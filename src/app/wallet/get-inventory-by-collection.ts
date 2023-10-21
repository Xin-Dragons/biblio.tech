import { getTensorInventory } from "@/helpers/tensor-server-actions"
import { groupBy, omit, size } from "lodash"

export async function getInventoryByCollection(address: string) {
  const { inventoryBySlug, userActiveListingsV2 } = await getTensorInventory(address)

  const byCollection = inventoryBySlug.map((collection: any) => {
    const floor = Number(collection.statsV2?.buyNowPrice || 0) * collection.mints.length
    collection.mints = collection.mints.map((mint: any) => {
      return {
        ...mint,
        collection: omit(collection, "mints"),
      }
    })

    return {
      ...collection,
      floor,
    }
  })

  if (userActiveListingsV2.txs.length) {
    const listings = groupBy(userActiveListingsV2.txs, (item) => item.mint.collection.slugDisplay)
    if (size(listings)) {
      Object.keys(listings).map((key) => {
        const items = listings[key].map((item) => {
          return {
            ...item.mint,
            listing: item.tx,
          }
        })
        let collection = byCollection.find((c) => c.slugDisplay === key)
        if (!collection) {
          const newCollection = {
            ...items[0].collection,
            mints: items,
          }
          byCollection.push(newCollection)
        } else {
          collection.mints.push(...items)
        }
      })
    }
  }

  console.log({ byCollection })

  return byCollection
}
