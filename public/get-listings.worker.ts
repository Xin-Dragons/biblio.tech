import { getListings } from "@/helpers/hello-moon"

self.addEventListener("message", async (event) => {
  try {
    const { helloMoonCollectionId, publicKey } = event.data
    const listings = (await getListings(helloMoonCollectionId, publicKey)).sort((a, b) => a.price - b.price)
    self.postMessage({ listings })
  } catch (err: any) {
    console.log(err)
    self.postMessage({ ok: false })
  }
})
