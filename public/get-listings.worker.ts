import { getListings } from "@/helpers/hello-moon"

self.addEventListener("message", async (event) => {
  try {
    console.log("IN LISTINGS", event.data)
    const { helloMoonCollectionId, publicKey } = event.data
    console.log({ helloMoonCollectionId, publicKey })
    const listings = (await getListings(helloMoonCollectionId, publicKey)).sort((a, b) => a.price - b.price)
    console.log(listings[0])
    self.postMessage({ listings })
  } catch (err: any) {
    console.log(err)
    self.postMessage({ ok: false })
  }
})
