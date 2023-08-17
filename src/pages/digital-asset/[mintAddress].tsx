import { useEffect, useState } from "react"
import { Layout } from "../../components/Layout"
import { useRouter } from "next/router"
import {
  DigitalAsset,
  DigitalAssetWithToken,
  JsonMetadata,
  TokenStandard,
  fetchAllDigitalAssetWithTokenByMint,
  fetchJsonMetadata,
} from "@metaplex-foundation/mpl-token-metadata"
import { useUmi } from "../../context/umi"
import { toast } from "react-hot-toast"
import { publicKey, unwrapOption, unwrapOptionRecursively } from "@metaplex-foundation/umi"
import { Box, Card, CardContent, Chip, Stack, Typography, darken, useTheme } from "@mui/material"
import { CopyAddress } from "../../components/CopyAddress"
import { Check, Close, CropSquareSharp } from "@mui/icons-material"
import { fetchRuleSet } from "@metaplex-foundation/mpl-token-auth-rules"

const tokenStandardLabels = ["NFT", "SFT", "SPL", "NFT Edition", "pNFT", "Unknown"]

export default function DigitalAssetPage() {
  const [title, setTitle] = useState("Digital Asset")
  const [digitalAsset, setDigitalAsset] = useState<(DigitalAssetWithToken & { json: JsonMetadata }) | null>(null)
  const [loading, setLoading] = useState(false)
  const umi = useUmi()
  const router = useRouter()
  const mintAddress = router.query.mintAddress as string

  async function getDigitalAsset() {
    if (!mintAddress) {
      setDigitalAsset(null)
      return
    }
    try {
      setLoading(true)
      const da = (await fetchAllDigitalAssetWithTokenByMint(umi, publicKey(mintAddress))).find(
        (item) => item.token.amount
      ) as DigitalAssetWithToken
      const json = (await fetchJsonMetadata(umi, da.metadata.uri)) as JsonMetadata
      setDigitalAsset({ ...da, json })
    } catch {
      toast.error("Error loading digital asset")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    getDigitalAsset()
  }, [mintAddress])

  return (
    <Layout nfts={[]} filtered={[]} title={title} actions={<></>}>
      <Box p={4} pl={2}>
        <Card>
          <CardContent>
            {digitalAsset ? <DigitalAssetView digitalAsset={digitalAsset} /> : <Typography>Nothing found</Typography>}
          </CardContent>
        </Card>
      </Box>
    </Layout>
  )
}

function DigitalAssetView({ digitalAsset }: { digitalAsset: DigitalAssetWithToken & { json: JsonMetadata } }) {
  const theme = useTheme()
  const umi = useUmi()
  const tokenStandard = unwrapOption(digitalAsset.metadata.tokenStandard) || 5
  const collection = unwrapOption(digitalAsset.metadata.collection)

  const ruleSet = unwrapOptionRecursively(digitalAsset.metadata.programmableConfig)?.ruleSet

  async function getRuleSet() {
    if (!ruleSet) {
      return
    }
    const rules = await fetchRuleSet(umi, ruleSet)
    console.log(rules)
  }

  useEffect(() => {
    getRuleSet()
  }, [ruleSet])

  return (
    <Stack direction="row" spacing={2}>
      <img src={digitalAsset.json.image} width="40%" />

      <Stack spacing={2} alignItems="flex-start">
        <Stack direction="row" alignItems="center" spacing={2}>
          <Typography variant="h4">{digitalAsset.json.name || digitalAsset.metadata.name}</Typography>
          <Typography variant="h6" fontWeight="bold">
            ({digitalAsset.json.symbol || digitalAsset.metadata.symbol})
          </Typography>
          <CopyAddress>{digitalAsset.publicKey}</CopyAddress>
        </Stack>
        <Stack spacing={2} direction="row">
          <Chip label={tokenStandardLabels[tokenStandard]} color="primary" sx={{ fontWeight: "bold" }} />
          <Chip
            label={digitalAsset.metadata.isMutable ? "Mutable" : "Immutable"}
            color={digitalAsset.metadata.isMutable ? "secondary" : "success"}
            sx={{ fontWeight: "bold" }}
          />
          {digitalAsset.edition?.isOriginal && (
            <Chip
              label="Master edition"
              sx={{
                fontWeight: "bold",
                backgroundColor: "gold.main",
                // @ts-ignore
                color: darken(theme.palette.gold.main, 0.8),
              }}
            />
          )}
        </Stack>
        {collection && (
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="h6">Collection:</Typography>
            <CopyAddress>{collection.key}</CopyAddress>
            {collection.verified ? (
              <Stack direction="row" alignItems="center" spacing={1}>
                <Check color="success" />
                <Typography fontWeight="bold" variant="body2" sx={{ color: "success.main" }}>
                  VERIFIED
                </Typography>
              </Stack>
            ) : (
              <Stack direction="row" alignItems="center" spacing={1}>
                <Close color="error" />
                <Typography fontWeight="bold" variant="body2" sx={{ color: "error.main" }}>
                  UNVERIFIED
                </Typography>
              </Stack>
            )}
          </Stack>
        )}
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="h6">Update Authority:</Typography>
          <CopyAddress wallet>{digitalAsset.metadata.updateAuthority}</CopyAddress>
        </Stack>
        {[0, 3, 4].includes(tokenStandard) && (
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="h6">Holder:</Typography>
            <CopyAddress>{digitalAsset.token.owner}</CopyAddress>
          </Stack>
        )}
      </Stack>
    </Stack>
  )
}

export async function getServerSideProps(ctx) {
  console.log(ctx)
  return {
    props: {},
  }
}
