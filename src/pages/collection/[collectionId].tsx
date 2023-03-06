import { Nft } from "@metaplex-foundation/js";
import { Box, Button, Card, CardContent, Grid, Rating, Typography } from "@mui/material";
import { Stack } from "@mui/system";
import { PublicKey } from "@solana/web3.js";
import { every, filter, startCase, uniq } from "lodash";
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

const Collection: NextPage = ({ collectionId }) => {
  const [menuShowing, setMenuShowing] = useState(true)
  const { selectedFilters } = useFilters()
  const { untagged } = useUiSettings();
  const { db } = useDatabase();
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
      .toArray(),
    [db, wallet.publicKey, collectionId]
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

  console.log(nfts)

  const filtered = nfts.filter(nft => {
    return every(selectedFilters, (items, key) => {
      return !items.length || items.some(item => {
        return (nft.json?.attributes || []).find(att => att.trait_type === key && att.value === item)
      })
    })
  })
    .filter(nft => !untagged || !taggedNfts.map(u => u.nftId).includes(nft.nftMint))

  console.log({filtered})

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