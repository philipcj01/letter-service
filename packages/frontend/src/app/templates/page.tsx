'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, Badge, EmptyState, Spinner, Input } from '@/components/ui';
import { useTemplates } from '@/lib/hooks';
import { BookOpen, Send, Search } from 'lucide-react';

export default function TemplatesPage() {
  const [search, setSearch] = useState('');
  const { data, isLoading, error } = useTemplates();
  const allTemplates = data?.templates ?? [];

  const templates = search
    ? allTemplates.filter((t) =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        (t.description ?? '').toLowerCase().includes(search.toLowerCase()) ||
        t.id.toLowerCase().includes(search.toLowerCase())
      )
    : allTemplates;

  if (isLoading) {
    return <Spinner className="py-20" label="Loading templates..." />;
  }

  if (error) {
    return (
      <Card className="p-6">
        <EmptyState
          title="Failed to load templates"
          description={(error as Error).message}
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Templates</h1>
        <p className="text-sm text-muted-foreground">Overview of all available templates, their API documentation and ability to send manually.</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search templates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {templates.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            title={search ? 'No results' : 'No templates found'}
            description={search ? `No templates match "${search}"` : 'No templates have been defined in the system yet.'}
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <Link key={t.id} href={`/templates/${t.id}`}>
              <Card className="h-full p-5 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <Badge>v{t.version}</Badge>
                </div>
                <h3 className="font-semibold text-foreground mb-1">{t.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{t.description}</p>
                <div className="flex items-center text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Send className="h-3 w-3" />
                    {t.requiredFields} required fields
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
