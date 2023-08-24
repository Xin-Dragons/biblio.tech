"use client"
import { Layout } from "@/components/Layout"
import { useDatabase } from "@/context/database"
import { Items } from "@/components/Items"
import { useNfts } from "@/context/nfts"
import { useRouter } from "next/router"
import { Color } from "@/components/Tags"
import { Edit } from "@mui/icons-material"
import { Stack, Typography, IconButton } from "@mui/material"
import { useTags } from "@/context/tags"
import { useAccess } from "@/context/access"
import { useState } from "react"
import { UpdateTag } from "@/components/UpdateTag"

type OrderItem = {
  nftMint: string
  sortedIndex: number
}

export default function Tag({ params: { tagId } }: { params: Record<string, string> }) {
  const [editOpen, setEditOpen] = useState(false)
  const { updateOrder } = useDatabase()
  const { nfts, filtered } = useNfts()
  const { tags, updateTag } = useTags()
  const { isAdmin } = useAccess()

  const tag = tags.find((t) => t.id === tagId)

  async function handleUpdateOrder(items: OrderItem[]) {
    await updateOrder(items, tagId)
  }

  const title =
    tagId === "untagged"
      ? "Untagged"
      : (tag && (
          <Stack direction="row" alignItems="center" spacing={1} justifyContent="center">
            <Typography variant="h5">TAGS - </Typography>
            <Color color={tag.color!} />
            <Typography variant="h5">{tag.name}</Typography>
            {isAdmin && (
              <IconButton onClick={() => setEditOpen(true)}>
                <Edit />
              </IconButton>
            )}
          </Stack>
        )) ||
        ""

  return (
    <Layout nfts={nfts} filtered={filtered} showUntagged title={title}>
      <Items items={filtered} updateOrder={handleUpdateOrder} sortable />
      <UpdateTag
        open={editOpen}
        setOpen={setEditOpen}
        id={tag?.id}
        name={tag?.name}
        color={tag?.color}
        onUpdate={updateTag}
      />
    </Layout>
  )
}
