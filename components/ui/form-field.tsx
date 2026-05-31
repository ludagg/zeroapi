"use client";

import { forwardRef, useId } from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

type FormFieldProps = Omit<ComponentPropsWithoutRef<"input">, "id"> & {
  label: ReactNode;
  /** Optional element rendered to the right of the label (e.g. "Oublié ?"). */
  labelAction?: ReactNode;
  /** Leading icon inside the input. */
  icon?: ReactNode;
  /** Trailing control inside the input (e.g. show-password toggle). */
  trailing?: ReactNode;
  error?: string;
  hint?: ReactNode;
  id?: string;
};

/**
 * Accessible form field: label + optional icon + input + error.
 * Automatically wires `aria-describedby` / `aria-invalid` and renders the
 * error in a `role="alert"` region. Use with react-hook-form's `register`:
 *   <FormField label="Email" error={errors.email?.message} {...register("email")} />
 */
export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(function FormField(
  { label, labelAction, icon, trailing, error, hint, id, className, ...inputProps },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? `field-${autoId}`;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div>
      <div className={cn("mb-2 flex items-center", labelAction ? "justify-between" : undefined)}>
        <label htmlFor={inputId} className="block text-[13px] font-medium text-ink-2">
          {label}
        </label>
        {labelAction}
      </div>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted [&_svg]:h-4 [&_svg]:w-4">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn("input-base", icon && "pl-10", trailing && "pr-11", className)}
          {...inputProps}
        />
        {trailing && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2">{trailing}</span>
        )}
      </div>
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-[12px] text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-[12px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
});
