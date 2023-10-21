// import { Chip, IconButton, Stack, Tooltip } from "@mui/material"
// import { useTags } from "../../context/tags"
// import AddCircleIcon from "@mui/icons-material/AddCircle"
// import { useLiveQuery } from "dexie-react-hooks"
// import { useDatabase } from "../../context/database"
// import { useSelection } from "../../context/selection"
// import { toast } from "react-hot-toast"
// import { UpdateTag } from "../UpdateTag"
// import { FC, useState } from "react"
// import { useTheme } from "../../context/theme"
// import { Tag, Tag as TagType } from "../../db"
// import { ChipPropsColorOverrides } from "@mui/material/Chip"
// import { CollectionItem } from "../../app/bags/collection/page"
// import { noop } from "lodash"
// import { useFilters } from "../../context/filters"
// import { useRouter } from "next/router"
// import { Close, LabelOff, TakeoutDining } from "@mui/icons-material"

// type TagProps = {
//   isSelected: boolean
//   tag: TagType & { numNfts?: number }
//   addToTag: Function
//   removeFromTag: Function
//   clip?: boolean
//   edit?: boolean
// }

// const Tag: FC<TagProps> = ({ isSelected, tag, addToTag, removeFromTag, edit }) => {
//   const { selectedTags, selectTag, deselectTag } = useFilters()
//   const { selected: selectedNfts } = useSelection()
//   const theme = useTheme()

//   if (!theme.palette[tag.id as keyof object]) {
//     return null
//   }

//   const selectedTag = selectedTags.includes(tag.id)

//   function onTagClick() {
//     if (selectedTag) {
//       deselectTag(tag.id)
//     } else {
//       selectTag(tag.id)
//     }
//   }

//   return (
//     <Chip
//       key={tag.id}
//       label={`${tag.name} ${tag.numNfts}`}
//       onDelete={edit ? () => (isSelected ? removeFromTag(tag) : addToTag(tag)) : undefined}
//       onClick={edit ? undefined : onTagClick}
//       variant={edit ? (isSelected ? "filled" : "outlined") : selectedTag ? "filled" : "outlined"}
//       deleteIcon={edit && !isSelected ? <AddCircleIcon /> : undefined}
//       sx={{
//         fontWeight: "bold",
//         border: `1px solid`,
//         borderColor: `${tag.id}.main`,
//       }}
//       disabled={(!edit && !tag.numNfts) || (edit && !selectedNfts.length)}
//       //@ts-ignore
//       color={tag.id}
//     />
//   )
// }

// type TagListProps = {
//   edit?: boolean
//   clip?: boolean
//   clearAll?: boolean
// }

// export const TagList: FC<TagListProps> = ({ edit, clip, clearAll = true }) => {
//   const { tags, addNftsToTag, removeNftsFromTag, addTag } = useTags()
//   const { db } = useDatabase()
//   const { selected } = useSelection()
//   const { selectedTags, clearSelectedTags } = useFilters()
//   const [open, setOpen] = useState(false)
//   const { nfts, filtered } = useNfts()

//   const taggedNfts =
//     useLiveQuery(
//       () => db.taggedNfts.filter((item) => nfts.map((n) => n.nftMint).includes(item.nftId)).toArray(),
//       [filtered, nfts],
//       []
//     ) || []

//   async function addToTag(tag: Tag) {
//     try {
//       if (!tag) {
//         throw new Error("Missing tag")
//       }
//       if (!selected.length) {
//         throw new Error("No items selected")
//       }
//       await addNftsToTag(tag.id, selected)
//       toast.success(`Added NFT${selected.length === 1 ? "" : "s"} to ${tag.name}`)
//     } catch (err: any) {
//       toast.error(err.message)
//     }
//   }

//   async function removeFromTag(tag: TagType) {
//     try {
//       if (!tag) {
//         throw new Error("Missing tag")
//       }

//       if (!selected.length) {
//         throw new Error("No items selected")
//       }
//       await removeNftsFromTag(tag.id, selected)
//       toast.success(`Removed NFT${selected.length === 1 ? "" : "s"} from ${tag.name}`)
//     } catch (err: any) {
//       toast.error(err.message)
//     }
//   }

//   async function createTagAndAddItems(_: string, name: string, color: string) {
//     try {
//       if (!name) {
//         throw new Error("Tag name is required")
//       }
//       if (!color) {
//         throw new Error("Color is required")
//       }
//       const id = await addTag(name, color)
//       if (selected.length) {
//         await addNftsToTag(id, selected)
//         toast.success(`Added NFT${selected.length === 1 ? "" : "s"} to ${name}`)
//       } else {
//         toast.success(`Added new tag: ${name}`)
//       }
//     } catch (err: any) {
//       toast.error(err.message)
//     }
//   }

//   return (
//     <Stack
//       direction="row"
//       alignItems="center"
//       justifyContent="flex-end"
//       sx={{
//         padding: 1,
//         paddingTop: 0,
//         paddingBottom: 0,
//         paddingRight: 2,
//       }}
//     >
//       <Stack
//         direction="row"
//         spacing={clip ? 1 : 0}
//         sx={{
//           gap: clip ? 0 : 1,
//           flexWrap: clip ? "none" : "wrap",
//           overflowX: "auto",
//           "&::-webkit-scrollbar": { display: "none" },
//         }}
//         alignItems="center"
//       >
//         {edit && (
//           <Chip
//             label={`Add ${selected.length ? "to " : ""}new tag`}
//             onClick={() => setOpen(true)}
//             onDelete={() => setOpen(true)}
//             deleteIcon={<AddCircleIcon />}
//           />
//         )}
//         {tags
//           .map((t) => {
//             return {
//               ...t,
//               numNfts: taggedNfts.filter((tag) => tag.tagId === t.id).length,
//             }
//           })
//           .sort((b, a) => {
//             if (!edit) {
//               return a.numNfts - b.numNfts
//             }
//             return b.name.localeCompare(a.name)
//           })
//           .map((tag: TagType) => {
//             const selectedNfts = taggedNfts.filter((n) => n.tagId === tag.id).map((n) => n.nftId)
//             return (
//               <Tag
//                 key={tag.id}
//                 tag={tag}
//                 isSelected={Boolean(selected.length && selected.every((mint) => selectedNfts.includes(mint)))}
//                 addToTag={addToTag}
//                 removeFromTag={removeFromTag}
//                 clip={clip}
//                 edit={edit}
//               />
//             )
//           })}
//       </Stack>
//       {!edit && clearAll && (
//         <Tooltip title="Clear tag filters">
//           <span>
//             <IconButton onClick={() => clearSelectedTags()} disabled={!selectedTags.length}>
//               <Close />
//             </IconButton>
//           </span>
//         </Tooltip>
//       )}

//       <UpdateTag open={open} setOpen={setOpen} onUpdate={createTagAndAddItems} />
//     </Stack>
//   )
// }
