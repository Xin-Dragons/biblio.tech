"use client"
import { Sidebar } from "@/components/Sidebar"
import { HashlistProvider } from "@/context/hashlist"
import { Box, Button, Stack, Typography } from "@mui/material"
import Link from "next/link"
import { ReactNode } from "react"
import { routes } from "./routes"
import { MenuSection } from "@/components/MenuSection"
import { usePathname } from "next/navigation"

export default function Layout({ children }: { children: ReactNode }) {
  const path = usePathname()
  return (
    <HashlistProvider>
      <Stack direction="row" height="100%">
        <Sidebar>
          <Stack>
            {Object.keys(routes).map((key) => {
              const settings = routes[key as keyof typeof routes]
              return (
                <MenuSection
                  title={settings.title}
                  accordion
                  open={!!settings.routes.find((route) => route.href === path)}
                >
                  {settings.routes.map((route: any) => {
                    return (
                      <Button
                        LinkComponent={Link}
                        href={route.href}
                        variant={route.href === path ? "contained" : "outlined"}
                      >
                        {route.label}
                      </Button>
                    )
                  })}
                </MenuSection>
              )
            })}
          </Stack>
        </Sidebar>
        <Box
          sx={{
            width: "100%",
            minHeight: "100%",
            overflowY: "auto",
            flexGrow: 1,
            backgroundImage: "url(/tapestry-dark.svg)",
            backgroundSize: "100px",
          }}
        >
          <main>{children}</main>
        </Box>
      </Stack>
    </HashlistProvider>
  )
}
