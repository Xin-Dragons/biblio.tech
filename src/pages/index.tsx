import { RestClient, NftMintsByOwnerRequest, LeaderboardStats, NftMintsByOwner } from "@hellomoon/api"
import { Metaplex, Nft } from "@metaplex-foundation/js";
import { AppBar, Box, Button, Card, CardContent, Chip, CircularProgress, Grid, Stack, ToggleButton, ToggleButtonGroup, Toolbar, Typography } from '@mui/material';
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { sample, uniq } from "lodash";
import type { NextPage } from 'next';
import Link from 'next/link';
import React, { FC, useEffect, useState } from 'react';
import { ActionBar } from "../components/ActionBar";
import { Layout } from '../components/Layout';
import { useMetaplex } from "../context/metaplex";
import { useNfts } from '../context/nfts';
import { useSelection } from "../context/selection";
import styles from '../styles/Home.module.scss';
import Spinner from "../components/Spinner";
import { useLocalStorage } from "../hooks/local-storage";
import { useUiSettings } from "../context/ui-settings";
import { SideMenu } from "../components/SideMenu";
import { Items } from "../components/Items";
import { useLiveQuery } from "dexie-react-hooks";
import { usePrevious } from "../hooks/use-previous";
import { useDatabase } from "../context/database";

type CollectionProps = {
  item: LeaderboardStats,
  nfts: NftMintsByOwner[],
  value: number,
  selected: boolean
}

const Collection: FC<CollectionProps> = ({ item, selected }) => {
  const [image, setImage] = useState<string>(item.image)
  const { updateCollectionImage } = useDatabase();
  const { layoutSize } = useUiSettings();
  const metaplex = useMetaplex();
  const previous = usePrevious(image)
  const nfts = item.nfts;

  async function updateImage() {
    await updateCollectionImage(item.id, image)
  }

  useEffect(() => {
    if (image !== previous) {
      updateImage()
    }
  }, [image])

  async function getLatest(random?: boolean, retries = 3) {
    try {
      const randoNft = nfts[0]
      if (randoNft.nftCollectionMint) {
        try {
          const nft = await metaplex.nfts().findByMint({ mintAddress: new PublicKey(randoNft.nftCollectionMint) }) as Nft
          if (nft.json?.image) {
            return setImage(nft.json?.image as string);
          }
        } catch {
          const nft = await metaplex.nfts().findByMint({ mintAddress: new PublicKey(randoNft.nftMint) }) as Nft
          if (nft.json?.image) {
            setImage(nft.json?.image as string);
          }
        }
      }
      const nft = await metaplex.nfts().findByMint({ mintAddress: new PublicKey(randoNft.nftMint) }) as Nft
      if (nft.json?.image) {
        setImage(nft.json?.image as string);
      }
      
    } catch (err) {
      if (retries) {
        getLatest(true, --retries)
      }
    }
  }

  useEffect(() => {
    if (item.id !== 'unknown') {
      getLatest()
    }
  }, [item])

  return (
    <Link href={`/collection/${item.id}`}>
      <Card sx={{
        position: "relative",
        cursor: "pointer",
        boxShadow: "2px 2px 0px #333, 4px 4px 0px #222, 6px 6px 0px #111",
        outline: selected ? "2px solid white" : "none"
      }}>
        <Chip
          label={nfts.length}
          sx={{
            position: "absolute",
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            right: "0.5em",
            top: "0.5em"
          }} 
        
        />
        <Box sx={{
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
            opacity: 1
          }
        }}>
          <Stack>
            <Typography textAlign="center">Estimated value</Typography>
            <Typography variant="h6" textAlign="center">◎{item.value.toLocaleString(undefined, { minimumFractionDrgits: 4 })}</Typography>
          </Stack>
        </Box>
        {
          item.image || item.id === "unknown"
            ? <img src={item.image ? `https://img-cdn.magiceden.dev/rs:fill:400:400:0:0/plain/${item.image}` : '/fallback-image.jpg'} width="100%" style={{ display: "block", aspectRatio: "1 / 1" }} />
            : <Box sx={{
              width: "100%",
              aspectRatio: "1 / 1",
              display: "flex",
              justifyContent: "center",
              alignItems: "center"
            }}>
              <CircularProgress />
            </Box>
        }
        
        {
          layoutSize !== "small" && (
            <CardContent>
              <Typography variant="h6" sx={{ whiteSpace: "nowrap", textOverflow: "ellipsis", width: "100%", overflow: "hidden" }}>{item.name}</Typography>
            </CardContent>
          )
        }
      </Card>
    </Link>
  )
}

const Home: NextPage = () => {
  const wallet = useWallet();
  const { db } = useDatabase();
  

  const nfts = useLiveQuery(
    () => db && db
      .nfts
      .toArray(),
    [db, wallet.publicKey],
    []
  ) || [];


  const collections = useLiveQuery(
    () => db && db
      .collections
      .toArray(),
    [db, wallet.publicKey],
    []
  ) || [];

  let items = collections?.map(collection => {
    const collectionNfts = nfts.filter(n => n.helloMoonCollectionId === collection.helloMoonCollectionId);
    const value = (collection.floorPrice * collectionNfts.length) / LAMPORTS_PER_SOL;
    return {
      id: collection.helloMoonCollectionId,
      image: collection.image,
      name: collection.collectionName,
      nfts: collectionNfts,
      value
    }
  })
    .sort((a, b) => b.value - a.value)

  if (items.length) {
    items.push({
      id: "unknown",
      name: "Unknown collection",
      nfts: nfts.filter(n => !n.helloMoonCollectionId),
      value: 0
    })
  }

  return (
    <Layout title="All collections" nfts={items} filters={false}>
      <Items items={items} Component={Collection} />
    </Layout>
  );
};

export default Home;
