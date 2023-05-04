import { NextPage } from "next";
import { Layout } from "../components/Layout";
import { useDatabase } from "../context/database";
import { useLiveQuery } from "dexie-react-hooks";
import { useUiSettings } from "../context/ui-settings";
import { useFilters } from "../context/filters";
import { Items } from "../components/Items";
import { every } from "lodash";
import { useWallet } from "@solana/wallet-adapter-react";

export const Nfts: NextPage = () => {
  const { db } = useDatabase();
  const { showStarred, untagged } = useUiSettings();
  const wallet = useWallet();
  const { sort, search } = useFilters();

  const nfts = useLiveQuery(() => db && db
    .nfts
    .filter(item => [0, 4, null].includes(item.tokenStandard))
    .sortBy(sort),
    [db, wallet.publicKey, sort],
    []
  ) || [];

  const taggedNfts = useLiveQuery(() => db && db
    .taggedNfts
    .toArray(),
    [db, wallet.publicKey],
    [] 
  ) || []

  const filtered = nfts
    .filter(nft => !untagged || !taggedNfts.map(u => u.nftId).includes(nft.nftMint))
    .filter(nft => !showStarred || nft.starred)
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

  return (
    <Layout title="All NFTs" nfts={nfts} filtered={filtered} showUntagged>
      <Items items={filtered}></Items>
    </Layout>
  )
}

export default Nfts;