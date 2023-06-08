import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  FormControlLabel,
  SvgIcon,
  Switch,
  Typography,
} from "@mui/material"
import { Box, Stack } from "@mui/system"
import Link from "next/link"

import ExpandMoreIcon from "@mui/icons-material/ExpandMore"

import StarIcon from "@mui/icons-material/Star"
import LockIcon from "@mui/icons-material/Lock"
import DeleteIcon from "@mui/icons-material/Delete"
import { Filters } from "../_Filters"
import { Sidebar } from "../Sidebar"
import { useTags } from "../../context/tags"
import { Tags } from "../Tags"
import { FC, ReactNode } from "react"
import { useRouter } from "next/router"
import { useBasePath } from "../../context/base-path"
import VaultIcon from "../Actions/vault.svg"
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn"
import { useAccess } from "../../context/access"
import { Sell } from "@mui/icons-material"
import { useUiSettings } from "../../context/ui-settings"

type SideMenuProps = {
  fullWidth?: boolean
  noAccordions?: boolean
  large?: boolean
}

type MenuSectionProps = {
  accordion?: boolean
  children: ReactNode
  title: string
}

const MenuSection: FC<MenuSectionProps> = ({ accordion, children, title }) => {
  if (!accordion) {
    return (
      <Stack spacing={2}>
        <Typography variant="h6" fontWeight="bold" textTransform="uppercase">
          {title}
        </Typography>
        {children}
      </Stack>
    )
  }

  return (
    <Accordion
      defaultExpanded
      sx={{
        backgroundColor: "transparent",
        backgroundImage: "none !important",
        padding: "0 !important",
        borderBottom: 1,
        borderColor: "divider",
        borderTop: 0,
      }}
      disableGutters
      elevation={0}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ border: 0 }}>
        <Typography variant="h6" fontWeight="bold" textTransform="uppercase">
          {title}
        </Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ border: 0 }}>
        <Stack spacing={2}>{children}</Stack>
      </AccordionDetails>
    </Accordion>
  )
}

export const SideMenu: FC<SideMenuProps> = ({ fullWidth, noAccordions, large }) => {
  const basePath = useBasePath()
  const router = useRouter()
  const { isAdmin } = useAccess()

  function relative(path: string) {
    return `${basePath}${path}`
  }

  const route = router.asPath.replace(basePath, "")

  return (
    <Stack spacing={2}>
      <MenuSection accordion={!noAccordions} title="Show">
        <Link href={relative("/")} passHref>
          <Button variant={["/", ""].includes(route) ? "contained" : "outlined"} size={large ? "large" : "medium"}>
            Collections
          </Button>
        </Link>
        <Link href={relative("/nfts")} passHref>
          <Button variant={route === "/nfts" ? "contained" : "outlined"} size={large ? "large" : "medium"}>
            NFTs
          </Button>
        </Link>
        <Link href={relative("/editions")} passHref>
          <Button variant={route === "/editions" ? "contained" : "outlined"} size={large ? "large" : "medium"}>
            NFT Editions
          </Button>
        </Link>
        <Link href={relative("/sfts")} passHref>
          <Button variant={route === "/sfts" ? "contained" : "outlined"} size={large ? "large" : "medium"}>
            SFTs
          </Button>
        </Link>
        <Link href={relative("/spl")} passHref>
          <Button variant={route === "/spl" ? "contained" : "outlined"} size={large ? "large" : "medium"}>
            SPL Tokens
          </Button>
        </Link>
      </MenuSection>
      <MenuSection accordion={!noAccordions} title="Go to">
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
                size={large ? "large" : "medium"}
              >
                The Vault
              </Button>
            </Link>
          )}

          <Link href={relative("/loans")} passHref>
            <Button
              variant={route === "/loans" ? "contained" : "outlined"}
              startIcon={<MonetizationOnIcon />}
              size={large ? "large" : "medium"}
            >
              Loans
            </Button>
          </Link>
          <Link href={relative("/listings")} passHref>
            <Button
              variant={route === "/listings" ? "contained" : "outlined"}
              startIcon={<Sell />}
              size={large ? "large" : "medium"}
            >
              Listings
            </Button>
          </Link>
          <Link href={relative("/junk")} passHref>
            <Button
              variant={route === "/junk" ? "contained" : "outlined"}
              startIcon={<DeleteIcon />}
              size={large ? "large" : "medium"}
            >
              Junk
            </Button>
          </Link>
        </Stack>
      </MenuSection>
      {!router.query.publicKey && isAdmin && (
        <MenuSection accordion={!noAccordions} title="Tags">
          <Tags large={large} />
        </MenuSection>
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

      <img src="/biblio-logo.png" style={{ opacity: 0.3, margin: "auto" }} width="200px" />
    </Stack>
  )
}
