import { atom } from "jotai"

export type ToastType = "success" | "error" | "info" | "warning"

export interface Toast {
  id: string
  message: string
  type: ToastType
}

export const toastsAtom = atom<Toast[]>([])

export const addToastAtom = atom(
  null,
  (_get, set, { message, type = "info" }: { message: string; type?: ToastType }) => {
    const id = crypto.randomUUID()
    const toast: Toast = { id, message, type }
    set(toastsAtom, (prev) => [...prev, toast])

    setTimeout(() => {
      set(toastsAtom, (prev) => prev.filter((t) => t.id !== id))
    }, 5000)
  }
)

export const removeToastAtom = atom(null, (_get, set, id: string) => {
  set(toastsAtom, (prev) => prev.filter((t) => t.id !== id))
})
