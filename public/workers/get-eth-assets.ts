import { ethAlchemy } from "@/helpers/alchemy"
import { Nft } from "alchemy-sdk"

async function getAlchemyNfts(contractAddress: string): Promise<void> {
  for await (const nft of ethAlchemy.nft.getNftsForContractIterator(contractAddress)) {
    self.postMessage({ nft })
  }
}

self.addEventListener("message", async (event) => {
  const { collectionId } = event.data
  await getAlchemyNfts(collectionId)
})
