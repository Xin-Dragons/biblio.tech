import { useLiveQuery } from "dexie-react-hooks"
import { useDatabase } from "../../context/database"
import { Layout } from "../../components/Layout"
import { NextPage } from "next"

const Tags: NextPage = () => {
  const { db } = useDatabase()
  const tags = useLiveQuery(() => db && db
    .tags
    .toArray(),
    [db],
    []
  ) || []

  return (
    <Layout nfts={[]} filtered={[]}>

    </Layout>
  )
}

export default Tags