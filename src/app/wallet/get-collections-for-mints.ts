import { flatten, groupBy } from "lodash"
import { DAS, Scope } from "helius-sdk"
import { getCollections } from "../helpers/supabase"

export async function getCollectionsForMints(digitalAssets: DAS.GetAssetResponse[]) {
  const grouped = groupBy(digitalAssets, (item) => {
    const mcc = item.grouping?.find((g) => g.group_key === "collection")?.group_value
    if (mcc) {
      return mcc
    }

    const fvc = item.creators?.find((c) => c.verified)?.address
    if (fvc) {
      return `${fvc}.${item.content?.metadata.symbol}`
    }

    const ua = item.authorities?.find((c) => c.scopes.includes("full" as Scope))?.address
    if (ua) {
      return `${ua}.${item.content?.metadata.symbol}`
    }
  })

  const mintFromEach = Object.keys(grouped).map((k) => grouped[k][0])

  return flatten(Object.values(grouped))
}
