import {
  Box,
  Button,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  Menu,
  MenuItem,
  AppBar as MuiAppBar,
  Select,
  Stack,
  SvgIcon,
  TextField,
  Theme,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material"
import { ToggleButton } from "@mui/material"
import Link from "next/link"

import { LayoutSize, useUiSettings } from "../../context/ui-settings"
import ViewQuiltIcon from "@mui/icons-material/ViewQuilt"
import MenuRoundedIcon from "@mui/icons-material/MenuRounded"
import VisibilityIcon from "@mui/icons-material/Visibility"
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff"
import { useFilters } from "../../context/filters"
import { WalletSearch } from "../WalletSearch"
import { useWallet } from "@solana/wallet-adapter-react"
import { useAccess } from "../../context/access"
import { useRouter } from "next/router"
import { UserMenu } from "../UserMenu"
import { useNfts } from "../../context/nfts"
import { useTags } from "../../context/tags"
import { Color } from "../Tags"
import { Dashboard, Edit, Info } from "@mui/icons-material"
import { UpdateTag } from "../UpdateTag"
import { FC, useState } from "react"
import { useDatabase } from "../../context/database"
import { useInfo } from "../../context/info"
import { ViewMenu } from "../ViewMenu"
import { ShowInfo } from "../ShowInfo"

const Title: FC<{ setOpen?: Function }> = ({ setOpen }) => {
  const { isAdmin } = useAccess()
  const { collections } = useDatabase()
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
        <Stack direction="row" alignItems="center" spacing={1}>
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
      <Stack direction="row" alignItems="center">
        <Typography variant="h5" fontFamily="Lato" fontWeight="bold">
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
      sx={{ whiteSpace: breakLine ? "auto" : "nowrap", fontSize: breakLine ? "5vw" : "parent" }}
    >
      {title}
    </Typography>
  )
}

type AppBarProps = {
  showMenu?: boolean
  toggleMenu?: Function
}

export const AppBar: FC<AppBarProps> = ({ showMenu, toggleMenu }) => {
  const [open, setOpen] = useState(false)
  const { tag, updateTag } = useTags()

  return (
    <MuiAppBar sx={{ background: "#111316", borderBottom: "1px solid #333" }} position="sticky" elevation={0}>
      <Container maxWidth={false}>
        <Stack
          direction="row"
          justifyContent="space-between"
          padding={0}
          alignItems="center"
          spacing={2}
          sx={{ overflow: "auto" }}
        >
          <Link href="/">
            <img src="/logo-text-white.svg" width={75} height={75} style={{ cursor: "pointer" }} />
          </Link>
          {showMenu && <WalletSearch />}

          <Box sx={{ flexGrow: 1 }}>
            <Title setOpen={setOpen} />
          </Box>

          {showMenu ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <ShowInfo />
              <ViewMenu />
              <UserMenu />
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
