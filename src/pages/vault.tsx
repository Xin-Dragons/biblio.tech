import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { NextPage } from "next";
import { useEffect, useState } from "react";
import { Layout } from "../components/Layout";
import { Items } from "../components/Items";
import { useMetaplex } from "../context/metaplex";
import { useFrozen } from "../context/frozen";

const Vault: NextPage = () => {
  const [nfts, setNfts] = useState([]);
  const metaplex = useMetaplex()
  const { connection } = useConnection();
  const { inVault } = useFrozen();
  const wallet = useWallet()

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
  
  return (
    <Layout title="Vault" nfts={nfts}>
      <Items items={nfts} />
    </Layout>
  )
}

export default Vault;