'use client';

import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { Check, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MultiSelectProps {
  value?: string[];
  onValueChange?: (value: string[]) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  label?: string;
}

export function MultiSelect({
  value = [],
  onValueChange,
  options,
  placeholder = 'Vælg...',
  disabled,
  className,
  label,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const toggle = (optionValue: string) => {
    const next = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue];
    onValueChange?.(next);
  };

  const remove = (optionValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange?.(value.filter((v) => v !== optionValue));
  };

  const selectedLabels = value
    .map((v) => options.find((o) => o.value === v))
    .filter(Boolean);

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label className="text-sm font-medium leading-none">{label}</label>
      )}
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        <PopoverPrimitive.Trigger asChild disabled={disabled}>
          <button
            type="button"
            className={cn(
              'flex min-h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm',
              'focus:outline-none focus:ring-1 focus:ring-ring',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            <div className="flex flex-wrap gap-1">
              {selectedLabels.length === 0 && (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
              {selectedLabels.map((opt) => (
                <span
                  key={opt!.value}
                  className="inline-flex items-center gap-1 rounded-sm bg-secondary px-1.5 py-0.5 text-xs font-medium"
                >
                  {opt!.label}
                  <X
                    className="h-3 w-3 cursor-pointer opacity-50 hover:opacity-100"
                    onClick={(e) => remove(opt!.value, e)}
                  />
                </span>
              ))}
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </button>
        </PopoverPrimitive.Trigger>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            className={cn(
              'z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
              'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            )}
            align="start"
            sideOffset={4}
          >
            {options.map((opt) => {
              const selected = value.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggle(opt.value)}
                  className={cn(
                    'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none',
                    'hover:bg-accent hover:text-accent-foreground',
                    'focus:bg-accent focus:text-accent-foreground',
                  )}
                >
                  <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                    {selected && <Check className="h-4 w-4" />}
                  </span>
                  {opt.label}
                </button>
              );
            })}
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    </div>
  );
}
