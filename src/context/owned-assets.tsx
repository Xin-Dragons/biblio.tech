"use client"
import { umi } from "@/app/helpers/umi"
import { DigitalAsset } from "@/app/models/DigitalAsset"
import db from "@/db"
import { fetchAllDigitalAssetsByIds, getAllDigitalAssetsByOwner } from "@/helpers/digital-assets"
import { TokenState, fetchAllDigitalAssetWithTokenByOwner } from "@metaplex-foundation/mpl-token-metadata"
import { useWallet } from "@solana/wallet-adapter-react"
import { useLiveQuery } from "dexie-react-hooks"
import { publicKey as umiPublicKey, unwrapOption } from "@metaplex-foundation/umi"
import { TokenState as LegacyTokenState } from "@metaplex-foundation/mpl-toolbox"
import { PropsWithChildren, createContext, useContext, useEffect, useState } from "react"
import { flatten, groupBy, isEqual, merge, omit, pick, uniq } from "lodash"
import { getInventoryByCollection } from "@/app/wallet/get-inventory-by-collection"
import { getActiveLoansForUser } from "@/helpers/hello-moon-server-actions"
import { STAKING_AUTHS } from "@/constants"
import { DAS } from "helius-sdk"
import { Listing } from "@/app/models/Listing"
import { subscribeToWalletChanges } from "@/helpers/tensor"
import { usePublicKey } from "./public-key"
import { useProfile } from "./profile"
import { getProfile } from "@/app/helpers/supabase"

const Context = createContext<{ digitalAssets: DigitalAsset[]; collections: any[] } | undefined>(undefined)

export function OwnedAssetsProvider({ children, publicKey }: PropsWithChildren<{ publicKey?: string }>) {
  const profile = useProfile()

  const [active, setActive] = useState(false)
  const connectedPublicKey = usePublicKey()

  const address = publicKey || connectedPublicKey

  const digitalAssets = useLiveQuery(
    () => {
      if (!address) {
        return []
      }
      return db.digitalAssets.where("owner").equals(address).toArray()
    },
    [address],
    []
  ).map((item) => new DigitalAsset(item))

  const collections = useLiveQuery(
    () => {
      if (!digitalAssets.length) {
        return []
      }
      const ids = digitalAssets.map((da) => da.collection?.slugDisplay || da.collection?.slug || "unknown")
      return db.collections.where("id").anyOf(ids).toArray()
    },
    [digitalAssets.length],
    []
  ).map((c) => {
    const mints = digitalAssets.filter(
      (da) => c.id === (da.collection?.slugDisplay || da.collection?.slug || "unknown")
    )
    return {
      ...c,
      mints,
      estimatedValue: mints.reduce((sum, item) => sum + item.estimatedValue, 0),
    }
  })

  async function receivedItem(item: any) {
    console.log(item, item.status, digitalAssets.length)
    if (item.status !== "CONFIRMED" || !digitalAssets.length) {
      return
    }

    console.log(item)

    if (item.action === "LIST") {
      const toUpdate = item.mints
        .map((mint: string, index: number) => {
          const da = digitalAssets.find((d) => d.id === mint)
          if (!da) {
            return null
          }

          const amount = item.amounts[index]

          da.listing = new Listing({
            id: item.sig,
            nftId: mint,
            price: amount,
            currency: "SOL",
            blocktime: item.attemptedAt,
            seller: item.wallet,
            marketplace: item.mp,
          })

          da.status = "LISTED"

          return da
        })
        .filter(Boolean)

      if (toUpdate.length) {
        await db.digitalAssets.bulkPut(toUpdate)
      }
    } else if (item.action === "DELIST") {
      const toUpdate = item.mints
        .map((mint: string) => {
          const da = digitalAssets.find((d) => d.id === mint)
          if (!da) {
            return null
          }

          delete da.listing
          da.status = "NONE"

          return da
        })
        .filter(Boolean)

      console.log({ toUpdate })

      if (toUpdate.length) {
        await db.digitalAssets.bulkPut(toUpdate)
      }
    } else if (item.action === "BUY") {
      if (item.wallet !== address) {
        await db.digitalAssets.bulkDelete(item.mints)
      } else {
        // const newDigitalAssets = await getAllDigitalAssetsWithCollection(item.mints)
        // if (newDigitalAssets.length) {
        // }
      }
    }

    // if (item.action === "DELIST") {
    //   const item =
    // }

    // if (item.action === "BUY") {

    // }
  }

  useEffect(() => {
    if (!address || !digitalAssets.length) {
      return
    }
    console.log("SUBSCRIBING", address)
    const conn = subscribeToWalletChanges(address)
    if (!conn) {
      return
    }
    const sub = conn.subscribe({
      next({ data }) {
        if (data.newUserTransaction) {
          receivedItem(data.newUserTransaction)
        }
      },
      error(err) {
        console.error("err", err)
      },
    })

    return () => {
      sub?.unsubscribe()
    }
  }, [address, digitalAssets.length])

  useEffect(() => {
    if (!address || active) {
      return
    }
    ;(async () => {
      try {
        setActive(true)
        const [items, assets, byCollection, loans, profile] = await Promise.all([
          getAllDigitalAssetsByOwner(address),
          fetchAllDigitalAssetWithTokenByOwner(umi, umiPublicKey(address)),
          getInventoryByCollection(address),
          getActiveLoansForUser(address),
          getProfile(address),
        ])

        db.collections.bulkPut(
          byCollection.map((c) => {
            return {
              id: c.slugDisplay || c.slug,
              ...omit(c, "mints"),
            }
          })
        )

        const loanedMints = loans.map((l) => l.collateralMint)

        const collectionMints = flatten(byCollection.map((c: any) => c.mints))

        const fetchedIds = items.map((i) => i.id)
        const toFetch = collectionMints.filter((c) => !fetchedIds.includes(c.onchainId)).map((f) => f.onchainId)
        let fetched: DAS.GetAssetResponse[] = []
        if (toFetch.length) {
          fetched = await fetchAllDigitalAssetsByIds(toFetch)
        }

        const withCollections = [...items, ...fetched].filter(Boolean).map((item) => {
          const withC: any = collectionMints.find((c: any) => c.onchainId === item.id)
          if (!withC) {
            console.log("NO COLL")
            return item
          }

          return {
            ...item,
            collectionId: withC.collection.slugDisplay || withC.collection.slug,
            collection: withC.collection,
            floor: withC.collection.statsV2?.buyNowPrice,
            lastSale: withC.lastSale,
            howRare: withC.rarityRankHR,
            moonRank: withC.rarityRankStat,
            numMints: withC.collection.statsV2?.numMints,
            verified: withC.collection.tensorVerified,
            listing: withC.listing
              ? new Listing({
                  id: withC.listing.txId,
                  nftId: withC.id,
                  price: withC.listing.grossAmount,
                  marketplace: withC.listing.source,
                  seller: withC.listing.sellerId,
                  blocktime: withC.listing.txAt,
                  currency: "SOL",
                })
              : null,
          }
        })

        const withStatus = withCollections.map((item) => {
          if (item.listing) {
            return {
              ...item,
              status: "LISTED",
            }
          }
          const asset = assets.find((a) => a.publicKey === item.id)
          let status = "NONE"
          let delegate: string | undefined = undefined
          if (!asset) {
            console.log("bailing")
            return item
          }
          if (asset.tokenRecord) {
            const tokenRecordState = TokenState[asset.tokenRecord.state]
            const tokenRecordDelegate = unwrapOption(asset.tokenRecord.delegate)
            if (tokenRecordDelegate) {
              delegate = tokenRecordDelegate
            }
            if (tokenRecordState === "Locked") {
              status = "FROZEN"
            } else if (tokenRecordState === "Unlocked") {
              status = "NONE"
            }
          } else if (asset.token) {
            const tokenDelegate = unwrapOption(asset.token.delegate)
            if (tokenDelegate) {
              delegate = tokenDelegate
            }
            const tokenState = LegacyTokenState[asset.token.state]
            if (tokenState === "Frozen") {
              status = "FROZEN"
            } else if (tokenState === "Initialized") {
              status = "NONE"
            }
          }

          const wallets = [address, ...(profile?.wallets || []).map((w) => w.public_key)]

          if (status === "FROZEN") {
            if (delegate && STAKING_AUTHS.includes(delegate)) {
              status = "STAKED"
            } else if (delegate && loanedMints.includes(item.id)) {
              status = "COLLATERALIZED"
            } else if (delegate && uniq(wallets).includes(delegate)) {
              status = "SECURED"
            }
          } else if (delegate && status === "NONE") {
            status = "DELEGATED"
          }

          return {
            ...item,
            status,
          }
        })

        const toAdd = withStatus.map((item) => DigitalAsset.solana(item))
        const all = await db.digitalAssets.toArray()

        const toUpdate = toAdd
          .map((item) => {
            const da = all.find((a) => a.id === item.id)
            return merge({
              ...da,
              ...item,
              ...pick(da, "topTrait", "valuationMethod", "userValuation"),
            })
          })
          .filter(Boolean)

        const allIds = toUpdate.map((i) => i.id)
        const existing = await db.digitalAssets.where("owner").equals(address).toArray()
        const toDelete = existing.filter((item) => !allIds.includes(item.id)).map((item) => item.id)

        await db.digitalAssets.bulkPut(toUpdate)
        await db.digitalAssets.bulkDelete(toDelete)
      } catch (err) {
        console.log("Error!!", err)
      } finally {
        setActive(false)
      }
    })()
  }, [address])

  return <Context.Provider value={{ digitalAssets, collections }}>{children}</Context.Provider>
}

export const useOwnedAssets = () => {
  const context = useContext(Context)

  if (context === undefined) {
    throw new Error("useOwnedAssets must be used in an OwnedAssetsProvider")
  }

  return context
}
