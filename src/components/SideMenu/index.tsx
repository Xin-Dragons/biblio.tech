import { Accordion, AccordionDetails, AccordionSummary, Button, SvgIcon, Typography } from "@mui/material"
import { Box, Stack } from "@mui/system"
import Link from "next/link"

import ExpandMoreIcon from "@mui/icons-material/ExpandMore"

import StarIcon from "@mui/icons-material/Star"
import LockIcon from "@mui/icons-material/Lock"
import DeleteIcon from "@mui/icons-material/Delete"
import { Filters } from "../Filters"
import { Sidebar } from "../Sidebar"
import { useTags } from "../../context/tags"
import { Tags } from "../Tags"
import { FC } from "react"
import { useRouter } from "next/router"
import { useBasePath } from "../../context/base-path"
import VaultIcon from "../ActionBar/vault.svg"
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn"
import { useAccess } from "../../context/access"

export const SideMenu: FC = () => {
  const basePath = useBasePath()
  const router = useRouter()
  const { isAdmin } = useAccess()

  function relative(path: string) {
    return `${basePath}${path}`
  }

  const route = router.asPath.replace(basePath, "")

  return (
    <Sidebar>
      <Stack spacing={2}>
        <Accordion
          defaultExpanded
          sx={{
            backgroundColor: "transparent",
            backgroundImage: "none !important",
            padding: "0 !important",
          }}
          disableGutters
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6" fontWeight="bold">
              SHOW
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              <Link href={relative("/")} passHref>
                <Button variant={["/", ""].includes(route) ? "contained" : "outlined"}>Collections</Button>
              </Link>
              <Link href={relative("/nfts")} passHref>
                <Button variant={route === "/nfts" ? "contained" : "outlined"}>NFTs</Button>
              </Link>
              <Link href={relative("/editions")} passHref>
                <Button variant={route === "/editions" ? "contained" : "outlined"}>NFT Editions</Button>
              </Link>
              <Link href={relative("/sfts")} passHref>
                <Button variant={route === "/sfts" ? "contained" : "outlined"}>SFTs</Button>
              </Link>
              <Link href={relative("/spl")} passHref>
                <Button variant={route === "/spl" ? "contained" : "outlined"}>SPL Tokens</Button>
              </Link>
            </Stack>
          </AccordionDetails>
        </Accordion>
        <Accordion
          defaultExpanded
          sx={{
            backgroundColor: "transparent",
            backgroundImage: "none !important",
            padding: "0 !important",
          }}
          disableGutters
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6" fontWeight="bold">
              GO TO
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              {!router.query.publicKey && isAdmin && (
                <Link href={relative("/vault")} passHref>
                  <Button
                    variant={route === "/vault" ? "contained" : "outlined"}
                    startIcon={
                      <SvgIcon fontSize="large">
                        <VaultIcon />
                      </SvgIcon>
                    }
                  >
                    Vault
                  </Button>
                </Link>
              )}

              <Link href={relative("/loans")} passHref>
                <Button variant={route === "/loans" ? "contained" : "outlined"} startIcon={<MonetizationOnIcon />}>
                  Loans
                </Button>
              </Link>
              <Link href={relative("/junk")} passHref>
                <Button variant={route === "/junk" ? "contained" : "outlined"} startIcon={<DeleteIcon />}>
                  Junk
                </Button>
              </Link>
            </Stack>
          </AccordionDetails>
        </Accordion>
        {!router.query.publicKey && isAdmin && (
          <Accordion
            defaultExpanded
            sx={{
              backgroundColor: "transparent",
              backgroundImage: "none !important",
              padding: "0 !important",
            }}
            disableGutters
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6" fontWeight="bold">
                TAGS
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Tags />
            </AccordionDetails>
          </Accordion>
        )}
        {/* {filters && (
          <Accordion
            defaultExpanded
            sx={{
              backgroundColor: "transparent",
              backgroundImage: "none !important",
              padding: "0 !important",
            }}
            disableGutters
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h5">Filters</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Filters nfts={nfts} />
            </AccordionDetails>
          </Accordion>
        )} */}

        <img src="/biblio-logo.png" style={{ opacity: 0.3, margin: 20 }} />
      </Stack>
    </Sidebar>
  )
}
