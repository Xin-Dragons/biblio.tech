"use client"
import { Box, Button, Stack } from "@mui/material"
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline"
import { useTags } from "@/context/tags"
import Link from "next/link"
import { FC, useState } from "react"
import { UpdateTag } from "./UpdateTag"
import { useAccess } from "@/context/access"
import { Star } from "@mui/icons-material"
import { Tag } from "./Tag"
import { useParams, usePathname } from "next/navigation"

export const Color: FC<{ color: string }> = ({ color }) => {
  return (
    <Box
      sx={{
        borderRadius: "100%",
        backgroundColor: color,
        width: "1em",
        height: "1em",
      }}
    />
  )
}

type TagsProps = {
  large?: boolean
}

export const Tags: FC<TagsProps> = ({ large }) => {
  const { addTag, tags } = useTags()
  const [open, setOpen] = useState(false)
  const { isAdmin } = useAccess()
  const { tagId } = useParams()

  async function createTag(id: string, name: string, color: string) {
    await addTag(name, color)
  }

  return (
    <Stack spacing={1}>
      <Link href={`/tags/untagged`} passHref>
        <Button variant={tagId === "untagged" ? "contained" : "outlined"} size={large ? "large" : "medium"}>
          Untagged
        </Button>
      </Link>
      <Link href={"/starred"} passHref>
        <Button
          variant={tagId === "starred" ? "contained" : "outlined"}
          startIcon={<Star sx={{ color: "#faaf00" }} />}
          size={large ? "large" : "medium"}
        >
          Starred
        </Button>
      </Link>
      {tags.length ? (
        tags.map((tag) => <Tag key={tag.id} tag={tag} selected={tagId === tag.id} large={large} />)
      ) : (
        <Button disabled>No tags added yet</Button>
      )}
      {isAdmin && (
        <>
          <Button startIcon={<AddCircleOutlineIcon />} onClick={() => setOpen(true)} size={large ? "large" : "medium"}>
            New Tag
          </Button>
          <UpdateTag open={open} setOpen={setOpen} onUpdate={createTag} />
        </>
      )}
    </Stack>
  )
}
