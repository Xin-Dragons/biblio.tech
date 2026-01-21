import { useAtomValue, useSetAtom } from "jotai"
import { useEffect, useRef } from "react"
import { errorAtom } from "@/stores/nfts"
import { addToastAtom } from "@/stores/toast"

export function ErrorWatcher() {
  const error = useAtomValue(errorAtom)
  const addToast = useSetAtom(addToastAtom)
  const prevError = useRef<string | null>(null)

  useEffect(() => {
    if (error && error !== prevError.current) {
      addToast({ message: error, type: "error" })
    }
    prevError.current = error
  }, [error, addToast])

  return null
}
