const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/$/, '');

// ─── Types matching backend responses ──────────────────────────────────────────

// ─── Template types (read-only from registry) ──────────────────────────────────

export interface TemplateListItem {
  id: string;
  name: string;
  description?: string;
  version: string;
  placeholderCount: number;
  requiredFields: number;
}

export interface PlaceholderField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'list' | 'email';
  required: boolean;
  description?: string;
  defaultValue?: unknown;
  apiPath?: string;
  validationRegex?: string;
  options?: { label: string; value: string }[];
}

export interface TemplateDetail {
  id: string;
  name: string;
  description?: string;
  version: string;
  placeholders: PlaceholderField[];
  sections: Array<{
    id: string;
    type: string;
    label: string;
    blocks?: Array<{ type: string; level?: string; text?: string }>;
    columns?: Array<{ key: string; header: string; width?: number }>;
    dataSourcePlaceholder?: string;
    recipientPlaceholder?: string;
  }>;
  header?: { companyName?: string; logoUrl?: string; showDate?: boolean; showReferenceNumber?: boolean };
  footer?: { companyName?: string; address?: string; phone?: string; email?: string; website?: string; showPageNumbers?: boolean };
  signatureFields?: { name: string; title: string };
  api: {
    endpoint: string;
    method: string;
    description: string;
    jsonExample: Record<string, unknown>;
    baseFields: Record<string, { type: string; required: boolean; description: string }>;
  };
}

export interface LetterListItem {
  letterId: string;
  templateId: string;
  templateName?: string;
  customerId: string;
  status: 'draft' | 'created' | 'sent' | 'archived' | 'failed';
  metadata?: { subject?: string; category?: string; tags?: string[]; caseReference?: string };
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
  archivedAt?: string;
}

export interface LetterDetail extends LetterListItem {
  templateVersion: number;
  placeholderValues: Record<string, unknown>;
  pdfS3Key?: string;
  pdfUrl?: string;
  archiveDocumentId?: string;
}

// ─── API Client ────────────────────────────────────────────────────────────────

class ApiClient {
  private getToken: (() => string | null) | null = null;
  private getValidToken: (() => Promise<string | null>) | null = null;

  setTokenGetter(fn: () => string | null) {
    this.getToken = fn;
  }

  setValidTokenGetter(fn: () => Promise<string | null>) {
    this.getValidToken = fn;
  }

  private get headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = this.getToken?.();
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    let res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: this.headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    // On 401, try refreshing token and retry once
    if (res.status === 401 && this.getValidToken) {
      const freshToken = await this.getValidToken();
      if (freshToken) {
        const retryHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${freshToken}`,
        };
        res = await fetch(`${API_BASE}${path}`, {
          method,
          headers: retryHeaders,
          body: body ? JSON.stringify(body) : undefined,
        });
      }
    }

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(error.message || `API error: ${res.status}`);
    }

    return res.json();
  }

  async requestRaw(method: string, path: string, body?: unknown): Promise<Response> {
    return fetch(`${API_BASE}${path}`, {
      method,
      headers: this.headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  }
}

export const api = new ApiClient();

// ─── Template API ──────────────────────────────────────────────────────────────

export const templateApi = {
  list: () => api.request<{ templates: TemplateListItem[]; count: number }>('GET', '/templates'),
  get: (id: string) => api.request<TemplateDetail>('GET', `/templates/${id}`),
};

// ─── Letter API ────────────────────────────────────────────────────────────────

export const letterApi = {
  list: (params?: { nextToken?: string; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.nextToken) query.set('nextToken', params.nextToken);
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    return api.request<{ letters: LetterListItem[]; nextToken?: string }>('GET', `/letters${qs ? `?${qs}` : ''}`);
  },
  get: (id: string) => api.request<LetterDetail>('GET', `/letters/${id}`),
  create: (data: {
    templateId: string;
    templateVersion?: number;
    customerId: string;
    placeholderValues: Record<string, unknown>;
    metadata?: { subject: string; category?: string; tags?: string[]; caseReference?: string };
  }) => api.request<LetterDetail>('POST', '/letters', data),
  preview: (data: { templateId: string; templateVersion?: number; placeholderValues: Record<string, unknown> }) =>
    api.request<{ url: string }>('POST', '/letters/preview', data),
  send: (templateId: string, data: Record<string, unknown>) =>
    api.request<{ letterId: string; status: string; createdAt: string }>('POST', `/letters/${templateId}`, data),
  archive: (id: string, data: { documentTypeName?: string; archiveReason?: string }) =>
    api.request<{ letterId: string; archiveDocumentId: string; archivedAt: string }>('POST', `/letters/${id}/archive`, data),
};

// ─── Dashboard API ─────────────────────────────────────────────────────────────

export interface DashboardStats {
  activeTemplates: number;
  lettersToday: number;
  sentThisWeek: number;
  archived: number;
}

export const dashboardApi = {
  stats: async (): Promise<DashboardStats> => {
    // Aggregate from list endpoints until a dedicated stats endpoint exists
    const [templatesRes, lettersRes] = await Promise.all([
      templateApi.list(),
      letterApi.list(),
    ]);

    const templates = templatesRes.templates || [];
    const letters = lettersRes.letters || [];

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    return {
      activeTemplates: templates.length,
      lettersToday: letters.filter((l) => l.createdAt?.startsWith(todayStr)).length,
      sentThisWeek: letters.filter((l) => l.status === 'sent' && l.sentAt && l.sentAt >= weekAgo).length,
      archived: letters.filter((l) => l.status === 'archived').length,
    };
  },
};
