import { cn } from "@/lib/utils";

const baseField =
  "min-w-0 w-full rounded-input border border-navy/15 bg-surface px-3 text-sm text-navy outline-none transition placeholder:text-navy/40 focus:border-orange focus:ring-2 focus:ring-orange/20 disabled:opacity-60";

export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  children,
  className,
}: {
  label?: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="text-sm font-semibold text-navy"
        >
          {label}
          {required && <span className="ml-0.5 text-orange">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs font-medium text-red-600" aria-live="polite">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-navy/50">{hint}</p>
      )}
    </div>
  );
}

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(baseField, "h-11", className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea className={cn(baseField, "min-h-24 py-2.5", className)} {...props} />
  );
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(baseField, "h-11 pr-8", className)} {...props}>
      {children}
    </select>
  );
}
