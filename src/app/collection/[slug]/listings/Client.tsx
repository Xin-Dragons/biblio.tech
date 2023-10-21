"use client"
import { Button, CircularProgress, Stack } from "@mui/material"
import { FilterBar } from "../../../../components/FilterBar"
import { Items } from "@/components/Items"
import { ListingActions } from "./ListingActions"
import { DigitalAsset } from "@/components/DigitalAsset"
import { useEffect, useState } from "react"
import { Listing } from "@/app/models/Listing"
import { useFiltered } from "@/context/filtered"
import { DigitalAsset as DigitalAssetType } from "@/app/models/DigitalAsset"
import { MINT, TX, subscribeToChanges } from "@/helpers/tensor"
import { Collection } from "@/types/database"
import { getTensorListings } from "@/helpers/tensor-server-actions"
import { isEqual, map, uniqBy } from "lodash"
import { useSort } from "@/context/sort"
import { usePrevious } from "@/hooks/use-previous"
import { useFilters } from "@/context/filters"
import { PageCursor } from "@/types/tensor"

export function Client({
  items: initialItems,
  collection,
  page: initialPage,
}: {
  items: DigitalAssetType[]
  collection: Collection
  page: PageCursor | null
}) {
  const [items, setItems] = useState(initialItems)
  const [loading, setLoading] = useState(false)
  const { filter } = useFiltered()
  const { selectedFilters: filters } = useFilters()
  const [page, setPage] = useState<PageCursor | null>(initialPage)
  const { sort, doSort } = useSort()
  const previousFilters = usePrevious(filters)

  console.log({ filters, previousFilters })

  const previousSort = usePrevious(sort)

  function receivedItem({ tx, mint }: { tx: TX; mint: MINT }) {
    if (["LIST", "SWAP_LIST"].includes(tx.txType)) {
      const newListing = getNewListing(tx, mint, { isNew: true })
      addOrUpdate(newListing)
    } else if (["ADJUST_PRICE", "SWAP_EDIT_SINGLE_LISTING"].includes(tx.txType)) {
      const prev = items.find((item) => item.id === mint.onchainId)
      const newListing = getNewListing(tx, mint, { prevPrice: prev?.listing?.price })
      addOrUpdate(newListing)
    } else if (
      ["SALE_ACCEPT_BID", "SALE_BUY_NOW", "SWAP_BUY_NFT", "SWAP_BUY_SINGLE_LISTING", "SWAP_SELL_NFT"].includes(
        tx.txType
      )
    ) {
      setItems((listings) => {
        return listings.map((listing) => {
          if (listing.id === mint.onchainId) {
            return {
              ...listing,
              sold: true,
            }
          }
          return listing
        })
      })
      setTimeout(() => removeItem(mint.onchainId), 5_000)
    } else if (["DELIST", , "SWAP_DELIST"].includes(tx.txType)) {
      removeItem(mint.onchainId)
    }
  }

  function addOrUpdate(newListing: DigitalAssetType) {
    if (items.map((l) => l.id).includes(newListing.id)) {
      setItems((listings) => {
        return listings.map((l) => {
          if (l.id === newListing.id) {
            return newListing
          }
          return l
        })
      })
    } else {
      setItems((listings) => [...listings, newListing])
    }
  }

  function getNewListing(tx: TX, mint: MINT, opts: { isNew?: boolean; prevPrice?: number }) {
    const listing = new Listing({
      id: tx.txId,
      price: Number(tx.grossAmount),
      blocktime: tx.txAt,
      nftId: mint.onchainId,
      seller: tx.sellerId,
      currency: "SOL",
      marketplace: tx.source,
    })

    const digitalAsset = new DigitalAssetType({
      id: mint.onchainId,
      attributes: mint.attributes,
      image: mint.imageUri,
      name: mint.name,
      rarity: {
        howRare: mint.rarityRankHR,
        moonRank: mint.rarityRankStat,
        tt: mint.rarityRankTT,
      },
      lastSale: mint.lastSale,
      chain: "SOL",
      isNonFungible: [
        "NON_FUNGIBLE",
        "NON_FUNGIBLE_EDITION",
        "PROGRAMMABLE_NON_FUNGIBLE",
        "PROGRAMMABLE_NON_FUNGIBLE_EDITION",
      ].includes(mint.tokenStandard),
      listing,
      owner: listing.seller,
    })

    return digitalAsset
  }

  useEffect(() => {
    if ((previousSort && sort !== previousSort) || (previousFilters && !isEqual(previousFilters, filters))) {
      console.log("setting null", previousFilters, filters)
      setPage(null)
      fetch()
    }
  }, [sort, previousSort, filters, previousFilters])

  function removeItem(id: string) {
    setItems((listings) => {
      return listings.filter((l) => l.id !== id)
    })
  }

  useEffect(() => {
    if (!collection.slug) {
      return
    }

    const conn = subscribeToChanges(collection.slug_tensor)
    if (!conn) {
      return
    }
    const sub = conn.subscribe({
      next({ data }) {
        if (data.newTransactionTV2) {
          receivedItem(data.newTransactionTV2)
        }
      },
      error(err) {
        console.error("err", err)
      },
    })
    return () => {
      sub.unsubscribe()
    }
  }, [])

  async function fetch(append?: boolean) {
    console.log("fetching ya")
    if (loading) {
      return
    }

    try {
      setLoading(true)
      const selectedFilters = map(filters, (values, traitType) => {
        return {
          traitType,
          values,
        }
      }).filter((item) => item.values.length)
      const f = selectedFilters.length ? { traits: selectedFilters } : {}
      const listings = await getTensorListings(collection.slug_tensor, sort, f, append ? page.endCursor : null)
      if (!listings?.results.length) {
        return
      }
      if (listings.page) {
        setPage(listings.page)
      }

      const toAdd = listings?.results.map((listing) => {
        return new DigitalAssetType({
          ...listing.digitalAsset,
          listing: new Listing(listing),
        })
      })

      if (append) {
        setItems((items) => {
          return uniqBy([...items, ...toAdd], (item) => item.id)
        })
      } else {
        setItems(toAdd)
      }
    } finally {
      setLoading(false)
    }
  }

  // if (helloMoonCollectionId) {
  //   websocket.onmessage = async (event) => {
  //     const data = JSON.parse(event.data)
  //     const relevant = data.filter((item: any) => item.helloMoonCollectionId === helloMoonCollectionId)
  //     if (!relevant.length) {
  //       return
  //     }

  //     const listedMints = items.map((l) => l.id)
  //     const toFetch = relevant.filter((item: any) => ["ASK", "UPDATE_ASK"].includes(item.marketActionType))
  //     let newDigitalAssets: DigitalAssetType[] = []
  //     if (toFetch.length) {
  //       newDigitalAssets = (await fetchAllDigitalAssetsByIds(toFetch.map((item: any) => item.mint))).map(
  //         (item: DAS.GetAssetResponse) => DigitalAssetType.solana(item)
  //       )
  //     }

  //     relevant.map((item: any) => {
  //       if (["ASK", "UPDATE_ASK"].includes(item.marketActionType)) {
  //         const da = newDigitalAssets.find((da) => item.mint === da.id)
  //         if (!da) {
  //           return
  //         }
  //         da.listing = Listing.fromHelloMoon(item)

  //         if (listedMints.includes(item.mint)) {
  //           setItems((listings) => {
  //             return listings.map((l) => {
  //               if (l.id === item.mint) {
  //                 return da
  //               }
  //               return l
  //             })
  //           })
  //         } else {
  //           setItems((listings) => [...listings, da])
  //         }
  //       } else if (["SALE", "CANCEL_ASK"].includes(item.marketActionType)) {
  //         setItems((listings) => {
  //           return listings.filter((l) => l.id !== item.mint)
  //         })
  //       }
  //     })
  //   }
  // }

  // useEffect(() => {
  //   if (helloMoonCollectionId) {
  //     websocket.onopen = (event) => {
  //       websocket.send(
  //         JSON.stringify({
  //           action: "subscribe",
  //           apiKey: "678c78ac-efa1-42d5-bfea-cc860c73ed3d",
  //           subscriptionId: "84d3f772-c6b3-42ad-a9f5-2521e1253431",
  //         })
  //       )
  //     }
  //   }
  // }, [helloMoonCollectionId])

  const filtered = doSort(filter(items))

  return (
    <Stack height="100%" spacing={1}>
      <FilterBar sortOptions={["price", "lastSale", "rarity", "listed"]} />
      <Items
        items={filtered}
        Component={(props) => <DigitalAsset {...props} numMints={collection.num_mints} />}
        onEndReached={() => {
          if (!page?.hasMore) {
            return
          }
          fetch(true)
        }}
      />
      <ListingActions listings={filtered} loading={loading} />
    </Stack>
  )
}
