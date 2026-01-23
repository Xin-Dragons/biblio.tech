import { cn } from "@/lib/utils"

interface BiblioLogoProps {
  className?: string
}

export function BiblioLogo({ className }: BiblioLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="53 18 71 52"
      fill="currentColor"
      className={cn("h-4 transition-colors duration-500", className)}
    >
      <path d="M59.5,18.5c-3.3,0-5.9,0.4-5.9,0.9v48.7c0,0.5,2.7,0.9,5.9,0.9c3.3,0,5.9-0.4,5.9-0.9V19.4C65.5,18.9,62.8,18.5,59.5,18.5z" />
      <path d="M97.9,68.1V23.8c0-0.5-2.2-0.9-4.9-0.9s-5,0.4-5,0.9v44.4c0,0.5,2.2,0.9,4.9,0.9S97.9,68.6,97.9,68.1z" />
      <path d="M76.8,69c3.9,0,7-0.4,7-0.9V31.7c0-0.5-3.1-0.9-7-0.9s-7,0.4-7,0.9v36.4C69.8,68.6,72.9,69,76.8,69z" />
      <path d="M123.4,65.8l-8.5-36.6c-0.1-0.5-3.4-0.1-7.4,0.8s-7.1,2-7,2.5l8.5,36.6c0.1,0.5,3.4,0.1,7.4-0.8S123.5,66.2,123.4,65.8z" />
    </svg>
  )
}
