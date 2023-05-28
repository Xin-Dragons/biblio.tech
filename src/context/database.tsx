import { FC, ReactNode, createContext, useContext, useEffect, useState } from "react"
import { Collection, DB, Loan, Nft, NftMetadata, Rarity } from "../db"
import { useLiveQuery } from "dexie-react-hooks"
import { useAccess } from "./access"
import { io } from "socket.io-client"
import { StreamClient } from "@hellomoon/api"

import { includes, noop, partition, uniqBy } from "lodash"
import { NftEdition } from "@metaplex-foundation/js"
import { toast } from "react-hot-toast"
import { useSession } from "next-auth/react"
import axios from "axios"

export const MS_PER_DAY = 8.64e7

const db = new DB()

type DatabaseContextProps = {
  db: DB
  sync: Function
  syncing: boolean
  syncingData: boolean
  syncingRarity: boolean
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
  syncingMetadata: boolean
}

const initial = {
  db,
  sync: noop,
  syncing: false,
  syncingData: false,
  syncingRarity: false,
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
  syncingMetadata: false,
}

const DatabaseContext = createContext<DatabaseContextProps>(initial)

type DatabaseProviderProps = {
  children: ReactNode
}

export const DatabaseProvider: FC<DatabaseProviderProps> = ({ children }) => {
  const { publicKey, isActive, isOffline } = useAccess()
  const [syncingData, setSyncingData] = useState(false)
  const [syncingRarity, setSyncingRarity] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const nfts = useLiveQuery(() => db.nfts.where({ owner: publicKey }).toArray(), [publicKey], [])
  const [syncingMetadata, setSyncingMetadata] = useState(false)
  const collections = useLiveQuery(
    () =>
      db.collections
        .where("id")
        .anyOf(nfts.filter((n) => n.collectionIdentifier).map((n) => n.collectionIdentifier as string))
        .toArray(),
    [nfts],
    []
  )

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
    db.transaction("rw", db.collections, async () => {
      const fromDb = await db.collections.toArray()

      const [toAdd, toUpdate] = partition(collections, (collection) => {
        return !fromDb.map((item) => item.id).includes(collection.id)
      })

      await db.collections.bulkAdd(
        toAdd.map((c) => {
          return {
            id: c.id,
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
    db.transaction("rw", db.nfts, async () => {
      const fromDb = await db.nfts.toArray()

      if (remove) {
        const toRemove = fromDb.filter(
          (item) => item.owner === publicKey && !nfts.map((n) => n.nftMint).includes(item.nftMint)
        )

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

      const [toAdd, toUpdate] = partition(
        uniqBy(nfts, (nft) => nft.nftMint),
        (nft) => {
          return !fromDb.map((item: any) => item.nftMint).includes(nft.nftMint)
        }
      )

      await db.nfts.bulkAdd(toAdd)

      await db.nfts.bulkUpdate(
        toUpdate.map((n) => {
          const changes = n

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
      syncDataWorker(toAdd.map((txn: any) => txn.mint))
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

  useEffect(() => {
    if (!publicKey) return
    syncDataWorker()
  }, [publicKey])

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
    setSyncingMetadata(true)
    const worker = new Worker(new URL("../../public/get-metadata.worker.ts", import.meta.url))
    worker.addEventListener("message", async (event) => {
      setSyncingMetadata(false)
      await updateMetadata(event.data.metadata)
    })

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

  function syncDataWorker(mints?: string[], force?: boolean) {
    if (isOffline) {
      return
    }
    setSyncingData(true)
    const worker = new Worker(new URL("../../public/get-data.worker.ts", import.meta.url))
    worker.addEventListener("message", async (event) => {
      const { type } = event.data
      if (type === "get-rarity") {
        syncRoyaltiesWorker(event.data.nfts, event.data.force)
        syncMetadataWorker(event.data.nfts, event.data.force)
      } else if (type === "done") {
        setSyncingData(false)
        await Promise.all([
          addNftsToDb(event.data.nftsToAdd, publicKey!, !mints),
          addCollectionsToDb(event.data.collectionsToAdd),
        ])
      } else if (type === "error") {
        setSyncingData(false)
        worker.terminate()
      }
    })
    worker.postMessage({ publicKey, force, mints })

    worker.addEventListener("error", () => {
      worker.terminate()
      setSyncingData(false)
    })

    return () => {
      worker.terminate()
      setSyncingData(false)
    }
  }

  async function syncRoyaltiesWorker(nfts: Nft[], force?: boolean) {
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

    setSyncingRarity(true)
    const worker = new Worker(new URL("../../public/get-rarity-worker.ts", import.meta.url))
    worker.addEventListener("message", async (event) => {
      await updateRarity(event.data.updates)
      setSyncingRarity(false)
    })
    worker.addEventListener("error", () => {
      worker.terminate()
      setSyncingRarity(false)
    })
    worker.postMessage({ nfts: toUpdate })
    return () => {
      worker.terminate()
      setSyncingRarity(false)
    }
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

  async function deleteNfts(nfts: string[]) {
    const a = await db.nfts
      .where("nftMint")
      .anyOf(...nfts)
      .delete()
  }

  async function updateNfts(updates: Nft[]) {
    await db.nfts.bulkUpdate(
      updates.map((item) => {
        const { nftMint, ...changes } = item
        return {
          key: nftMint,
          changes,
        }
      })
    )
  }

  async function updateOwnerForNfts(mints: string[], owner: string) {
    await db.nfts.bulkUpdate(
      mints.map((mint) => {
        return {
          key: mint,
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

  async function addNftsToVault(mints: string[], owner: string) {
    await db.nfts.bulkUpdate(
      mints.map((mint) => {
        return {
          key: mint,
          changes: {
            status: "inVault",
          },
        }
      })
    )
  }

  async function removeNftsFromVault(mints: string[], owner: string) {
    await db.nfts.bulkUpdate(
      mints.map((mint) => {
        return {
          key: mint,
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

  useEffect(() => {
    setSyncing(syncingData || syncingRarity || syncingMetadata)
  }, [syncingData, syncingRarity, syncingMetadata])

  async function sync() {
    if (!publicKey || syncing) {
      return
    }

    syncDataWorker(undefined, true)
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

  return (
    <DatabaseContext.Provider
      value={{
        syncing,
        syncingData,
        syncingRarity,
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
        syncingMetadata,
      }}
    >
      {children}
    </DatabaseContext.Provider>
  )
}

export const useDatabase = () => {
  return useContext(DatabaseContext)
}
