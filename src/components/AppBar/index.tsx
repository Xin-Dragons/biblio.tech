import {
  Box,
  Card,
  CardContent,
  Container,
  Dialog,
  IconButton,
  LinearProgress,
  AppBar as MuiAppBar,
  Stack,
  SvgIcon,
  Typography,
  useMediaQuery,
} from "@mui/material"
import Link from "next/link"

import MenuRoundedIcon from "@mui/icons-material/MenuRounded"
import { WalletSearch } from "../WalletSearch"
import { useAccess } from "../../context/access"
import { useRouter } from "next/router"
import { UserMenu } from "../UserMenu"
import { useTags } from "../../context/tags"
import { Color } from "../Tags"
import { Edit, Info } from "@mui/icons-material"
import { UpdateTag } from "../UpdateTag"
import { FC, useState } from "react"
import { useDatabase } from "../../context/database"
import { ViewMenu } from "../ViewMenu"
import { ShowInfo } from "../ShowInfo"
import { Collage } from "../Collage"
import { useUiSettings } from "../../context/ui-settings"
import { shorten } from "../../helpers/utils"
import { LightDarkMode } from "../LightDarkMode"
import Logo from "./logo.svg"
import Snowflakes from "./snowflakes.svg"

const Title: FC<{ setOpen?: Function }> = ({ setOpen }) => {
  const { isAdmin, publicKey } = useAccess()
  const { collections } = useDatabase()
  const { showAllWallets } = useUiSettings()
  const router = useRouter()
  const { tag } = useTags()
  const isVault = router.query.filter === "vault"
  const [showVaultInfo, setShowVaultInfo] = useState(false)

  function toggleVaultInfo() {
    setShowVaultInfo(!showVaultInfo)
  }

  const breakLine = useMediaQuery("(max-width:500px)")

  let title
  if (router.query.tag && tag) {
    if (router.query.tag === "untagged") {
      title = "Untagged"
    } else {
      title = (
        <Stack direction="row" alignItems="center" spacing={1} justifyContent="center">
          <Typography variant="h5">TAGS - </Typography>
          <Color color={tag.color!} />
          <Typography variant="h5">{tag.name}</Typography>
          {isAdmin && (
            <IconButton onClick={() => setOpen?.(true)}>
              <Edit />
            </IconButton>
          )}
        </Stack>
      )
    }
  } else if (router.query.collectionId) {
    const collection = collections.find((c) => c.id === router.query.collectionId)
    title = collection?.collectionName || "Unknown collection"
  } else if (isVault) {
    title = (
      <Stack direction="row" alignItems="center" sx={{ width: "100%" }} justifyContent="center">
        <Typography variant="h5" fontFamily="Lato" fontWeight="bold" textAlign="center">
          THE VAULT
        </Typography>
        <IconButton onClick={toggleVaultInfo}>
          <Info />
        </IconButton>
      </Stack>
    )
  } else if (router.query.filter) {
    title = router.query.filter
  } else if (!router.query.collectionId && !router.query.tag && !router.query.filter) {
    title = "All collections"
  }

  return (
    <Typography
      variant="h5"
      textTransform="uppercase"
      textAlign="center"
      sx={{
        whiteSpace: "auto",
        fontSize: breakLine ? "5vw" : "parent",
        overflow: "hidden",
        flexShrink: 1,
      }}
    >
      {title}
      {publicKey && (
        <Typography color="primary" variant="body2" textTransform="none">
          Now viewing: {showAllWallets && isAdmin ? "all wallets" : shorten(publicKey!)}
        </Typography>
      )}
      <Dialog open={showVaultInfo} onClose={toggleVaultInfo} fullWidth maxWidth="md">
        <Card>
          <CardContent>
            <Container maxWidth="sm">
              <Stack spacing={4} mb={4}>
                <Stack>
                  <Stack direction="row" width="100%" justifyContent="center" mt={4}>
                    <Typography
                      color="primary"
                      variant="h4"
                      fontWeight="normal"
                      textTransform="uppercase"
                      textAlign="center"
                    >
                      What is The Vault
                    </Typography>
                    <SvgIcon sx={{ marginLeft: -1 }}>
                      <Snowflakes />
                    </SvgIcon>
                  </Stack>
                  <Typography color="primary" textAlign="center">
                    And how does it work?
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={4}>
                  <Stack spacing={2} width="50%">
                    <Typography color="primary" textTransform="uppercase">
                      The Vault is a unique self-custodial locking system for NFTs, pNFTs and NFT editions.
                    </Typography>
                    <Typography variant="body2" textAlign="justify">
                      Adding items to The Vault helps protect them from wallet drains when interacting with malicious
                      dApps. Items in The Vault are frozen so if you accidentally sign a transaction to transfer these
                      assets, it will fail.
                    </Typography>
                    <Typography variant="body2" textAlign="justify">
                      The Vault works in the same way as locked staking or borrowing from Sharky or Frakt, however the
                      authority is delegated to a second wallet of your choosing so you dont need to trust any third
                      party program.
                    </Typography>
                  </Stack>
                  <Stack spacing={2} width="50%">
                    <Typography variant="body2" textAlign="justify">
                      As it is very unlikely for two of your wallets to both become compromised, this method is one of
                      the safest existing to date.
                    </Typography>
                    <Typography color="primary" textTransform="uppercase">
                      This system is unique and one of the safest ways to protect your NFTs
                    </Typography>
                    <Typography variant="body2" textAlign="justify">
                      You can use any of your linked wallets. We recommend freezing with a wallet that doesn&apos;t
                      contain the NFTs to amplify the security of your assets.
                    </Typography>
                    <Typography variant="body2" textAlign="justify">
                      THE VAULT IS 100% TRUSTLESS - you simply transfer authority between wallets you own. No
                      third-parties involved. We dont hold any authority or keys.
                    </Typography>
                  </Stack>
                </Stack>
              </Stack>
            </Container>
          </CardContent>
        </Card>
      </Dialog>
    </Typography>
  )
}

type AppBarProps = {
  showMenu?: boolean
  toggleMenu?: Function
  toggleSolTransferOpen: Function
}

export const AppBar: FC<AppBarProps> = ({ showMenu, toggleMenu, toggleSolTransferOpen }) => {
  const [open, setOpen] = useState(false)
  const { tag, updateTag } = useTags()
  const breakLine = useMediaQuery("(max-width:500px)")

  return (
    <MuiAppBar
      sx={{ borderBottom: 1, borderColor: "divider", maxWidth: "100%", overflow: "hidden" }}
      position="sticky"
      elevation={0}
      color="default"
    >
      <Container maxWidth={false}>
        <Stack
          direction="row"
          justifyContent="space-between"
          padding={0}
          alignItems="center"
          spacing={2}
          overflow="hidden"
          maxWidth="100%"
        >
          <Link href="/">
            <SvgIcon fontSize="large" sx={{ width: "75px", height: "75px", cursor: "pointer" }}>
              <Logo fontSize="large" />
            </SvgIcon>
          </Link>
          {showMenu && <WalletSearch />}

          <Box sx={{ flexGrow: breakLine ? 0 : 1 }}>
            <Title setOpen={setOpen} />
          </Box>

          {showMenu ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <Collage />
              <LightDarkMode />
              <ShowInfo />
              <ViewMenu />
              <UserMenu toggleSolTransferOpen={toggleSolTransferOpen} />
            </Stack>
          ) : (
            <IconButton onClick={toggleMenu as any} size="large">
              <MenuRoundedIcon fontSize="large" />
            </IconButton>
          )}
        </Stack>
      </Container>
      <UpdateTag open={open} setOpen={setOpen} id={tag?.id} name={tag?.name} color={tag?.color} onUpdate={updateTag} />
    </MuiAppBar>
  )
}
