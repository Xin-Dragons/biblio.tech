import { Connection } from "@solana/web3.js";
import { DB, NftMetadata } from "../src/db";
import { Metadata, Metaplex, Nft } from "@metaplex-foundation/js";
import { PublicKey } from "@solana/web3.js";
import { LeaderboardStatsRequest, NftMintsByOwner, NftMintsByOwnerRequest, RestClient } from "@hellomoon/api";
import { partition, uniq, uniqBy } from "lodash";

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
        symbol: n.symbol
      }
    }))

    await db.nfts.bulkUpdate(toUpdate.map(n => {
      const changes = {
        nftMint: n.nftMint,
        nftCollectionMint: n.nftCollectionMint,
        sellerFeeBasisPoints: n.sellerFeeBasisPoints,
        tokenStandard: n.tokenStandard || n.tokenStandard === 0
          ? n.tokenStandard
          : n.type === "metaplex" ? 0 : null,
        name: n.name,
        symbol: n.symbol
      }

      if (n.json) {
        changes.json = n.json as NftMetadata
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

  if (type === 'update-nfts') {
    try {
      const nfts = collectionId === "unknown"
        ? await db.nfts.filter(item => !item.helloMoonCollectionId).toArray()
        : await db.nfts.where({ helloMoonCollectionId: collectionId }).toArray()

      const metadatas = (await metaplex.nfts().findAllByMintList({ mints: nfts.map(nft => new PublicKey(nft.nftMint) )})).filter(Boolean)
      const withMeta = await Promise.all(metadatas.map(metadata => metaplex.nfts().load({ metadata })));

      const combined = withMeta.map((nft: Nft) => {
        return {
          ...nfts.find(n => n.nftMint === nft.mint.address.toBase58()),
          ...nft as Nft
        }
      })

      await addNftsToDb(db, combined)
      self.postMessage({ succes: true })
    } catch (err) {
      self.postMessage({ error: true })
    }
  } else {
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

    console.log({helloMoonNfts})
  
    const collections = await getCollections(uniq(combined.map(c => c.helloMoonCollectionId).filter(Boolean)))
  
    await addCollectionsToDb(db, collections)
    await addNftsToDb(db, combined)
  
    self.postMessage({ok: true})
  }
})