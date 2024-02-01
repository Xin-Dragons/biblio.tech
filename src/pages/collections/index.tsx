import { NftMintsByOwner } from "@hellomoon/api"
import { Box, Card, CardContent, Chip, Stack, SvgIcon, Typography, alpha } from "@mui/material"
import { useWallet } from "@solana/wallet-adapter-react"
import { LAMPORTS_PER_SOL } from "@solana/web3.js"
import type { NextPage } from "next"
import Link from "next/link"
import React, { FC } from "react"
import { Layout } from "../../components/Layout"
import { LayoutSize, useUiSettings } from "../../context/ui-settings"
import { Items } from "../../components/Items"
import { useLiveQuery } from "dexie-react-hooks"
import { useDatabase } from "../../context/database"
import { useFilters } from "../../context/filters"
import { useBasePath } from "../../context/base-path"
import { publicKey, unwrapSome } from "@metaplex-foundation/umi"
import { useNfts } from "../../context/nfts"
import { difference, flatten, orderBy, sortBy } from "lodash"
import { Nft } from "../../db"
import { useAccess } from "../../context/access"
import { useTheme } from "../../context/theme"
import { CURRENCIES, CurrencyItem, useBrice } from "../../context/brice"
import Solana from "../../../public/solana.svg"
import Eth from "../../../public/eth.svg"
import Matic from "../../../public/matic.svg"

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
  const { showInfo, lightMode, layoutSize, preferredCurrency } = useUiSettings()
  const basePath = useBasePath()
  const nfts = item.nfts
  const theme = useTheme()

  const margins = {
    small: 1,
    medium: 1.25,
    large: 1.5,
    collage: 5,
  }

  const fontSizes = (layoutSize: LayoutSize) => {
    const sizes = {
      small: {
        xs: "3vw",
        sm: "2vw",
        md: "1.5vw",
        lg: "1.25vw",
        xl: "1vw",
      },
      medium: {
        xs: "5vw",
        sm: "3vw",
        md: "1.75vw",
        lg: "1.5vw",
        xl: "1.25vw",
      },
      large: {
        xs: "8vw",
        sm: "4vw",
        md: "2.5vw",
        lg: "2vw",
        xl: "1.5vw",
      },
    }

    return sizes[layoutSize as keyof object]
  }

  const currencySymbols = {
    solana: "SOL",
    ethereum: "ETH",
  }

  const currency = CURRENCIES.find((c) => c.code === preferredCurrency) as CurrencyItem

  return (
    <Link href={`${basePath}/collections/${item.id}`}>
      <Card
        sx={{
          position: "relative",
          cursor: "pointer",
          outline: selected ? "2px solid white" : "none",
          margin: margins[layoutSize],
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
            onError={(e: any) => (e.target.src = lightMode ? "/books-lightest.svg" : "/books-lighter.svg")}
            src={
              item.image
                ? `https://img-cdn.magiceden.dev/rs:fill:400:400:0:0/plain/${item.image.replace(
                    "ipfs://",
                    "https://ipfs.io/ipfs/"
                  )}`
                : lightMode
                ? "/books-lightest.svg"
                : "/books-lighter.svg"
            }
            width="100%"
            style={{ display: "block", aspectRatio: "1 / 1" }}
          />
          {showInfo && (
            <Chip
              label={nfts.length}
              sx={{
                position: "absolute",
                backgroundColor: alpha(theme.palette.background.default, 0.8),
                right: "8px",
                top: "8px",
                height: "30px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold",
              }}
            />
          )}

          {showInfo && (
            <SvgIcon
              sx={{
                position: "absolute",
                left: "8px",
                top: "8px",
                width: "30px",
                height: "30px",
                fill: lightMode ? "white" : "black",
              }}
            >
              {item.chain === "solana" && <Solana />}
              {item.chain === "eth" && <Eth />}
              {item.chain === "matic" && <Matic />}
            </SvgIcon>
          )}

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
              color: "fontColor",
              backgroundColor: alpha(theme.palette.background.default, 0.8),
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
              <Typography textAlign="center" sx={{ fontSize: fontSizes(layoutSize) }}>
                Estimated value
              </Typography>
              <Typography variant="h6" textAlign="center" sx={{ fontSize: fontSizes(layoutSize) }}>
                {item.id === "unknown" || item.value === 0
                  ? "Unknown"
                  : `${(item.value as number).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${
                      currencySymbols[item.currency as keyof object]
                    }`}
              </Typography>
              <Typography variant="body1" textAlign="center" sx={{ fontSize: fontSizes(layoutSize) }}>
                {item.id === "unknown" || item.price === 0
                  ? "Unknown"
                  : `${currency.symbol}${item.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
              </Typography>
            </Stack>
          </Box>
        </Box>
        {showInfo && (
          <CardContent sx={{ padding: { xs: 1 } }}>
            <Typography
              variant="h6"
              sx={{
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
                width: "100%",
                overflow: "hidden",
                fontSize: fontSizes(layoutSize),
              }}
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
  const { sort, preferredCurrency } = useUiSettings()
  const brice = useBrice()
  const { nfts, filtered } = useNfts()

  const allFilteredMints = filtered.map((f) => f.nftMint)

  const collections = useLiveQuery(
    () =>
      db.collections
        .where("id")
        .anyOf(nfts.filter((i) => i.collectionIdentifier).map((n) => n.collectionIdentifier) as string[])
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
      const filtered = collectionNfts.filter((n) => allFilteredMints.includes(n.nftMint))

      const currency = collection.chain === "eth" ? "ethereum" : "solana"

      const value =
        collection.chain === "solana"
          ? (collection.floorPrice * filtered.length) / LAMPORTS_PER_SOL
          : collection.floorPrice * filtered.length

      const price = value * brice[currency as keyof object][preferredCurrency]

      return {
        id: collection.id,
        image: collection.image,
        name: collection.collectionName,
        chain: collection.chain,
        allNfts: collectionNfts,
        nfts: filtered,
        value: value || 0,
        price: price || 0,
        currency,
      }
    })
    .filter(Boolean)
    .filter((item: any) => item.allNfts.length)

  const uncategorized = nfts.filter(
    (n) =>
      [0, 4, 5].includes(n.metadata.tokenStandard) &&
      !flatten(collections.map((c: any) => c.nfts.map((cn: Nft) => cn.nftMint))).includes(n.nftMint)
  )

  if (collections.length && uncategorized.length) {
    collections.push({
      id: "uncategorized",
      name: "Uncategorized",
      image: "/books.svg",
      chain: "solana",
      allNfts: uncategorized,
      nfts: uncategorized.filter((n) => allFilteredMints.includes(n.nftMint)),
      currency: "◎",
      price: 0,
      value: 0,
    })
  }

  let filteredCollections = collections.filter((item: any) => {
    return (!search || item?.name?.toLowerCase().includes(search?.toLowerCase())) && item.nfts.length
  })

  if (sort === "value") {
    filteredCollections = orderBy(
      filteredCollections,
      ["price", (item) => item?.nfts.length, (item: any) => item.image],
      ["asc", "asc", "desc"]
    ).reverse()
  } else if (sort === "name") {
    filteredCollections = orderBy(filteredCollections, (item: any) => item.name.toLowerCase().trim())
  } else if (sort === "holdings") {
    filteredCollections = orderBy(filteredCollections, (item) => item?.nfts.length).reverse()
  }

  return (
    <Layout nfts={collections as CollectionItem[]} filtered={filteredCollections as CollectionItem[]} selection={false}>
      <Items items={filteredCollections as CollectionItem[]} Component={Collection} sortable />
    </Layout>
  )
}

export default Home
