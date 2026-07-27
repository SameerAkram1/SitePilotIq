'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { getCalendarEvents } from '@/hooks/api';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Loader2,
} from 'lucide-react';

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

const EVENT_COLORS: Record<string, string> = {
  orange: 'bg-orange-500',
  green: 'bg-green-500',
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
};

const EVENT_BADGE_COLORS: Record<string, string> = {
  orange: 'bg-orange-100 text-orange-700 border-orange-200',
  green: 'bg-green-100 text-green-700 border-green-200',
  blue: 'bg-blue-100 text-blue-700 border-blue-200',
  purple: 'bg-purple-100 text-purple-700 border-purple-200',
};

interface CalendarEvent {
  id: string;
  type: string;
  title: string;
  date: string;
  status: string;
  color: string;
  link: string;
  meta?: string;
  priority?: string;
}

export default function CalendarPage() {
  const t = useTranslations('calendar');
  const td = useTranslations('dashboard.upcoming');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [view, setView] = useState<'month' | 'week'>('month');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const startDate = useMemo(() => {
    const d = new Date(year, month, 1);
    return d.toISOString().split('T')[0];
  }, [year, month]);

  const endDate = useMemo(() => {
    const d = new Date(year, month + 1, 0);
    return d.toISOString().split('T')[0];
  }, [year, month]);

  const { data: events, isLoading } = useQuery({
    queryKey: ['calendarEvents', startDate, endDate],
    queryFn: () => getCalendarEvents({ startDate, endDate }),
    staleTime: 60_000,
  });

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const evt of events || []) {
      const dateKey = new Date(evt.date).toISOString().split('T')[0];
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(evt);
    }
    return map;
  }, [events]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: { date: Date; isCurrentMonth: boolean; isToday: boolean }[] = [];

    const prevMonth = new Date(year, month, 0);
    const daysInPrevMonth = prevMonth.getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, daysInPrevMonth - i);
      days.push({ date: d, isCurrentMonth: false, isToday: false });
    }

    const today = new Date();
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      const isToday =
        d.getFullYear() === today.getFullYear() &&
        d.getMonth() === today.getMonth() &&
        d.getDate() === today.getDate();
      days.push({ date: d, isCurrentMonth: true, isToday });
    }

    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({ date: d, isCurrentMonth: false, isToday: false });
    }

    return days;
  }, [year, month]);

  const weekDays = useMemo(() => {
    if (!selectedDate) return [];
    const startOfWeek = new Date(selectedDate);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  }, [selectedDate]);

  const goToPrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDate(null);
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDate(null);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const dateKey = (d: Date) => d.toISOString().split('T')[0];

  const getDaysUntil = (dateStr: string) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  const selectedDateEvents = selectedDate
    ? eventsByDate[dateKey(selectedDate)] || []
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-[family-name:var(--font-heading)] flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 text-blue-600" />
            {t('title')}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={view === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('month')}
          >
            {t('month_view')}
          </Button>
          <Button
            variant={view === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setView('week'); if (!selectedDate) setSelectedDate(new Date()); }}
          >
            {t('week_view')}
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-3">
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={goToPrevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <CardTitle className="text-lg font-semibold font-[family-name:var(--font-heading)]">
                  {t(MONTHS[month])} {year}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={goToNextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex justify-center mt-2">
                <Button variant="outline" size="sm" onClick={goToToday}>
                  {t('today')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {view === 'month' ? (
                <div className="grid grid-cols-7 gap-px bg-border/30 rounded-lg overflow-hidden">
                  {DAYS.map((day) => (
                    <div
                      key={day}
                      className="bg-muted/50 p-2 text-center text-xs font-medium text-muted-foreground"
                    >
                      {t(`days.${day}`)}
                    </div>
                  ))}
                  {calendarDays.map((day, idx) => {
                    const key = dateKey(day.date);
                    const dayEvents = eventsByDate[key] || [];
                    const isSelected =
                      selectedDate && dateKey(selectedDate) === key;
                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedDate(day.date)}
                        className={`bg-card min-h-[80px] sm:min-h-[100px] p-1.5 cursor-pointer hover:bg-muted/50 transition-colors ${
                          !day.isCurrentMonth ? 'opacity-40' : ''
                        } ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950/30' : ''} ${
                          day.isToday ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                              day.isToday
                                ? 'bg-blue-600 text-white'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {day.date.getDate()}
                          </span>
                          {dayEvents.length > 0 && (
                            <span className="text-[10px] text-muted-foreground">
                              {dayEvents.length}
                            </span>
                          )}
                        </div>
                        <div className="space-y-0.5">
                          {dayEvents.slice(0, 3).map((evt) => (
                            <div
                              key={evt.id}
                              className={`h-1.5 rounded-full ${EVENT_COLORS[evt.color] || 'bg-gray-400'}`}
                              title={evt.title}
                            />
                          ))}
                          {dayEvents.length > 3 && (
                            <p className="text-[10px] text-muted-foreground">
                              +{dayEvents.length - 3} more
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Week View */
                <div className="space-y-2">
                  <div className="grid grid-cols-7 gap-2">
                    {weekDays.map((day) => {
                      const key = dateKey(day);
                      const dayEvents = eventsByDate[key] || [];
                      const isToday =
                        day.toDateString() === new Date().toDateString();
                      const isSelected =
                        selectedDate && dateKey(selectedDate) === key;
                      return (
                        <div
                          key={key}
                          onClick={() => setSelectedDate(day)}
                          className={`p-3 rounded-xl text-center cursor-pointer hover:bg-muted/50 transition-colors ${
                            isSelected
                              ? 'bg-blue-50 dark:bg-blue-950/30 ring-2 ring-blue-500'
                              : ''
                          } ${isToday ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}`}
                        >
                          <p className="text-xs text-muted-foreground">
                            {t(`days.${DAYS[day.getDay()]}`)}
                          </p>
                          <p
                            className={`text-lg font-bold ${
                              isToday
                                ? 'bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center mx-auto'
                                : ''
                            }`}
                          >
                            {day.getDate()}
                          </p>
                          <div className="flex justify-center gap-0.5 mt-1">
                            {dayEvents.slice(0, 4).map((evt) => (
                              <div
                                key={evt.id}
                                className={`w-1.5 h-1.5 rounded-full ${EVENT_COLORS[evt.color] || 'bg-gray-400'}`}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Event Details Sidebar */}
        <div className="lg:col-span-1">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold font-[family-name:var(--font-heading)]">
                {selectedDate
                  ? new Date(selectedDate).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                    })
                  : t('today')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                </div>
              ) : selectedDateEvents.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarIcon className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">{t('no_events')}</p>
                </div>
              ) : (
                selectedDateEvents.map((evt) => {
                  const daysUntil = getDaysUntil(evt.date);
                  return (
                    <Link key={evt.id} href={evt.link}>
                      <div className={`p-3 rounded-xl border cursor-pointer hover:shadow-sm transition-all ${EVENT_BADGE_COLORS[evt.color] || 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{evt.title}</p>
                            {evt.meta && (
                              <p className="text-xs text-muted-foreground mt-0.5">{evt.meta}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                {t(`event_types.${evt.type}`, { defaultValue: evt.type })}
                              </Badge>
                              {evt.priority && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                  {evt.priority}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                            daysUntil < 0
                              ? 'bg-red-100 text-red-700'
                              : daysUntil === 0
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-blue-100 text-blue-700'
                          }`}>
                            {daysUntil < 0
                              ? td('overdue')
                              : daysUntil === 0
                                ? td('today')
                                : daysUntil === 1
                                  ? td('tomorrow')
                                  : td('in_days', { days: daysUntil })}
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Legend */}
          <Card className="border-border/50 mt-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Legend</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { color: 'orange', label: t('event_types.project') },
                { color: 'green', label: t('event_types.milestone') },
                { color: 'blue', label: t('event_types.reminder') },
                { color: 'purple', label: t('event_types.dpr') },
              ].map((item) => (
                <div key={item.color} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${EVENT_COLORS[item.color]}`} />
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
