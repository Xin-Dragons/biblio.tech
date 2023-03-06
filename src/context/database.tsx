import { createContext, useContext, useEffect, useState } from "react";
import { DB } from "../db";
import { useWallet } from "@solana/wallet-adapter-react";
import Dexie from "dexie";
import { useLiveQuery } from "dexie-react-hooks";

const DatabaseContext = createContext();

export const DatabaseProvider = ({ children, collectionId }) => {
  const [syncing, setSyncing] = useState(false);
  const [db, setDb] = useState(null);
  const wallet = useWallet();
  
  useEffect(() => {
    if (wallet.publicKey) {
      const db = new DB(wallet.publicKey.toBase58());
      setDb(db);
    }
  }, [wallet.publicKey])

  useEffect(() => {
    if (!wallet.publicKey) {
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

    worker.postMessage({ publicKey: wallet.publicKey?.toBase58() })
  }, [wallet.publicKey])


  useEffect(() => {
    if (!wallet.publicKey) {
      return;
    }
    setSyncing(true)
    const worker = new Worker(new URL('../../public/get-data.worker.ts', import.meta.url));
    worker.addEventListener("message", event => {
      setSyncing(false)
      // setWorking(false)
      // setKeypair(new Keypair(event.data.keypair._keypair));
    })

    worker.postMessage({ publicKey: wallet.publicKey?.toBase58() })
  }, [wallet.publicKey])

  useEffect(() => {
    console.log(collectionId)
    if (!wallet.publicKey || !collectionId) {
      return;
    }
    setSyncing(true)
    const worker = new Worker(new URL('../../public/get-data.worker.ts', import.meta.url));
    worker.addEventListener("message", event => {
      setSyncing(false)
      // setWorking(false)
      // setKeypair(new Keypair(event.data.keypair._keypair));
    })

    worker.postMessage({ publicKey: wallet.publicKey?.toBase58(), collectionId, type: "update-nfts" })
  }, [collectionId, wallet.publicKey])


  async function updateCollection(id: string, updates: Object) {
    try {
      setSyncing(true);
      await db.collections.update(id, updates);
    } catch {

    } finally {
      setSyncing(false)
    }
  }

  async function updateCollectionImage(id: string, image) {
    setSyncing(true)
    const thing = await db.collections.update(id, { image })

    setSyncing(false)
  }

  async function updateStarred(id, starred) {
    await db.nfts.update(id, { starred })
  }

  async function deleteNfts(nfts: string[]) {
    console.log(nfts)
    const a = await db.nfts.where("nftMint").anyOf(...nfts).delete()
    console.log(a)
  }

  return (
    <DatabaseContext.Provider value={{ syncing, updateCollection, db, updateCollectionImage, updateStarred, deleteNfts }}>
      { children }
    </DatabaseContext.Provider>
  )
}

export const useDatabase = () => {
  return useContext(DatabaseContext);
}