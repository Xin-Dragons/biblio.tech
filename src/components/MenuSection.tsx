import { ExpandMore } from "@mui/icons-material"
import { Stack, Typography, Accordion, AccordionSummary, AccordionDetails } from "@mui/material"
import { ReactNode } from "react"

export function MenuSection({
  accordion,
  children,
  title,
  open,
}: {
  accordion?: boolean
  children: ReactNode
  title: string
  open?: boolean
}) {
  if (!accordion) {
    return (
      <Stack spacing={2}>
        <Typography variant="h6" fontWeight="bold" textTransform="uppercase">
          {title}
        </Typography>
        {children}
      </Stack>
    )
  }

  return (
    <Accordion
      defaultExpanded={open}
      sx={{
        backgroundColor: "transparent",
        backgroundImage: "none !important",
        padding: "0 !important",
        borderBottom: 1,
        borderColor: "divider",
        borderTop: 0,
        "&:before": {
          backgroundColor: "transparent",
        },
      }}
      disableGutters
      elevation={0}
    >
      <AccordionSummary expandIcon={<ExpandMore />} sx={{ border: 0 }}>
        <Typography variant="h6" fontWeight="bold" textTransform="uppercase" sx={{ fontSize: "16px" }}>
          {title}
        </Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ border: 0 }}>
        <Stack spacing={2}>{children}</Stack>
      </AccordionDetails>
    </Accordion>
  )
}
