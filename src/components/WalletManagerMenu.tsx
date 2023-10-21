import { Button } from "@mui/material"
import Link from "next/link"
import { usePathname } from "next/navigation"

export function WalletManagerMenu() {
  const path = usePathname()
  const isWallet = path.replace("/", "").split("/").pop() === "wallet"
  return (
    <Button LinkComponent={Link} href="/wallet" sx={{ color: isWallet ? "primary.main" : "white" }}>
      Wallet
    </Button>
  )
}
