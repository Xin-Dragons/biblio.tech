"use client"
import { Dispatch, PropsWithChildren, SetStateAction, createContext, useContext, useEffect, useState } from "react"

const Context = createContext<
  { progress: number | null; setProgress: Dispatch<SetStateAction<number | null>> } | undefined
>(undefined)

export function ProgressProvider({ children }: PropsWithChildren) {
  const [progress, setProgress] = useState<number | null>(null)

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>
    if (progress && progress >= 100) {
      timeout = setTimeout(() => setProgress(null), 1_000)
    }
    return () => {
      clearTimeout(timeout)
    }
  }, [progress])

  return <Context.Provider value={{ progress, setProgress }}>{children}</Context.Provider>
}

export const useProgress = () => {
  const context = useContext(Context)

  if (context === undefined) {
    throw new Error("useProgress must be used in a ProgressProvider")
  }

  return context
}
