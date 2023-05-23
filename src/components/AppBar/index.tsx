import {
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
import GridIcon from "./grid.svg"
import GridIcon2 from "./grid-2.svg"
import GridIcon3 from "./grid-3.svg"
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
import { Edit, Info } from "@mui/icons-material"
import { UpdateTag } from "../UpdateTag"
import { FC, useState } from "react"
import { useDatabase } from "../../context/database"
import { useInfo } from "../../context/info"

const Title: FC<{ setOpen?: Function }> = ({ setOpen }) => {
  const { isAdmin } = useAccess()
  const { collections } = useDatabase()
  const router = useRouter()
  const { tag } = useTags()
  const isVault = router.query.filter === "vault"
  const { toggleInfo } = useInfo()

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
    <Typography variant="h5" textTransform="uppercase">
      {title}
    </Typography>
  )
}

type AppBarProps = {
  showMenu?: boolean
  toggleMenu?: Function
}

export const AppBar: FC<AppBarProps> = ({ showMenu, toggleMenu }) => {
  const { layoutSize, showInfo, setShowInfo, setLayoutSize, sort, setSort } = useUiSettings()
  const { filtered } = useNfts()
  const [open, setOpen] = useState(false)
  const { sortOptions } = useFilters()
  const { tag, updateTag } = useTags()
  const router = useRouter()
  const { isAdmin } = useAccess()
  const {
    query: { publicKey: scopedPublicKey },
  } = useRouter()
  const wallet = useWallet()

  function toggleInfo() {
    setShowInfo(!showInfo)
  }

  function handleSizeChange(e: any, value: LayoutSize) {
    if (value !== null) {
      setLayoutSize(value)
    }
  }

  const showNavigation = useMediaQuery((theme: Theme) => theme.breakpoints.up("sm"))

  return (
    <MuiAppBar sx={{ background: "#111316", borderBottom: "1px solid #333" }} position="sticky" elevation={0}>
      <Container maxWidth={false}>
        <Stack direction="row" justifyContent="space-between" padding={0} alignItems="center" spacing={2}>
          <Link href="/">
            <img src="/logo-text-white.svg" width={75} height={75} style={{ cursor: "pointer" }} />
          </Link>
          <Stack direction="row" sx={{ flexGrow: 1 }} justifyContent="space-between">
            <WalletSearch />
            {/* {
              showNavigation && (
                <Stack direction="row">
                  <Link href="/" passHref>
                    <Button size="large" sx={{ fontWeight: "bold" }}>Collections</Button>
                  </Link>
                  <Link href="/nfts" passHref>
                    <Button size="large" sx={{ fontWeight: "bold" }}>NFTs</Button>
                  </Link>
                  <Link href="/wallet" passHref>
                    <Button size="large" sx={{ fontWeight: "bold" }}>Wallets</Button>
                  </Link>
                </Stack>
              )
            } */}

            <Title setOpen={setOpen} />

            <Stack direction="row" spacing={1} alignItems="center">
              <FormControl size="small">
                <InputLabel id="demo-simple-select-label">Sort</InputLabel>
                <Select
                  labelId="demo-simple-select-label"
                  id="demo-simple-select"
                  value={sort}
                  label="Age"
                  onChange={(e) => setSort(e.target.value)}
                  sx={{ fontSize: "14px", width: "100px" }}
                >
                  {sortOptions.map((item, index) => (
                    <MenuItem key={index} value={item.value}>
                      {item.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Tooltip title="Toggle detailed view">
                <IconButton onClick={toggleInfo}>{showInfo ? <VisibilityIcon /> : <VisibilityOffIcon />}</IconButton>
              </Tooltip>
              <ToggleButtonGroup
                value={layoutSize}
                exclusive
                onChange={handleSizeChange}
                aria-label="Layout size"
                defaultValue={layoutSize}
                size="small"
              >
                <ToggleButton value="small">
                  <SvgIcon component={GridIcon3} inheritViewBox fontSize="small" />
                </ToggleButton>
                <ToggleButton value="medium">
                  <SvgIcon component={GridIcon2} inheritViewBox fontSize="small" />
                </ToggleButton>
                <ToggleButton value="large">
                  <SvgIcon component={GridIcon} inheritViewBox fontSize="small" />
                </ToggleButton>
                <ToggleButton value="collage" disabled={filtered.length > 500}>
                  <ViewQuiltIcon inheritViewBox />
                </ToggleButton>
              </ToggleButtonGroup>
              <UserMenu />

              {!showMenu && (
                <IconButton onClick={toggleMenu as any}>
                  <MenuRoundedIcon fontSize="large" />
                </IconButton>
              )}
            </Stack>
          </Stack>
        </Stack>
      </Container>
      <UpdateTag open={open} setOpen={setOpen} id={tag?.id} name={tag?.name} color={tag?.color} onUpdate={updateTag} />
    </MuiAppBar>
  )
}
