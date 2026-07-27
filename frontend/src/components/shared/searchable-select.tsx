'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, ChevronDown, X, AlertCircle } from 'lucide-react';

interface Option {
  id: string;
  label: string;
  sublabel?: string;
  avatar?: string;
}

interface SearchableSelectProps {
  label?: string;
  options: Option[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  loading?: boolean;
  required?: boolean;
  optional?: boolean;
  disabled?: boolean;
  onCreateNew?: (search: string) => void;
  createNewLabel?: string;
}

export function SearchableSelect({
  label,
  options,
  value,
  onChange,
  placeholder = 'Search...',
  error,
  loading = false,
  required = false,
  optional = false,
  disabled = false,
  onCreateNew,
  createNewLabel = 'Create new',
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((opt) => opt.id === value);

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase()),
  );

  const showCreateNew =
    onCreateNew &&
    search.length > 0 &&
    !options.some((opt) => opt.label.toLowerCase() === search.toLowerCase());

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = useCallback(
    (id: string) => {
      onChange(id);
      setIsOpen(false);
      setSearch('');
    },
    [onChange],
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange('');
      setSearch('');
    },
    [onChange],
  );

  return (
    <div className="space-y-1.5" ref={containerRef}>
      {label && (
        <Label className="text-sm font-semibold text-foreground">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
          {optional && <span className="text-muted-foreground font-normal ml-1">(optional)</span>}
        </Label>
      )}

      <div className="relative">
        <div
          className={`flex items-center h-11 bg-muted rounded-xl border cursor-pointer ${
            error ? 'border-red-400' : isOpen ? 'border-blue-400 ring-2 ring-blue-400/20' : 'border-border'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={() => {
            if (!disabled) {
              setIsOpen(!isOpen);
              setTimeout(() => inputRef.current?.focus(), 0);
            }
          }}
        >
          {selectedOption ? (
            <div className="flex-1 px-3 flex items-center gap-2">
              {selectedOption.avatar && (
                <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                  {selectedOption.label.charAt(0)}
                </div>
              )}
              <span className="text-sm font-medium truncate">{selectedOption.label}</span>
              {selectedOption.sublabel && (
                <span className="text-xs text-muted-foreground">({selectedOption.sublabel})</span>
              )}
            </div>
          ) : (
            <div className="flex-1 px-3">
              <span className="text-sm text-muted-foreground">{placeholder}</span>
            </div>
          )}

          <div className="pr-3 flex items-center gap-1">
            {selectedOption && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="h-4 w-4 rounded-full bg-muted-foreground/20 flex items-center justify-center hover:bg-muted-foreground/40"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            )}
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
            />
          </div>
        </div>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-card rounded-xl border border-border shadow-lg max-h-64 overflow-auto">
            <div className="p-2 border-b border-border">
              <Input
                ref={inputRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="h-9 text-sm"
                autoFocus
              />
            </div>

            <div className="p-1">
              {loading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
              ) : filteredOptions.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">No options found</div>
              ) : (
                filteredOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors"
                    onClick={() => handleSelect(option.id)}
                  >
                    {option.avatar ? (
                      <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                        {option.label.charAt(0)}
                      </div>
                    ) : (
                      <div className="h-6 w-6 rounded-lg bg-muted flex items-center justify-center">
                        <span className="text-xs font-medium text-muted-foreground">
                          {option.label.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 text-left">
                      <span className="font-medium">{option.label}</span>
                      {option.sublabel && (
                        <span className="text-muted-foreground ml-1">({option.sublabel})</span>
                      )}
                    </div>
                    {value === option.id && <Check className="h-4 w-4 text-blue-600" />}
                  </button>
                ))
              )}

              {showCreateNew && (
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-blue-50 text-blue-600 transition-colors border-t border-border mt-1"
                  onClick={() => {
                    onCreateNew(search);
                    setIsOpen(false);
                    setSearch('');
                  }}
                >
                  <span className="text-lg">+</span>
                  {createNewLabel}: "{search}"
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-500 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
}
