import { getListings } from "@/helpers/hello-moon"

self.addEventListener("message", async (event) => {
  try {
    const { helloMoonCollectionId, publicKey } = event.data
    console.log("WUT")
    const listings = await getListings(helloMoonCollectionId, publicKey)
    console.log({ listings })

    self.postMessage({ listings })
  } catch (err: any) {
    console.log(err)
    self.postMessage({ ok: false })
  }
})
