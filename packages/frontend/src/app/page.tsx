'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge } from '@/components/ui';
import { useDashboardStats } from '@/lib/hooks';
import { FileText, Clock, Send } from 'lucide-react';

export default function HomePage() {
  const { data: stats, isLoading } = useDashboardStats();

  const statCards = [
    { label: 'Templates', value: stats?.activeTemplates ?? '—', description: 'Available templates' },
    { label: 'Sent today', value: stats?.lettersToday ?? '—', description: 'Created today' },
    { label: 'Sent this week', value: stats?.sentThisWeek ?? '—', description: 'Across all channels' },
    { label: 'Archived', value: stats?.archived ?? '—', description: 'In document archive' },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">CloudLetters</h1>
        <p className="mt-2 text-muted-foreground max-w-2xl">
          Generate, send and archive letters to customers.
        </p>
      </div>

      <div className="grid gap-4 mb-10 md:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardDescription>{stat.label}</CardDescription>
              <CardTitle className="text-2xl">
                {isLoading ? <span className="animate-pulse text-muted-foreground">…</span> : stat.value}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Link href="/templates" className="group">
          <Card className="h-full transition-all hover:shadow-md hover:border-primary/30 group-hover:-translate-y-0.5">
            <CardHeader>
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileText className="h-5 w-5" />
              </div>
              <CardTitle className="text-base">Templates</CardTitle>
              <CardDescription>
                View all templates, API documentation and preview as PDF.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!isLoading && stats && <Badge variant="secondary">{stats.activeTemplates} available</Badge>}
            </CardContent>
          </Card>
        </Link>

        <Link href="/letters" className="group">
          <Card className="h-full transition-all hover:shadow-md hover:border-primary/30 group-hover:-translate-y-0.5">
            <CardHeader>
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Clock className="h-5 w-5" />
              </div>
              <CardTitle className="text-base">History</CardTitle>
              <CardDescription>
                View all sent and archived letters with status and details.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!isLoading && stats && <Badge variant="info">{stats.lettersToday} today</Badge>}
            </CardContent>
          </Card>
        </Link>

        <Link href="/templates" className="group">
          <Card className="h-full border-dashed border-2 transition-all hover:shadow-md hover:border-primary/50 group-hover:-translate-y-0.5">
            <CardHeader>
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Send className="h-5 w-5" />
              </div>
              <CardTitle className="text-base">Send a letter</CardTitle>
              <CardDescription>
                Select a letter, fill in the required data and send manually to the customer.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-sm font-medium text-primary">View templates →</span>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
