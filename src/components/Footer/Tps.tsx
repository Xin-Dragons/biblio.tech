"use client"
import { Typography } from "@mui/material"
import { useConnection } from "@solana/wallet-adapter-react"
import { useState, useEffect } from "react"

export const TPS = () => {
  const [tps, setTps] = useState(1000)
  const { connection } = useConnection()

  async function getTps() {
    try {
      const [results] = await connection.getRecentPerformanceSamples(1)
      setTps(results.numTransactions / results.samplePeriodSecs)
    } catch {}
  }

  useEffect(() => {
    getTps()
    const interval = setInterval(getTps, 5000)
    return () => {
      clearInterval(interval)
    }
  }, [])

  return (
    <Typography variant="body2" fontWeight="bold">
      TPS: {tps.toLocaleString(undefined, { maximumFractionDigits: 0 })}
    </Typography>
  )
}
