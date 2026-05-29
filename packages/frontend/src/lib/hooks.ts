'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { templateApi, letterApi, dashboardApi } from './api';
import type { TemplateListItem, TemplateDetail, LetterListItem, LetterDetail, DashboardStats } from './api';

// ─── Query Keys ────────────────────────────────────────────────────────────────

export const queryKeys = {
  templates: ['templates'] as const,
  template: (id: string) => ['templates', id] as const,
  letters: ['letters'] as const,
  letter: (id: string) => ['letters', id] as const,
  dashboard: ['dashboard'] as const,
};

// ─── Template Hooks (read-only) ────────────────────────────────────────────────

export function useTemplates() {
  return useQuery<{ templates: TemplateListItem[]; count: number }>({
    queryKey: queryKeys.templates,
    queryFn: () => templateApi.list(),
  });
}

export function useTemplate(id: string) {
  return useQuery<TemplateDetail>({
    queryKey: queryKeys.template(id),
    queryFn: () => templateApi.get(id),
    enabled: !!id,
  });
}

// ─── Letter Hooks ──────────────────────────────────────────────────────────────

export function useLetters(nextToken?: string) {
  return useQuery<{ letters: LetterListItem[]; nextToken?: string }>({
    queryKey: [...queryKeys.letters, nextToken],
    queryFn: () => letterApi.list({ nextToken }),
  });
}

export function useLetter(id: string) {
  return useQuery<LetterDetail>({
    queryKey: queryKeys.letter(id),
    queryFn: () => letterApi.get(id),
    enabled: !!id,
  });
}

export function useCreateLetter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof letterApi.create>[0]) => letterApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.letters });
      toast.success('Letter created');
    },
    onError: () => { toast.error('Failed to create letter'); },
  });
}

export function useSendLetter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof letterApi.send>[1] }) => letterApi.send(id, data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.letters });
      qc.invalidateQueries({ queryKey: queryKeys.letter(vars.id) });
      toast.success('Letter sent');
    },
    onError: () => { toast.error('Failed to send letter'); },
  });
}

export function useArchiveLetter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof letterApi.archive>[1] }) => letterApi.archive(id, data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.letters });
      qc.invalidateQueries({ queryKey: queryKeys.letter(vars.id) });
      toast.success('Letter archived');
    },
    onError: () => { toast.error('Failed to archive letter'); },
  });
}

export function usePreviewLetter() {
  return useMutation({
    mutationFn: (data: Parameters<typeof letterApi.preview>[0]) => letterApi.preview(data),
    onError: () => { toast.error('Failed to generate preview'); },
  });
}

// ─── Dashboard Hooks ───────────────────────────────────────────────────────────

export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: queryKeys.dashboard,
    queryFn: () => dashboardApi.stats(),
    staleTime: 30_000,
  });
}
