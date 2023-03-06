import { useLiveQuery } from "dexie-react-hooks"
import { useDatabase } from "../../context/database"
import { Layout } from "../../components/Layout"
import { Items } from "../../components/Items"
import { useState } from "react"
import { NextPage } from "next"

const Untagged: NextPage = () => {
  const [open, setOpen] = useState(false);
  const { db } = useDatabase()

  const taggedNfts = useLiveQuery(() => db && db
    .taggedNfts
    .toArray(),
    [db],
    [] 
  ) || [];

  const nfts = useLiveQuery(() => db && db
    .nfts
    .where('nftMint')
    .noneOf(taggedNfts.map(t => t.nftId))
    .toArray(),
    [db, taggedNfts],
    [] 
  ) || [];

  return <Layout nfts={nfts} tagId="untagged" title="Untagged">
    <Items items={nfts} />
  </Layout>
}

export default Untagged;