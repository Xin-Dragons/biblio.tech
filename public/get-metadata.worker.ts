import { Metaplex, Nft, PublicKey, Sft } from "@metaplex-foundation/js";
import { Connection } from "@solana/web3.js";
import { chunk, flatten } from "lodash";

const connection = new Connection(process.env.NEXT_PUBLIC_RPC_HOST!)
const metaplex = new Metaplex(connection);

async function getItem(mint: string, retries = 3): Promise<any> {
  try {
    const nft = await metaplex.nfts().findByMint({ mintAddress: new PublicKey(mint)})
    return nft;
  } catch {
    if (retries) {
      return getItem(mint, --retries);
    } else {
      return null
    }
  }
}

async function getMetadata(mints:  string[]) {
  const batches = chunk(mints, 100);
  const results: any = []
  await batches.reduce((promise: any, batch: string[]) => {
    return promise.then(async() => {
      const items = await Promise.all(batch.map(async item => await getItem(item)))
      results.push(items)
      return;
    })
  }, Promise.resolve())

  return flatten(results)

  // return await Promise.all(batches.map(async batch => {
  //   const nfts = await Promise.all(batch.map(getItem))
  //   return nfts;
  // }))
}

self.addEventListener("message", async event => {
  try {
    const { mints } = event.data;
  
    const metadata = await getMetadata(mints)
  
    self.postMessage({ metadata: mints.map((m: string) => {
      try {
        const result = metadata.find((meta: any) => meta?.mint?.address?.toBase58() === m) as Nft | Sft
        if (result) {
          return {
            nftMint: m,
            json: result.json,
            jsonLoaded: result.jsonLoaded
          }
        } else {
          return {
            nftMint: m
          }
        }
      } catch {
        return {
          nftMint: m
        }
      }
    }) });
  } catch (err: any) {
    console.log(err)
    self.postMessage({ok: true});
  }
})