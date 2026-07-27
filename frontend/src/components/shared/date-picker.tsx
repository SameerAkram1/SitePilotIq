'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle } from 'lucide-react';

interface DatePickerProps {
  label: string;
  value?: string;
  onChange: (value: string | undefined) => void;
  error?: string;
  optional?: boolean;
  disableFuture?: boolean;
  disablePast?: boolean;
  noDeadlineOption?: boolean;
  noDeadlineLabel?: string;
}

export function DatePicker({
  label,
  value,
  onChange,
  error,
  optional = false,
  disableFuture = false,
  disablePast = false,
  noDeadlineOption = false,
  noDeadlineLabel = 'No deadline',
}: DatePickerProps) {
  const [noDeadline, setNoDeadline] = useState(!value && noDeadlineOption);

  const handleNoDeadlineChange = (checked: boolean) => {
    setNoDeadline(checked);
    if (checked) {
      onChange(undefined);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold text-foreground">
          {label}
          {optional && <span className="text-muted-foreground font-normal ml-1">(optional)</span>}
        </Label>
        {noDeadlineOption && (
          <div className="flex items-center gap-2">
            <Checkbox
              id={`${label}-no-deadline`}
              checked={noDeadline}
              onCheckedChange={handleNoDeadlineChange}
            />
            <label
              htmlFor={`${label}-no-deadline`}
              className="text-xs text-muted-foreground cursor-pointer"
            >
              {noDeadlineLabel}
            </label>
          </div>
        )}
      </div>

      {!noDeadline && (
        <Input
          type="date"
          value={value || ''}
          onChange={(e) => onChange(e.target.value || undefined)}
          min={disablePast ? today : undefined}
          max={disableFuture ? today : undefined}
          className={`h-11 bg-muted rounded-xl ${error ? 'border-red-400 focus:border-red-500' : 'border-border focus:bg-background focus:border-blue-400'}`}
        />
      )}

      {error && (
        <p className="text-sm text-red-500 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
}
