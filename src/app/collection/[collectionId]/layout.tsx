import { ReactNode } from "react"
import { isAddress } from "viem"

export default function Layout({
  params,
  eth,
  solana,
}: {
  params: Record<string, string>
  eth: ReactNode
  solana: ReactNode
}) {
  if (isAddress(params.collectionId)) {
    return eth
  }
  return solana
}
