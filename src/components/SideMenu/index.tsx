import { Accordion, AccordionDetails, AccordionSummary, Button, Typography } from "@mui/material"
import { Box, Stack } from "@mui/system"
import Link from "next/link"

import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import StarIcon from '@mui/icons-material/Star';
import LockIcon from '@mui/icons-material/Lock';
import DeleteIcon from '@mui/icons-material/Delete';
import { Filters } from "../Filters";
import { Sidebar } from "../Sidebar";
import { useTags } from "../../context/tags";
import { Tags } from "../Tags";
import { FC } from "react";
import { useRouter } from "next/router";
import { useBasePath } from "../../context/base-path";

export const SideMenu: FC = ({ nfts, filters, tagId }) => {
  const basePath = useBasePath();
  const router = useRouter();

  function relative(path: string) {
    return `${basePath}${path}`
  }

  return (
    <Sidebar defaultShowing={true}>
      <Stack spacing={2}>
        <Accordion defaultExpanded sx={{
          backgroundColor: "transparent",
          backgroundImage: "none !important",
          padding: "0 !important"
        }} disableGutters>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
          >
            <Typography variant="h5">Pages</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>

            <Link href={relative("/collections")} passHref>
              <Button variant={router.route === "/collections" ? "contained" : "outlined"}>All Collections</Button>
            </Link>
            <Link href={relative('/nfts')} passHref>
              <Button variant={ "outlined"}>All NFTs</Button>
            </Link>
            <Link href={relative('/editions')} passHref>
              <Button variant={ "outlined"}>All NFT Editions</Button>
            </Link>
            <Link href={relative('/sfts')} passHref>
              <Button variant={ "outlined"}>All SFTs</Button>
            </Link>
            </Stack>
          </AccordionDetails>
        </Accordion>
        <Accordion defaultExpanded sx={{
          backgroundColor: "transparent",
          backgroundImage: "none !important",
          padding: "0 !important"
        }} disableGutters>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
          >
          <Typography variant="h5">Go to</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              <Link href={relative("/vault")} passHref>
                <Button variant={router.route === "/vault" ? "contained" : "outlined"} startIcon={<LockIcon />}>Vault</Button>
              </Link>
              <Link href={relative("/trash")} passHref>
                <Button variant={router.route === "/trash" ? "contained" : "outlined"} startIcon={<DeleteIcon />}>Trash</Button>
              </Link>
              <Link href={relative("/tag/starred")} passHref>
                <Button variant={router.route === "/tag/starred" ? "contained" : "outlined"} startIcon={<StarIcon sx={{ color: "#faaf00" }} />}>Starred</Button>
              </Link>
            </Stack>
          </AccordionDetails>
        </Accordion>
        <Accordion defaultExpanded sx={{
          backgroundColor: "transparent",
          backgroundImage: "none !important",
          padding: "0 !important"
        }} disableGutters>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
          >
            <Typography variant="h5">Tags</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Tags tagId={tagId} />
          </AccordionDetails>
        </Accordion>
        {
          filters && (
          <Accordion defaultExpanded sx={{
            backgroundColor: "transparent",
            backgroundImage: "none !important",
            padding: "0 !important"
          }} disableGutters>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
            >
            <Typography variant="h5">Filters</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Filters nfts={nfts} />
            </AccordionDetails>
          </Accordion>
          )
        }

        <img src="/biblio-logo.png" />
      </Stack>
    </Sidebar>
  )
}