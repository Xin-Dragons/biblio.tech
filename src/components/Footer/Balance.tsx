"use client"
import { Typography } from "@mui/material"
import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import { LAMPORTS_PER_SOL } from "@solana/web3.js"
import { useState, useRef, useEffect } from "react"

export function Balance() {
  const wallet = useWallet()
  const { connection } = useConnection()
  const [balance, setBalance] = useState(0)

  async function getBalance() {
    try {
      const bal = await connection.getBalance(wallet.publicKey!)
      setBalance(bal)
    } catch {
      setBalance(0)
    }
  }

  const interval = useRef<any>()

  useEffect(() => {
    clearInterval(interval.current)
    if (wallet.publicKey) {
      getBalance()
      interval.current = setInterval(getBalance, 1000)
    } else {
      setBalance(0)
      clearInterval(interval.current)
    }
    return () => {
      clearInterval(interval.current)
    }
  }, [wallet.publicKey])

  if (!wallet.connected) {
    return null
  }

  return (
    <Typography variant="body2" fontWeight="bold">
      ◎{(balance / LAMPORTS_PER_SOL).toLocaleString(undefined, { maximumFractionDigits: 2 })}
    </Typography>
  )
}
