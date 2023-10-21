"use client"

import { Link, Stack } from "@mui/material"
import { PropsWithChildren } from "react"
import ExitToAppIcon from "@mui/icons-material/ExitToApp"

export function RefreshLink({ children }: PropsWithChildren) {
  function onLinkClick(e: any) {
    e.preventDefault()
    window.location.reload()
  }
  return (
    <Link onClick={onLinkClick} href="#" underline="hover">
      <Stack direction="row" alignItems="center" spacing={1}>
        <ExitToAppIcon fontSize="large" />
        {children}
      </Stack>
    </Link>
  )
}
