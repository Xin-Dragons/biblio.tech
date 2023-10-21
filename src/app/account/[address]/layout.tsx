import { umi } from "@/app/helpers/umi"
import { PROGRAMS } from "@/components/RuleSets/constants"
import { publicKey } from "@metaplex-foundation/umi"
import { Box, Container, Stack, Typography } from "@mui/material"
import { Tabs } from "./Tabs"
import { PropsWithChildren } from "react"
import { CopyAddress } from "@/components/CopyAddress"
import { Header } from "./components/Header"
import { getAccount } from "./helpers/get-account"
import { BpfLoader } from "@solana/web3.js"
import { shorten } from "@/helpers/utils"

export default async function Layout({ params, children }: PropsWithChildren & { params: Record<string, string> }) {
  const accountDetails = await getAccount(params.address)
  console.log(accountDetails)

  if (!accountDetails) {
    return (
      <Box py={4} sx={{ overflowY: "auto" }} height="100%">
        <Container>
          <Stack>
            <Typography variant="h5" color="primary">
              {params.address}
            </Typography>
            <Typography variant="h2">Account not found</Typography>
          </Stack>
        </Container>
      </Box>
    )
  }

  return (
    <Box py={4} sx={{ overflowY: "auto" }} height="100%">
      <Container>
        <Stack spacing={4}>
          <Stack direction="row" justifyContent="space-between">
            <Stack spacing={4} justifyContent="space-between">
              <Stack>
                <Stack direction="row" spacing={2}>
                  <Typography variant="h4" color="primary">
                    {accountDetails.program} account:
                  </Typography>
                  <CopyAddress link={false} variant="h4">
                    {params.address}
                  </CopyAddress>
                </Stack>
                <Stack direction="row" spacing={2} alignItems="center">
                  {accountDetails.logo && <img src={accountDetails.logo} height={50} />}
                  <Typography variant="h2">{accountDetails.type}</Typography>
                </Stack>
              </Stack>
              <Tabs hasParsed={accountDetails.parsed} />
            </Stack>

            <Header header={accountDetails.data?.header} />
          </Stack>
          {children}
        </Stack>
      </Container>
    </Box>
  )
}
