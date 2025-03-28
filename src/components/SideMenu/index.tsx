import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  SvgIcon,
  Typography,
  Link as MuiLink,
} from "@mui/material"
import { Box, Stack } from "@mui/system"
import Link from "next/link"

import ExpandMoreIcon from "@mui/icons-material/ExpandMore"

import DeleteIcon from "@mui/icons-material/Delete"
import { Tags } from "../Tags"
import { FC, ReactNode } from "react"
import { useRouter } from "next/router"
import { useBasePath } from "../../context/base-path"
import VaultIcon from "../Actions/vault.svg"
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn"
import { Sell } from "@mui/icons-material"
import { isAddress } from "viem"
import Tokens from "./tokens.svg"
import Nfts from "./nfts.svg"
import Address from "./address.svg"
import Snap from "./snap.svg"
import Crow from "./crow.svg"

type SideMenuProps = {
  fullWidth?: boolean
  noAccordions?: boolean
  large?: boolean
}

type MenuSectionProps = {
  accordion?: boolean
  children: ReactNode
  title: string
  open?: boolean
}

const MenuSection: FC<MenuSectionProps> = ({ accordion, children, title, open }) => {
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
      defaultExpanded={open}
      sx={{
        backgroundColor: "transparent",
        backgroundImage: "none !important",
        padding: "0 !important",
        borderBottom: 1,
        borderColor: "divider",
        borderTop: 0,
        "&:before": {
          backgroundColor: "transparent",
        },
      }}
      disableGutters
      elevation={0}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ border: 0 }}>
        <Typography variant="h6" fontWeight="bold" textTransform="uppercase" sx={{ fontSize: "16px" }}>
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

  const [_, section, page] = router.asPath.split("/")

  const isEthWallet = isAddress(router.query.publicKey as string)

  function relative(path: string) {
    return `${basePath}${path}`
  }

  const route = router.asPath.replace(basePath, "")

  return (
    <Stack>
      <MenuSection accordion={!noAccordions} title="Wallet">
        <Link href={relative("/")} passHref>
          <Button
            sx={{ width: "100%" }}
            variant={["/", ""].includes(route) ? "contained" : "outlined"}
            size={large ? "large" : "medium"}
          >
            Collections
          </Button>
        </Link>
        <Link href={relative("/nfts")} passHref>
          <Button
            sx={{ width: "100%" }}
            variant={route === "/nfts" ? "contained" : "outlined"}
            size={large ? "large" : "medium"}
          >
            NFTs
          </Button>
        </Link>
        <Link href={relative("/nifty")} passHref>
          <Button
            sx={{ width: "100%" }}
            variant={route === "/nifty" ? "contained" : "outlined"}
            size={large ? "large" : "medium"}
          >
            Nifty
          </Button>
        </Link>
        <Link href={relative("/core")} passHref>
          <Button
            sx={{ width: "100%" }}
            variant={route === "/core" ? "contained" : "outlined"}
            size={large ? "large" : "medium"}
          >
            Core
          </Button>
        </Link>
        {!isEthWallet && [
          <Link href={relative("/cnfts")} passHref key={0}>
            <Button
              sx={{ width: "100%" }}
              variant={route === "/cnfts" ? "contained" : "outlined"}
              size={large ? "large" : "medium"}
            >
              cNFTs
            </Button>
          </Link>,
          <Link href={relative("/editions")} passHref key={1}>
            <Button
              sx={{ width: "100%" }}
              variant={route === "/editions" ? "contained" : "outlined"}
              size={large ? "large" : "medium"}
            >
              NFT Editions
            </Button>
          </Link>,
          <Link href={relative("/sfts")} passHref key={2}>
            <Button
              sx={{ width: "100%" }}
              variant={route === "/sfts" ? "contained" : "outlined"}
              size={large ? "large" : "medium"}
            >
              SFTs
            </Button>
          </Link>,
          <Link href={relative("/spl")} passHref key={3}>
            <Button
              sx={{ width: "100%" }}
              variant={route === "/spl" ? "contained" : "outlined"}
              size={large ? "large" : "medium"}
            >
              SPL Tokens
            </Button>
          </Link>,
        ]}
      </MenuSection>
      {!isEthWallet && (
        <MenuSection accordion={!noAccordions} title="Go to">
          <Stack spacing={2}>
            <Link href={relative("/vault")} passHref>
              <Button
                sx={{ width: "100%" }}
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

            <Link href={relative("/loans")} passHref>
              <Button
                sx={{ width: "100%" }}
                variant={route === "/loans" ? "contained" : "outlined"}
                startIcon={<MonetizationOnIcon />}
                size={large ? "large" : "medium"}
              >
                Loans
              </Button>
            </Link>
            <Link href={relative("/listings")} passHref>
              <Button
                sx={{ width: "100%" }}
                variant={route === "/listings" ? "contained" : "outlined"}
                startIcon={<Sell />}
                size={large ? "large" : "medium"}
              >
                Listings
              </Button>
            </Link>
            <Link href={relative("/junk")} passHref>
              <Button
                sx={{ width: "100%" }}
                variant={route === "/junk" ? "contained" : "outlined"}
                startIcon={<DeleteIcon />}
                size={large ? "large" : "medium"}
              >
                Junk
              </Button>
            </Link>
          </Stack>
        </MenuSection>
      )}

      {!router.query.publicKey && (
        <MenuSection accordion={!noAccordions} title="Tags">
          <Tags large={large} />
        </MenuSection>
      )}
      <MenuSection title="Creator tools" accordion={!noAccordions} open={section === "tools"}>
        <Link href={"/tools/token-tool"} passHref>
          <Button
            sx={{ width: "100%" }}
            variant={page === "token-tool" ? "contained" : "outlined"}
            startIcon={
              <SvgIcon fontSize="large">
                <Tokens />
              </SvgIcon>
            }
            size={large ? "large" : "medium"}
          >
            Token Tool
          </Button>
        </Link>
        <Link href={"/tools/nft-suite"} passHref>
          <Button
            sx={{ width: "100%" }}
            variant={page === "nft-suite" ? "contained" : "outlined"}
            startIcon={
              <SvgIcon fontSize="large">
                <Nfts />
              </SvgIcon>
            }
            size={large ? "large" : "medium"}
          >
            NFT Suite
          </Button>
        </Link>
        <Link href={"/tools/grind-address"} passHref>
          <Button
            sx={{ width: "100%" }}
            variant={page === "grind-address" ? "contained" : "outlined"}
            startIcon={
              <SvgIcon fontSize="large">
                <Address />
              </SvgIcon>
            }
            size={large ? "large" : "medium"}
          >
            Grind address
          </Button>
        </Link>
        <Link href={"/tools/snapshot"} passHref>
          <Button
            sx={{ width: "100%" }}
            variant={page === "snapshot" ? "contained" : "outlined"}
            startIcon={
              <SvgIcon fontSize="large">
                <Snap />
              </SvgIcon>
            }
            size={large ? "large" : "medium"}
          >
            Snapshot
          </Button>
        </Link>
        <MuiLink href={"https://crow.so"} target="_blank" rel="noreferrer">
          <Button
            sx={{ width: "100%" }}
            variant="outlined"
            startIcon={
              <SvgIcon fontSize="large">
                <Crow />
              </SvgIcon>
            }
            size={large ? "large" : "medium"}
          >
            Crow.so
          </Button>
        </MuiLink>
      </MenuSection>
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
    </Stack>
  )
}
