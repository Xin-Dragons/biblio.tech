import axios from "axios";
import { DB, Nft, Rarity } from "../src/db";

async function getHowRare(mints: any) {
  const { data } = await axios.post('/api/get-howrare', { mints })
  return data;
}

async function getMoonRank(mints: any) {
  const { data } = await axios.post('/api/get-moonrank', { mints })
  return data;
}

async function getRarity(nfts: Nft[]) {
  const mints = nfts.map(n => {
    return {
      nftMint: n.nftMint,
      collectionIdentifier: n.collectionIdentifier
    }
  })

  const [moonRank, howRare] = await Promise.all([
    getMoonRank(mints),
    getHowRare(mints)
  ])

  return {
    moonRank,
    howRare
  }
}

self.addEventListener("message", async event => {
  console.log('rarity started')
  try {
    const { nfts } = event.data;
  
    const rarity = await getRarity(nfts)
  
    const updates = nfts.map((item: Nft) => {
      const howRare = rarity.howRare.find((i: any) => i.nftMint === item.nftMint)
      const moonRank = rarity.moonRank.find((i: any) => i.nftMint === item.nftMint)
  
      return {
        nftMint: item.nftMint,
        ...(howRare ? howRare : {}),
        ...(moonRank ? moonRank : {}),
        lastParsed: Date.now()
      } as Rarity
    })
    console.log('rarity ended')
    self.postMessage({ updates });
  } catch (err) {
    console.log(err)
    console.log('rarity error')
    self.postMessage({ok: true});
  }
})