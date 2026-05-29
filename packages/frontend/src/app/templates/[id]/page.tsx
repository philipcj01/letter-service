'use client';

import { useParams } from 'next/navigation';
import { useTemplate, usePreviewLetter } from '@/lib/hooks';
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, Input, Spinner, DatePicker, Checkbox, SimpleSelect, Textarea, MultiSelect } from '@/components/ui';
import { ArrowLeft, Eye, Send, Code2, FileText, Globe } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import type { PlaceholderField } from '@/lib/api';

export default function TemplateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: template, isLoading, error } = useTemplate(id);
  const previewLetter = usePreviewLetter();
  const [tab, setTab] = useState<'docs' | 'preview' | 'send'>('docs');
  const [inputValues, setInputValues] = useState<Record<string, unknown>>({});
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [jsonMode, setJsonMode] = useState(false);
  const [jsonValue, setJsonValue] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  if (isLoading) {
    return <Spinner className="py-24" label="Loading template..." />;
  }

  if (error || !template) {
    return (
      <Card className="p-6">
        <p className="text-sm text-destructive">{(error as Error)?.message || 'Template not found'}</p>
      </Card>
    );
  }

  function setField(key: string, value: unknown) {
    setInputValues((prev) => ({ ...prev, [key]: value }));
  }

  function applyJson() {
    try {
      const parsed = JSON.parse(jsonValue);
      setInputValues(parsed);
      setJsonError(null);
    } catch {
      setJsonError('Invalid JSON');
    }
  }

  function switchToJson() {
    setJsonValue(JSON.stringify(inputValues, null, 2));
    setJsonMode(true);
  }

  async function handlePreview() {
    setPdfUrl(null);
    const { url } = await previewLetter.mutateAsync({
      templateId: template!.id,
      placeholderValues: inputValues,
    });
    setPdfUrl(url);
  }

  const tabs = [
    { key: 'docs', label: 'Documentation', icon: FileText },
    { key: 'preview', label: 'Preview', icon: Eye },
    { key: 'send', label: 'Send manually', icon: Send },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/templates">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">{template.name}</h1>
            <Badge>v{template.version}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
        </div>
      </div>

      <div className="flex items-center gap-1 border-b">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'docs' && <DocsTab template={template} />}
      {tab === 'preview' && (
        <PreviewTab
          template={template}
          inputValues={inputValues}
          setField={setField}
          jsonMode={jsonMode}
          jsonValue={jsonValue}
          setJsonValue={setJsonValue}
          jsonError={jsonError}
          switchToJson={switchToJson}
          applyJson={applyJson}
          setJsonMode={setJsonMode}
          handlePreview={handlePreview}
          isLoading={previewLetter.isPending}
          pdfUrl={pdfUrl}
        />
      )}
      {tab === 'send' && (
        <SendTab
          template={template}
          inputValues={inputValues}
          setField={setField}
          jsonMode={jsonMode}
          jsonValue={jsonValue}
          setJsonValue={setJsonValue}
          jsonError={jsonError}
          switchToJson={switchToJson}
          applyJson={applyJson}
          setJsonMode={setJsonMode}
        />
      )}
    </div>
  );
}

function DocsTab({ template }: { template: NonNullable<ReturnType<typeof useTemplate>['data']> }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4" />
            API Endpoint
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="success">POST</Badge>
            <code className="text-sm bg-muted px-2 py-1 rounded font-mono">{template.api.endpoint}</code>
          </div>
          <p className="text-sm text-muted-foreground">{template.api.description}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Base fields (all letters)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(template.api.baseFields).map(([key, field]) => (
              <div key={key} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{key}</code>
                  {field.required && <Badge variant="danger" className="text-[10px] px-1 py-0">Required</Badge>}
                </div>
                <span className="text-muted-foreground">{field.type}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Input</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Field</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Label</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Type</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Required</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {template.placeholders.map((p) => (
                  <tr key={p.key} className="hover:bg-muted/30">
                    <td className="py-2 px-3"><code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{p.key}</code></td>
                    <td className="py-2 px-3">{p.label}</td>
                    <td className="py-2 px-3"><Badge variant="secondary" className="text-xs">{p.type}</Badge></td>
                    <td className="py-2 px-3">{p.required ? <Badge variant="danger" className="text-xs">Yes</Badge> : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Code2 className="h-4 w-4" />
            JSON example
          </CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto max-h-80 font-mono">
            {JSON.stringify(template.api.jsonExample, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}

interface InputFormProps {
  template: NonNullable<ReturnType<typeof useTemplate>['data']>;
  inputValues: Record<string, unknown>;
  setField: (key: string, value: unknown) => void;
  jsonMode: boolean;
  jsonValue: string;
  setJsonValue: (v: string) => void;
  jsonError: string | null;
  switchToJson: () => void;
  applyJson: () => void;
  setJsonMode: (v: boolean) => void;
}

function InputForm({ template, inputValues, setField, jsonMode, jsonValue, setJsonValue, jsonError, switchToJson, applyJson, setJsonMode }: InputFormProps) {
  if (jsonMode) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">JSON Input</span>
          <Button variant="ghost" size="sm" onClick={() => setJsonMode(false)}>Form</Button>
        </div>
        <Textarea
          className="h-64 font-mono text-xs"
          value={jsonValue}
          onChange={(e) => setJsonValue(e.target.value)}
        />
        {jsonError && <p className="text-xs text-destructive">{jsonError}</p>}
        <Button size="sm" onClick={applyJson}>Apply JSON</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Fill in fields</span>
        <Button variant="ghost" size="sm" onClick={switchToJson}>
          <Code2 className="h-3.5 w-3.5 mr-1" /> JSON
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Checkbox
          checked={(inputValues.archiveEnabled as boolean) || false}
          onCheckedChange={(checked) => setField('archiveEnabled', !!checked)}
          label="Archive letter"
          description="Store the letter in the document archive"
        />
      </div>
      <div className="border-t pt-4 grid gap-3 sm:grid-cols-2">
        {template.placeholders
          .filter((p) => !['archiveEnabled'].includes(p.key))
          .map((p) => (
            <FieldInput key={p.key} field={p} value={inputValues[p.key]} onChange={(v) => setField(p.key, v)} />
          ))}
      </div>
    </div>
  );
}

function FieldInput({ field, value, onChange }: { field: PlaceholderField; value: unknown; onChange: (v: unknown) => void }) {
  if (field.type === 'boolean') {
    return (
      <Checkbox
        checked={!!value}
        onCheckedChange={(checked) => onChange(!!checked)}
        label={`${field.label}${field.required ? ' *' : ''}`}
      />
    );
  }
  if (field.type === 'list' && field.options && field.options.length > 0) {
    return (
      <MultiSelect
        label={`${field.label}${field.required ? ' *' : ''}`}
        value={(value as string[]) || []}
        onValueChange={(v) => onChange(v)}
        options={field.options}
        placeholder="Select..."
      />
    );
  }
  if (field.options && field.options.length > 0) {
    return (
      <SimpleSelect
        label={`${field.label}${field.required ? ' *' : ''}`}
        value={(value as string) || ''}
        onValueChange={(v) => onChange(v)}
        options={field.options}
        placeholder="Select..."
      />
    );
  }
  if (field.type === 'date') {
    return (
      <DatePicker
        label={`${field.label}${field.required ? ' *' : ''}`}
        value={(value as string) || ''}
        onChange={(v) => onChange(v)}
        placeholder={'Select date'}
        required={field.required}
      />
    );
  }
  return (
    <Input
      label={`${field.label}${field.required ? ' *' : ''}`}
      type={field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : 'text'}
      placeholder={'Enter ' + field.label.toLowerCase()}
      value={(value as string) ?? ''}
      onChange={(e) => onChange(field.type === 'number' ? Number(e.target.value) : e.target.value)}
    />
  );
}

function PreviewTab(props: InputFormProps & { handlePreview: () => void; isLoading: boolean; pdfUrl: string | null }) {
  const { handlePreview, isLoading, pdfUrl, ...formProps } = props;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="p-5">
        <InputForm {...formProps} />
        <div className="mt-4">
          <Button onClick={handlePreview} disabled={isLoading}>
            {isLoading ? <Spinner size="sm" /> : <Eye className="h-4 w-4 mr-1" />}
            Generate preview
          </Button>
        </div>
      </Card>
      <Card className="p-5">
        <h3 className="text-sm font-medium mb-3">Preview</h3>
        {pdfUrl ? (
          <iframe src={pdfUrl} className="w-full h-[600px] rounded border" />
        ) : (
          <div className="flex items-center justify-center h-[600px] bg-muted/30 rounded border border-dashed text-sm text-muted-foreground">
            Fill in the fields and click &quot;Generate preview&quot;
          </div>
        )}
      </Card>
    </div>
  );
}

function SendTab(props: InputFormProps) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSend() {
    setSending(true);
    try {
      const { template, inputValues } = props;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/letters/${template.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputValues),
      });
      if (res.ok) {
        setSent(true);
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-1">Send letter manually</h3>
        <p className="text-xs text-muted-foreground mb-4">Fill in the data and send the letter. It will be generated and delivered.</p>
        <InputForm {...props} />
        <div className="mt-4 flex items-center gap-3">
          <Button onClick={handleSend} disabled={sending || sent}>
            {sending ? <Spinner size="sm" /> : <Send className="h-4 w-4 mr-1" />}
            {sent ? 'Sent!' : 'Send letter'}
          </Button>
          {sent && <span className="text-sm text-green-600">The letter has been sent.</span>}
        </div>
      </Card>
    </div>
  );
}