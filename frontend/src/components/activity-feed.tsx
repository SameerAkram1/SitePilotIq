'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { getSiteActivity } from '@/hooks/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ChevronLeft, ChevronRight, Clock } from 'lucide-react';

const ACTION_LABELS: Record<string, { color: string; key: string }> = {
  SITE_CREATED: { color: 'bg-green-100 text-green-800', key: 'site_created' },
  SITE_UPDATED: { color: 'bg-blue-100 text-blue-800', key: 'site_updated' },
  SITE_DISABLED: { color: 'bg-red-100 text-red-800', key: 'site_disabled' },
  SITE_QR_REGENERATED: { color: 'bg-purple-100 text-purple-800', key: 'qr_regenerated' },
  BOQ_IMPORTED: { color: 'bg-emerald-100 text-emerald-800', key: 'boq_imported' },
  BOQ_BULK_CREATED: { color: 'bg-emerald-100 text-emerald-800', key: 'boq_bulk_created' },
  BOQ_ITEM_CREATED: { color: 'bg-emerald-100 text-emerald-800', key: 'boq_item_created' },
  BOQ_ITEM_UPDATED: { color: 'bg-emerald-100 text-emerald-800', key: 'boq_item_updated' },
  BOQ_ITEM_DELETED: { color: 'bg-emerald-100 text-emerald-800', key: 'boq_item_deleted' },
  BOQ_BASELINED: { color: 'bg-emerald-100 text-emerald-800', key: 'boq_baselined' },
  BOQ_SECTION_CREATED: { color: 'bg-emerald-100 text-emerald-800', key: 'section_created' },
  BOQ_SECTION_UPDATED: { color: 'bg-emerald-100 text-emerald-800', key: 'section_updated' },
  BOQ_SECTION_DELETED: { color: 'bg-emerald-100 text-emerald-800', key: 'section_deleted' },
  IPC_SUBMITTED: { color: 'bg-amber-100 text-amber-800', key: 'ipc_submitted' },
  IPC_CERTIFIED: { color: 'bg-green-100 text-green-800', key: 'ipc_certified' },
  IPC_REJECTED: { color: 'bg-red-100 text-red-800', key: 'ipc_rejected' },
  IPC_PAYMENT_RECORDED: { color: 'bg-blue-100 text-blue-800', key: 'ipc_payment_recorded' },
  IPC_MARKED_PAID: { color: 'bg-green-100 text-green-800', key: 'ipc_marked_paid' },
  VO_CREATED: { color: 'bg-orange-100 text-orange-800', key: 'vo_created' },
  VO_SUBMITTED: { color: 'bg-orange-100 text-orange-800', key: 'vo_submitted' },
  VO_APPROVED: { color: 'bg-green-100 text-green-800', key: 'vo_approved' },
  VO_REJECTED: { color: 'bg-red-100 text-red-800', key: 'vo_rejected' },
  VO_UPDATED: { color: 'bg-orange-100 text-orange-800', key: 'vo_updated' },
  VO_DELETED: { color: 'bg-red-100 text-red-800', key: 'vo_deleted' },
  MB_ENTRY_CREATED: { color: 'bg-cyan-100 text-cyan-800', key: 'mb_created' },
  MB_ENTRY_UPDATED: { color: 'bg-cyan-100 text-cyan-800', key: 'mb_updated' },
  MB_ENTRY_DELETED: { color: 'bg-red-100 text-red-800', key: 'mb_deleted' },
  SITE_ASSIGNMENT_CREATED: { color: 'bg-indigo-100 text-indigo-800', key: 'assignment_created' },
  SITE_ASSIGNMENT_UPDATED: { color: 'bg-indigo-100 text-indigo-800', key: 'assignment_updated' },
  SITE_ASSIGNMENT_ENDED: { color: 'bg-indigo-100 text-indigo-800', key: 'assignment_ended' },
  SITE_ASSIGNMENT_CANCELLED: { color: 'bg-red-100 text-red-800', key: 'assignment_cancelled' },
  SITE_LOCATION_CREATED: { color: 'bg-violet-100 text-violet-800', key: 'location_created' },
  PHOTO_UPLOADED: { color: 'bg-pink-100 text-pink-800', key: 'photo_uploaded' },
  PHOTO_DELETED: { color: 'bg-red-100 text-red-800', key: 'photo_deleted' },
  DOCUMENT_UPLOADED: { color: 'bg-blue-100 text-blue-800', key: 'document_uploaded' },
  DOCUMENT_DELETED: { color: 'bg-red-100 text-red-800', key: 'document_deleted' },
  DPR_CREATED: { color: 'bg-cyan-100 text-cyan-800', key: 'dpr_created' },
  DPR_UPDATED: { color: 'bg-cyan-100 text-cyan-800', key: 'dpr_updated' },
  DPR_DELETED: { color: 'bg-red-100 text-red-800', key: 'dpr_deleted' },
};

function formatTimeAgo(date: Date, t: (key: string, params?: any) => string): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return t('just_now');
  if (minutes < 60) return t('minutes_ago', { minutes });
  if (hours < 24) return t('hours_ago', { hours });
  if (days < 7) return t('days_ago', { days });
  return date.toLocaleDateString();
}

interface ActivityFeedProps {
  siteId: string;
  limit?: number;
}

export default function ActivityFeed({ siteId, limit = 15 }: ActivityFeedProps) {
  const td = useTranslations('sites.activity');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['siteActivity', siteId, page, limit],
    queryFn: () => getSiteActivity(siteId, { page, limit }),
  });

  const logs = data?.data || [];
  const pagination = data?.pagination;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5" />
          {td('title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">{td('empty')}</p>
        ) : (
          <div className="space-y-3">
            {logs.map((log: any) => {
              const actionConfig = ACTION_LABELS[log.action] || { color: 'bg-gray-100 text-gray-800', key: 'unknown' };
              return (
                <div key={log.id} className="flex items-start gap-3 text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={`text-xs ${actionConfig.color}`}>
                        {td(`actions.${actionConfig.key}`)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {log.user?.fullName || td('system')}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatTimeAgo(new Date(log.createdAt), td)}
                      </span>
                    </div>
                    {log.newValues && typeof log.newValues === 'object' && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {Object.entries(log.newValues)
                          .filter(([key]) => !['id', 'tenantId', 'projectId', 'createdById', 'updatedById', 'siteManagerId'].includes(key))
                          .map(([key, val]) => {
                            if (val == null || val === '') return null;
                            const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
                            if (typeof val === 'boolean') return `${label}: ${val ? 'Yes' : 'No'}`;
                            if (typeof val === 'number') return `${label}: ${val.toLocaleString()}`;
                            return `${label}: ${String(val)}`;
                          })
                          .filter(Boolean)
                          .slice(0, 3)
                          .join(' · ')}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-3 border-t">
            <span className="text-xs text-muted-foreground">
              {td('page_info', { page: pagination.page, total: pagination.totalPages })}
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
