import { Box, Button, Stack, Typography } from "@mui/material"
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline"
import { useTags } from "../../context/tags"
import Link from "next/link"
import { FC, useState } from "react"
import { UpdateTag } from "../UpdateTag"
import { useRouter } from "next/router"
import { useAccess } from "../../context/access"
import { Star } from "@mui/icons-material"
import { Tag as TagType } from "../../db"

export const Tag: FC<{ tag: TagType; selected?: boolean; large?: boolean }> = ({ tag, selected, large }) => {
  return (
    <Link href={`/tags/${tag.id}`} passHref key={tag.id}>
      <Button variant={selected ? "contained" : "outlined"} size={large ? "large" : "medium"} sx={{ width: "100%" }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Color color={tag.color as string} />
          <Typography>{tag.name}</Typography>
        </Stack>
      </Button>
    </Link>
  )
}

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
  const router = useRouter()
  const { addTag, tags } = useTags()
  const [open, setOpen] = useState(false)
  const { isInScope } = useAccess()

  async function createTag(id: string, name: string, color: string) {
    await addTag(name, color)
  }

  const tagId = router.query.tag

  return (
    <Stack spacing={1}>
      <Link href={`/tags/untagged`} passHref>
        <Button
          variant={tagId === "untagged" ? "contained" : "outlined"}
          size={large ? "large" : "medium"}
          sx={{ width: "100%" }}
        >
          Untagged
        </Button>
      </Link>
      <Link href={"/starred"} passHref>
        <Button
          variant={router.asPath === "/starred" ? "contained" : "outlined"}
          startIcon={<Star sx={{ color: "#faaf00" }} />}
          size={large ? "large" : "medium"}
          sx={{ width: "100%" }}
        >
          Starred
        </Button>
      </Link>
      {tags.length ? (
        tags.map((tag) => <Tag key={tag.id} tag={tag} selected={tagId === tag.id} large={large} />)
      ) : (
        <Button disabled>No tags added yet</Button>
      )}
      {isInScope && (
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
