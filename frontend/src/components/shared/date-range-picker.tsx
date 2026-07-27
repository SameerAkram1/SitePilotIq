'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle } from 'lucide-react';

interface DateRangePickerProps {
  startDateLabel?: string;
  endDateLabel?: string;
  startDate?: string;
  endDate?: string;
  ongoing?: boolean;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string | undefined) => void;
  onOngoingChange?: (value: boolean) => void;
  startError?: string;
  endError?: string;
  disablePastStart?: boolean;
  ongoingLabel?: string;
  ongoingHint?: string;
}

export function DateRangePicker({
  startDateLabel = 'Start Date',
  endDateLabel = 'End Date',
  startDate,
  endDate,
  ongoing = false,
  onStartDateChange,
  onEndDateChange,
  onOngoingChange,
  startError,
  endError,
  disablePastStart = true,
  ongoingLabel = 'Ongoing (no end date)',
  ongoingHint = 'Ongoing — will be ended manually',
}: DateRangePickerProps) {
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-sm font-semibold text-foreground">
          {startDateLabel} <span className="text-red-500">*</span>
        </Label>
        <Input
          type="date"
          value={startDate || ''}
          onChange={(e) => onStartDateChange(e.target.value)}
          min={disablePastStart ? today : undefined}
          className={`h-11 bg-muted rounded-xl ${startError ? 'border-red-400' : ''}`}
        />
        {startError && (
          <p className="text-sm text-red-500 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {startError}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold text-foreground">
            {endDateLabel} <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          {onOngoingChange && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="ongoing-assignment"
                checked={ongoing}
                onCheckedChange={(checked) => onOngoingChange(!!checked)}
              />
              <label
                htmlFor="ongoing-assignment"
                className="text-xs text-muted-foreground cursor-pointer"
              >
                {ongoingLabel}
              </label>
            </div>
          )}
        </div>
        {!ongoing && (
          <Input
            type="date"
            value={endDate || ''}
            onChange={(e) => onEndDateChange(e.target.value || undefined)}
            min={startDate || today}
            className={`h-11 bg-muted rounded-xl ${endError ? 'border-red-400' : ''}`}
          />
        )}
        {ongoing && (
          <div className="h-11 bg-muted rounded-xl flex items-center px-3 text-sm text-muted-foreground border border-dashed border-border">
            {ongoingHint}
          </div>
        )}
        {endError && (
          <p className="text-sm text-red-500 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {endError}
          </p>
        )}
      </div>
    </div>
  );
}
