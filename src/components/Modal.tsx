import { Box, Card, CardContent, Container, Dialog, Stack, Typography } from "@mui/material"
import { PropsWithChildren } from "react"

export function Modal({
  open,
  setOpen,
  title,
  children,
}: PropsWithChildren<{ open: boolean; setOpen: Function; title: string }>) {
  return (
    <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
      <Card>
        <CardContent>
          <Container maxWidth="sm">
            <Stack spacing={4}>
              <Typography variant="h4" textTransform="uppercase" textAlign="center" color="primary">
                {title}
              </Typography>
              <Box>{children}</Box>
            </Stack>
          </Container>
        </CardContent>
      </Card>
    </Dialog>
  )
}
