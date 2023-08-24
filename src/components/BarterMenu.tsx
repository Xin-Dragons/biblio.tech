import { Button } from "@mui/material"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { toast } from "react-hot-toast"

export function BarterMenu() {
  const path = usePathname()
  const isWallet = path.replace("/", "").split("/").shift() === "barter"
  return (
    <Button
      LinkComponent={Link}
      sx={{ color: isWallet ? "primary.main" : "white" }}
      onClick={() => toast("Coming soon...")}
    >
      Barter
    </Button>
  )
}
