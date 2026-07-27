'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface MaskedFieldProps {
  label: string;
  value?: string | null;
  onChange?: (value: string) => void;
  optional?: boolean;
  placeholder?: string;
}

export function MaskedField({ label, value, onChange, optional = false, placeholder }: MaskedFieldProps) {
  const [isEditing, setIsEditing] = useState(false);

  if (!onChange) {
    return (
      <div className="space-y-1.5">
        <Label className="text-sm font-semibold text-foreground">
          {label}
          {optional && <span className="text-muted-foreground font-normal ml-1">(optional)</span>}
        </Label>
        <div className="h-11 px-3 bg-muted rounded-xl border border-border flex items-center text-sm text-muted-foreground font-mono">
          {value || '—'}
        </div>
      </div>
    );
  }

  if (!isEditing && value && value.startsWith('••••')) {
    return (
      <div className="space-y-1.5">
        <Label className="text-sm font-semibold text-foreground">
          {label}
          {optional && <span className="text-muted-foreground font-normal ml-1">(optional)</span>}
        </Label>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-11 px-3 bg-muted rounded-xl border border-border flex items-center text-sm text-muted-foreground font-mono">
            {value}
          </div>
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium shrink-0"
          >
            Change
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-semibold text-foreground">
        {label}
        {optional && <span className="text-muted-foreground font-normal ml-1">(optional)</span>}
      </Label>
      <Input
        placeholder={placeholder || `Enter ${label.toLowerCase()}`}
        className="h-11 bg-muted rounded-xl font-mono"
        defaultValue={isEditing ? '' : (value && !value.startsWith('••••') ? value : '')}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsEditing(true)}
      />
    </div>
  );
}
