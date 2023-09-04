"use client"

import { Container, Tab, Tabs as MuiTabs, Stack, Typography } from "@mui/material"
import Link from "next/link"
import { usePathname } from "next/navigation"

interface Tab {
  label: string
  href: string
}

export function Tabs({ tabs, title }: { tabs: Tab[]; title?: string }) {
  const path = usePathname()
  const tab = path.split("/").pop()

  return (
    <Container
      maxWidth={false}
      sx={{
        borderBottom: 1,
        borderColor: "divider",
        paddingLeft: `0.75em !important`,
        backgroundColor: "background.default",
        height: "50.5px !important",
      }}
    >
      <Stack direction="row" spacing={2} alignItems="center">
        {title && (
          <Typography variant="h5" textTransform="uppercase">
            {title}
          </Typography>
        )}
        <MuiTabs value={tab}>
          {tabs.map((tab, index) => (
            <Tab key={index} LinkComponent={Link} href={tab.href} label={tab.label} value={tab.href.split("/").pop()} />
          ))}
        </MuiTabs>
      </Stack>
    </Container>
  )
}
