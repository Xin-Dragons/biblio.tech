import * as React from "react"
import * as AccordionPrimitive from "@radix-ui/react-accordion"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

const Accordion = AccordionPrimitive.Root

interface AccordionItemProps extends React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item> {
  showConnector?: boolean
  isComplete?: boolean
}

const AccordionItem = React.forwardRef<React.ElementRef<typeof AccordionPrimitive.Item>, AccordionItemProps>(
  ({ className, showConnector = true, isComplete, ...props }, ref) => (
    <AccordionPrimitive.Item ref={ref} className={cn("relative", className)} {...props}>
      {showConnector && (
        <div
          className={cn(
            "absolute w-px transition-colors duration-300",
            isComplete ? "bg-emerald-500/40" : "bg-muted-foreground/20"
          )}
          style={{
            left: "17px",
            top: "48px",
            bottom: "-30px",
          }}
        />
      )}
      {props.children}
    </AccordionPrimitive.Item>
  )
)
AccordionItem.displayName = "AccordionItem"

interface AccordionTriggerProps extends React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger> {
  step?: number
  isComplete?: boolean
}

const AccordionTrigger = React.forwardRef<React.ElementRef<typeof AccordionPrimitive.Trigger>, AccordionTriggerProps>(
  ({ className, children, step, isComplete, ...props }, ref) => (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        ref={ref}
        className={cn(
          "group flex w-full items-center gap-4 py-3 text-left transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-xl",
          className
        )}
        {...props}
      >
        {/* Step badge with number always visible + completion indicator */}
        <div className="relative z-10 shrink-0">
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold transition-all duration-300",
              isComplete
                ? "bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-500/40"
                : [
                    "bg-muted text-muted-foreground",
                    "group-data-[state=open]:bg-gradient-to-br group-data-[state=open]:from-primary group-data-[state=open]:to-primary/80",
                    "group-data-[state=open]:text-primary-foreground group-data-[state=open]:shadow-lg group-data-[state=open]:shadow-primary/30",
                  ]
            )}
          >
            {step}
          </div>
          {/* Completion checkmark badge */}
          {isComplete && (
            <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-card shadow-sm">
              <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
            </div>
          )}
        </div>

        <span
          className={cn(
            "flex-1 font-display font-semibold text-base transition-colors duration-200",
            isComplete
              ? "text-foreground"
              : "text-muted-foreground group-hover:text-foreground group-data-[state=open]:text-foreground"
          )}
        >
          {children}
        </span>

        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-300",
            "group-data-[state=open]:bg-primary/10 group-data-[state=open]:rotate-180"
          )}
        >
          <svg
            className={cn("h-4 w-4 transition-colors", "text-muted-foreground group-data-[state=open]:text-primary")}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
)
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName

const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
    {...props}
  >
    <div className={cn("pl-[52px] pb-5 pr-1", className)}>{children}</div>
  </AccordionPrimitive.Content>
))
AccordionContent.displayName = AccordionPrimitive.Content.displayName

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
