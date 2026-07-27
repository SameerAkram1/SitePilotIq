'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import {
  getIpcRecords,
  getIpcStats,
  getIpcRecord,
  createIpcRecord,
  submitIpc,
  certifyIpc,
  rejectIpc,
  recordIpcPayment,
  markIpcPaid,
  downloadIpcPdf,
  getMbAggregated,
  getSite,
  ipcKeys,
} from '@/hooks/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Plus,
  Loader2,
  Send,
  CheckCircle,
  DollarSign,
  Eye,
  FileText,
  XCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Download,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  UNIT_LABELS,
  formatCurrency,
  formatDateRange,
  formatDate,
  IPC_STATUS_CONFIG,
  type BoqUnit,
} from '@/lib/finance-utils';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

export default function IpcPage() {
  const params = useParams();
  const siteId = params.id as string;
  const queryClient = useQueryClient();
  const td = useTranslations('sites.ipc');

  const [view, setView] = useState<'list' | 'detail' | 'create'>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({ billingStartDate: '', billingEndDate: '', isFinal: false, isMbLinked: false });
  const [lineItemEdits, setLineItemEdits] = useState<Record<string, number>>({});
  const [certifyEdits, setCertifyEdits] = useState<Record<string, number>>({});
  const [showPaidConfirm, setShowPaidConfirm] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: '',
    referenceNumber: '',
    notes: '',
  });

  const { data: site } = useQuery({
    queryKey: ['site', siteId],
    queryFn: () => getSite(siteId),
  });

  const { data: stats } = useQuery({
    queryKey: ipcKeys.stats(siteId),
    queryFn: () => getIpcStats(siteId),
  });

  const { data: recordsData, isLoading: recordsLoading } = useQuery({
    queryKey: ipcKeys.list(siteId),
    queryFn: () => getIpcRecords(siteId),
  });

  const { data: record, isLoading: recordLoading } = useQuery({
    queryKey: ipcKeys.detail(siteId, selectedId || ''),
    queryFn: () => getIpcRecord(siteId, selectedId!),
    enabled: !!selectedId,
  });

  const currencyCode = site?.currencyCode || record?.currencyCode || 'USD';
  const retentionPct = record?.retentionPercentage ?? stats?.retentionPercentage ?? 10;
  const advanceRecovery = record?.advanceRecoveryAmount ?? stats?.advanceRecoveryAmount ?? 0;

  const createMutation = useMutation({
    mutationFn: (data: any) => createIpcRecord(siteId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ipcKeys.list(siteId) });
      queryClient.invalidateQueries({ queryKey: ipcKeys.stats(siteId) });
      setSelectedId(data.id);
      setView('detail');
      setLineItemEdits({});
      toast.success(td('created_success', { number: String(data.ipcNumber).padStart(2, '0') }));
    },
    onError: (err: any) => toast.error(err.response?.data?.message || td('create_error')),
  });

  const submitMutation = useMutation({
    mutationFn: ({ id, lineItems }: any) => submitIpc(siteId, id, { lineItems }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ipcKeys.detail(siteId, selectedId || '') });
      queryClient.invalidateQueries({ queryKey: ipcKeys.list(siteId) });
      queryClient.invalidateQueries({ queryKey: ipcKeys.stats(siteId) });
      toast.success(td('submitted'));
    },
    onError: (err: any) => toast.error(err.response?.data?.message || td('submit_error')),
  });

  const certifyMutation = useMutation({
    mutationFn: ({ id, lineItems, retentionReleased }: any) =>
      certifyIpc(siteId, id, { lineItems, retentionReleased }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ipcKeys.detail(siteId, selectedId || '') });
      queryClient.invalidateQueries({ queryKey: ipcKeys.list(siteId) });
      queryClient.invalidateQueries({ queryKey: ipcKeys.stats(siteId) });
      queryClient.invalidateQueries({ queryKey: ['siteDashboard', siteId] });
      toast.success(td('certified'));
    },
    onError: (err: any) => toast.error(err.response?.data?.message || td('certify_error')),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: any) => rejectIpc(siteId, id, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ipcKeys.detail(siteId, selectedId || '') });
      queryClient.invalidateQueries({ queryKey: ipcKeys.list(siteId) });
      queryClient.invalidateQueries({ queryKey: ipcKeys.stats(siteId) });
      toast.success(td('rejected'));
      setShowRejectConfirm(false);
      setRejectReason('');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || td('reject_error')),
  });

  const paymentMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => recordIpcPayment(siteId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ipcKeys.detail(siteId, selectedId || '') });
      queryClient.invalidateQueries({ queryKey: ipcKeys.list(siteId) });
      queryClient.invalidateQueries({ queryKey: ipcKeys.stats(siteId) });
      toast.success(td('payment_recorded'));
      setShowPaymentForm(false);
      setPaymentForm({ amount: '', paymentDate: new Date().toISOString().split('T')[0], paymentMethod: '', referenceNumber: '', notes: '' });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || td('payment_error')),
  });

  const paidMutation = useMutation({
    mutationFn: (id: string) => markIpcPaid(siteId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ipcKeys.detail(siteId, selectedId || '') });
      queryClient.invalidateQueries({ queryKey: ipcKeys.list(siteId) });
      queryClient.invalidateQueries({ queryKey: ipcKeys.stats(siteId) });
      toast.success(td('paid'));
      setShowPaidConfirm(false);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || td('paid_error')),
  });

  const handleDownloadPdf = async () => {
    if (!record) return;
    try {
      const blob = await downloadIpcPdf(siteId, record.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `IPC-${String(record.ipcNumber).padStart(2, '0')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      toast.error(td('pdf_download_error'));
    }
  };

  const handleAggregateFromMb = async (ipcId: string) => {
    if (!record) return;
    try {
      const aggData = await getMbAggregated(
        siteId,
        record.billingStartDate.split('T')[0],
        record.billingEndDate.split('T')[0],
      );
      const edits: Record<string, number> = {};
      for (const agg of aggData) {
        edits[agg.boqItemId] = agg.totalQuantity;
      }
      setLineItemEdits(edits);
      toast.success(td('aggregate_success', { count: aggData.length }));
    } catch {
      toast.error(td('aggregate_error'));
    }
  };

  const handleSubmitIpc = () => {
    if (!record) return;
    const lineItems = record.lineItems.map((li: any) => ({
      boqItemId: li.boqItemId,
      currentQuantity: lineItemEdits[li.boqItemId] ?? Number(li.currentQuantity),
    }));
    submitMutation.mutate({ id: record.id, lineItems });
  };

  const handleCertifyIpc = () => {
    if (!record) return;
    const lineItems = record.lineItems.map((li: any) => ({
      boqItemId: li.boqItemId,
      certifiedQuantity: certifyEdits[li.boqItemId] ?? Number(li.currentQuantity),
    }));
    certifyMutation.mutate({ id: record.id, lineItems, retentionReleased: false });
  };

  const handleRecordPayment = () => {
    if (!record || !paymentForm.amount || !paymentForm.paymentDate) return;
    paymentMutation.mutate({
      id: record.id,
      amount: parseFloat(paymentForm.amount),
      paymentDate: paymentForm.paymentDate,
      paymentMethod: paymentForm.paymentMethod || undefined,
      referenceNumber: paymentForm.referenceNumber || undefined,
      notes: paymentForm.notes || undefined,
    });
  };

  const records = recordsData?.data || [];

  if (view === 'create') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href={`/sites/${siteId}`} className="hover:text-foreground">{td('breadcrumb_sites')}</Link>
          <span>/</span>
          <button onClick={() => setView('list')} className="hover:text-foreground">{td('breadcrumb_ipc')}</button>
          <span>/</span>
          <span className="text-foreground font-medium">{td('breadcrumb_new')}</span>
        </div>
        <Card className="max-w-lg">
          <CardHeader><CardTitle>{td('create_title')}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>{td('billing_start')}</Label>
              <Input type="date" value={createForm.billingStartDate}
                onChange={(e) => setCreateForm({ ...createForm, billingStartDate: e.target.value })} />
            </div>
            <div>
              <Label>{td('billing_end')}</Label>
              <Input type="date" value={createForm.billingEndDate}
                onChange={(e) => setCreateForm({ ...createForm, billingEndDate: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isFinal"
                checked={createForm.isFinal}
                onChange={(e) => setCreateForm({ ...createForm, isFinal: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="isFinal">{td('is_final_ipc')}</Label>
            </div>
            {createForm.isFinal && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                <AlertTriangle className="h-4 w-4 inline mr-1" />
                {td('final_ipc_warning')}
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isMbLinked"
                checked={createForm.isMbLinked}
                onChange={(e) => setCreateForm({ ...createForm, isMbLinked: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="isMbLinked">{td('mb_linked_ipc')}</Label>
            </div>
            {createForm.isMbLinked && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                <FileText className="h-4 w-4 inline mr-1" />
                {td('mb_linked_hint')}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setView('list')}>{td('cancel')}</Button>
              <Button onClick={() => createMutation.mutate(createForm)} disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {td('create_button')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (view === 'detail' && record) {
    const sortedLineItems = [...record.lineItems].sort((a: any, b: any) => (a.boqItem?.sortOrder || 0) - (b.boqItem?.sortOrder || 0));

    const liveGrossClaimed = sortedLineItems.reduce((sum: number, li: any) => {
      const rate = Number(li.boqUnitRate);
      const qty = lineItemEdits[li.boqItemId] ?? Number(li.currentQuantity);
      return sum + Math.round(qty * rate * 100) / 100;
    }, 0);

    const liveRetention = Math.round(liveGrossClaimed * (retentionPct / 100) * 100) / 100;
    const liveNetPayable = liveGrossClaimed - liveRetention - advanceRecovery;

    const certifiedGross = record.certifiedGross != null ? Number(record.certifiedGross) : liveGrossClaimed;
    const certifiedRetention = record.certifiedRetention != null ? Number(record.certifiedRetention) : liveRetention;
    const certifiedAdvance = record.certifiedAdvanceRecovery != null ? Number(record.certifiedAdvanceRecovery) : advanceRecovery;
    const certifiedNet = record.certifiedNetPayable != null ? Number(record.certifiedNetPayable) : liveNetPayable;

    const totalPaid = record.totalPaid || 0;
    const certifiedAmount = record.certifiedNetPayable ? Number(record.certifiedNetPayable) : certifiedNet;
    const remainingBalance = Math.max(0, certifiedAmount - totalPaid);

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href={`/sites/${siteId}`} className="hover:text-foreground">{td('breadcrumb_sites')}</Link>
          <span>/</span>
          <button onClick={() => { setView('list'); setSelectedId(null); }} className="hover:text-foreground">{td('breadcrumb_ipc')}</button>
          <span>/</span>
          <span className="text-foreground font-medium">IPC-{String(record.ipcNumber).padStart(2, '0')}</span>
          <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${IPC_STATUS_CONFIG[record.status]?.color || ''}`}>
            {IPC_STATUS_CONFIG[record.status]?.label || record.status}
          </span>
          {record.isFinal && (
            <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
              {td('final_badge')}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">IPC-{String(record.ipcNumber).padStart(2, '0')}</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {td('billing')}: {formatDateRange(record.billingStartDate, record.billingEndDate)}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDownloadPdf}>
              <Download className="h-4 w-4 mr-2" />
              {td('download_pdf')}
            </Button>
            {record.status === 'DRAFT' && (
              <>
                <Button variant="outline" onClick={() => handleAggregateFromMb(record.id)}>
                  {td('aggregate_mb')}
                </Button>
                <Button onClick={handleSubmitIpc} disabled={submitMutation.isPending}>
                  <Send className="h-4 w-4 mr-2" />
                  {td('submit_for_cert')}
                </Button>
              </>
            )}
            {record.status === 'SUBMITTED' && (
              <>
                <Button className="bg-green-600 hover:bg-green-700" onClick={handleCertifyIpc} disabled={certifyMutation.isPending}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {td('certify_approve')}
                </Button>
                <Button variant="destructive" onClick={() => setShowRejectConfirm(true)}>
                  <XCircle className="h-4 w-4 mr-2" />
                  {td('reject')}
                </Button>
              </>
            )}
            {record.status === 'CERTIFIED' && (
              <>
                <Button onClick={() => setShowPaymentForm(true)}>
                  <DollarSign className="h-4 w-4 mr-2" />
                  {td('record_payment')}
                </Button>
                <Button variant="outline" onClick={() => setShowPaidConfirm(true)} disabled={paidMutation.isPending}>
                  {td('mark_paid_full')}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Line Items Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left py-2 px-2 font-medium">{td('col_item')}</th>
                    <th className="text-left py-2 px-2 font-medium">{td('col_description')}</th>
                    <th className="text-left py-2 px-2 font-medium">{td('col_unit')}</th>
                    <th className="text-right py-2 px-2 font-medium">{td('col_rate')}</th>
                    <th className="text-right py-2 px-2 font-medium">{td('col_boq_qty')}</th>
                    <th className="text-right py-2 px-2 font-medium">{td('col_prev_qty')}</th>
                    <th className="text-right py-2 px-2 font-medium">{td('col_prev_amt')}</th>
                    <th className="text-right py-2 px-2 font-medium bg-blue-50">
                      {record.status === 'SUBMITTED' ? td('col_cert_qty') : td('col_current_qty')}
                    </th>
                    <th className="text-right py-2 px-2 font-medium">{td('col_current_pct')}</th>
                    <th className="text-right py-2 px-2 font-medium">{td('col_current_amt')}</th>
                    <th className="text-right py-2 px-2 font-medium">{td('col_cum_qty')}</th>
                    <th className="text-right py-2 px-2 font-medium">{td('col_cum_amt')}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedLineItems.map((li: any) => {
                    const boqQty = Number(li.boqQuantity);
                    const rate = Number(li.boqUnitRate);
                    const prevQty = Number(li.previousQuantity);
                    const currentQty = lineItemEdits[li.boqItemId] ?? Number(li.currentQuantity);
                    const currentPct = boqQty > 0 ? (currentQty / boqQty) * 100 : 0;
                    const currentAmt = Math.round(currentQty * rate * 100) / 100;
                    const cumQty = prevQty + currentQty;
                    const cumAmt = Math.round(cumQty * rate * 100) / 100;

                    return (
                      <tr key={li.id} className="border-b hover:bg-muted/30">
                        <td className="py-2 px-2 font-mono">{li.boqItem?.itemCode}</td>
                        <td className="py-2 px-2">{li.boqItem?.description}</td>
                        <td className="py-2 px-2">{UNIT_LABELS[li.boqItem?.unit as BoqUnit] || li.boqItem?.unit}</td>
                        <td className="py-2 px-2 text-right">{formatCurrency(rate, currencyCode)}</td>
                        <td className="py-2 px-2 text-right">{Number(boqQty).toLocaleString()}</td>
                        <td className="py-2 px-2 text-right">{Number(prevQty).toLocaleString()}</td>
                        <td className="py-2 px-2 text-right">{formatCurrency(Number(li.previousAmount), currencyCode)}</td>
                        <td className="py-2 px-2 text-right bg-blue-50/50">
                          {record.status === 'SUBMITTED' ? (
                            <Input
                              type="number" step="0.01" min="0" className="w-24 h-7 text-right text-xs"
                              value={certifyEdits[li.boqItemId] ?? currentQty}
                              onChange={(e) => setCertifyEdits({
                                ...certifyEdits, [li.boqItemId]: parseFloat(e.target.value) || 0,
                              })}
                            />
                          ) : record.status === 'DRAFT' ? (
                            <Input
                              type="number" step="0.01" min="0" className="w-24 h-7 text-right text-xs"
                              value={lineItemEdits[li.boqItemId] ?? currentQty}
                              onChange={(e) => setLineItemEdits({
                                ...lineItemEdits, [li.boqItemId]: parseFloat(e.target.value) || 0,
                              })}
                            />
                          ) : (
                            <span>{Number(li.certifiedQuantity ?? li.currentQuantity).toLocaleString()}</span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-right">{currentPct.toFixed(1)}%</td>
                        <td className="py-2 px-2 text-right">{formatCurrency(currentAmt, currencyCode)}</td>
                        <td className="py-2 px-2 text-right">{Number(cumQty).toLocaleString()}</td>
                        <td className="py-2 px-2 text-right font-medium">{formatCurrency(cumAmt, currencyCode)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Financial Summary */}
        <Card>
          <CardHeader><CardTitle className="text-lg">{td('financial_summary')}</CardTitle></CardHeader>
          <CardContent>
            <div className="max-w-md ml-auto space-y-2">
              <div className="flex justify-between text-sm">
                <span>{td('gross_claimed')}</span>
                <span className="font-medium">{formatCurrency(liveGrossClaimed, currencyCode)}</span>
              </div>
              <div className="flex justify-between text-sm text-red-600">
                <span>{td('less_retention', { percent: retentionPct })}</span>
                <span>-{formatCurrency(liveRetention, currencyCode)}</span>
              </div>
              <div className="flex justify-between text-sm text-red-600">
                <span>{td('less_advance')}</span>
                <span>-{formatCurrency(advanceRecovery, currencyCode)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold">
                <span>{td('net_payable')}</span>
                <span className="text-green-600">{formatCurrency(liveNetPayable, currencyCode)}</span>
              </div>

              {record.status === 'CERTIFIED' && (
                <div className="border-t pt-2 mt-2">
                  <p className="text-xs text-muted-foreground mb-2 font-medium">{td('certified_figures')}</p>
                  <div className="flex justify-between text-sm">
                    <span>{td('certified_gross')}</span>
                    <span className="font-medium">{formatCurrency(certifiedGross, currencyCode)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-red-600">
                    <span>{td('less_retention', { percent: retentionPct })}</span>
                    <span>-{formatCurrency(certifiedRetention, currencyCode)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-red-600">
                    <span>{td('less_advance')}</span>
                    <span>-{formatCurrency(certifiedAdvance, currencyCode)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-bold">
                    <span>{td('certified_net')}</span>
                    <span className="text-green-600">{formatCurrency(certifiedNet, currencyCode)}</span>
                  </div>
                </div>
              )}

              {record.status === 'PAID' && totalPaid > 0 && (
                <div className="border-t pt-2 mt-2">
                  <p className="text-xs text-muted-foreground mb-2 font-medium">{td('payment_history')}</p>
                  <div className="flex justify-between text-sm font-medium text-purple-600">
                    <span>{td('total_paid')}</span>
                    <span>{formatCurrency(totalPaid, currencyCode)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{td('payment_count')}</span>
                    <span>{record.paymentRecords?.length || 0}</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payment Records */}
        {record.paymentRecords && record.paymentRecords.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-lg">{td('payment_records')}</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2 font-medium text-muted-foreground">{td('pay_date')}</th>
                      <th className="text-right py-2 px-2 font-medium text-muted-foreground">{td('pay_amount')}</th>
                      <th className="text-left py-2 px-2 font-medium text-muted-foreground">{td('pay_method')}</th>
                      <th className="text-left py-2 px-2 font-medium text-muted-foreground">{td('pay_reference')}</th>
                      <th className="text-left py-2 px-2 font-medium text-muted-foreground">{td('pay_recorded_by')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {record.paymentRecords.map((pr: any) => (
                      <tr key={pr.id} className="border-b hover:bg-muted/30">
                        <td className="py-2 px-2">{formatDate(pr.paymentDate)}</td>
                        <td className="py-2 px-2 text-right font-medium">{formatCurrency(Number(pr.amount), currencyCode)}</td>
                        <td className="py-2 px-2 text-muted-foreground">{pr.paymentMethod || '—'}</td>
                        <td className="py-2 px-2 font-mono text-xs">{pr.referenceNumber || '—'}</td>
                        <td className="py-2 px-2 text-muted-foreground text-xs">{pr.recordedBy?.fullName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Rejection info */}
        {record.rejectionReason && (
          <Card className="border-red-200">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-red-600">{td('rejection_reason')}</p>
              <p className="text-sm text-muted-foreground mt-1">{record.rejectionReason}</p>
              {record.rejectedBy && (
                <p className="text-xs text-muted-foreground mt-1">
                  {td('rejected_by')}: {record.rejectedBy.fullName} — {formatDate(record.rejectedAt)}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Payment Form Dialog */}
        {showPaymentForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md">
              <CardHeader><CardTitle className="text-lg">{td('record_payment')}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">{td('remaining_balance')}</p>
                  <p className="text-lg font-bold">{formatCurrency(remainingBalance, currencyCode)}</p>
                </div>
                <div>
                  <Label>{td('pay_amount')}</Label>
                  <Input type="number" step="0.01" min="0.01" max={remainingBalance}
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    className="mt-1" />
                </div>
                <div>
                  <Label>{td('pay_date')}</Label>
                  <Input type="date" value={paymentForm.paymentDate}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                    className="mt-1" />
                </div>
                <div>
                  <Label>{td('pay_method')}</Label>
                  <Input value={paymentForm.paymentMethod} placeholder={td('pay_method_placeholder')}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                    className="mt-1" />
                </div>
                <div>
                  <Label>{td('pay_reference')}</Label>
                  <Input value={paymentForm.referenceNumber} placeholder={td('pay_reference_placeholder')}
                    onChange={(e) => setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })}
                    className="mt-1" />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowPaymentForm(false)}>{td('cancel')}</Button>
                  <Button onClick={handleRecordPayment} disabled={paymentMutation.isPending}>
                    {paymentMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    {td('confirm_payment')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Paid Confirm Dialog */}
        {showPaidConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md">
              <CardHeader><CardTitle className="text-lg">{td('confirm_paid_title')}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{td('confirm_paid_text')}</p>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowPaidConfirm(false)}>{td('cancel')}</Button>
                  <Button onClick={() => paidMutation.mutate(record.id)} disabled={paidMutation.isPending}>
                    {paidMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    {td('confirm_paid_button')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Reject Confirm Dialog */}
        <ConfirmationDialog
          open={showRejectConfirm}
          onOpenChange={setShowRejectConfirm}
          title={td('reject_confirm_title')}
          description={td('reject_confirm_text')}
          confirmLabel={td('reject')}
          cancelLabel={td('cancel')}
          variant="destructive"
          loading={rejectMutation.isPending}
          onConfirm={() => rejectMutation.mutate({ id: record.id, reason: rejectReason })}
        >
          <div>
            <Label htmlFor="rejectReason">{td('rejection_reason')}</Label>
            <textarea
              id="rejectReason"
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] resize-y"
              placeholder={td('rejection_reason_placeholder')}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
        </ConfirmationDialog>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href={`/sites/${siteId}`} className="hover:text-foreground">{td('breadcrumb_sites')}</Link>
        <span>/</span>
        <span className="text-foreground font-medium">{td('title')}</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{td('title')}</h1>
          <p className="text-muted-foreground text-sm mt-1">{td('subtitle')}</p>
        </div>
        <Button onClick={() => setView('create')}>
          <Plus className="h-4 w-4 mr-2" />
          {td('create_new')}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">{td('stat_total')}</p>
          <p className="text-2xl font-bold">{stats?.totalIpcs || 0}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">{td('stat_draft')}</p>
          <p className="text-2xl font-bold">{stats?.draftCount || 0}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">{td('stat_submitted')}</p>
          <p className="text-2xl font-bold">{stats?.submittedCount || 0}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">{td('stat_certified')}</p>
          <p className="text-2xl font-bold">{stats?.certifiedCount || 0}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">{td('stat_rejected')}</p>
          <p className="text-2xl font-bold">{stats?.rejectedCount || 0}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">{td('stat_value')}</p>
          <p className="text-2xl font-bold">{formatCurrency(Number(stats?.totalCertifiedValue || 0), currencyCode)}</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardContent>
          {recordsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>
          ) : records.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>{td('no_records')}</p>
              <p className="text-sm mt-1">{td('no_records_hint')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">{td('col_ipc_number')}</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">{td('col_billing_period')}</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">{td('col_status')}</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">{td('col_gross')}</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">{td('col_net')}</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">{td('col_created_by')}</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((rec: any) => (
                    <tr key={rec.id} className="border-b hover:bg-muted/50 cursor-pointer" onClick={() => {
                      setSelectedId(rec.id);
                      setView('detail');
                      setLineItemEdits({});
                      setCertifyEdits({});
                    }}>
                      <td className="py-3 px-2 font-mono font-medium">
                        IPC-{String(rec.ipcNumber).padStart(2, '0')}
                        {rec.isFinal && <span className="ml-1 text-xs text-purple-600">{td('final_badge')}</span>}
                      </td>
                      <td className="py-3 px-2 text-xs">{formatDateRange(rec.billingStartDate, rec.billingEndDate)}</td>
                      <td className="py-3 px-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${IPC_STATUS_CONFIG[rec.status]?.color || ''}`}>
                          {IPC_STATUS_CONFIG[rec.status]?.label || rec.status}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right">{formatCurrency(Number(rec.grossClaimed), currencyCode)}</td>
                      <td className="py-3 px-2 text-right font-medium">{formatCurrency(Number(rec.netPayable), currencyCode)}</td>
                      <td className="py-3 px-2 text-muted-foreground text-xs">{rec.createdBy?.fullName}</td>
                      <td className="py-3 px-2"><Eye className="h-4 w-4 text-muted-foreground" /></td>
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
