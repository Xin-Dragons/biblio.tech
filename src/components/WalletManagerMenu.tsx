import { Button } from "@mui/material"
import Link from "next/link"
import { usePathname } from "next/navigation"

export function WalletManagerMenu() {
  const path = usePathname()
  const isWallet = path.replace("/", "").split("/").shift() === "bags"
  return (
    <Button LinkComponent={Link} href="/bags" sx={{ color: isWallet ? "primary.main" : "white" }}>
      Bags
    </Button>
  )
}
