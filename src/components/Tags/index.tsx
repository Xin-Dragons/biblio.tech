import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, IconButton, Radio, RadioGroup, Stack, TextField, Typography } from "@mui/material"
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { useTags } from "../../context/tags";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import DoneIcon from '@mui/icons-material/Done';
import EditIcon from '@mui/icons-material/Edit';
import { useDatabase } from "../../context/database";
import { useLiveQuery } from "dexie-react-hooks";
import { HexColorPicker } from "react-colorful";
import { UpdateTag } from "../UpdateTag";
import { useWallet } from "../../context/wallet";
import { useRouter } from "next/router";

export const Tag: FC = ({ tag, selected }) => {
  const [name, setName] = useState(tag.name);

  return (
    <Link href={`/tags/${tag.id}`} passHref key={tag.id}>
      <Button variant={ selected ? "contained" : "outlined"}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography>
            {tag.name}
          </Typography>
          <Color color={tag.color} />
        </Stack>
      </Button>      
    </Link>
  )
}

export const Color = ({ color }) => {
  return (
    <Box sx={{
      borderRadius: "100%",
      backgroundColor: color,
      width: "1em",
      height: "1em"
    }} />
  )
}

export const Tags: FC = ({ tagId, basePath }) => {
  const wallet = useWallet();
  console.log(wallet)
  const { addTag, tags } = useTags();
  const [open, setOpen] = useState(false);

  async function createTag(id, name, color) {
    await addTag(name, color)
  }

  return (
    <Stack spacing={1}>
      <Link href={`/tag/untagged`} variant={tagId === "untagged" ? "contained" : "outlined"} passHref>
        <Button>Untagged</Button>
      </Link>
      {
        tags.length
          ? tags.map(tag => <Tag key={tag.id} tag={tag} selected={tagId === tag.id} basePath={basePath} />)
          : <Button disabled>No tags added yet</Button>
      }
      {
        wallet?.isAdmin && <>
          <Button startIcon={<AddCircleOutlineIcon />} onClick={() => setOpen(true)}>New Tag</Button>
          <UpdateTag
            open={open}
            setOpen={setOpen}
            onUpdate={createTag}
          />
        </>
      }
      
    </Stack>
  )
}