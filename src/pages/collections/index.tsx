import { NftMintsByOwner } from "@hellomoon/api"
import { Box, Card, CardContent, Chip, Stack, Typography } from "@mui/material"
import { useWallet } from "@solana/wallet-adapter-react"
import { LAMPORTS_PER_SOL } from "@solana/web3.js"
import type { NextPage } from "next"
import Link from "next/link"
import React, { FC } from "react"
import { Layout } from "../../components/Layout"
import { useUiSettings } from "../../context/ui-settings"
import { Items } from "../../components/Items"
import { useLiveQuery } from "dexie-react-hooks"
import { useDatabase } from "../../context/database"
import { useFilters } from "../../context/filters"
import { useBasePath } from "../../context/base-path"
import { publicKey, unwrapSome } from "@metaplex-foundation/umi"
import { useNfts } from "../../context/nfts"
import { flatten, sortBy } from "lodash"
import { Nft } from "../../db"
import { useAccess } from "../../context/access"

type CollectionProps = {
  item: any
  nfts: NftMintsByOwner[]
  value: number
  selected: boolean
}

export type CollectionItem = {
  id: string
  name: string
  value: number
  nfts: Nft[]
}

export const Collection: FC<CollectionProps> = ({ item, selected }) => {
  const { showInfo } = useUiSettings()
  const basePath = useBasePath()
  const nfts = item.nfts

  return (
    <Link href={`${basePath}/collections/${item.id}`}>
      <Card
        sx={{
          position: "relative",
          cursor: "pointer",
          outline: selected ? "2px solid white" : "none",
          margin: 1,
        }}
      >
        <Box
          sx={{
            width: "100%",
            aspectRatio: "1 / 1",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            position: "relative",
          }}
        >
          <img
            onError={(e: any) => (e.target.src = "/books.svg")}
            src={item.image ? `https://img-cdn.magiceden.dev/rs:fill:400:400:0:0/plain/${item.image}` : "/books.svg"}
            width="100%"
            style={{ display: "block", aspectRatio: "1 / 1" }}
          />
          <Chip
            label={nfts.length}
            sx={{
              position: "absolute",
              backgroundColor: "rgba(0, 0, 0, 0.8)",
              right: "0.5em",
              top: "0.5em",
            }}
          />
          <Box
            sx={{
              position: "absolute",
              zIndex: 10,
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              color: "white",
              backgroundColor: "rgba(0, 0, 0, 0.6)",
              opacity: 0,
              transition: "opacity 0.2s",
              cursor: "pointer",
              fontWeight: "bold",
              "&:hover": {
                opacity: 1,
              },
            }}
          >
            <Stack>
              <Typography textAlign="center">Estimated value</Typography>
              <Typography variant="h6" textAlign="center">
                {item.id === "unknown" || item.value === 0
                  ? "Unknown"
                  : `◎${item.value.toLocaleString(undefined, { minimumFractionDrgits: 4 })}`}
              </Typography>
            </Stack>
          </Box>
        </Box>
        {showInfo && (
          <CardContent>
            <Typography
              variant="h6"
              sx={{ whiteSpace: "nowrap", textOverflow: "ellipsis", width: "100%", overflow: "hidden" }}
            >
              {item.name || "Unknown collection"}
            </Typography>
          </CardContent>
        )}
      </Card>
    </Link>
  )
}

const Home: NextPage = () => {
  const wallet = useWallet()
  const { db } = useDatabase()
  const { search } = useFilters()
  const { sort } = useUiSettings()
  const { nfts } = useNfts()
  const { publicKey } = useAccess()

  const collections = useLiveQuery(
    () =>
      db.collections
        .where("id")
        .anyOf(nfts.filter((i) => i.collectionIdentifier).map((n) => n.collectionIdentifier))
        .toArray(),
    [nfts],
    []
  )
    .map((collection) => {
      const collectionNfts = nfts.filter(
        (n) =>
          n.collectionIdentifier === collection.id &&
          (n.collectionId ||
            n.helloMoonCollectionId ||
            nfts.filter((nft) => nft.firstVerifiedCreator === n.firstVerifiedCreator).length > 1)
      )
      if (!collectionNfts) {
        return null
      }
      const value = (collection.floorPrice * collectionNfts.length) / LAMPORTS_PER_SOL
      return {
        id: collection.id,
        image: collection.image,
        name: collection.collectionName,
        nfts: collectionNfts,
        value: value || 0,
      }
    })
    .filter(Boolean)
    .filter((item: any) => item.nfts.length)

  const uncategorized = nfts.filter(
    (n) =>
      [0, 4, 5].includes(unwrapSome(n.metadata.tokenStandard)!) &&
      !flatten(collections.map((c: any) => c.nfts.map((cn: Nft) => cn.nftMint))).includes(n.nftMint)
  )

  if (collections.length && uncategorized.length) {
    collections.push({
      id: "uncategorized",
      name: "Uncategorized",
      image: "/books.svg",
      nfts: uncategorized,
      value: 0,
    })
  }

  let filtered = collections.filter((nft: any) => {
    if (!search) {
      return true
    }

    const s = search.toLowerCase()
    const name = nft.name
    return name.toLowerCase().includes(s)
  })

  if (sort === "value") {
    filtered = sortBy(filtered, ["value", (item) => item?.nfts.length]).reverse()
  } else if (sort === "name") {
    filtered = sortBy(filtered, (item: any) => item.name.toLowerCase().trim())
  } else if (sort === "holdings") {
    filtered = sortBy(filtered, (item) => item?.nfts.length).reverse()
  }

  return (
    <Layout nfts={collections as CollectionItem[]} filtered={filtered as CollectionItem[]} selection={false}>
      <Items items={filtered as CollectionItem[]} Component={Collection} sortable />
    </Layout>
  )
}

export default Home
