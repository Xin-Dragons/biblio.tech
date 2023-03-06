import { useLiveQuery } from "dexie-react-hooks"
import { useDatabase } from "../../context/database"
import { Layout } from "../../components/Layout"
import { Items } from "../../components/Items"
import { IconButton, Stack, Typography } from "@mui/material"
import { Edit } from "@mui/icons-material"
import { UpdateTag } from "../../components/UpdateTag"
import { useState } from "react"
import { useTags } from "../../context/tags"
import { Color } from "../../components/Tags"

const Tag: NextPage = ({ tagId }) => {
  const [open, setOpen] = useState(false);
  const { db } = useDatabase()
  const { updateTag } = useTags();
  const tag = useLiveQuery(() => db && db
    .tags
    .where({ id: tagId })
    .first(),
    [db, tagId],
    {}
  ) || {}

  const taggedNfts = useLiveQuery(() => db && db
    .taggedNfts
    .where({ tagId })
    .toArray(),
    [db, tagId],
    [] 
  ) || [];

  const nfts = useLiveQuery(() => db && db
    .nfts
    .where('nftMint')
    .anyOf(taggedNfts.map(t => t.nftId))
    .toArray(),
    [db, taggedNfts],
    [] 
  ) || [];

  console.log({ tag })

  return <Layout nfts={nfts} tagId={tagId} title={tag.name &&
    <Stack direction="row" alignItems="center" spacing={1}>
      <Color color={tag.color} />
      <Typography variant="h5">{tag.name}</Typography>
      <IconButton onClick={() => setOpen(true)}>
        <Edit />
      </IconButton>
    </Stack>
  }>
    <Items items={nfts} />
    <UpdateTag
      open={open}
      setOpen={setOpen}
      id={tag.id}
      name={tag.name}
      color={tag.color}
      onUpdate={updateTag}
    />
  </Layout>
}

export default Tag;

export async function getServerSideProps(ctx) {
  return {
    props: {
      tagId: ctx.params.tag
    }
  }
}