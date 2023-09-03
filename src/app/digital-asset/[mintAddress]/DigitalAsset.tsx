import { publicKey, unwrapOption } from "@metaplex-foundation/umi"
import { Check } from "@mui/icons-material"
import {
  Stack,
  Typography,
  Chip,
  Box,
  Link,
  Card,
  CardContent,
  TableCell,
  Table,
  TableRow,
  Alert,
  TableBody,
  Tab,
  Tabs,
} from "@mui/material"
import { CopyAddress } from "@/components/CopyAddress"
import { fetchDigitalAsset, fetchJsonMetadata } from "@metaplex-foundation/mpl-token-metadata"
import { umi } from "@/app/helpers/umi"
import { ImageWithFallback } from "@/components/ImageWithFallback"
import { getHmDigitalAsset, getListingForMint, hmClient } from "@/helpers/hello-moon"
import { CollectionMintsRequest, LeaderboardStatsRequest } from "@hellomoon/api"
import NextLink from "next/link"
import axios from "axios"
import { getDigitalAsset } from "@/helpers/digital-assets"
import { Listing } from "@/components/Listing"
import { TensorProvider } from "@/context/tensor"
import { Activity } from "./Activity"

const tokenStandardLabels = ["NFT", "SFT", "SPL", "NFT Edition", "pNFT", "cNFT", "Unknown"]

export async function DigitalAssetView({ mintAddress }: { mintAddress: string }) {
  let digitalAsset = await getDigitalAsset(mintAddress)

  if (!digitalAsset) {
    digitalAsset = await getHmDigitalAsset(mintAddress)
    if (!digitalAsset) {
      return <Alert severity="error">Unable to find details for digital asset. Was this item burned?</Alert>
    }
  }

  const updateAuthority = digitalAsset.authorities.find((auth) => auth.scopes.includes("full"))?.address

  let tokenStandard = 6

  try {
    if (!digitalAsset.compression.compressed) {
      const da = await fetchDigitalAsset(umi, publicKey(digitalAsset.id))
      tokenStandard = unwrapOption(da.metadata.tokenStandard) || 0
    } else {
      tokenStandard = 5
    }
  } catch {}

  console.log(digitalAsset)

  // console.log(da)
  // const collection = unwrapOption(digitalAsset.metadata.collection)

  // const ruleSet = unwrapOptionRecursively(digitalAsset.metadata.programmableConfig)?.ruleSet
  // const rules = ruleSet ? await fetchRuleSet(umi, ruleSet) : null

  const collection = digitalAsset.grouping.find((g) => g.group_key === "collection")?.group_value
  let collectionName: string | undefined = undefined
  const helloMoonCollectionId = (
    await hmClient.send(
      new CollectionMintsRequest({
        nftMint: digitalAsset.id,
      })
    )
  )?.data?.[0]?.helloMoonCollectionId

  if (helloMoonCollectionId) {
    const { data } = await hmClient.send(
      new LeaderboardStatsRequest({
        helloMoonCollectionId,
        granularity: "ONE_DAY",
      })
    )
    collectionName = data[0].collectionName
  }

  const image =
    digitalAsset.content.links.image ||
    (digitalAsset.content.json_uri
      ? (await fetchJsonMetadata(umi, digitalAsset.content.json_uri)).image
      : "/books-lighter.svg")

  const listing = await getListingForMint(mintAddress)

  return (
    <Card sx={{ height: "100%" }}>
      <CardContent sx={{ height: "100%", overflowY: "auto" }}>
        <Stack direction="row" spacing={2} height="100%">
          <Box>
            <ImageWithFallback src={image as string} size={600} />
            {listing && (
              <TensorProvider>
                <Listing
                  listing={listing}
                  royaltiesEnforced={tokenStandard === 4}
                  sellerFeeBasisPoints={digitalAsset.royalty.basis_points}
                />
              </TensorProvider>
            )}
          </Box>

          <Stack spacing={2} alignItems="flex-start" width="100%" height="100%">
            <Stack direction="row" justifyContent="space-between" alignItems="center" width="100%">
              <Stack direction="row" alignItems="center" spacing={2}>
                <Typography variant="h4">{digitalAsset.content.metadata.name}</Typography>
                {digitalAsset.content.metadata.symbol && (
                  <Typography variant="h6" fontWeight="bold">
                    ({digitalAsset.content.metadata.symbol})
                  </Typography>
                )}
              </Stack>
              {helloMoonCollectionId && (
                <Stack alignItems="flex-end">
                  <Link
                    component={NextLink}
                    href={`/collection/${collection || helloMoonCollectionId}`}
                    fontSize="1.5em"
                    underline="hover"
                  >
                    {collectionName}
                  </Link>
                  {!collectionName?.includes("Unverified") && (
                    <Stack direction="row" spacing={1}>
                      <Check color="success" />
                      <Typography fontWeight="bold" variant="body2" sx={{ color: "success.main" }}>
                        VERIFIED
                      </Typography>
                    </Stack>
                  )}
                </Stack>
              )}
            </Stack>
            <Stack spacing={2} direction="row">
              <Chip label={tokenStandardLabels[tokenStandard]} color="primary" sx={{ fontWeight: "bold" }} />
              <Chip
                label={digitalAsset.mutable ? "Mutable" : "Immutable"}
                color={digitalAsset.mutable ? "secondary" : "success"}
                sx={{ fontWeight: "bold" }}
              />
              {digitalAsset.edition?.isOriginal && (
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
              {digitalAsset.burned && <Chip label="Burned" color="error" sx={{ fontWeight: "bold" }} />}
            </Stack>

            <Table>
              <TableBody>
                <TableRow>
                  <TableCell>
                    <Typography>Mint Address:</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography>
                      <CopyAddress>{digitalAsset.id}</CopyAddress>
                    </Typography>
                  </TableCell>
                </TableRow>
                {collection && (
                  <TableRow>
                    <TableCell>
                      <Typography>Verified Collection:</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography>
                        <CopyAddress linkPath="collection">{collection}</CopyAddress>
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                <TableRow>
                  <TableCell>
                    <Typography>Update Authority:</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography textAlign="right">
                      {updateAuthority ? <CopyAddress linkPath="wallet">{updateAuthority}</CopyAddress> : "-"}
                    </Typography>
                  </TableCell>
                </TableRow>
                {[0, 3, 4, 5].includes(tokenStandard) && (
                  <TableRow>
                    <TableCell>
                      <Typography>Holder:</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography>
                        <CopyAddress linkPath="wallet">
                          {listing ? listing.seller : digitalAsset.ownership.owner}
                        </CopyAddress>
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            <Typography variant="h5" fontWeight="bold" color="primary">
              Traits
            </Typography>
            <Stack direction="row" spacing={0} sx={{ flexWrap: "wrap", gap: 1 }}>
              {(digitalAsset.content.metadata.attributes || []).map((att, index) => (
                <Box
                  key={index}
                  sx={{ borderRadius: "5px", border: "1px solid", padding: 1, borderColor: "primary.main" }}
                >
                  <Typography color="primary" textTransform="uppercase">
                    {att?.trait_type}
                  </Typography>
                  <Typography>{att?.value}</Typography>
                </Box>
              ))}
            </Stack>
            <Tabs value="sales">
              <Tab label="Sales" value="sales" />
            </Tabs>
            <Activity mintAddress={mintAddress} />
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}
