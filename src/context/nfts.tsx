import { NftMintsByOwnerRequest, RestClient, NftMintsByOwner, LeaderboardStatsRequest, LeaderboardStats } from "@hellomoon/api";
import { FindNftsByOwnerOutput, Metadata, Metaplex, Nft as MetaplexNft, Nft, Pda, PublicKey } from "@metaplex-foundation/js";
import { useWallet } from "@solana/wallet-adapter-react";
import axios from "axios";
import { flatten, groupBy, partition, uniq, uniqBy } from "lodash";
import { createContext, FC, useContext, useEffect, useMemo, useState } from "react";
import { useMetaplex } from "./metaplex";
import { toast } from "react-hot-toast";
import { NftMetadata } from "../db";
import { useDatabase } from "./database";

const initial = {
  nfts: [],
  collections: [],
  loading: false
}

interface NftsContextProps {
  nfts: NftMintsByOwner[];
  collections: LeaderboardStats[];
  loading: boolean;
}

const NftsContext = createContext<NftsContextProps>(initial);

type NftsProviderProps = {
  children: JSX.Element | JSX.Element[];
  collectionId?: string;
}

interface MetadataWithMint extends Metadata {
  nftMint: string
}
interface CombinedNft extends Metadata, NftMintsByOwner {}
interface LoadedCombinedNft extends NftMintsByOwner, Nft {}

export const NftsProvider: FC<NftsProviderProps> = ({ children, collectionId }) => {
  const [helloMoonNfts, setHelloMoonNfts] = useState<NftMintsByOwner[]>([]);
  const [combinedNfts, setCombinedNfts] = useState<CombinedNft[]>([])
  const [nfts, setNfts] = useState<LoadedCombinedNft[]>([]);

  const { db } = useDatabase();

  const [collections, setCollections] = useState<LeaderboardStats[]>([]);
  const [loading, setLoading] = useState(false)
  const [helloMoonLoading, setHelloMoonLoading] = useState(false)
  const [metaplexLoading, setMetaplexLoading] = useState(false)
  const [collectionsLoading, setCollectionsLoading] = useState(false)
  const metaplex = useMetaplex();
  const wallet = useWallet()


  // async function getNftsFromDb() {
  //   const nfts = await db.nfts
  //     .where('publicKey')
  //     .equals(wallet.publicKey?.toBase58() as string)
  //     .toArray();

  //   setNfts(nfts);
  // }

  // async function getCollectionsFromDb() {
  //   const collections = await db.collections
  //     .toArray();

  //   setCollections(collections);
  // }

  // useEffect(() => {
  //   if (wallet.publicKey) {
  //     getNftsFromDb()
  //     getCollectionsFromDb()
  //   }
  // }, [wallet.publicKey])

  useEffect(() => {
    setLoading(helloMoonLoading || metaplexLoading || collectionsLoading);
  }, [helloMoonLoading, metaplexLoading, collectionsLoading])

  async function getHelloMoonNfts() {
    try {
      console.log('getting hm')
      setHelloMoonLoading(true)
      
      console.log('got hm')
      if (!helloMoonNfts.length) {
        toast.error('Unable to read Hello Moon API, please try again later')
      }
      setHelloMoonNfts(helloMoonNfts);
    } catch (err) {
      console.log('nfts', err)
    } finally {
      setHelloMoonLoading(false)
    }
  }

  async function getMetaplexNfts() {
    try {
      console.log('getting metaplex')
      setMetaplexLoading(true)
      const metaplexNfts = (await metaplex.nfts().findAllByOwner({ owner: wallet.publicKey as PublicKey })) as Metadata[];
      console.log('got metaplex')
      setMetadata(metaplexNfts
        .filter(Boolean)
        .map((md: Metadata) => {
          return {
            ...md,
            nftMint: md.mintAddress.toBase58()
          }
        })
      )
    } catch (err) {
      console.log(err)
    } finally {
      setMetaplexLoading(false)
    }
  }

  async function loadCollections() {
    try {
      setCollectionsLoading(true)
      console.log('getting collections')
      const collectionIds = uniq(combinedNfts.map(n => n.helloMoonCollectionId).filter(Boolean))
      const collections = await getCollections(collectionIds)
      console.log('got collections')
      setCollections(collections);
    } catch (err) {
      console.log("collections", err)
    } finally {
      setCollectionsLoading(false)
    }
  }

  async function loadNfts() {
    
    if (combinedNfts.length && collectionId) {
      try {
        setLoading(true)
        const loadedNfts = await Promise.all(
          combinedNfts
            .filter(nft => nft.helloMoonCollectionId === collectionId)
            .map(async metadata => metaplex.nfts().load({ metadata }))
        ) as Nft[];
  
        const loadedCombinedNfts = loadedNfts.map((nft: Nft) => {
          return {
            ...combinedNfts.find(n => n.mintAddress.equals(nft.mint.address)) as CombinedNft,
            ...nft as Nft
          }
        }) as LoadedCombinedNft
  
        setNfts(loadedCombinedNfts)
      } catch (err) {
        console.log('error syncing')
      } finally {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    if (metadata.length && helloMoonNfts.length) {
      setCombinedNfts(metadata.map((item: Metadata) => {
        return {
          ...item,
          ...helloMoonNfts.find(hm => hm.nftMint === item.nftMint)
        }
      }))
    }
  }, [helloMoonNfts, metadata])

  
  useEffect(() => {
    if (nfts.length) {
      addNftsToDb(nfts);
    } else if (combinedNfts.length) {
      addNftsToDb(combinedNfts);
    }
  }, [nfts, combinedNfts])

  async function addCollectionsToDb() {
    db.transaction('rw', db.collections, async () => {
      const fromDb = await db.collections.toArray();
  
      const [toAdd, toUpdate] = partition(collections, collection => {
        return !fromDb.map(item => item.helloMoonCollectionId).includes(collection.helloMoonCollectionId)
      })
  
      await db.collections.bulkAdd(toAdd.map(c => {
        return {
          helloMoonCollectionId: c.helloMoonCollectionId,
          collectionName: c.collectionName,
          image: c.sample_image,
          floorPrice: c.floorPrice
        }
      }))
  
      await db.collections.bulkUpdate(toUpdate.map(c => {
        const changes = {
          collectionName: c.collectionName,
          floorPrice: c.floorPrice
        }
  
        if (c.image) {
          changes.image = c.sample_image;
        }
        return {
          key: c.helloMoonCollectionId,
          changes
        };
      }))
    })
  }

  useEffect(() => {
    if (collections.length) {
      addCollectionsToDb()
    }
  }, [collections])

  useEffect(() => {
    loadNfts()
  }, [combinedNfts, collectionId])

  useEffect(() => {
    if (combinedNfts.length) {
      loadCollections()
    }
  }, [combinedNfts])

  useEffect(() => {
    if (wallet.publicKey) {
      Promise.all([
        getHelloMoonNfts(),
        getMetaplexNfts()
      ]);
    }
  }, [wallet.publicKey])

  return (
    <NftsContext.Provider value={{ collections, nfts, loading, combinedNfts }}>
      { children }
    </NftsContext.Provider>
  )
}

export const useNfts = () => {
  return useContext(NftsContext);
}