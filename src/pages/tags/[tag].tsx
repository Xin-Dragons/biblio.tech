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
import { useFilters } from "../../context/filters"

const Tag: NextPage = ({ tagId }) => {
  const [open, setOpen] = useState(false);
  const { db } = useDatabase()
  const { updateTag } = useTags();
  const { sort, search } = useFilters()
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
    .sortBy(sort),
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

  async function updateTags(updates) {
    const res = await db.taggedNfts.bulkUpdate(
      updates.map(update => {
        const { nftMint, ...changes } = update;
        const tagObject = taggedNfts.find(t => t.nftId === nftMint);
        return {
          key: [tagObject.nftId, tagObject.tagId],
          changes
        }
      })
    )
  }

  const filtered = nfts.sort((a, b) => {
    return ((taggedNfts.find(n => n.nftId === a.nftMint) || {}).sortedIndex || 0) - ((taggedNfts.find(n => n.nftId === b.nftMint) || {}).sortedIndex || 0)
  })
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

  return <Layout nfts={nfts} filtered={filtered} tagId={tagId} allowCollageView title={tag.name &&
    <Stack direction="row" alignItems="center" spacing={1}>
      <Typography variant="h5">TAGS - </Typography>
      <Color color={tag.color} />
      <Typography variant="h5">{tag.name}</Typography>
      <IconButton onClick={() => setOpen(true)}>
        <Edit />
      </IconButton>
    </Stack>
  }>
    <Items items={filtered} sortable updateOrder={updateTags} />
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