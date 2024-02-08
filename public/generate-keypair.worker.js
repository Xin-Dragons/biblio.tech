import { Keypair } from "@solana/web3.js"

self.addEventListener("message", (event) => {
  let { prefix, caseSensitive } = event.data
  const regex = new RegExp(`^${prefix}`, `${caseSensitive ? "" : "i"}`)

  let keypair = Keypair.generate()
  while (!regex.test(keypair.publicKey.toBase58())) {
    keypair = Keypair.generate()
  }

  self.postMessage({ keypair })
})
