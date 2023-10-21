import { getMarketplaceSnapshot } from "@/helpers/hyperspace"
import { Box, Container, Typography, Stack, Grid } from "@mui/material"
import { ReactNode } from "react"

export default async function Layout({
  highestValueSales,
  smartMoney,
  socialBuying,
  tensor,
  portfolioValue,
  volumeBought,
  volumeSold,
}: {
  highestValueSales: ReactNode
  smartMoney: ReactNode
  socialBuying: ReactNode
  tensor: ReactNode
  portfolioValue: ReactNode
  volumeBought: ReactNode
  volumeSold: ReactNode
}) {
  const snap = await getMarketplaceSnapshot()

  return (
    <Box py={4} height="100%" overflow="auto">
      <Container>
        <Grid container spacing={4}>
          <Grid item xs={12}>
            {highestValueSales}
          </Grid>
          <Grid item xs={6}>
            {smartMoney}
          </Grid>
          <Grid item xs={6}>
            {socialBuying}
          </Grid>
          <Grid item xs={4}>
            {volumeBought}
          </Grid>
          <Grid item xs={4}>
            {volumeSold}
          </Grid>
          <Grid item xs={4}>
            {portfolioValue}
          </Grid>
          <Grid item xs={12}>
            {tensor}
          </Grid>
        </Grid>
      </Container>
    </Box>
  )
}
