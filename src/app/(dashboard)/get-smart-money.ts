"use server"
import { fetchAllDigitalAssetsByIds } from "@/helpers/digital-assets"
import { getCollectionIdFromHelloMoonCollectionId, getTopCollections } from "@/helpers/hello-moon-server-actions"
import { DAS } from "helius-sdk"

export async function getSmartMoney(sortBy = "smartMoneyInflow", days = 1) {
  let collections = await getTopCollections(sortBy, days)
  collections = await Promise.all(
    collections.map(async (c: any) => {
      const collectionMint = await getCollectionIdFromHelloMoonCollectionId(c.id)
      return {
        ...c,
        collectionMint,
      }
    })
  )
  const das = await fetchAllDigitalAssetsByIds(collections.map((c: any) => c.collectionMint).filter(Boolean))
  return collections.map((c: any) => {
    const da = das.find((d: DAS.GetAssetResponse) => d.id === c.collectionMint)
    return {
      ...c,
      digitalAsset: da,
    }
  })
}
