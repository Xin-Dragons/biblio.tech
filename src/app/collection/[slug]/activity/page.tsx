import { SortProvider } from "@/context/sort"
import { Client } from "./client"
import { FilterBar } from "@/components/FilterBar"
import { getRecentTransactions } from "@/helpers/tensor-server-actions"
import { getCollection } from "@/app/helpers/supabase"
import { Sale } from "@/app/models/Sale"
import { DigitalAsset } from "@/app/models/DigitalAsset"
import { jsonify } from "@/helpers/utils"

export default async function Activity({ params }: { params: Record<string, string> }) {
  const collection = await getCollection(params.slug)
  const activity = (await getRecentTransactions(collection.slug_tensor!)).map((item: any) => {
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
  return (
    <SortProvider defaultSort="blocktime.desc">
      <FilterBar sortOptions={["blocktime", "price"]} />
      <Client activity={jsonify(activity)} collection={collection} />
    </SortProvider>
  )
}
