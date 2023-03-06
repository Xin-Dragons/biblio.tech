import { NextPage } from "next";
import { Layout } from "../../components/Layout";
import { useNfts } from "../../context/nfts";
import { Box } from "@mui/material";
import { Items } from "../../components/Items";
import { useLiveQuery } from "dexie-react-hooks";
import { useDatabase } from "../../context/database";

const Starred: NextPage = () => {
  const { db } = useDatabase();
  const starredNfts = useLiveQuery(() => db && db
    .nfts
    .filter(item => item.starred)
    .toArray(),
    [db],
    []
  ) || []

  return (
    <Layout title="Starred" nfts={starredNfts}>
      <Box>
        <Items items={starredNfts} />
      </Box>
    </Layout>
  )
}

export default Starred;