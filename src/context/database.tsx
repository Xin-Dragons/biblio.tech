import { FC, ReactNode, createContext, useContext, useEffect, useState } from "react"
import { Collection, DB, Loan, Nft, NftMetadata, Rarity, SharkyOrderBooks } from "../db"
import { useLiveQuery } from "dexie-react-hooks"
import { useAccess } from "./access"

import { merge, noop, partition, uniqBy } from "lodash"
import { useUiSettings } from "./ui-settings"
import { useWallet } from "@solana/wallet-adapter-react"
import { isAddress } from "viem"
import { useRouter } from "next/router"

export const MS_PER_DAY = 8.64e7

const db = new DB()

type DatabaseContextProps = {
  db: DB
  sync: Function
  syncing: boolean
  collections: Collection[]
  deleteNfts: Function
  updateItem: Function
  updateNfts: Function
  updateOrder: Function
  updateOwnerForNfts: Function
  addNftsToVault: Function
  removeNftsFromVault: Function
  stakeNft: Function
  unstakeNft: Function
  settleLoans: Function
  nftsDelisted: Function
  nftsListed: Function
  nftsSold: Function
  nftsBought: Function
  refreshMint: Function
  setLoaned: Function
  syncProgress: number
  updateCollection: Function
}

const initial = {
  db,
  sync: noop,
  syncing: false,
  collections: [],
  deleteNfts: noop,
  updateItem: noop,
  updateNfts: noop,
  updateOrder: noop,
  updateOwnerForNfts: noop,
  addNftsToVault: noop,
  removeNftsFromVault: noop,
  stakeNft: noop,
  unstakeNft: noop,
  settleLoans: noop,
  nftsDelisted: noop,
  nftsListed: noop,
  nftsSold: noop,
  nftsBought: noop,
  refreshMint: noop,
  setLoaned: noop,
  syncProgress: 0,
  updateCollection: noop,
}

const DatabaseContext = createContext<DatabaseContextProps>(initial)

type DatabaseProviderProps = {
  children: ReactNode
}

export const DatabaseProvider: FC<DatabaseProviderProps> = ({ children }) => {
  const { publicKey, publicKeys, isAdmin, isActive, isOffline } = useAccess()
  const { showAllWallets } = useUiSettings()
  const [syncing, setSyncing] = useState(false)
  const [totalMints, setTotalMints] = useState(0)
  const [loadedMints, setLoadedMints] = useState(0)
  const [syncProgress, setSyncProgress] = useState(0)
  const [workers, setWorkers] = useState<Worker[]>([])
  const wallet = useWallet()
  const router = useRouter()
  const nfts = useLiveQuery(
    () =>
      (showAllWallets && isAdmin
        ? db.nfts.where("owner").anyOf(publicKeys)
        : db.nfts.where({ owner: publicKey })
      ).toArray(),
    [publicKey, publicKeys],
    []
  )
  const collections = useLiveQuery(
    () =>
      db.collections
        .where("id")
        .anyOf(nfts.filter((n) => n.collectionIdentifier).map((n) => n.collectionIdentifier as string))
        .toArray(),
    [nfts],
    []
  )

  useEffect(() => {
    if (!loadedMints) {
      setSyncProgress(0)
      return
    }
    const progress = (loadedMints / totalMints) * 100
    setSyncProgress(progress)
  }, [totalMints, loadedMints])

  // useEffect(() => {
  //   if (!isAdmin) return
  //   saveChanges()
  // }, [tags, taggedNfts, order, isAdmin])

  // async function saveChanges() {
  //   if (!session?.user?.active || !isAdmin) {
  //     return
  //   }
  //   const { exportDB } = require("dexie-export-import")
  //   const blob = await exportDB(db, {
  //     filter: (table) => table === "tags" || table === "taggedNfts" || table === "order",
  //   })
  //   const json = JSON.parse(await blob.text())
  //   console.log(json)
  //   await axios.post("/api/sync", { json, publicKey: session.publicKey })
  //   toast.success("synced")
  // }

  // async function importDB() {
  //   const { importInto, peakImportFile } = require("dexie-export-import")

  //   const str = JSON.stringify(user.data)
  //   console.log(str)
  //   const bytes = new TextEncoder().encode(str)
  //   const blob = new Blob([bytes], {
  //     type: "application/json;charset=utf-8",
  //   })

  //   const peeked = await peakImportFile(blob)
  //   console.log(peeked)

  //   await importInto(db, blob, {
  //     filter: (table) => table === "tags" || table === "taggedNfts" || table === "order",
  //     overwriteValues: true,
  //   })
  //   toast.success("imported")
  // }

  // useEffect(() => {
  //   if (!isAdmin) return
  //   if (user?.data) {
  //     importDB()
  //   }
  // }, [user])

  async function addCollectionsToDb(collections: any[]) {
    await db.transaction("rw", db.collections, async () => {
      const fromDb = await db.collections.toArray()

      const [toAdd, toUpdate] = partition(collections, (collection) => {
        return !fromDb.map((item) => item.id).includes(collection.id)
      })

      await db.collections.bulkAdd(
        toAdd.map((c) => {
          return {
            id: c.id,
            chain: c.chain || "solana",
            helloMoonCollectionId: c.helloMoonCollectionId,
            collectionId: c.collectionId,
            collectionName: c.collectionName,
            image: c.image || c.sample_image,
            floorPrice: c.floorPrice,
          }
        })
      )

      await db.collections.bulkUpdate(
        toUpdate.map((c) => {
          const changes = {
            chain: c.chain || "solana",
            collectionName: c.collectionName,
            collectionId: c.collectionId,
            helloMoonCollectionId: c.helloMoonCollectionId,
            floorPrice: c.floorPrice,
            image: c.image || c.sample_image,
          }

          return {
            key: c.id,
            changes,
          }
        })
      )
    })
  }

  async function addNftsToDb(nfts: Nft[], publicKey: string, remove?: boolean) {
    console.log("ading nfts to db")
    await db.transaction("rw", db.nfts, async () => {
      const fromDb = await db.nfts.toArray()
      console.log(fromDb)

      if (remove) {
        const toRemove = fromDb.filter(
          (item) => item.owner === publicKey && !nfts.map((n) => n.nftMint).includes(item.nftMint)
        )

        if (toRemove.length) {
          await db.nfts.bulkUpdate(
            toRemove.map((item) => {
              return {
                key: item.nftMint,
                changes: {
                  owner: null,
                },
              }
            })
          )
        }
      }

      const [toAdd, toUpdate] = partition(
        uniqBy(nfts, (nft) => nft.nftMint),
        (nft) => {
          return !fromDb.map((item: any) => item.nftMint).includes(nft.nftMint)
        }
      )

      await db.nfts.bulkAdd(toAdd)

      await db.nfts.bulkUpdate(
        toUpdate.map((n) => {
          const balance = fromDb.find((nft) => nft.nftMint === n.nftMint)?.balance
          const changes = {
            ...n,
            balance: balance instanceof Number ? n.balance : merge(balance, n.balance || {}),
            publicKey: null,
          }

          return {
            key: n.nftMint,
            changes,
          }
        })
      )
    })
  }

  async function receivedTransfers(txns: any) {
    if (!publicKey) {
      return
    }
    const allMints = nfts.map((n) => n.nftMint)
    const toUpdate = txns.filter((txn: any) => {
      return txn.destinationOwner === publicKey || txn.sourceOwner === publicKey || allMints.includes(txn.mint)
    })

    if (!toUpdate.length) {
      return
    }

    const [toAdd, toRemove] = partition(toUpdate, (txn: any) => {
      if (!allMints.includes(txn.mint)) {
        return true
      }

      if (txn.destinationOwner && txn.desitnationOwner === publicKey) {
        return true
      }

      if (txn.sourceOwner && txn.sourceOwner === publicKey) {
        return false
      }

      return true
    })

    if (toAdd.length) {
      syncDataWorker(
        publicKey,
        toAdd.map((txn: any) => txn.mint)
      )
    }

    if (toRemove.length) {
      await db.nfts.bulkUpdate(
        toRemove.map((item) => {
          return {
            key: item.mint,
            changes: {
              owner: item.destinationOwner,
            },
          }
        })
      )
    }
  }

  useEffect(() => {
    let unsubscribe: Function | undefined = undefined
    if (isOffline) {
      return
    }
    // const client = new StreamClient(process.env.NEXT_PUBLIC_HELLO_MOON_API_KEY!)
    // try {
    //   client
    //     .connect((data) => {
    //       console.log(data)
    //     })
    //     .then(
    //       (disconnect) => {
    //         unsubscribe = client.subscribe(process.env.NEXT_PUBLIC_TOKEN_TRANSFERS_WS_KEY!, (data) => {
    //           console.log("received message")
    //           receivedTransfers(data)
    //         })
    //       },
    //       (err) => {
    //         // Handle error
    //         console.log(err)
    //       }
    //     )
    //     .catch(console.error)
    // } catch {
    //   console.log("Failed to authenticate")
    // }

    // return () => {
    //   unsubscribe && unsubscribe()
    //   client.disconnect()
    // }
  }, [publicKey, isOffline])

  async function updateSharkyOrderBooks(orderBooks: SharkyOrderBooks[]) {
    if (orderBooks && orderBooks.length) {
      await db.sharkyOrderBooks.bulkPut(orderBooks)
    }
  }

  useEffect(() => {
    workers.forEach((worker) => worker.terminate())
    setWorkers([])
    setLoadedMints(0)
    setTotalMints(0)
    if (!publicKey) {
      return
    }
    if (router.query.publicKey) {
      if (isAddress(router.query.publicKey as string)) {
        getEthNftsWorker(router.query.publicKey as string)
      } else {
        syncDataWorker(router.query.publicKey as string)
      }
      return
    }
    if (isAdmin && publicKeys.length) {
      publicKeys.map((pk) => (isAddress(pk) ? getEthNftsWorker(pk) : syncDataWorker(pk)))
    } else {
      if (isAddress(publicKey)) {
        getEthNftsWorker(publicKey)
      } else {
        syncDataWorker(publicKey)
      }
    }
    getSharkyOrderBooksWorker()
  }, [publicKey])

  function getSharkyOrderBooksWorker() {
    if (isOffline) {
      return
    }
    const worker = new Worker(new URL("../../public/get-sharky-order-books.worker.ts", import.meta.url))
    Object.defineProperty(worker, "type", {
      value: "sharky",
      writable: false,
    })

    setWorkers((prevState) => {
      return [...prevState, worker]
    })

    worker.onmessage = async (event) => {
      await updateSharkyOrderBooks(event.data.orderBooks)
      worker.terminate()
      setWorkers((prevState) => prevState.filter((w) => w !== worker))
    }

    worker.onerror = () => {
      worker.terminate()
      setWorkers((prevState) => prevState.filter((w) => w !== worker))
    }

    worker.postMessage({ start: true })
  }

  async function updateMetadata(metadata: any) {
    await db.nfts.bulkUpdate(
      metadata.map((item: any) => {
        return {
          key: item.nftMint,
          changes: {
            json: item.json,
            jsonLoaded: item.jsonLoaded,
          },
        }
      })
    )
  }

  async function syncMetadataWorker(items: Nft[], force?: boolean) {
    if (isOffline) {
      return
    }
    const worker = new Worker(new URL("../../public/get-metadata.worker.ts", import.meta.url))
    Object.defineProperty(worker, "type", {
      value: "metadata",
      writable: false,
    })
    setWorkers((prevState) => {
      return [...prevState, worker]
    })
    worker.onmessage = async (event) => {
      await updateMetadata(event.data.metadata)
      worker.terminate()
      setWorkers((prevState) => prevState.filter((w) => w !== worker))
    }

    worker.onerror = () => {
      worker.terminate()
      setWorkers((prevState) => prevState.filter((w) => w !== worker))
    }

    const nfts = await db.nfts.where({ owner: publicKey }).toArray()

    const mints = items
      .filter((n) => {
        if (force) {
          return true
        }
        const item = nfts.find((nft) => nft.nftMint === n.nftMint)
        return !item || !item.json
      })
      .map((m) => m.nftMint)

    worker.postMessage({ mints })
  }

  useEffect(() => {
    console.log("Active workers: ", workers)
  }, [workers])

  function syncDataWorker(publicKey: string, mints?: string[], force?: boolean) {
    if (isOffline) {
      return
    }
    const worker = new Worker(new URL("../../public/get-data.worker.ts", import.meta.url))
    Object.defineProperty(worker, "type", {
      value: "sync-data",
      writable: false,
    })

    setWorkers((prevState) => {
      return [...prevState, worker]
    })

    worker.onmessage = async (event) => {
      const { type } = event.data
      if (type === "get-rarity") {
        syncRarityWorker(event.data.nfts, event.data.force)
        syncMetadataWorker(event.data.nfts, event.data.force)
      } else if (type === "done") {
        await Promise.all([
          addNftsToDb(event.data.nftsToAdd, publicKey!, !mints),
          addCollectionsToDb(event.data.collectionsToAdd),
        ])
        worker.terminate()
        setWorkers((prevState) => prevState.filter((w) => w !== worker))
      }
    }

    worker.onerror = () => {
      worker.terminate()
      setWorkers((prevState) => prevState.filter((w) => w !== worker))
    }

    worker.postMessage({ publicKey, force, mints, publicKeys })
  }

  async function syncRarityWorker(nfts: Nft[], force?: boolean) {
    if (isOffline) {
      return
    }
    const rarity = await db.rarity.toArray()
    const toUpdate = nfts.filter((n) => {
      const r = rarity.find((r) => r.nftMint === n.nftMint)
      return !r || force || Date.now() - (r.lastParsed || Date.now()) >= MS_PER_DAY
    })

    if (!toUpdate.length) {
      return
    }

    const worker = new Worker(new URL("../../public/get-rarity-worker.ts", import.meta.url))
    Object.defineProperty(worker, "type", {
      value: "rarity",
      writable: false,
    })

    setWorkers((prevState) => {
      return [...prevState, worker]
    })

    worker.onmessage = async (event) => {
      await updateRarity(event.data.updates)
      worker.terminate()
      setWorkers((prevState) => prevState.filter((w) => w !== worker))
    }

    worker.onerror = () => {
      worker.terminate()
      setWorkers((prevState) => prevState.filter((w) => w !== worker))
    }

    worker.postMessage({ nfts })
  }

  async function updateRarity(updates: Rarity[]) {
    await db.transaction("rw", db.rarity, async () => {
      const all = await db.rarity
        .where("nftMint")
        .anyOf(updates.map((u) => u.nftMint))
        .toArray()

      const [toUpdate, toAdd] = partition(updates, (update) => all.map((u) => u.nftMint).includes(update.nftMint))

      await db.rarity.bulkUpdate(
        toUpdate.map((u) => {
          return {
            key: u.nftMint,
            changes: u,
          }
        })
      )

      await db.rarity.bulkAdd(toAdd)
    })
  }

  async function deleteNfts(nfts: Nft[]) {
    const a = await db.nfts
      .where("nftMint")
      .anyOf(...nfts.map((n) => n.nftMint))
      .delete()
  }

  async function updateNfts(updates: Nft[]) {
    await db.nfts.bulkUpdate(
      updates.map((item: any) => {
        const { nftMint, ...changes } = item
        return {
          key: nftMint,
          changes,
        }
      })
    )
  }

  async function updateOwnerForNfts(mints: Nft[], owner: string) {
    await db.nfts.bulkUpdate(
      mints.map((mint) => {
        return {
          key: mint.nftMint,
          changes: {
            owner,
          },
        }
      })
    )
  }

  async function stakeNft(mint: string) {
    await db.nfts.update(mint, {
      status: "staked",
    })
  }

  async function unstakeNft(mint: string) {
    await db.nfts.update(mint, {
      status: null,
    })
  }

  async function addNftsToVault(nfts: Nft[], owner: string) {
    await db.nfts.bulkUpdate(
      nfts.map((nft) => {
        return {
          key: nft.nftMint,
          changes: {
            status: "inVault",
          },
        }
      })
    )
  }

  async function removeNftsFromVault(nfts: Nft[], owner: string) {
    await db.nfts.bulkUpdate(
      nfts.map((nft) => {
        return {
          key: nft.nftMint,
          changes: {
            status: null,
          },
        }
      })
    )
  }

  async function updateOrder(nfts: any[], key: string) {
    await db.transaction("rw", db.order, async () => {
      const all = await db.order.toArray()
      const [toUpdate, toAdd] = partition(nfts, (nft) => all.map((a) => a.nftMint).includes(nft.nftMint))

      if (toAdd.length) {
        await db.order.bulkAdd(
          toAdd.map((item) => {
            return {
              nftMint: item.nftMint,
              [key]: item.sortedIndex,
            }
          })
        )
      }

      if (toUpdate.length) {
        await db.order.bulkUpdate(
          toUpdate.map((item) => {
            return {
              key: item.nftMint,
              changes: {
                [key]: item.sortedIndex,
              },
            }
          })
        )
      }
    })
  }

  async function getEthNftsWorker(publicKey: string) {
    if (isOffline) {
      return
    }
    const worker = new Worker(new URL("../../public/get-eth-nfts.worker.ts", import.meta.url))
    Object.defineProperty(worker, "type", {
      value: "get-eth-nfts",
      writable: false,
    })
    setWorkers((prevState) => {
      return [...prevState, worker]
    })

    worker.onmessage = async (event) => {
      if (event.data.done) {
        await Promise.all([addNftsToDb(event.data.nfts, publicKey, true), addCollectionsToDb(event.data.collections)])
        worker.terminate()
        setWorkers((prevState) => prevState.filter((w) => w !== worker))
      }

      if (event.data.progress) {
        setLoadedMints((prev) => prev + event.data.progress)
      }

      if (event.data.total) {
        setTotalMints((prev) => prev + event.data.total)
      }
    }

    worker.onerror = () => {
      worker.terminate()
      setWorkers((prevState) => prevState.filter((w) => w !== worker))
    }

    worker.postMessage({ address: publicKey })
  }

  useEffect(() => {
    const relevantWorkers = workers.filter((worker) =>
      ["sync-data", "metadata", "get-eth-nfts"].includes((worker as any).type)
    )
    setSyncing(!!relevantWorkers.length)
  }, [workers])

  async function sync() {
    workers.forEach((worker) => worker.terminate())
    setWorkers([])
    setLoadedMints(0)
    setTotalMints(0)
    if (!publicKey) {
      return
    }

    if (isAdmin && publicKeys.length > 1) {
      publicKeys.map((pk) => (isAddress(pk) ? getEthNftsWorker(pk) : syncDataWorker(pk, undefined, true)))
    } else {
      if (isAddress(publicKey)) {
        getEthNftsWorker(publicKey)
      } else {
        syncDataWorker(publicKey, undefined, true)
      }
    }
  }

  async function updateItem(item: Nft) {
    const changes = {
      nftMint: item.nftMint,
      jsonLoaded: item.jsonLoaded,
    } as any

    if (item.json) {
      changes.json = item.json as NftMetadata
    }
    if (item.helloMoonCollectionId) {
      changes.helloMoonCollectionId = item.helloMoonCollectionId
    }
    await db.nfts.update(item.nftMint, changes)
  }

  async function settleLoans(items: Nft[]) {
    await db.nfts.bulkUpdate(
      items
        .filter((item) => item.loan)
        .map((item) => {
          const changes = {
            loan: {
              ...(item.loan as Loan),
              status: "repaid",
            },
            status: null,
          }
          return {
            key: item.nftMint,
            changes,
          }
        })
    )
  }

  async function nftsDelisted(items: Nft[]) {
    const changes = {
      listing: null,
      status: null,
    }

    await db.nfts.bulkUpdate(
      items.map((item) => {
        return {
          key: item.nftMint,
          changes,
        }
      })
    )
  }

  async function nftsListed(items: Nft[], marketplace: string) {
    await db.nfts.bulkUpdate(
      items.map((item) => {
        const changes = {
          listing: {
            marketplace,
            nftMint: item.nftMint,
            price: item.listing?.price as number,
          },
          status: "listed",
        }
        return {
          key: item.nftMint,
          changes,
        }
      })
    )
  }

  async function nftsSold(items: Nft[]) {
    await db.nfts.bulkUpdate(
      items.map((item) => {
        const changes = {
          owner: null,
        }
        return {
          key: item.nftMint,
          changes,
        }
      })
    )
  }

  async function nftsBought(items: Nft[]) {
    await db.nfts.bulkUpdate(
      items.map((item) => {
        const changes = {
          owner: wallet.publicKey?.toBase58(),
          listing: null,
        }
        return {
          key: item.nftMint,
          changes,
        }
      })
    )
  }

  async function refreshMint(nftMint: string) {
    syncDataWorker(publicKey!, [nftMint])
  }

  async function setLoaned(nftMint: string) {
    await db.nfts.update(nftMint, { status: "loaned" })
  }

  async function updateCollection(id: string, updates: Object) {
    await db.collections.update(id, updates)
  }

  return (
    <DatabaseContext.Provider
      value={{
        syncing,
        db,
        collections,
        deleteNfts,
        updateItem,
        updateNfts,
        sync,
        updateOrder,
        updateOwnerForNfts,
        addNftsToVault,
        removeNftsFromVault,
        stakeNft,
        unstakeNft,
        settleLoans,
        nftsDelisted,
        nftsListed,
        nftsSold,
        nftsBought,
        refreshMint,
        setLoaned,
        syncProgress,
        updateCollection,
      }}
    >
      {children}
    </DatabaseContext.Provider>
  )
}

export const useDatabase = () => {
  return useContext(DatabaseContext)
}
