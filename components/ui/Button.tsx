import { cn } from "@/lib/utils";
import Spinner from "./Spinner";

export type ButtonVariant =
  | "primary"
  | "navy"
  | "secondary"
  | "ghost"
  | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-orange font-bold text-white shadow-sm hover:bg-orange/90",
  navy: "bg-navy font-semibold text-white hover:bg-navy/90",
  secondary:
    "border border-navy/20 bg-surface font-semibold text-navy/80 hover:border-orange hover:text-orange",
  ghost: "font-semibold text-navy hover:bg-navy/5",
  danger: "bg-red-600 font-bold text-white hover:bg-red-700",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

/** Class string for the button look — reuse on `<Link>` for link-buttons. */
export function buttonClasses(opts: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
} = {}): string {
  const { variant = "primary", size = "md", fullWidth, className } = opts;
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-input transition-[color,background-color,border-color,box-shadow,transform] duration-150 focus-ring active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
    VARIANTS[variant],
    SIZES[size],
    fullWidth && "w-full",
    className,
  );
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
}

export default function Button({
  variant,
  size,
  fullWidth,
  loading,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={buttonClasses({ variant, size, fullWidth, className })}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Spinner size={16} />}
      {children}
    </button>
  );
}
