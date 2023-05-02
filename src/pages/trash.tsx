import { useLiveQuery } from "dexie-react-hooks";
import { Items } from "../components/Items";
import { Layout } from "../components/Layout";
import { NextPage } from "next";
import { useDatabase } from "../context/database";
import { useFilters } from "../context/filters";

const Trash: NextPage = () => {
  const { db } = useDatabase();
  const { search } = useFilters();
  const trash = useLiveQuery(() => db && db
    .nfts
    .filter(item => !item.helloMoonCollectionId && item.jsonLoaded && !item.json)
    .toArray(),
    [db],
    []
  ) || []

  const filtered = trash.filter(nft => {
    if (!search) {
      return true
    }

    const s = search.toLowerCase();
    const name = nft.json?.name || nft.name || ""
    const symbol = nft.json?.symbol || nft.symbol || ""
    const description = nft.json?.description || ""
    const values = (nft.json?.attributes || []).map(att => `${att.value || ""}`.toLowerCase())
    return name.toLowerCase().includes(s) ||
      description.toLowerCase().includes(s) ||
      symbol.toLowerCase().includes(s) ||
      values.some(val => val.includes(s))
  })

  return (
    <Layout title="Trash" nfts={trash} filtered={filtered}>
      <Items items={filtered} />
    </Layout>
  )
}

export default Trash;