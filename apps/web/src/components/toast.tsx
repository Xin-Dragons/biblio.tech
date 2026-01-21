import { useAtomValue, useSetAtom } from "jotai"
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react"
import { toastsAtom, removeToastAtom, type ToastType } from "@/stores/toast"
import { cn } from "@/lib/utils"

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="h-5 w-5 text-green-500" />,
  error: <AlertCircle className="h-5 w-5 text-red-500" />,
  warning: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
  info: <Info className="h-5 w-5 text-blue-500" />,
}

const styles: Record<ToastType, string> = {
  success: "border-green-500/30 bg-green-500/10",
  error: "border-red-500/30 bg-red-500/10",
  warning: "border-yellow-500/30 bg-yellow-500/10",
  info: "border-blue-500/30 bg-blue-500/10",
}

export function ToastContainer() {
  const toasts = useAtomValue(toastsAtom)
  const removeToast = useSetAtom(removeToastAtom)

  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "pointer-events-auto flex w-80 items-start gap-3 rounded-lg border p-4 shadow-lg backdrop-blur-sm",
            styles[toast.type]
          )}
        >
          <div className="shrink-0">{icons[toast.type]}</div>
          <p className="flex-1 text-sm">{toast.message}</p>
          <button
            onClick={() => removeToast(toast.id)}
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
