"use client"
import { CircularProgress } from "@mui/material"
import BaseLayout from "../BaseLayout"
import { useWallet } from "@solana/wallet-adapter-react"
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import { ReactNode } from "react"

export default function Layout({ children, sidebar }: { children: ReactNode; sidebar: ReactNode }) {
  const { publicKey, connecting } = useWallet()

  if (connecting) {
    return <CircularProgress />
  }

  if (!publicKey) {
    return <WalletMultiButton />
  }

  return <BaseLayout publicKey={publicKey?.toBase58()} children={children} sidebar={sidebar} />
}
