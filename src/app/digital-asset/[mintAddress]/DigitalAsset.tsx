import { publicKey, unwrapOption, unwrapOptionRecursively } from "@metaplex-foundation/umi"
import { Check, Close } from "@mui/icons-material"
import { Stack, Typography, Chip, darken, Box, Link } from "@mui/material"
import { CopyAddress } from "@/components/CopyAddress"
import { fetchDigitalAsset, fetchJsonMetadata } from "@metaplex-foundation/mpl-token-metadata"
import { umi } from "@/app/helpers/umi"
import { ImageWithFallback } from "@/components/ImageWithFallback"
import { hmClient } from "@/helpers/hello-moon"
import { CollectionMintsRequest, LeaderboardStatsRequest, NftMintInformationRequest } from "@hellomoon/api"
import NextLink from "next/link"

const tokenStandardLabels = ["NFT", "SFT", "SPL", "NFT Edition", "pNFT", "cNFT", "Unknown"]

export async function DigitalAssetView({ digitalAsset }: { digitalAsset: any }) {
  console.log(digitalAsset)
  const updateAuthority = digitalAsset.authorities.find((auth) => auth.scopes.includes("full")).address

  let tokenStandard = 6

  if (!digitalAsset.compression.compressed) {
    const da = await fetchDigitalAsset(umi, publicKey(digitalAsset.id))
    console.log(da)
    tokenStandard = unwrapOption(da.metadata.tokenStandard) || 0
  } else {
    tokenStandard = 5
  }

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

  const image = digitalAsset.content.links.image || (await fetchJsonMetadata(umi, digitalAsset.content.json_uri)).image

  return (
    <Stack direction="row" spacing={2}>
      <Box width="40%">
        <ImageWithFallback src={image} size={600} />
      </Box>

      <Stack spacing={2} alignItems="flex-start" width="100%">
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
              <Stack direction="row" spacing={1}>
                <Check color="success" />
                <Typography fontWeight="bold" variant="body2" sx={{ color: "success.main" }}>
                  VERIFIED
                </Typography>
              </Stack>
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
        </Stack>
        <Stack>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="h6">Mint Address:</Typography>
            <CopyAddress>{digitalAsset.id}</CopyAddress>
          </Stack>
          {collection && (
            <Stack direction="row" spacing={2} alignItems="center">
              <Typography variant="h6">Verified Collection:</Typography>
              <CopyAddress linkPath="collection">{collection}</CopyAddress>
              {/* {collection.verified ? (
                
              ) : (
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Close color="error" />
                  <Typography fontWeight="bold" variant="body2" sx={{ color: "error.main" }}>
                    UNVERIFIED
                  </Typography>
                </Stack>
              )} */}
            </Stack>
          )}
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="h6">Update Authority:</Typography>
            <CopyAddress linkPath="wallet">{updateAuthority}</CopyAddress>
          </Stack>
          {[0, 3, 4, 5].includes(tokenStandard) && (
            <Stack direction="row" spacing={2} alignItems="center">
              <Typography variant="h6">Holder:</Typography>
              <CopyAddress linkPath="wallet">{digitalAsset.ownership.owner}</CopyAddress>
            </Stack>
          )}
        </Stack>
        <Typography variant="h5" fontWeight="bold" color="primary">
          Traits
        </Typography>
        <Stack direction="row" spacing={0} sx={{ flexWrap: "wrap", gap: 1 }}>
          {(digitalAsset.content.metadata.attributes || []).map((att, index) => (
            <Box key={index} sx={{ borderRadius: "5px", border: "1px solid", padding: 1, borderColor: "primary.main" }}>
              <Typography color="primary" textTransform="uppercase">
                {att?.trait_type}
              </Typography>
              <Typography>{att?.value}</Typography>
            </Box>
          ))}
        </Stack>
      </Stack>
    </Stack>
  )
}
