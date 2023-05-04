import { createContext, useContext, useEffect, useState } from "react";
import { DB } from "../db";
import { useWallet } from "@solana/wallet-adapter-react";
import Dexie from "dexie";
import { useLiveQuery } from "dexie-react-hooks";
import { useRouter } from "next/router";

const DatabaseContext = createContext();

export const DatabaseProvider = ({ children }) => {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [db, setDb] = useState(null);
  const wallet = useWallet();
  
  useEffect(() => {
    if (wallet.publicKey || router.query.publicKey) {
      const db = new DB(router.query.publicKey || wallet.publicKey.toBase58());
      setDb(db);
    }
  }, [wallet.publicKey, router.query.publicKey])

  useEffect(() => {
    if (!router.query.publicKey && !wallet.publicKey) {
      return;
    }
    setSyncing(true)
    const worker = new Worker(new URL('../../public/get-data.worker.ts', import.meta.url));
    worker.addEventListener("message", event => {
      console.log(event)
      setSyncing(false)
      // setWorking(false)
      // setKeypair(new Keypair(event.data.keypair._keypair));
    })

    worker.postMessage({ publicKey: router.query.publicKey || wallet.publicKey?.toBase58() })
  }, [router.query.publicKey, wallet.publicKey])

  async function updateCollectionImage(id: string, image) {
    await db.collections.update(id, { image })
  }

  async function updateStarred(id, starred) {
    await db.nfts.update(id, { starred })
  }

  async function deleteNfts(nfts: string[]) {
    const a = await db.nfts.where("nftMint").anyOf(...nfts).delete()
  }

  async function updateNfts(updates) {
    await db.nfts.bulkUpdate(updates.map(item => {
      const { nftMint, ...changes } = item;
      return {
        key: nftMint,
        changes
      }
    }))
  }

  async function updateItem(item) {
    const changes = {
      nftMint: item.nftMint,
      nftCollectionMint: item.nftCollectionMint,
      sellerFeeBasisPoints: item.sellerFeeBasisPoints,
      tokenStandard: item.tokenStandard || item.tokenStandard === 0
        ? item.tokenStandard
        : item.type === "metaplex" ? 0 : null,
      name: item.name,
      symbol: item.symbol,
      jsonLoaded: item.jsonLoaded
    }

    if (item.json) {
      changes.json = item.json as NftMetadata
    }
    if (item.helloMoonCollectionId) {
      changes.helloMoonCollectionId = item.helloMoonCollectionId;
    }
    await db && db.nfts.update(item.nftMint, changes);
  }

  return (
    <DatabaseContext.Provider value={{ syncing, db, updateCollectionImage, updateStarred, deleteNfts, updateItem, updateNfts }}>
      { children }
    </DatabaseContext.Provider>
  )
}

export const useDatabase = () => {
  return useContext(DatabaseContext);
}