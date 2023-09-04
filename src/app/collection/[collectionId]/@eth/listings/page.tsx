import { Items } from "@/components/Items"
import { getListingsFromContract } from "@/helpers/opensea"

function EthNft({ item }: { item: any }) {
  console.log(item)
  return null
}

export default async function Page({ params }: { params: Record<string, string> }) {
  const listings = await getListingsFromContract(params.collectionId)
  return <Items items={listings} Component={EthNft} />
}
