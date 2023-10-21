"use client"

import { useEffect, useState } from "react"
import dayjs from "@/helpers/dayjs"

export function Counter({ from }: { from: number }) {
  const [time, setTime] = useState(dayjs(from).fromNow())

  useEffect(() => {
    const interval = setInterval(() => setTime(dayjs(from).fromNow()), 1000)
    return () => {
      clearInterval(interval)
    }
  }, [from])

  return time
}
