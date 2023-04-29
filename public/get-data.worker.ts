import { Connection } from "@solana/web3.js";
import { DB, NftMetadata } from "../src/db";
import { Metadata, Metaplex, Nft } from "@metaplex-foundation/js";
import { PublicKey } from "@solana/web3.js";
import { LeaderboardStatsRequest, NftMintsByOwner, NftMintsByOwnerRequest, RestClient } from "@hellomoon/api";
import { partition, uniq, uniqBy } from "lodash";
import axios from "axios";

const client = new RestClient(process.env.NEXT_PUBLIC_HELLO_MOON_API_KEY as string);

async function addCollectionsToDb(db, collections: any[]) {
  db.transaction('rw', db.collections, async () => {
    const fromDb = await db.collections.toArray();

    const [toAdd, toUpdate] = partition(collections, collection => {
      return !fromDb.map(item => item.helloMoonCollectionId).includes(collection.helloMoonCollectionId)
    })

    await db.collections.bulkAdd(toAdd.map(c => {
      return {
        helloMoonCollectionId: c.helloMoonCollectionId,
        collectionName: c.collectionName,
        image: c.sample_image,
        floorPrice: c.floorPrice
      }
    }))

    await db.collections.bulkUpdate(toUpdate.map(c => {
      const changes = {
        collectionName: c.collectionName,
        floorPrice: c.floorPrice
      }

      if (c.image) {
        changes.image = c.sample_image;
      }
      return {
        key: c.helloMoonCollectionId,
        changes
      };
    }))
  })
}

async function addNftsToDb(db, nfts: any[]) {
  db.transaction('rw', db.nfts, async () => {
    const fromDb = await db.nfts.toArray();

    const [toAdd, toUpdate] = partition(nfts, nft => {
      return !fromDb.map(item => item.nftMint).includes(nft.nftMint)
    })

    await db.nfts.bulkAdd(toAdd.map(n => {
      return {
        nftMint: n.nftMint,
        helloMoonCollectionId: n.helloMoonCollectionId,
        nftCollectionMint: n.nftCollectionMint,
        tokenStandard: n.tokenStandard || n.tokenStandard === 0
          ? n.tokenStandard
          : n.type === "metaplex" ? 0 : null,
        sellerFeeBasisPoints: n.sellerFeeBasisPoints,
        json: n.json,
        name: n.name,
        symbol: n.symbol,
        jsonLoaded: n.jsonLoaded,
        sortedIndex: n.sortedIndex
      }
    }))

    await db.nfts.bulkUpdate(toUpdate.map(n => {
      const prev = fromDb.find(nft => nft.nftMint === n.nftMint)
      const changes = {
        nftMint: n.nftMint,
        nftCollectionMint: n.nftCollectionMint,
        sellerFeeBasisPoints: n.sellerFeeBasisPoints,
        tokenStandard: n.tokenStandard || n.tokenStandard === 0
          ? n.tokenStandard
          : n.type === "metaplex" ? 0 : null,
        name: n.name,
        symbol: n.symbol,
      }

      if (n.json) {
        changes.json = n.json as NftMetadata
        changes.jsonLoaded = n.jsonLoaded
      }

      if (!prev.sortedIndex && prev.sortedIndex !== 0) {
        changes.sortedIndex = n.sortedIndex;
      }

      if (n.helloMoonCollectionId) {
        changes.helloMoonCollectionId = n.helloMoonCollectionId;
      }

      return {
        key: n.nftMint,
        changes
      };
    }))
  })
}


async function getOwnedHelloMoonNfts(ownerAccount: string, paginationToken?: string): Promise<NftMintsByOwner[]> {
  const result = await client.send(new NftMintsByOwnerRequest({
    ownerAccount,
    limit: 1000,
    paginationToken
  }))

  if (result.paginationToken) {
    
    return [
      ...result.data,
      ...(await getOwnedHelloMoonNfts(ownerAccount, result.paginationToken))
    ]
  }

  return result.data
}

async function getCollections(collectionIds: string[]) {
  const collections = await client.send(new LeaderboardStatsRequest({
    limit: 1000,
    helloMoonCollectionId: collectionIds,
    granularity: "ONE_DAY"
  }))
  return uniqBy(collections.data, item => item.helloMoonCollectionId)
}

const connection = new Connection(process.env.NEXT_PUBLIC_RPC_HOST as string, {
  httpHeaders: {
    Authorization: `Bearer ${process.env.NEXT_PUBLIC_HELLO_MOON_API_KEY}`
  }
})

const metaplex = Metaplex.make(connection);

self.addEventListener("message", async event => {
  let { publicKey, collectionId, type } = event.data;
  const db = new DB(publicKey);

  const [nfts, helloMoonNfts] = await Promise.all([
    metaplex.nfts().findAllByOwner({ owner: new PublicKey(publicKey) }),
    getOwnedHelloMoonNfts(publicKey)
  ])

  const nftsWithNftMint = nfts
    .filter(Boolean)
    .map(nft => {
      return {
        ...nft,
        nftMint: nft.mintAddress.toBase58()
      }
    })
  
  const combined = nftsWithNftMint.map(nft => {
    const helloMoonNft = helloMoonNfts.find(hm => hm.nftMint === nft.nftMint);
    // .filter(hm => nftsWithNftMint.map(n => n.nftMint).includes(hm.nftMint)).map(hm => {
    // const nft = nfts.find(n => n.mintAddress.toBase58() === hm.nftMint);
    return {
      ...nft,
      ...helloMoonNft
    }
  })

  const nftPerCollection = uniqBy(
    combined.filter(item => item.helloMoonCollectionId),
    item => item.helloMoonCollectionId
  );

  const collections = await getCollections(nftPerCollection.map(n => n.helloMoonCollectionId) as string[])
  collections.forEach(collection => {
    const nfts = combined.filter(n => n.helloMoonCollectionId === collection.helloMoonCollectionId)
    nfts.sort((a, b) => a.nftMint.localeCompare(b.nftMint)).forEach((item, sortedIndex) => {
      item.sortedIndex = sortedIndex;
    })
  })
  await Promise.all([
    addCollectionsToDb(db, collections),
    addNftsToDb(db, combined)
  ])

  self.postMessage({ok: true})
})