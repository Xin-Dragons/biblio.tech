import { getHelloMoonCollectionId, getListings, getSingleMint, hmClient } from "@/helpers/hello-moon"
import {
  CollectionAllTimeRequest,
  CollectionMintsRequest,
  LeaderboardStats,
  LeaderboardStatsRequest,
  NftMintInformationRequest,
} from "@hellomoon/api"
import { isPublicKey, publicKey, unwrapOption } from "@metaplex-foundation/umi"
import { Box, Stack, SvgIcon, Typography } from "@mui/material"
import { getDigitalAsset, fetchDigitalAssetsByCollection, fetchDigitalAssetsByCreator } from "@/helpers/digital-assets"
import { uniq } from "lodash"
import { redirect } from "next/navigation"
import { bigNumberFormatter, lamportsToSol } from "@/helpers/utils"
import Solana from "@/../public/solana.svg"
import { ArrowDownward, ArrowUpward } from "@mui/icons-material"
import { ReactNode } from "react"
import { ListingsProvider } from "@/context/listings"
import { DigitalAssetsProvider } from "@/context/digital-assets"
import { HoldersInfo } from "./HoldersInfo"
import { Tabs } from "./Tabs"
import { Sidebar } from "@/components/Sidebar"
import { AttributeFilters } from "@/components/AttributeFilters"
import { FiltersProvider } from "@/context/filters"
import { umi } from "@/app/helpers/umi"
import { fetchDigitalAsset } from "@metaplex-foundation/mpl-token-metadata"
import { TOKEN_PROGRAM_ID } from "@solana/spl-token"
import axios from "axios"
import client from "@/helpers/apollo"
import { gql } from "@apollo/client"
import { SortProvider } from "@/context/sort"
import { RarityProvider } from "@/context/rarity"

export default async function Collection({
  params,
  children,
}: {
  params: Record<string, string>
  children: ReactNode
}) {
  let collection: Pick<
    LeaderboardStats,
    "collectionName" | "sample_image" | "floorPrice" | "price_percent_change" | "volume" | "listing_count" | "supply"
  > & {
    totalVolumeLamports: number
  } = {
    collectionName: "Unknown collection",
    sample_image: "",
    floorPrice: 0,
    totalVolumeLamports: 0,
    price_percent_change: 0,
    volume: 0,
    listing_count: 0,
    supply: 0,
  }

  const helloMoonCollectionId = await getHelloMoonCollectionId(params.collectionId)

  if (helloMoonCollectionId) {
    const { data } = await hmClient.send(
      new LeaderboardStatsRequest({
        helloMoonCollectionId,
        granularity: "ONE_DAY",
      })
    )

    const response = (await hmClient.send(
      new CollectionAllTimeRequest({
        helloMoonCollectionId,
      })
    )) as any

    collection = {
      ...data[0],
      totalVolumeLamports: response.totalVolumeLamports,
    }
  }

  if (isPublicKey(params.collectionId)) {
    const da = await getDigitalAsset(params.collectionId)

    collection.collectionName = da.content.metadata.name
    collection.sample_image = da.content.links.image

    if (!helloMoonCollectionId || !collection.floorPrice) {
      const collectionInfo = await client.query({
        query: gql`
          query CollectionStats($slug: String!) {
            instrumentTV2(slug: $slug) {
              slug
              name
              statsV2 {
                buyNowPrice
                numListed
                numMints
                floor24h
                volume24h
                volumeAll
              }
            }
          }
        `,
        variables: {
          slug: params.collectionId,
        },
      })

      console.log(collectionInfo.data.instrumentTV2)
      collection.collectionName = collectionInfo.data.instrumentTV2.name
      collection.floorPrice = collectionInfo.data.instrumentTV2.statsV2.buyNowPrice
      collection.totalVolumeLamports = collectionInfo.data.instrumentTV2.statsV2.volumeAll
      collection.price_percent_change = collectionInfo.data.instrumentTV2.statsV2.floor24h * 100
      collection.listing_count = collectionInfo.data.instrumentTV2.statsV2.numListed
      collection.supply = collectionInfo.data.instrumentTV2.statsV2.numMints
      collection.volume = collectionInfo.data.instrumentTV2.statsV2.volume24h
    }
  } else {
    const singleMint = await getSingleMint(params.collectionId)

    const { data } = await hmClient.send(
      new NftMintInformationRequest({
        nftMint: singleMint,
      })
    )

    if (!data.length) {
      throw new Error("Error looking up mint")
    }

    const item = data[0]

    if (item.nftCollectionMint) {
      const info = await umi.rpc.getAccount(publicKey(item.nftCollectionMint))
      if (info.exists && info.owner === TOKEN_PROGRAM_ID.toBase58()) {
        return redirect(`/collection/${item.nftCollectionMint}`)
      } else {
        try {
          const da = await fetchDigitalAsset(umi, publicKey(item.nftMint as string))
          const collection = unwrapOption(da.metadata.collection)
          if (collection?.verified) {
            return redirect(`/collection/${collection.key}`)
          }
        } catch {}
      }
    }
  }
  const fp = collection.floorPrice / Math.pow(10, 9)

  return (
    <FiltersProvider>
      <ListingsProvider collectionId={params.collectionId}>
        <DigitalAssetsProvider collectionId={params.collectionId}>
          <Stack direction="row" height="100%" width="100%">
            <Sidebar>
              <Box padding={2}>
                <AttributeFilters />
              </Box>
            </Sidebar>
            <Stack height="100%" spacing={2} padding={2} flexGrow={1} width="100%">
              <Stack direction="row" alignItems="center" spacing={2} justifyContent="space-between">
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Typography variant="h4">{collection.collectionName}</Typography>
                  <Stack direction="row" spacing={2}>
                    <Stack>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <SvgIcon>
                          <Solana />
                        </SvgIcon>
                        <Typography color="primary" variant="h5">
                          {fp < 1
                            ? fp.toLocaleString(undefined, {
                                minimumFractionDigits: 3,
                              })
                            : fp.toLocaleString(undefined, {
                                maximumFractionDigits: 2,
                              })}
                        </Typography>
                      </Stack>
                      <Typography variant="body2">FLOOR PRICE</Typography>
                    </Stack>
                    <Stack>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        {collection.price_percent_change > 0 ? (
                          <ArrowUpward color="success" />
                        ) : (
                          <ArrowDownward color="error" />
                        )}
                        <Typography
                          variant="h5"
                          sx={{ color: collection.price_percent_change > 0 ? "success.main" : "error.main" }}
                        >
                          {(collection.price_percent_change || 0).toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })}
                          %
                        </Typography>
                      </Stack>
                      <Typography variant="body2">PRICE CHANGE</Typography>
                    </Stack>
                    <Stack>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <SvgIcon>
                          <Solana />
                        </SvgIcon>
                        <Typography color="primary" variant="h5">
                          {bigNumberFormatter.format(collection.volume / Math.pow(10, 9))}
                        </Typography>
                      </Stack>
                      <Typography variant="body2">24H VOLUME</Typography>
                    </Stack>
                    <Stack>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <SvgIcon>
                          <Solana />
                        </SvgIcon>
                        <Typography color="primary" variant="h5">
                          {bigNumberFormatter.format(collection?.totalVolumeLamports / Math.pow(10, 9))}
                        </Typography>
                      </Stack>
                      <Typography variant="body2">TOTAL VOLUME</Typography>
                    </Stack>
                    <Stack>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography color="primary" variant="h5">
                          {bigNumberFormatter.format(collection.supply)}
                        </Typography>
                      </Stack>
                      <Typography variant="body2">SUPPLY</Typography>
                    </Stack>
                    <Stack direction="row" spacing={2}>
                      <Stack>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography color="primary" variant="h5">
                            {bigNumberFormatter.format(collection.listing_count)}
                          </Typography>
                        </Stack>
                        <Typography variant="body2">LISTED</Typography>
                      </Stack>
                    </Stack>
                  </Stack>
                </Stack>
                <Tabs />
              </Stack>
              {children}
            </Stack>
          </Stack>
        </DigitalAssetsProvider>
      </ListingsProvider>
    </FiltersProvider>
  )
}
