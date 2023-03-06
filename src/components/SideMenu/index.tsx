import { Button, Typography } from "@mui/material"
import { Box, Stack } from "@mui/system"
import Link from "next/link"

import StarIcon from '@mui/icons-material/Star';
import LockIcon from '@mui/icons-material/Lock';
import DeleteIcon from '@mui/icons-material/Delete';
import { Filters } from "../Filters";
import { Sidebar } from "../Sidebar";
import { useTags } from "../../context/tags";
import { Tags } from "../Tags";
import { FC } from "react";

export const SideMenu: FC = ({ nfts, filters, tagId }) => {
  return (
    <Sidebar defaultShowing={true}>
      <Stack spacing={2}>
        <Link href="/" passHref>
          <Button variant="outlined">All Collections</Button>
        </Link>
        <Typography variant="h6">Go to</Typography>
        <Link href="/vault" passHref>
          <Button variant="outlined" startIcon={<LockIcon />}>Vault</Button>
        </Link>
        <Link href="/trash" passHref>
          <Button variant="outlined" startIcon={<DeleteIcon />}>Trash</Button>
        </Link>
        <Link href="/tag/starred" passHref>
          <Button variant="outlined" startIcon={<StarIcon sx={{ color: "#faaf00" }} />}>Starred</Button>
        </Link>
        <Typography variant="h6">Tags</Typography>
        <Tags tagId={tagId} />
        {
          filters && <Filters nfts={nfts} />
        }
      </Stack>
    </Sidebar>
  )
}