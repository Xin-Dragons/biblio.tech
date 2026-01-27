import { forwardRef, type TextareaHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, error, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-lg border bg-background px-3 py-2 text-sm",
        "placeholder:text-muted-foreground",
        "transition-all duration-200",
        "focus:outline-none focus:ring-2 focus:ring-ring/50 focus:ring-offset-1 focus:ring-offset-background",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "resize-y",
        error
          ? "border-destructive focus:ring-destructive/50"
          : "border-border hover:border-border-hover focus:border-primary",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})

Textarea.displayName = "Textarea"
