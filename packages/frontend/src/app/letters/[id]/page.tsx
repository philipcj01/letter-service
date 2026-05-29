'use client';

import { Button, Card, CardHeader, CardTitle, CardContent, Badge, EmptyState } from '@/components/ui';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useLetter, useSendLetter, useArchiveLetter } from '@/lib/hooks';

const statusConfig: Record<string, { variant: 'secondary' | 'info' | 'success' | 'warning'; label: string }> = {
  draft: { variant: 'secondary', label: 'Draft' },
  created: { variant: 'warning', label: 'Created' },
  sent: { variant: 'info', label: 'Sent' },
  archived: { variant: 'success', label: 'Archived' },
  failed: { variant: 'secondary', label: 'Failed' },
};

export default function LetterDetailPage() {
  const params = useParams();
  const letterId = params.id as string;
  const { data: letter, isLoading, error } = useLetter(letterId);
  const sendLetter = useSendLetter();
  const archiveLetter = useArchiveLetter();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-muted-foreground">Loading letter...</div>
      </div>
    );
  }

  if (error || !letter) {
    return (
      <Card className="p-6">
        <EmptyState
          title="Letter not found"
          description={(error as Error)?.message || 'Could not load letter.'}
          action={<Link href="/letters"><Button variant="outline">← Back to letters</Button></Link>}
        />
      </Card>
    );
  }

  async function handleSend() {
    if (!letter) return;
    await sendLetter.mutateAsync({
      id: letter.letterId,
      data: {
        channel: 'email',
        recipient: { name: letter.customerId, email: '' },
      },
    });
  }

  async function handleArchive() {
    if (!letter) return;
    await archiveLetter.mutateAsync({
      id: letter.letterId,
      data: {},
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/letters" className="text-sm text-primary hover:underline">← Back to letters</Link>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mt-1">
            {letter.templateName || letter.metadata?.subject || `Letter ${letter.letterId}`}
          </h1>
          <p className="text-sm text-muted-foreground">Customer: {letter.customerId}</p>
        </div>
        <Badge variant={statusConfig[letter.status]?.variant ?? 'secondary'}>
          {statusConfig[letter.status]?.label ?? letter.status}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardContent>
              {letter.pdfUrl ? (
                <iframe src={letter.pdfUrl} className="h-[700px] w-full rounded-lg border" title="PDF" />
              ) : (
                <div className="flex h-[700px] items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30">
                  <p className="text-sm text-muted-foreground">No PDF available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(letter.status === 'draft' || letter.status === 'created') && (
                <Button className="w-full" onClick={handleSend} disabled={sendLetter.isPending}>
                  {sendLetter.isPending ? 'Sending...' : 'Send letter'}
                </Button>
              )}
              {letter.status !== 'archived' && (
                <Button variant="outline" className="w-full" onClick={handleArchive} disabled={archiveLetter.isPending}>
                  {archiveLetter.isPending ? 'Archiving...' : 'Archive letter'}
                </Button>
              )}
              {letter.pdfUrl && (
                <a href={letter.pdfUrl} download>
                  <Button variant="outline" className="w-full">Download PDF</Button>
                </a>
              )}
              {sendLetter.isError && (
                <p className="text-xs text-destructive">Error: {(sendLetter.error as Error).message}</p>
              )}
              {archiveLetter.isError && (
                <p className="text-xs text-destructive">Error: {(archiveLetter.error as Error).message}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Metadata</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Created:</dt>
                  <dd className="font-medium text-foreground">{new Date(letter.createdAt).toLocaleString('en-US')}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Created by:</dt>
                  <dd className="font-medium text-foreground">{letter.createdBy}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Letter:</dt>
                  <dd className="font-medium text-foreground">{letter.templateId} v{letter.templateVersion}</dd>
                </div>
                {letter.sentAt && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Sent:</dt>
                    <dd className="font-medium text-foreground">{new Date(letter.sentAt).toLocaleString('en-US')}</dd>
                  </div>
                )}
                {letter.archiveDocumentId && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Archive ID:</dt>
                    <dd className="font-medium text-foreground">{letter.archiveDocumentId}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Entered data</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                {Object.entries(letter.placeholderValues || {}).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <dt className="text-muted-foreground">{key}:</dt>
                    <dd className="font-medium text-foreground">{String(value)}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
