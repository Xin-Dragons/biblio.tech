import { useLiveQuery } from "dexie-react-hooks"
import { useDatabase } from "../../context/database"
import { Layout } from "../../components/Layout"
import { Items } from "../../components/Items"
import { useState } from "react"
import { NextPage } from "next"
import { useFilters } from "../../context/filters"

const Untagged: NextPage = () => {
  const [open, setOpen] = useState(false);
  const { db } = useDatabase()
  const { search } = useFilters();

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

  const filtered = search ? nfts.filter(nft => {
    const s = search.toLowerCase();
    const name = nft.json?.name || nft.name || ""
    const symbol = nft.json?.symbol || nft.symbol || ""
    const description = nft.json?.description || ""
    const values = (nft.json?.attributes || []).map(att => `${att.value || ""}`.toLowerCase())
    return name.toLowerCase().includes(s) ||
      description.toLowerCase().includes(s) ||
      symbol.toLowerCase().includes(s) ||
      values.some(val => val.includes(s))
  }) : nfts

  return <Layout nfts={filtered} tagId="untagged" title="Untagged">
    <Items items={filtered} />
  </Layout>
}

export default Untagged;