import {
  Box,
  Container,
  IconButton,
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
import { useInfo } from "../../context/info"
import { ViewMenu } from "../ViewMenu"
import { ShowInfo } from "../ShowInfo"
import { Collage } from "../Collage"
import { useUiSettings } from "../../context/ui-settings"
import { shorten } from "../../helpers/utils"
import { LightDarkMode } from "../LightDarkMode"
import Logo from "./logo.svg"

const Title: FC<{ setOpen?: Function }> = ({ setOpen }) => {
  const { isAdmin, publicKey } = useAccess()
  const { collections } = useDatabase()
  const { showAllWallets } = useUiSettings()
  const router = useRouter()
  const { tag } = useTags()
  const isVault = router.query.filter === "vault"
  const { toggleInfo } = useInfo()

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
        <IconButton onClick={() => toggleInfo("vault")}>
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

          <Box sx={{ flexGrow: breakLine ? 1 : 0 }}>
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
