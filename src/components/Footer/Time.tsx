"use client"
import { Typography } from "@mui/material"
import { format } from "date-fns"
import { useEffect, useState } from "react"

export function Time() {
  const [time, setTime] = useState("")

  function updateTime() {
    const now = new Date()
    const utc = new Date(now.getTime() + now.getTimezoneOffset() * 60000)

    setTime(format(utc, "HH:mm:ss"))
  }

  useEffect(() => {
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => {
      clearInterval(interval)
    }
  }, [])
  return (
    <Typography variant="body2" fontWeight="bold">
      UTC: {time}
    </Typography>
  )
}
