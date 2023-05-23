import { Chip, Stack } from "@mui/material"
import { useTags } from "../../context/tags"
import AddCircleIcon from "@mui/icons-material/AddCircle"
import { useLiveQuery } from "dexie-react-hooks"
import { useDatabase } from "../../context/database"
import { useSelection } from "../../context/selection"
import { toast } from "react-hot-toast"
import { UpdateTag } from "../UpdateTag"
import { FC, useState } from "react"
import { useTheme } from "../../context/theme"
import { Collection, Nft, Tag, Tag as TagType } from "../../db"
import { ChipPropsColorOverrides } from "@mui/material/Chip"
import { CollectionItem } from "../../pages/collections"
import { noop } from "lodash"

type TagProps = {
  isSelected: boolean
  tag: TagType
  addToTag: Function
  removeFromTag: Function
}

const Tag: FC<TagProps> = ({ isSelected, tag, addToTag, removeFromTag }) => {
  const theme = useTheme()
  const { selected } = useSelection()

  if (!theme.palette[tag.id as keyof object]) {
    return null
  }

  return (
    <Chip
      key={tag.id}
      label={tag.name}
      onDelete={selected.length ? () => (isSelected ? removeFromTag(tag) : addToTag(tag)) : undefined}
      onClick={() => toast.success(tag.name)}
      variant={isSelected ? "filled" : "outlined"}
      deleteIcon={!isSelected ? <AddCircleIcon /> : undefined}
      sx={{
        fontWeight: "bold",
      }}
      //@ts-ignore
      color={tag.id}
    />
  )
}

type TagListProps = {
  filtered: Nft[] | CollectionItem[]
}

export const TagList: FC<TagListProps> = ({ filtered }) => {
  const { tags, addNftsToTag, removeNftsFromTag, addTag } = useTags()
  const { db } = useDatabase()
  const { selected } = useSelection()
  const [open, setOpen] = useState(false)
  const taggedNfts = useLiveQuery(() => db && db.taggedNfts.toArray(), [filtered], []) || []

  async function addToTag(tag: Tag) {
    try {
      if (!tag) {
        throw new Error("Missing tag")
      }
      if (!selected.length) {
        throw new Error("No items selected")
      }
      await addNftsToTag(tag.id, selected)
      toast.success(`Added NFT${selected.length === 1 ? "" : "s"} to ${tag.name}`)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  async function removeFromTag(tag: TagType) {
    try {
      if (!tag) {
        throw new Error("Missing tag")
      }

      if (!selected.length) {
        throw new Error("No items selected")
      }
      await removeNftsFromTag(tag.id, selected)
      toast.success(`Removed NFT${selected.length === 1 ? "" : "s"} from ${tag.name}`)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  async function createTagAndAddItems(_: string, name: string, color: string) {
    try {
      if (!name) {
        throw new Error("Tag name is required")
      }
      if (!color) {
        throw new Error("Color is required")
      }
      const id = await addTag(name, color)
      if (selected.length) {
        await addNftsToTag(id, selected)
        toast.success(`Added NFT${selected.length === 1 ? "" : "s"} to ${name}`)
      } else {
        toast.success(`Added new tag: ${name}`)
      }
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  return (
    <Stack direction="row" spacing={0} sx={{ flexWrap: "wrap", gap: 1, padding: 1, paddingTop: 0 }}>
      {tags.map((tag: TagType) => {
        const selectedNfts = taggedNfts.filter((n) => n.tagId === tag.id).map((n) => n.nftId)
        return (
          <Tag
            key={tag.id}
            tag={tag}
            isSelected={Boolean(selected.length && selected.every((mint) => selectedNfts.includes(mint)))}
            addToTag={addToTag}
            removeFromTag={removeFromTag}
          />
        )
      })}
      <Chip
        label={`Add ${selected.length ? "to " : ""}new tag`}
        onDelete={() => setOpen(true)}
        deleteIcon={<AddCircleIcon />}
      />
      <UpdateTag open={open} setOpen={setOpen} onUpdate={createTagAndAddItems} />
    </Stack>
  )
}
