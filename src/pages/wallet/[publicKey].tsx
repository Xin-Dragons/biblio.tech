import { shorten } from "../../components/Item"
import { NextPage } from "next";
import { Layout } from "../../components/Layout";

const Wallet: NextPage = ({ publicKey }) => {
  return (
    <Layout title={shorten(publicKey)} nfts={[]}>

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