import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { NextPage } from "next";
import { useEffect, useState } from "react";
import { Layout } from "../components/Layout";
import { Items } from "../components/Items";
import { useMetaplex } from "../context/metaplex";
import { useFrozen } from "../context/frozen";
import { useFilters } from "../context/filters";

const Vault: NextPage = () => {
  const [nfts, setNfts] = useState([]);
  const metaplex = useMetaplex()
  const { connection } = useConnection();
  const { inVault } = useFrozen();
  const wallet = useWallet()
  const { search } = useFilters()

  async function getNfts() {
    
    const metadatas = await metaplex.nfts().findAllByMintList({
      mints: inVault.map(mint => new PublicKey(mint))
    });

    const nfts = await Promise.all(
      metadatas.map(async metadata => metaplex.nfts().load({ metadata }))
    );

    setNfts(nfts.map(n => {
      return {
        ...n,
        nftMint: n.mint.address.toBase58()
      }
    }))
  }

  useEffect(() => {
    if (wallet.publicKey && inVault.length) {
      getNfts()
    }
  }, [wallet.publicKey, inVault])

  const filtered = nfts.filter(nft => {
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
    <Layout title="Vault" nfts={nfts} filtered={filtered}>
      <Items items={filtered} />
    </Layout>
  )
}

export default Vault;