import { shorten } from "../../components/Item"
import { NextPage } from "next";
import { Layout } from "../../components/Layout";
import { useLiveQuery } from "dexie-react-hooks";
import { useFilters } from "../../context/filters";
import { Items } from "../../components/Items";
import { useDatabase } from "../../context/database";

const Wallet: NextPage = ({ publicKey }) => {
  const { search } = useFilters();
  const { db } = useDatabase()
  const nfts = useLiveQuery(() => db && db
    .nfts
    .toArray(),
    [db],
    []
  ) || [];

  console.log({ nfts, db })

  const filtered = nfts
    .filter(nft => {
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

  console.log({ filtered })


  return (
    <Layout title={shorten(publicKey)} nfts={nfts} filtered={filtered}>
      <Items items={filtered} />
    </Layout>
  )
}

export default Wallet;

export async function getServerSideProps(ctx) {
  return {
    props: {
      publicKey: ctx.params.publicKey
    }
  }
}