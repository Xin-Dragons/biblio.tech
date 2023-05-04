import { NextPage } from "next";
import { Layout } from "../../components/Layout";
import { WalletSearch } from "../../components/WalletSearch";

const Wallet: NextPage = () => {
  return (
    <Layout nfts={[]} filtered={[]}>
      <WalletSearch />
    </Layout>
  )
}

export default Wallet;