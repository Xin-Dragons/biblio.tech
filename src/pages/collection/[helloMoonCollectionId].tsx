import { useRouter } from "next/router"
import { Layout } from "../../components/Layout"
import { useEffect, useState } from "react"
import { hmClient } from "../../helpers/hello-moon"
import { CollectionMintsRequest } from "@hellomoon/api"
import { useUmi } from "../../context/umi"
import { DigitalAsset, fetchAllDigitalAsset } from "@metaplex-foundation/mpl-token-metadata"
import { publicKey } from "@metaplex-foundation/umi"
import { Items } from "../../components/Items"

export default function Collection() {
  const router = useRouter()
  const umi = useUmi()
  const [digitalAssets, setDigitalAssets] = useState<DigitalAsset[]>([])
  const helloMoonCollectionId = router.query.helloMoonCollectionId as string

  async function getCollection() {
    console.log("helloMoonCollectionId", helloMoonCollectionId)
    if (!helloMoonCollectionId) {
      return
    }
    const collection = await hmClient.send(
      new CollectionMintsRequest({
        helloMoonCollectionId,
      })
    )

    const das = await fetchAllDigitalAsset(
      umi,
      collection.data.map((item) => publicKey(item.nftMint as string))
    )

    console.log(das)

    setDigitalAssets(das)
  }

  useEffect(() => {
    console.log("GETTING")
    getCollection()
  }, [router.query])

  return (
    <Layout nfts={[]} filtered={[]}>
      {digitalAssets.map((da) => da.metadata.name)}
    </Layout>
  )
}
