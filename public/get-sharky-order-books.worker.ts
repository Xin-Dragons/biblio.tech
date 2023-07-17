import NodeWallet from "@project-serum/anchor/dist/cjs/nodewallet"
import { OrderBook, createProvider, createSharkyClient, enabledOrderBooks } from "@sharkyfi/client"
import { Connection, Keypair } from "@solana/web3.js"
import { flatten, noop } from "lodash"

const connection = new Connection(process.env.NEXT_PUBLIC_RPC_HOST!, { commitment: "processed" })

process.env.ANCHOR_PROVIDER_URL = process.env.NEXT_PUBLIC_RPC_HOST
const provider = createProvider(connection, new NodeWallet(Keypair.generate()))
const sharkyClient = createSharkyClient(provider)

const { program } = sharkyClient

async function getSharkyOrderBooks() {
  const orderBooks = await sharkyClient.fetchAllOrderBooks({ program })
  const collectionNames = await sharkyClient.fetchAllNftLists({ program })

  const nftListPubKeyToNameMap = Object.fromEntries(
    collectionNames.map(({ pubKey, collectionName }) => [pubKey, collectionName])
  )

  const orderBooksByName = flatten(
    orderBooks.map((ob: OrderBook) => [
      {
        collectionId: nftListPubKeyToNameMap[ob.orderBookType.nftList!.listAccount.toString()],
        pubkey: ob.pubKey.toString(),
        enabled: enabledOrderBooks.includes(ob.pubKey.toString()),
      },
    ])
  )

  return orderBooksByName.filter((item) => Boolean(item.collectionId))
}

self.addEventListener("message", async (event) => {
  try {
    const { nfts } = event.data

    const orderBooks = await getSharkyOrderBooks()

    self.postMessage({ orderBooks, ok: true })
  } catch {
    self.postMessage({ ok: false })
  }
})
