import { useLiveQuery } from "dexie-react-hooks";
import { Items } from "../components/Items";
import { Layout } from "../components/Layout";
import { NextPage } from "next";
import { useDatabase } from "../context/database";

const Trash: NextPage = () => {
  const { db } = useDatabase();
  const trash = useLiveQuery(() => db && db
    .nfts
    .filter(item => !item.helloMoonCollectionId)
    .toArray(),
    [db],
    []
  ) || []

  return (
    <Layout title="Trash" nfts={trash}>
      <Items items={trash} />
    </Layout>
  )
}

export default Trash;