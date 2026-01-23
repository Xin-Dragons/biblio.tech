interface NiftyBadgeProps {
  className?: string
}

export function NiftyBadge({ className = "" }: NiftyBadgeProps) {
  return (
    <img
      src="/nifty-dark.png"
      alt="Nifty"
      className={`absolute right-1.5 top-1.5 h-[15%] max-h-6 min-h-4 w-auto ${className}`}
    />
  )
}
