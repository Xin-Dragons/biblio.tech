import { Network, Alchemy, OwnedNftsResponse, OwnedNft } from "alchemy-sdk";
import axios from "axios";
import { add, filter, flatten, groupBy } from "lodash";

type Chain = "eth" | "matic"

interface OwnedNftWithChain extends OwnedNft {
  chain: Chain
}

async function getNftsForAddress(address: string, network: Network, onProgress: Function, setTotal: Function, pageKey?: string): Promise<OwnedNftWithChain[]> {
  const settings = {
    apiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY,
    network
  }
  
  const alchemy = new Alchemy(settings);

  const nfts = await alchemy.nft.getNftsForOwner(address, { pageKey });
  if (!pageKey) {
    setTotal(nfts.totalCount)
  }
    
  onProgress(nfts.ownedNfts.length)
  if (nfts.pageKey) {
    return [
      ...nfts.ownedNfts.map(nft => {
        return {
          ...nft,
          chain: network === Network.ETH_MAINNET ? "eth" : "matic" as Chain
        }
      }),
      ...(await getNftsForAddress(address, network, onProgress, setTotal, nfts.pageKey))
    ]
  }
  return nfts.ownedNfts.map(nft => {
    return {
      ...nft,
      chain: network === Network.ETH_MAINNET ? "eth" : "matic" as Chain
    }
  })
}

self.addEventListener("message", async event => {
  const { address } = event.data;

  const { data } = await axios.get('/api/open-sea-get-collections', { params: { address } })

  const openSeaCollections = data.map((item: any) => {
    const id = item.primary_asset_contracts[0]?.address;
    return {
      id,
      slug: item.slug,
      collectionName: item.name,
      description: item.description,
      image: item.image_url,
      floorPrice: item.stats.floor_price,
      safeList: item.safelist_request_status,
      royalties: item.opensea_seller_fee_basis_points,
      enforcedRoyalties: item.is_creator_fees_enforced,
      website: item.external_url,
      twitter: item.twitter_username,
      discord: item.discord_url,
      banner: item.banner_image_url
    }
  })
  .filter((item: any) => item.id)

  let loaded = 0;

  function onProgress(progress: number) {
    self.postMessage({ progress })
    // console.log(`Loaded ${loaded += num}`)
  }

  function setTotal(total: number) {
    self.postMessage({ total })
  }

  const nfts = flatten(await Promise.all([
    Network.ETH_MAINNET,
    Network.MATIC_MAINNET
  ].map(async network => await getNftsForAddress(address, network, onProgress, setTotal))))
    .map(nft => {
      const nftMint = `${nft.contract.address}.${nft.tokenId}`

      return {
        ...nft,
        chain: nft.chain,
        nftMint,
        collectionIdentifier: nft.contract.address,
        collectionId: nft.contract.address,
        name: nft.title || nft.rawMetadata?.name || "Unknown",
        json: nft.rawMetadata,
        jsonLoaded: true,
        owner: address,
        thumbnail: nft.media[0]?.thumbnail,
        compressed: nft.media[0]?.gateway,
        mint: {

        },
        metadata: {
          tokenStandard: 0
        },
      }
    })

  let collections = Object.values(groupBy(nfts, nft => nft.collectionId)).map(item => item[0])
    .map(item => {
      const contract = item.contract
      return {
        id: contract.address,
        chain: item.chain,
        collectionName: contract.name,
        name: contract.name || "Unknown collection",
        description: contract.openSea?.description,
        image: contract.openSea?.imageUrl,
        nftImage: item.json?.image,
        floorPrice: contract.openSea?.floorPrice,
        floorPriceCurrency: "eth",
        safeList: contract.openSea?.safelistRequestStatus,
        twitter: contract.openSea?.twitterUsername,
        discordUrl: contract.openSea?.discordUrl
      }
    })
    .map((item: any) => {
      const collection = openSeaCollections.find((c: any) => c.id === item.id);
      if (!collection) {
        return {
          ...item,
          image: item.image || item.nftImage
        }
      }
      return {
        id: item.id,
        slug: collection.slug,
        chain: item.chain,
        collectionName: collection.collectionName || item.collectionName,
        name: collection.name || item.name,
        description: collection.description || item.description,
        image: collection.image || item.image || item.nftImage,
        floorPrice: item.floorPrice,
        safeList: item.safeList || collection.safeList,
        twitter: item.twitter || collection.twitter,
        discordUrl: item.discordUrl || collection.discordUrl,
      }
    })

  const missingFp = collections.filter(c => c.image && !c.floorPrice).map(item => item.slug).filter(Boolean);
  if (missingFp.length) {
    const { data: collectionStats } = await axios.post('/api/open-sea-get-collection-stats', { slugs: missingFp });
    collections = collections.map(c => {
      const stats = collectionStats.find((cs: any) => cs.slug === c.slug);
      if (stats) {
        return {
          ...c,
          floorPrice: stats.floor_price
        }
      }
      return c
    })
  }


  self.postMessage({ done: true, collections, nfts })
})