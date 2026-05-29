'use client';

import { useState } from 'react';
import { Button, Card, Badge, EmptyState, Spinner, Pagination } from '@/components/ui';
import Link from 'next/link';
import { useLetters } from '@/lib/hooks';

const statusConfig: Record<string, { variant: 'secondary' | 'info' | 'success' | 'warning'; label: string }> = {
  draft: { variant: 'secondary', label: 'Draft' },
  created: { variant: 'warning', label: 'Created' },
  sent: { variant: 'info', label: 'Sent' },
  archived: { variant: 'success', label: 'Archived' },
  failed: { variant: 'secondary', label: 'Failed' },
};

export default function LettersPage() {
  const [tokens, setTokens] = useState<(string | undefined)[]>([undefined]);
  const [page, setPage] = useState(0);
  const { data, isLoading, error } = useLetters(tokens[page]);
  const letters = data?.letters ?? [];

  function goNext() {
    if (data?.nextToken) {
      const newTokens = [...tokens];
      newTokens[page + 1] = data.nextToken;
      setTokens(newTokens);
      setPage(page + 1);
    }
  }

  function goPrev() {
    if (page > 0) setPage(page - 1);
  }

  if (isLoading) {
    return <Spinner className="py-20" label="Loading letters..." />;
  }

  if (error) {
    return (
      <Card className="p-6">
        <EmptyState
          title="Failed to load letters"
          description={(error as Error).message || 'An error occurred.'}
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Letter History</h1>
        <p className="text-sm text-muted-foreground">All sent and archived letters</p>
      </div>

      {letters.length === 0 && page === 0 ? (
        <Card className="p-6">
          <EmptyState
            title="No letters yet"
            description="Letters will appear here once sent"
          />
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Letter</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">CPR</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Created</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {letters.map((letter) => (
                  <tr key={letter.letterId} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground">
                      {letter.templateName || letter.templateId}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{letter.customerId}</td>
                    <td className="px-6 py-4">
                      <Badge variant={statusConfig[letter.status]?.variant ?? 'secondary'}>
                        {statusConfig[letter.status]?.label ?? letter.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {new Date(letter.createdAt).toLocaleDateString('en-US')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/letters/${letter.letterId}`}>
                        <Button variant="ghost" size="sm">Open</Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 pb-4">
            <Pagination
              hasNext={!!data?.nextToken}
              hasPrev={page > 0}
              onNext={goNext}
              onPrev={goPrev}
              page={page + 1}
            />
          </div>
        </Card>
      )}
    </div>
  );
}
