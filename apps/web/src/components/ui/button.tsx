import { forwardRef, type ButtonHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "ghost" | "destructive" | "outline" | "gradient" | "success"
  size?: "default" | "sm" | "lg" | "icon" | "icon-sm"
  glow?: boolean
}

const buttonVariants = {
  default: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md active:scale-[0.98]",
  secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 active:scale-[0.98]",
  ghost: "hover:bg-accent hover:text-accent-foreground active:bg-accent/80",
  destructive:
    "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 hover:shadow-md active:scale-[0.98]",
  outline:
    "border border-border bg-transparent hover:bg-accent hover:text-accent-foreground hover:border-border-hover active:bg-accent/80",
  gradient:
    "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-md hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98]",
  success: "bg-success text-white shadow-sm hover:bg-success/90 hover:shadow-md active:scale-[0.98]",
}

const buttonSizes = {
  default: "h-10 px-4 py-2 text-sm",
  sm: "h-8 px-3 text-xs",
  lg: "h-12 px-6 text-base",
  icon: "h-10 w-10",
  "icon-sm": "h-8 w-8",
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", glow = false, ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium",
          "ring-offset-background transition-all duration-200 ease-out-expo",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          buttonVariants[variant],
          buttonSizes[size],
          glow && variant === "default" && "shadow-glow hover:shadow-glow-lg",
          glow && variant === "gradient" && "shadow-glow hover:shadow-glow-lg",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)

Button.displayName = "Button"
