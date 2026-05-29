'use client';

import React, { useState, useRef, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import { da } from 'date-fns/locale';
import { format, parse, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

export interface DatePickerProps {
  label?: string;
  value?: string; // ISO date string (YYYY-MM-DD)
  onChange?: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  className?: string;
}

export function DatePicker({ label, value, onChange, placeholder = 'Vælg dato', required, error, className }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selectedDate = value ? parse(value, 'yyyy-MM-dd', new Date()) : undefined;
  const displayValue = selectedDate && isValid(selectedDate)
    ? format(selectedDate, 'd. MMMM yyyy', { locale: da })
    : '';

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(date: Date | undefined) {
    if (date) {
      onChange?.(format(date, 'yyyy-MM-dd'));
    }
    setOpen(false);
  }

  return (
    <div className={cn('space-y-2', className)} ref={ref}>
      {label && (
        <label className="text-sm font-medium leading-none">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={cn(
            'flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors',
            'hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
            !displayValue && 'text-muted-foreground',
            error && 'border-destructive focus-visible:ring-destructive',
          )}
        >
          <span className={cn(!displayValue && 'text-muted-foreground')}>
            {displayValue || placeholder}
          </span>
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
        </button>

        {open && (
          <div className="absolute top-full left-0 z-50 mt-1 rounded-lg border bg-popover p-3 shadow-lg animate-in fade-in-0 zoom-in-95 slide-in-from-top-2">
            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={handleSelect}
              locale={da}
              showOutsideDays
              className="text-sm"
              classNames={{
                months: 'flex flex-col',
                month: 'space-y-3',
                month_caption: 'flex items-center justify-center relative h-7',
                caption_label: 'text-sm font-medium capitalize',
                nav: 'flex items-center gap-1 absolute inset-x-0 justify-between',
                button_previous: 'inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors',
                button_next: 'inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors',
                month_grid: 'w-full border-collapse',
                weekdays: 'flex',
                weekday: 'w-9 text-[0.8rem] font-medium text-muted-foreground text-center',
                week: 'flex mt-1',
                day: 'p-0 text-center',
                day_button: cn(
                  'inline-flex h-9 w-9 items-center justify-center rounded-md text-sm transition-colors',
                  'hover:bg-accent hover:text-accent-foreground',
                  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                  'aria-selected:opacity-100'
                ),
                selected: 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground rounded-md',
                today: 'bg-accent text-accent-foreground font-semibold',
                outside: 'text-muted-foreground/50',
                disabled: 'text-muted-foreground opacity-50 pointer-events-none',
              }}
              components={{
                Chevron: ({ orientation }) =>
                  orientation === 'left'
                    ? React.createElement(ChevronLeft, { className: 'h-4 w-4' })
                    : React.createElement(ChevronRight, { className: 'h-4 w-4' }),
              }}
            />
          </div>
        )}
      </div>
      {error && <p className="text-[0.8rem] font-medium text-destructive">{error}</p>}
    </div>
  );
}
