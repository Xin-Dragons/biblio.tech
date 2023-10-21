"use client"
import { DigitalAsset } from "@/app/models/DigitalAsset"
import { Sale } from "@/app/models/Sale"
import { ActivityLog } from "@/components/ActivityLog"
import { NftSale } from "@/components/NftSale"
import { useFilters } from "@/context/filters"
import { useSort } from "@/context/sort"
import { MINT, TX, subscribeToChanges } from "@/helpers/tensor"
import { getRecentTransactions } from "@/helpers/tensor-server-actions"
import { usePrevious } from "@/hooks/use-previous"
import { Collection } from "@/types/database"
import { PageCursor } from "@/types/tensor"
import { Box, CircularProgress, Typography } from "@mui/material"
import { isEqual, map } from "lodash"
import { useEffect, useState } from "react"

function Row({ sale, ...props }: { sale: any }) {
  return <NftSale {...props} sale={sale} showItem />
}

export function Client({
  activity: initialActivity,
  collection,
  page: initialPage,
}: {
  activity: any[]
  collection: Collection
  page: PageCursor | null
}) {
  const [activity, setActivity] = useState(initialActivity)
  const { selectedFilters: filters } = useFilters()
  const previousFilters = usePrevious(filters)
  const { sort, doSort } = useSort()
  const previousSort = usePrevious(sort)
  const [page, setPage] = useState<PageCursor | null>(initialPage)

  async function fetch() {
    const selectedFilters = map(filters, (values, traitType) => {
      return {
        traitType,
        values,
      }
    }).filter((item) => item.values.length)

    const activity = (await getRecentTransactions(collection.slug_tensor!, selectedFilters)).map((item: any) => {
      const digitalAsset = new DigitalAsset({
        id: item.mint.onchainId,
        attributes: item.mint.attributes,
        image: item.mint.imageUri,
        name: item.mint.name,
        rarity: {
          howRare: item.mint.rarityRankHR,
          moonRank: item.mint.rarityRankStat,
          tt: item.mint.rarityRankTT,
        },
        isNonFungible: [
          "NON_FUNGIBLE",
          "NON_FUNGIBLE_EDITION",
          "PROGRAMMABLE_NON_FUNGIBLE",
          "PROGRAMMABLE_NON_FUNGIBLE_EDITION",
        ].includes(item.mint.tokenStandard),
        chain: "SOL",
      })

      return new Sale({
        id: item.tx.txId,
        price: item.tx.grossAmount,
        nftId: item.tx.mintOnchainId,
        blocktime: item.tx.txAt,
        buyer: item.tx.buyerId,
        seller: item.tx.sellerId,
        marketplace: item.tx.source,
        type: item.tx.txType,
        chain: "SOL",
        digitalAsset,
      })
    })

    setActivity(activity)
  }

  function receivedItem({ tx, mint }: { tx: TX; mint: MINT }) {
    if (["SALE_ACCEPT_BID", "SALE_BUY_NOW", "SWAP_BUY_SINGLE_LISTING", "SWAP_SELL_NFT"].includes(tx.txType)) {
      const digitalAsset = new DigitalAsset({
        id: mint.onchainId,
        attributes: mint.attributes,
        image: mint.imageUri,
        name: mint.name,
        rarity: {
          howRare: mint.rarityRankHR,
          moonRank: mint.rarityRankStat,
          tt: mint.rarityRankTT,
        },
        isNonFungible: [
          "NON_FUNGIBLE",
          "NON_FUNGIBLE_EDITION",
          "PROGRAMMABLE_NON_FUNGIBLE",
          "PROGRAMMABLE_NON_FUNGIBLE_EDITION",
        ].includes(mint.tokenStandard),
        chain: "SOL",
      })

      const newSale = new Sale({
        id: tx.txId,
        price: Number(tx.grossAmount),
        nftId: tx.mintOnchainId,
        blocktime: tx.txAt,
        buyer: tx.buyerId,
        seller: tx.sellerId,
        marketplace: tx.source,
        type: tx.txType,
        chain: "SOL",
        digitalAsset,
      })

      setActivity((sales) => {
        return [...sales, newSale]
      })
    }
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

  useEffect(() => {
    if ((previousSort && sort !== previousSort) || (previousFilters && !isEqual(previousFilters, filters))) {
      console.log("setting null", previousFilters, filters)
      setPage(null)
      fetch()
    }
  }, [sort, previousSort, filters, previousFilters])

  // useEffect(() => {

  // }, [])

  if (!activity.length) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" width="100%" height="100%">
        {false ? <CircularProgress /> : <Typography>No activity to show</Typography>}
      </Box>
    )
  }
  return <ActivityLog activity={activity} Row={Row} />
}
