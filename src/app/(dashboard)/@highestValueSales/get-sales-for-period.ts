"use server"
import { fetchAllDigitalAssetsByIds } from "@/helpers/digital-assets"
import { getAllSalesInPeriod } from "@/helpers/hello-moon-server-actions"
import { withMappedCurrency } from "@/helpers/utils"
import { DAS } from "helius-sdk"
import { orderBy } from "lodash"

export async function getSalesForPeriod(hours: number) {
  let sales = orderBy(
    await getAllSalesInPeriod(hours, 10),
    (item) => {
      return item.price
    },
    "desc"
  )

  const outliers = sales.filter((s) => s.price > 1000)
  const mapped = await Promise.all(outliers.map(withMappedCurrency))
  const toRemove = mapped.filter((item) => item.currency).map((t) => t.transactionId)
  if (toRemove.length) {
    sales = sales.filter((item) => !toRemove.includes(item.transactionId))
  }

  const mints = sales.map((s) => s.nftMint)
  const das = (await fetchAllDigitalAssetsByIds(mints)).filter(Boolean)

  return sales
    .map((s) => {
      const da = das.find((da: DAS.GetAssetResponse) => da.id === s.nftMint)
      return {
        ...s,
        digitalAsset: da,
      }
    })
    .filter((s) => s.digitalAsset && s.digitalAsset.content.links.image)
}
