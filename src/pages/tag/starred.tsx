import { NextPage } from "next";
import { Layout } from "../../components/Layout";
import { Box } from "@mui/material";
import { Items } from "../../components/Items";
import { useLiveQuery } from "dexie-react-hooks";
import { useDatabase } from "../../context/database";
import { useFilters } from "../../context/filters";

const Starred: NextPage = () => {
  const { db } = useDatabase();
  const { search } = useFilters()
  const nfts = useLiveQuery(() => db && db
    .nfts
    .filter(item => item.starred)
    .toArray(),
    [db],
    []
  ) || []

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

  return (
    <Layout title="Starred" nfts={nfts} filtered={filtered}>
      <Box>
        <Items items={filtered} />
      </Box>
    </Layout>
  )
}

export default Starred;