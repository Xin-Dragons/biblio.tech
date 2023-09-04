"use client"
import { routes } from "@/app/workshop/routes"
import { Box, Button, List, ListItemButton, ListSubheader, Menu, MenuItem, Typography } from "@mui/material"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"

export function WorkshopMenu() {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)
  const path = usePathname()

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget)
  }
  const handleClose = () => {
    setAnchorEl(null)
  }

  const toolsActive = path.replace("/", "").split("/").shift() === "tools"

  return (
    <Box>
      <Button
        id="basic-button"
        aria-controls={open ? "basic-menu" : undefined}
        aria-haspopup="true"
        aria-expanded={open ? "true" : undefined}
        onClick={handleClick}
        sx={{ color: toolsActive ? "primary.main" : "white" }}
      >
        Workshop
      </Button>
      <Menu
        id="basic-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          "aria-labelledby": "basic-button",
        }}
        slotProps={{
          paper: {
            sx: { backgroundColor: "background.default" },
          },
        }}
      >
        <List>
          {Object.keys(routes).map((key) => {
            const settings = routes[key]
            return (
              <>
                <ListSubheader>{settings.title}</ListSubheader>
                {settings.routes.map((route) => (
                  <ListItemButton LinkComponent={Link} href={route.href} disabled={route.href === path}>
                    {route.label}
                  </ListItemButton>
                ))}
              </>
            )
          })}
        </List>
      </Menu>
    </Box>
  )
}
