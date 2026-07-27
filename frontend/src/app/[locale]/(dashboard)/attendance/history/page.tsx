'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { getAttendanceHistory, getSites } from '@/hooks/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/shared/searchable-select';
import {
  CalendarCheck,
  Loader2,
  CheckCircle,
  Clock,
  MapPin,
  Filter,
} from 'lucide-react';

export default function AttendanceHistoryPage() {
  const t = useTranslations('attendance.history');
  const tc = useTranslations('common');

  const [siteFilter, setSiteFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const { data: sites } = useQuery({
    queryKey: ['sitesList'],
    queryFn: () => getSites({ limit: 100 }),
  });

  const { data: attendance, isLoading } = useQuery({
    queryKey: ['attendance', 'history', { siteFilter, startDate, endDate }],
    queryFn: () =>
      getAttendanceHistory({
        siteId: siteFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }),
  });

  const siteOptions = [
    { id: '', label: t('all_sites') },
    ...(sites?.data || []).map((s: any) => ({
      id: s.id,
      label: `${s.code} - ${s.name}`,
    })),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
          <CalendarCheck className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground font-[family-name:var(--font-heading)]">
            {t('title')}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{t('subtitle')}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" />
            {t('site_filter')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">{t('site_filter')}</label>
              <SearchableSelect
                label={t('site_filter')}
                options={siteOptions}
                value={siteFilter}
                onChange={setSiteFilter}
                placeholder={t('all_sites')}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">{t('date_from')}</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-11 w-full bg-muted rounded-xl px-3 text-sm border border-input"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">{t('date_to')}</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-11 w-full bg-muted rounded-xl px-3 text-sm border border-input"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : !attendance || attendance.length === 0 ? (
            <div className="text-center py-12">
              <CalendarCheck className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">{t('empty')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">{t('table_date')}</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">{t('table_site')}</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">{t('table_check_in')}</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">{t('table_check_out')}</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-foreground">{t('table_hours')}</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">{t('table_status')}</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">{t('table_location')}</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((record: any) => (
                    <tr key={record.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                      <td className="py-3 px-4 text-sm">
                        {new Date(record.attendanceDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-sm font-medium">
                        {record.site?.name || '-'}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {new Date(record.checkInTime).toLocaleTimeString()}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {record.checkOutTime
                          ? new Date(record.checkOutTime).toLocaleTimeString()
                          : '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-medium">
                        {(() => {
                          const checkIn = record.checkInTime ? new Date(record.checkInTime) : null;
                          const checkOut = record.checkOutTime ? new Date(record.checkOutTime) : null;
                          if (checkIn && checkOut) {
                            const hours = ((checkOut.getTime() - checkIn.getTime()) / 3600000).toFixed(1);
                            return `${hours}h`;
                          }
                          return '—';
                        })()}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            record.status === 'CHECKED_IN'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {record.status === 'CHECKED_IN' ? (
                            <Clock className="h-3 w-3" />
                          ) : (
                            <CheckCircle className="h-3 w-3" />
                          )}
                          {record.status === 'CHECKED_IN' ? t('status_checked_in') : t('status_checked_out')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <div className="flex items-center gap-1">
                          {record.checkInLocationValid ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <MapPin className="h-4 w-4 text-red-500" />
                          )}
                          <span className={record.checkInLocationValid ? 'text-green-700' : 'text-red-700'}>
                            {record.checkInLocationValid ? t('location_on_site') : t('location_off_site')}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
