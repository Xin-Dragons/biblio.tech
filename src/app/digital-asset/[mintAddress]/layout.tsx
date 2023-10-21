import { Check } from "@mui/icons-material"
import { Stack, Typography, Chip, Alert, Link, Container, Box } from "@mui/material"
import NextLink from "next/link"
import { Tabs } from "./Tabs"
import { loadDigitalAsset } from "@/helpers/digital-assets"
import { PropsWithChildren } from "react"
import { getCollection } from "@/app/helpers/supabase"
import { RefreshLink } from "./RefreshLink"

const tokenStandardLabels = ["NFT", "SFT", "SPL", "NFT Edition", "pNFT", "cNFT", "Unknown"]

async function Collection({ collection }: { collection: any }) {
  console.log({ collection })
  return (
    <Stack alignItems="flex-end">
      <Link
        component={NextLink}
        href={`/collection/${collection.slugDisplay || collection.slug}`}
        fontSize="1.5em"
        underline="hover"
      >
        {collection.name}
      </Link>
      {collection.tensorVerified && (
        <Stack direction="row" spacing={1}>
          <Check color="success" />
          <Typography fontWeight="bold" variant="body2" sx={{ color: "success.main" }}>
            VERIFIED
          </Typography>
        </Stack>
      )}
    </Stack>
  )
}

export default async function Layout({
  params,
  children,
  noNavigation,
}: PropsWithChildren & { params: Record<string, string>; noNavigation?: boolean }) {
  const digitalAsset = await loadDigitalAsset(params.mintAddress)

  if (!digitalAsset) {
    return <Alert severity="error">Unable to find details for digital asset. Was this item burned?</Alert>
  }

  return (
    <Box sx={{ overflowY: "auto", height: "100%", py: 4 }}>
      <Container sx={{ height: "100%", width: "100%" }}>
        <Stack height="100%">
          <Stack direction="row" justifyContent="space-between" alignItems="center" width="100%">
            <Stack direction="row" alignItems="center" spacing={2}>
              {noNavigation ? (
                <RefreshLink>
                  <Typography variant="h4">{digitalAsset.name}</Typography>
                </RefreshLink>
              ) : (
                <Typography variant="h4">{digitalAsset.name}</Typography>
              )}

              {digitalAsset.symbol && (
                <Typography variant="h6" fontWeight="bold">
                  ({digitalAsset.symbol})
                </Typography>
              )}
              <Stack spacing={2} direction="row">
                <Chip
                  label={tokenStandardLabels[digitalAsset.tokenStandard!]}
                  color="primary"
                  sx={{ fontWeight: "bold" }}
                />
                <Chip
                  label={digitalAsset.mutable ? "Mutable" : "Immutable"}
                  color={digitalAsset.mutable ? "secondary" : "success"}
                  sx={{ fontWeight: "bold" }}
                />
                {digitalAsset.isMasterEdition && (
                  <Chip
                    label="Master edition"
                    sx={{
                      fontWeight: "bold",
                      backgroundColor: "gold.main",
                      // @ts-ignore
                      // color: darken("gold.main", 0.8),
                      color: "black",
                    }}
                  />
                )}
                {digitalAsset.isEdition && (
                  <Chip
                    label="Edition"
                    color="info"
                    sx={{
                      fontWeight: "bold",
                    }}
                  />
                )}
                {digitalAsset.burned && <Chip label="Burned" color="error" sx={{ fontWeight: "bold" }} />}
              </Stack>
            </Stack>
            {digitalAsset.collection && <Collection collection={digitalAsset.collection} />}
          </Stack>
          {!noNavigation && <Tabs isCompressed={digitalAsset.isCompressed} />}

          {children}
        </Stack>
      </Container>
    </Box>
  )
}
