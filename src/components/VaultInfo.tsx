"use client"
import { Info } from "@mui/icons-material"
import { Stack, Typography, IconButton, Dialog, Card, CardContent, Container, SvgIcon } from "@mui/material"
import { useState } from "react"
import Snowflakes from "@/../public/snowflakes.svg"

export function VaultInfo() {
  const [showVaultInfo, setShowVaultInfo] = useState(false)

  function toggleVaultInfo() {
    setShowVaultInfo(!showVaultInfo)
  }

  return (
    <Stack direction="row" alignItems="center" sx={{ width: "100%" }} justifyContent="center">
      <Typography variant="h5" fontWeight="bold" textAlign="center">
        THE VAULT
      </Typography>
      <IconButton onClick={toggleVaultInfo}>
        <Info />
      </IconButton>
      <Dialog open={showVaultInfo} onClose={toggleVaultInfo} fullWidth maxWidth="md">
        <Card>
          <CardContent>
            <Container maxWidth="sm">
              <Stack spacing={4} mb={4}>
                <Stack>
                  <Stack direction="row" width="100%" justifyContent="center" mt={4}>
                    <Typography
                      color="primary"
                      variant="h4"
                      fontWeight="normal"
                      textTransform="uppercase"
                      textAlign="center"
                    >
                      What is The Vault
                    </Typography>
                    <SvgIcon sx={{ marginLeft: -1 }}>
                      <Snowflakes />
                    </SvgIcon>
                  </Stack>
                  <Typography color="primary" textAlign="center">
                    And how does it work?
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={4}>
                  <Stack spacing={2} width="50%">
                    <Typography color="primary" textTransform="uppercase">
                      The Vault is a unique self-custodial locking system for NFTs, pNFTs and NFT editions.
                    </Typography>
                    <Typography variant="body2" textAlign="justify">
                      Adding items to The Vault helps protect them from wallet drains when interacting with malicious
                      dApps. Items in The Vault are frozen so if you accidentally sign a transaction to transfer these
                      assets, it will fail.
                    </Typography>
                    <Typography variant="body2" textAlign="justify">
                      The Vault works in the same way as locked staking or borrowing from Sharky or Frakt, however the
                      authority is delegated to a second wallet of your choosing so you dont need to trust any third
                      party program.
                    </Typography>
                  </Stack>
                  <Stack spacing={2} width="50%">
                    <Typography variant="body2" textAlign="justify">
                      As it is very unlikely for two of your wallets to both become compromised, this method is one of
                      the safest existing to date.
                    </Typography>
                    <Typography color="primary" textTransform="uppercase">
                      This system is unique and one of the safest ways to protect your NFTs
                    </Typography>
                    <Typography variant="body2" textAlign="justify">
                      You can use any of your linked wallets. We recommend freezing with a wallet that doesn&apos;t
                      contain the NFTs to amplify the security of your assets.
                    </Typography>
                    <Typography variant="body2" textAlign="justify">
                      THE VAULT IS 100% TRUSTLESS - you simply transfer authority between wallets you own. No
                      third-parties involved. We dont hold any authority or keys.
                    </Typography>
                  </Stack>
                </Stack>
              </Stack>
            </Container>
          </CardContent>
        </Card>
      </Dialog>
    </Stack>
  )
}
