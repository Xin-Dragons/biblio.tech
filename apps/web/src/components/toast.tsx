import { useAtomValue, useSetAtom } from "jotai"
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react"
import { toastsAtom, removeToastAtom, type ToastType } from "@/stores/toast"
import { cn } from "@/lib/utils"

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="h-5 w-5" />,
  error: <AlertCircle className="h-5 w-5" />,
  warning: <AlertTriangle className="h-5 w-5" />,
  info: <Info className="h-5 w-5" />,
}

const styles: Record<ToastType, { container: string; icon: string }> = {
  success: {
    container: "border-emerald-500/30 bg-emerald-500/10",
    icon: "text-emerald-400",
  },
  error: {
    container: "border-red-500/30 bg-red-500/10",
    icon: "text-red-400",
  },
  warning: {
    container: "border-amber-500/30 bg-amber-500/10",
    icon: "text-amber-400",
  },
  info: {
    container: "border-blue-500/30 bg-blue-500/10",
    icon: "text-blue-400",
  },
}

export function ToastContainer() {
  const toasts = useAtomValue(toastsAtom)
  const removeToast = useSetAtom(removeToastAtom)

  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          className={cn(
            "pointer-events-auto flex w-80 items-start gap-3 rounded-xl border p-4",
            "shadow-lg backdrop-blur-xl",
            "animate-slide-in-right",
            styles[toast.type].container
          )}
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <div className={cn("shrink-0 mt-0.5", styles[toast.type].icon)}>{icons[toast.type]}</div>
          <p className="flex-1 text-sm leading-relaxed">{toast.message}</p>
          <button
            onClick={() => removeToast(toast.id)}
            className="shrink-0 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
