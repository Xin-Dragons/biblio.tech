import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from "@mui/material"
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline"
import { useTags } from "../../context/tags"
import Link from "next/link"
import { FC, useEffect, useRef, useState } from "react"
import DoneIcon from "@mui/icons-material/Done"
import EditIcon from "@mui/icons-material/Edit"
import { useDatabase } from "../../context/database"
import { useLiveQuery } from "dexie-react-hooks"
import { HexColorPicker } from "react-colorful"
import { UpdateTag } from "../UpdateTag"
import { useRouter } from "next/router"
import { useWallet } from "@solana/wallet-adapter-react"
import { useBasePath } from "../../context/base-path"
import { useAccess } from "../../context/access"
import { useSession } from "next-auth/react"
import { Star } from "@mui/icons-material"
import { Tag as TagType } from "../../db"

export const Tag: FC<{ tag: TagType; selected?: boolean }> = ({ tag, selected }) => {
  return (
    <Link href={`/tags/${tag.id}`} passHref key={tag.id}>
      <Button variant={selected ? "contained" : "outlined"}>
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

export const Tags: FC = () => {
  const router = useRouter()
  const { addTag, tags } = useTags()
  const [open, setOpen] = useState(false)
  const { isAdmin } = useAccess()

  async function createTag(id: string, name: string, color: string) {
    await addTag(name, color)
  }

  const tagId = router.query.tag

  return (
    <Stack spacing={1}>
      <Link href={`/tags/untagged`} passHref>
        <Button variant={tagId === "untagged" ? "contained" : "outlined"}>Untagged</Button>
      </Link>
      <Link href={"/starred"} passHref>
        <Button
          variant={router.asPath === "/starred" ? "contained" : "outlined"}
          startIcon={<Star sx={{ color: "#faaf00" }} />}
        >
          Starred
        </Button>
      </Link>
      {tags.length ? (
        tags.map((tag) => <Tag key={tag.id} tag={tag} selected={tagId === tag.id} />)
      ) : (
        <Button disabled>No tags added yet</Button>
      )}
      {isAdmin && (
        <>
          <Button startIcon={<AddCircleOutlineIcon />} onClick={() => setOpen(true)}>
            New Tag
          </Button>
          <UpdateTag open={open} setOpen={setOpen} onUpdate={createTag} />
        </>
      )}
    </Stack>
  )
}
