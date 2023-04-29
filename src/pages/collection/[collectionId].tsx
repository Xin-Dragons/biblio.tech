import { Nft } from "@metaplex-foundation/js";
import { Box, Button, Card, CardContent, Grid, Rating, Typography } from "@mui/material";
import { Stack } from "@mui/system";
import { PublicKey } from "@solana/web3.js";
import { every, filter, flatten, sample, startCase, uniq } from "lodash";
import { NextPage } from "next";
import { useEffect, useState } from "react";
import { Layout } from "../../components/Layout";
import { useMetaplex } from "../../context/metaplex";
import { useNfts } from "../../context/nfts";
import { useSelection } from "../../context/selection";
import { useUiSettings } from "../../context/ui-settings";
import { Items } from "../../components/Items";
import { useLiveQuery } from "dexie-react-hooks";
import { useWallet } from "@solana/wallet-adapter-react";
import { db } from "../../db";
import { useDatabase } from "../../context/database";
import { FiltersProvider, useFilters } from "../../context/filters";
import axios from "axios";

const Collection: NextPage = ({ collectionId }) => {
  const [menuShowing, setMenuShowing] = useState(true)
  const { selectedFilters, search, sort } = useFilters()
  const { untagged } = useUiSettings();
  const { db, updateNfts } = useDatabase();
  const wallet = useWallet()

  const nfts = useLiveQuery(
    () => collectionId === "unknown"
    ? db && db
      .nfts
      .filter(item => !item.helloMoonCollectionId)
      .toArray()
    : db && db
      .nfts
      .where({
        helloMoonCollectionId: collectionId
      })
      .sortBy(sort),
    [db, wallet.publicKey, collectionId, sort]
  ) || [];

  const collection = useLiveQuery(
    () => db && db
      .collections
      .where({ helloMoonCollectionId: collectionId })
      .first(),
    [collectionId, db, wallet.publicKey]
  ) || {}

  const taggedNfts = useLiveQuery(() => db && db
    .taggedNfts
    .toArray(),
    [db, collectionId, wallet.publicKey],
    []  
  ) || []

  function toggleMenu() {
    setMenuShowing(!menuShowing);
  }

  async function getMoonrankRarity() {
    const mints = nfts.filter(n => !n.moonRank || !n.moonRankTier).map(n => n.nftMint)
    if (!mints.length) {
      return []
    }
    const { data } = await axios.post('/api/get-moonrank', { mints });
    return data
  }

  async function getHowRareRarity() {
    const mints = nfts.filter(n => !n.howRare || !n.howRareTier).map(n => n.nftMint)
    if (!mints.length) {
      return []
    }
    const { data } = await axios.post('/api/get-howrare', { mints });
    return data
  }

  async function getRarity() {
    const [moonRank, howRare] = await Promise.all([
      getMoonrankRarity(),
      getHowRareRarity()
    ])

    await updateNfts(moonRank)
    await updateNfts(howRare)
  }

  useEffect(() => {
    if (nfts.length) {
      getRarity();
    }
  }, [nfts])

  const filtered = nfts.filter(nft => {
    return every(selectedFilters, (items, key) => {
      return !items.length || items.some(item => {
        return (nft.json?.attributes || []).find(att => att.trait_type === key && att.value === item)
      })
    })
  })
    .filter(nft => !untagged || !taggedNfts.map(u => u.nftId).includes(nft.nftMint))
    .filter(nft => {
      if (!search) {
        return true
      }

      const s = search.toLowerCase();
      const name = nft.json?.name || nft.name || ""
      const symbol = nft.json?.symbol || nft.symbol || ""
      const description = nft.json?.description || ""
      const values = (nft.json?.attributes || []).map(att => `${att.value || ""}`.toLowerCase())
      return name.toLowerCase().includes(s) ||
        description.toLowerCase().includes(s) ||
        symbol.toLowerCase().includes(s) ||
        values.some(val => val.includes(s))
    })

  return (
    <Layout title={collection?.collectionName} nfts={filtered} filters>
      <Items items={filtered} />
    </Layout>
  )
}

export async function getServerSideProps(ctx) {
  return {
    props: {
      collectionId: ctx.params.collectionId
    }
  }
}

export default Collection