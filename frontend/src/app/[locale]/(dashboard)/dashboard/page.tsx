'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { useTranslations } from 'next-intl';
import {
  getDashboardStats,
  getFinancialOverview,
  getRevenueTrend,
  getIpcPipeline,
  getExpensesByType,
  getProjectStatus,
  getRecentActivity,
  getUpcomingEvents,
} from '@/hooks/api';
import {
  FolderKanban,
  MapPin,
  Users,
  ArrowRight,
  Plus,
  TrendingUp,
  Clock,
  Building2,
  Calendar,
  Zap,
  CalendarCheck,
  UserCheck,
  UserX,
  ShieldAlert,
  Loader2,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Receipt,
  FileText,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#94a3b8',
  ACTIVE: '#3b82f6',
  ON_HOLD: '#f59e0b',
  COMPLETED: '#10b981',
  CANCELLED: '#ef4444',
};

function formatCurrency(val: number) {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
  return val.toFixed(0);
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'good_morning';
  if (h < 17) return 'good_afternoon';
  return 'good_evening';
}

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');
  const { user } = useAuth();
  const firstName = user?.fullName?.split(' ')[0] || 'there';

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: getDashboardStats,
    staleTime: 60_000,
  });

  const { data: financial, isLoading: finLoading } = useQuery({
    queryKey: ['dashboardFinancial'],
    queryFn: getFinancialOverview,
    staleTime: 60_000,
  });

  const { data: revenueTrend } = useQuery({
    queryKey: ['dashboardRevenueTrend'],
    queryFn: getRevenueTrend,
    staleTime: 120_000,
  });

  const { data: ipcPipeline, isLoading: ipcLoading } = useQuery({
    queryKey: ['dashboardIpcPipeline'],
    queryFn: getIpcPipeline,
    staleTime: 120_000,
  });

  const { data: expensesByType, isLoading: expensesLoading } = useQuery({
    queryKey: ['dashboardExpensesByType'],
    queryFn: getExpensesByType,
    staleTime: 120_000,
  });

  const { data: projectStatus } = useQuery({
    queryKey: ['dashboardProjectStatus'],
    queryFn: getProjectStatus,
    staleTime: 120_000,
  });

  const { data: activities } = useQuery({
    queryKey: ['dashboardRecentActivity'],
    queryFn: getRecentActivity,
    staleTime: 60_000,
  });

  const { data: upcoming } = useQuery({
    queryKey: ['dashboardUpcomingEvents'],
    queryFn: getUpcomingEvents,
    staleTime: 60_000,
  });

  const greetingKey = getGreeting();
  const attendance = stats?.attendance;

  const statCards = [
    {
      title: t('financial.total_invoiced'),
      value: financial ? formatCurrency(financial.totalInvoiced) : '—',
      icon: DollarSign,
      bg: 'bg-emerald-100 dark:bg-emerald-900/50',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      title: t('financial.outstanding'),
      value: financial ? formatCurrency(financial.outstanding) : '—',
      icon: AlertCircle,
      bg: 'bg-amber-100 dark:bg-amber-900/50',
      iconColor: 'text-amber-600 dark:text-amber-400',
    },
    {
      title: t('stats.active_projects'),
      value: stats?.activeProjects ?? '—',
      icon: FolderKanban,
      bg: 'bg-blue-100 dark:bg-blue-900/50',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      title: t('stats.team_members'),
      value: stats?.teamMembers ?? '—',
      icon: Users,
      bg: 'bg-violet-100 dark:bg-violet-900/50',
      iconColor: 'text-violet-600 dark:text-violet-400',
    },
  ];

  const expensePieData = expensesByType?.map((e: { type: string; total: number }) => ({
    name: t(`charts.${e.type.toLowerCase()}` as any, { defaultValue: e.type }),
    value: e.total,
  })) || [];

  const projectBarData = projectStatus?.map((p: { status: string; count: number }) => ({
    name: p.status,
    count: p.count,
    fill: STATUS_COLORS[p.status] || '#94a3b8',
  })) || [];

  const isLoading = statsLoading || finLoading;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 p-6 sm:p-8 text-white">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-indigo-500/20 rounded-full blur-2xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="h-5 w-5 text-blue-200" />
            <span className="text-blue-200 text-sm font-medium">{t('welcome_back')}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-heading)] tracking-tight">
            {t(greetingKey, { firstName })}
          </h2>
          <p className="text-blue-100/80 mt-2 max-w-lg">
            {t('welcome_message')}
          </p>
          <div className="flex flex-wrap gap-3 mt-5">
            <Link href="/projects">
              <Button className="bg-white text-blue-700 hover:bg-blue-50 font-semibold rounded-xl shadow-lg shadow-blue-900/20">
                {t('view_projects')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/calendar">
              <Button className="bg-white/15 text-white hover:bg-white/25 font-semibold rounded-xl border border-white/20 backdrop-blur-sm">
                <Calendar className="mr-2 h-4 w-4" />
                {t('upcoming.view_calendar')}
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="relative overflow-hidden hover:shadow-lg transition-all duration-200 border-border/50">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-3xl font-bold tracking-tight font-[family-name:var(--font-heading)]">
                    {isLoading ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : stat.value}
                  </p>
                </div>
                <div className={`h-12 w-12 rounded-2xl ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row 1: Revenue Trend + IPC Pipeline */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold font-[family-name:var(--font-heading)] flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              {t('charts.revenue_trend')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {revenueTrend && revenueTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={revenueTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatCurrency(v)} />
                  <Tooltip
                    formatter={(value: any) => [`$${Number(value).toLocaleString()}`, '']}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} name={t('charts.revenue')} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} name={t('charts.expenses')} dot={{ r: 3 }} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                {tc('loading')}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold font-[family-name:var(--font-heading)] flex items-center gap-2">
              <Receipt className="h-4 w-4 text-emerald-600" />
              {t('charts.ipc_pipeline')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ipcLoading ? (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                {tc('loading')}
              </div>
            ) : ipcPipeline && ipcPipeline.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={ipcPipeline.map((i: any) => ({ name: i.status, value: i.count }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  >
                    {ipcPipeline.map((_: any, idx: number) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[280px] text-muted-foreground text-sm">
                <Receipt className="h-8 w-8 mb-2 opacity-40" />
                <p>No IPC records yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2: Expenses by Type + Project Status + Attendance */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold font-[family-name:var(--font-heading)] flex items-center gap-2">
              <Receipt className="h-4 w-4 text-amber-600" />
              {t('charts.expenses_by_type')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expensesLoading ? (
              <div className="flex items-center justify-center h-[240px] text-muted-foreground text-sm">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                {tc('loading')}
              </div>
            ) : expensePieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={expensePieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  >
                    {expensePieData.map((_: any, idx: number) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => [`$${Number(value).toLocaleString()}`, '']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[240px] text-muted-foreground text-sm">
                <Receipt className="h-8 w-8 mb-2 opacity-40" />
                <p>No expenses recorded yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold font-[family-name:var(--font-heading)] flex items-center gap-2">
              <FolderKanban className="h-4 w-4 text-violet-600" />
              {t('charts.project_status')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {projectBarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={projectBarData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {projectBarData.map((entry: any, idx: number) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[240px] text-muted-foreground text-sm">
                {tc('loading')}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attendance Widget */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold font-[family-name:var(--font-heading)] flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-blue-600" />
              {t('attendance_widget.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              </div>
            ) : !attendance || attendance.total === 0 ? (
              <div className="text-center py-8">
                <CalendarCheck className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">{t('attendance_widget.no_records')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-100 dark:border-green-900/50">
                  <UserCheck className="h-5 w-5 text-green-600 mx-auto mb-1" />
                  <p className="text-xl font-bold text-green-700 dark:text-green-400">{attendance.checkedIn}</p>
                  <p className="text-xs text-green-600 dark:text-green-500 font-medium">{t('attendance_widget.checked_in')}</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-gray-950/30 border border-gray-100 dark:border-gray-900/50">
                  <UserX className="h-5 w-5 text-gray-500 mx-auto mb-1" />
                  <p className="text-xl font-bold text-gray-700 dark:text-gray-400">{attendance.checkedOut}</p>
                  <p className="text-xs text-gray-500 font-medium">{t('attendance_widget.checked_out')}</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50">
                  <ShieldAlert className="h-5 w-5 text-red-500 mx-auto mb-1" />
                  <p className="text-xl font-bold text-red-600 dark:text-red-400">{attendance.offSite}</p>
                  <p className="text-xs text-red-500 font-medium">{t('attendance_widget.off_site')}</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50">
                  <CalendarCheck className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                  <p className="text-xl font-bold text-blue-700 dark:text-blue-400">{attendance.total}</p>
                  <p className="text-xs text-blue-600 dark:text-blue-500 font-medium">{t('attendance_widget.total')}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Recent Activity + Upcoming Events */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* Recent Activity */}
        <Card className="lg:col-span-3 border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold font-[family-name:var(--font-heading)] flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                {t('activity.title')}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-1 max-h-[360px] overflow-y-auto">
            {!activities || activities.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">{t('activity.no_activity')}</p>
              </div>
            ) : (
              activities.slice(0, 15).map((a: any) => {
                const timeAgo = getTimeAgo(a.createdAt);
                return (
                  <div key={a.id} className="flex items-start gap-3 py-2.5 border-b border-border/50 last:border-0">
                    <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <FileText className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        <span className="text-muted-foreground">{a.module}</span>{' '}
                        {a.action}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {a.user?.fullName} &middot; {timeAgo}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card className="lg:col-span-2 border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold font-[family-name:var(--font-heading)] flex items-center gap-2">
                <Calendar className="h-4 w-4 text-amber-600" />
                {t('upcoming.title')}
              </CardTitle>
              <Link href="/calendar">
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                  {t('upcoming.view_calendar')}
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-1 max-h-[360px] overflow-y-auto">
            {!upcoming || upcoming.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">{t('upcoming.no_events')}</p>
              </div>
            ) : (
              upcoming.map((evt: any) => {
                const daysUntil = Math.ceil(
                  (new Date(evt.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
                );
                const colorMap: Record<string, string> = {
                  orange: 'bg-orange-100 border-orange-200 dark:bg-orange-950/30 dark:border-orange-900/50',
                  green: 'bg-green-100 border-green-200 dark:bg-green-950/30 dark:border-green-900/50',
                  blue: 'bg-blue-100 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900/50',
                  purple: 'bg-purple-100 border-purple-200 dark:bg-purple-950/30 dark:border-purple-900/50',
                };
                return (
                  <Link key={evt.id} href={evt.link}>
                    <div className={`p-3 rounded-xl border cursor-pointer hover:shadow-sm transition-all ${colorMap[evt.color] || 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{evt.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{evt.meta}</p>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                          daysUntil < 0
                            ? 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400'
                            : daysUntil === 0
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400'
                        }`}>
                          {daysUntil < 0
                            ? t('upcoming.overdue')
                            : daysUntil === 0
                              ? t('upcoming.today')
                              : daysUntil === 1
                                ? t('upcoming.tomorrow')
                                : t('upcoming.in_days', { days: daysUntil })}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function getTimeAgo(dateStr: string) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}
