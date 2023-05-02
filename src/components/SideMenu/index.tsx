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
import { useRouter } from "next/router";

export const SideMenu: FC = ({ nfts, filters, tagId }) => {
  const router = useRouter();

  console.log(router)

  function relative(path: string) {
    return `${router.asPath.replace(path, "")}${path}`
  }

  return (
    <Sidebar defaultShowing={true}>
      <Stack spacing={2}>
        <Link href={relative('/')} passHref>
          <Button variant={router.route === "/" ? "contained" : "outlined"}>All NFTs</Button>
        </Link>
        <Link href={relative("/collections")} passHref>
          <Button variant={router.route === "/collections" ? "contained" : "outlined"}>All Collections</Button>
        </Link>
        <Typography variant="h6">Go to</Typography>
        <Link href={relative("/vault")} passHref>
          <Button variant={router.route === "/vault" ? "contained" : "outlined"} startIcon={<LockIcon />}>Vault</Button>
        </Link>
        <Link href={relative("/trash")} passHref>
          <Button variant={router.route === "/trash" ? "contained" : "outlined"} startIcon={<DeleteIcon />}>Trash</Button>
        </Link>
        <Link href={relative("/tag/starred")} passHref>
          <Button variant={router.route === "/tag/starred" ? "contained" : "outlined"} startIcon={<StarIcon sx={{ color: "#faaf00" }} />}>Starred</Button>
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