'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { checkIn, checkOut, getTodayAttendance, getSites } from '@/hooks/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/shared/searchable-select';
import { QrScanner } from '@/components/shared/qr-scanner';
import {
  LogIn,
  LogOut,
  Loader2,
  AlertCircle,
  CheckCircle,
  MapPin,
  Navigation,
  Clock,
  Camera,
  ScanLine,
} from 'lucide-react';

interface GeoLocation {
  latitude: number;
  longitude: number;
}

export default function CheckInPage() {
  const t = useTranslations('attendance.check_in');
  const tc = useTranslations('attendance.check_out');
  const queryClient = useQueryClient();

  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inputMethod, setInputMethod] = useState<'select' | 'qr'>('select');
  const [qrPayload, setQrPayload] = useState<any>(null);

  const { data: sites } = useQuery({
    queryKey: ['sitesList'],
    queryFn: () => getSites({ limit: 100, status: 'ACTIVE' }),
  });

  const { data: todayAttendance } = useQuery({
    queryKey: ['attendance', 'today'],
    queryFn: getTodayAttendance,
  });

  const activeCheckIn = todayAttendance?.find((a: any) => a.status === 'CHECKED_IN');

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (err) => {
          setLocationError(err.message);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
      );
    } else {
      setLocationError('Geolocation is not supported by this browser.');
    }
  }, []);

  const checkInMutation = useMutation({
    mutationFn: checkIn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      setSelectedSiteId('');
      setNotes('');
      setError(null);
    },
    onError: (err: any) => {
      const message = err.response?.data?.message;
      if (typeof message === 'object' && message.message) {
        setError(message.message);
      } else {
        setError(message || t('gps_error'));
      }
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: checkOut,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      setNotes('');
      setError(null);
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || tc('no_active_check_in'));
    },
  });

  const handleCheckIn = () => {
    if (!location) {
      setError(t('gps_error'));
      return;
    }
    setError(null);

    if (qrPayload) {
      // QR-based check-in
      checkInMutation.mutate({
        qrPayload,
        latitude: location.latitude,
        longitude: location.longitude,
        notes: notes || undefined,
      });
    } else if (selectedSiteId) {
      // Dropdown-based check-in
      checkInMutation.mutate({
        siteId: selectedSiteId,
        latitude: location.latitude,
        longitude: location.longitude,
        notes: notes || undefined,
      });
    }
  };

  const handleQrScan = (decodedText: string) => {
    try {
      // Try to parse as base64-encoded QR payload
      const decoded = JSON.parse(atob(decodedText));
      if (decoded.siteId && decoded.tenantId && decoded.token && decoded.sig) {
        setQrPayload(decoded);
        setError(null);
      } else {
        setError(t('invalid_qr'));
      }
    } catch {
      setError(t('invalid_qr'));
    }
  };

  const handleCheckOut = () => {
    if (!location) {
      setError(t('gps_error'));
      return;
    }
    setError(null);
    checkOutMutation.mutate({
      latitude: location.latitude,
      longitude: location.longitude,
      notes: notes || undefined,
    });
  };

  const siteOptions = (sites?.data || []).map((s: any) => ({
    id: s.id,
    label: `${s.code} - ${s.name}`,
  }));

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
          <LogIn className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground font-[family-name:var(--font-heading)]">
            {t('title')}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{t('subtitle')}</p>
        </div>
      </div>

      {/* GPS Status */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            {location ? (
              <>
                <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center">
                  <Navigation className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-green-700">{t('gps_active')}</p>
                  <p className="text-xs text-muted-foreground">
                    {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="h-8 w-8 rounded-lg bg-yellow-100 flex items-center justify-center">
                  <Loader2 className="h-4 w-4 text-yellow-600 animate-spin" />
                </div>
                <div>
                  <p className="text-sm font-medium text-yellow-700">{t('acquiring_gps')}</p>
                  {locationError && (
                    <p className="text-xs text-red-500">{locationError}</p>
                  )}
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
          {error}
        </div>
      )}

      {/* Check-in Form */}
      {!activeCheckIn ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LogIn className="h-4 w-4" />
              {t('title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Input Method Toggle */}
            <div className="flex gap-2">
              <Button
                variant={inputMethod === 'select' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setInputMethod('select'); setQrPayload(null); }}
                className="flex-1 rounded-xl"
              >
                <MapPin className="h-4 w-4 mr-2" />
                {t('select_site')}
              </Button>
              <Button
                variant={inputMethod === 'qr' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setInputMethod('qr'); setSelectedSiteId(''); }}
                className="flex-1 rounded-xl"
              >
                <ScanLine className="h-4 w-4 mr-2" />
                {t('scan_qr')}
              </Button>
            </div>

            {/* QR Scanner */}
            {inputMethod === 'qr' && (
              <div className="space-y-3">
                {qrPayload ? (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
                    <CheckCircle className="h-4 w-4 inline mr-2" />
                    {t('qr_detected')}
                  </div>
                ) : (
                  <QrScanner onScan={handleQrScan} disabled={!location} />
                )}
              </div>
            )}

            {/* Site Dropdown */}
            {inputMethod === 'select' && (
              <div>
                <Label className="text-sm font-semibold text-foreground mb-1.5 block">
                  {t('site_label')} <span className="text-red-500">*</span>
                </Label>
                <SearchableSelect
                  label={t('site_label')}
                  options={siteOptions}
                  value={selectedSiteId}
                  onChange={setSelectedSiteId}
                  placeholder={t('site_placeholder')}
                />
              </div>
            )}

            <div>
              <Label className="text-sm font-semibold text-foreground mb-1.5 block">
                {t('notes_label')}
              </Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('notes_placeholder')}
                rows={3}
                className="bg-muted rounded-xl"
              />
            </div>

            <Button
              onClick={handleCheckIn}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl h-11"
              disabled={checkInMutation.isPending || (!selectedSiteId && !qrPayload) || !location}
            >
              {checkInMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('checking_in')}
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4 mr-2" />
                  {t('check_in_button')}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Check-out Card */
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle className="h-4 w-4 text-green-600" />
              {t('checked_in_at', { site: activeCheckIn.site?.name })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-sm text-green-700">
                <Clock className="h-4 w-4" />
                {t('check_in_time')}: {new Date(activeCheckIn.checkInTime).toLocaleTimeString()}
              </div>
              <div className="flex items-center gap-2 text-sm text-green-700 mt-1">
                <MapPin className="h-4 w-4" />
                {activeCheckIn.checkInLat?.toFixed(6)}, {activeCheckIn.checkInLng?.toFixed(6)}
              </div>
            </div>

            <div>
              <Label className="text-sm font-semibold text-foreground mb-1.5 block">
                {t('notes_label')}
              </Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('notes_placeholder')}
                rows={3}
                className="bg-muted rounded-xl"
              />
            </div>

            <Button
              onClick={handleCheckOut}
              className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white rounded-xl h-11"
              disabled={checkOutMutation.isPending || !location}
            >
              {checkOutMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {tc('checking_out')}
                </>
              ) : (
                <>
                  <LogOut className="h-4 w-4 mr-2" />
                  {tc('check_out_button')}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Today's Summary */}
      {todayAttendance && todayAttendance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('todays_activity')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {todayAttendance.map((record: any) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-xl"
                >
                  <div>
                    <p className="text-sm font-medium">{record.site?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(record.checkInTime).toLocaleTimeString()} -{' '}
                      {record.checkOutTime
                        ? new Date(record.checkOutTime).toLocaleTimeString()
                        : tc('active')}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      record.status === 'CHECKED_IN'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {record.status === 'CHECKED_IN' ? tc('active') : tc('completed')}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
