"use client"

import { Dialog } from "@mui/material"
import { useRouter } from "next/navigation"
import { PropsWithChildren } from "react"

export function Client({ children }: PropsWithChildren) {
  const router = useRouter()
  return (
    <Dialog open onClose={router.back} maxWidth="lg" fullWidth PaperProps={{ sx: { height: "80vh" } }}>
      {children}
    </Dialog>
  )
}
