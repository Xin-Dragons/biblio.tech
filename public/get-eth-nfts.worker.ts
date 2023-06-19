import { Network, Alchemy } from "alchemy-sdk";
import { flatten, groupBy } from "lodash";

const settings = {
  apiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY,
  network: Network.ETH_MAINNET
}

const alchemy = new Alchemy(settings);

async function getNftsForAddress(address: string) {
  const nfts = await alchemy.nft.getNftsForOwner(address);
  return nfts.ownedNfts.map(item => {
    return {
      ...item,
      owner: address
    }
  })
}

self.addEventListener("message", async event => {
  const { addresses } = event.data;

  const nfts = flatten(await Promise.all(addresses.map(async (address: string) => getNftsForAddress(address))))
    .map(nft => {
      const nftMint = `${nft.contract.address}.${nft.tokenId}`
      return {
        ...nft,
        chain: "eth",
        nftMint,
        collectionIdentifier: nft.contract.address,
        collectionId: nft.contract.address,
        json: nft.rawMetadata,
        jsonLoaded: true,
        mint: {

        },
        metadata: {
          tokenStandard: 0
        },
      }
    })

  const collections = Object.values(groupBy(nfts, nft => nft.collectionId)).map(item => item[0].contract)
    .map(item => {
      return {
        id: item.address,
        chain: "eth",
        collectionName: item.name,
        description: item.openSea.description,
        image: item.openSea.imageUrl,
        floorPrice: item.openSea.floorPrice,
        floorPriceCurrency: "eth",
        safeList: item.openSea.safelistRequestStatus,
        twitter: item.openSea.twitterUsername,
        discordUrl: item.openSea.discordUrl
      }
    })

  self.postMessage({ type: "done", collections, nfts })
})