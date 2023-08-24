import { Button, Stack, Typography } from "@mui/material"
import Link from "next/link"
import { FC } from "react"
import { Color } from "./Tags"
import type { Tag as TagType } from "@/db"

export const Tag: FC<{ tag: TagType; selected?: boolean; large?: boolean }> = ({ tag, selected, large }) => {
  return (
    <Link href={`/tags/${tag.id}`} passHref key={tag.id}>
      <Button variant={selected ? "contained" : "outlined"} size={large ? "large" : "medium"}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Color color={tag.color as string} />
          <Typography>{tag.name}</Typography>
        </Stack>
      </Button>
    </Link>
  )
}
