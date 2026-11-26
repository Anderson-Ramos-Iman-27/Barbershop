
import type {
  ButtonHTMLAttributes,
  ReactNode,
} from "react";

type ButtonVariant = "primary" | "secondary" | "dark";

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
}

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-orange text-charcoal hover:brightness-95",
  secondary:
    "border border-brown bg-cream text-charcoal hover:bg-cream-deep",
  dark:
    "bg-brown text-white hover:bg-charcoal",
};

export default function Button({
  variant = "primary",
  children,
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`
        inline-flex min-h-11 items-center justify-center
        rounded-full px-6 py-3
        font-sans text-sm font-semibold
        transition-colors duration-200
        focus-visible:outline-2
        focus-visible:outline-offset-2
        focus-visible:outline-brown
        disabled:cursor-not-allowed
        disabled:opacity-50
        ${variants[variant]}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
}
