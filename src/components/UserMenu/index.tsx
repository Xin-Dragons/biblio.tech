import { AccountBalanceWallet, Info, Lan, MonetizationOn, PersonAdd, Star } from "@mui/icons-material"
import {
  Box,
  Chip,
  Dialog,
  IconButton,
  Link,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  MenuList,
  Stack,
  Switch,
  Theme,
  Tooltip,
  Typography,
  darken,
  useMediaQuery,
} from "@mui/material"
import { FC, MouseEvent, useEffect, useState } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { useWalletModal } from "@solana/wallet-adapter-react-ui"
import { Profile } from "../Profile"
import PermIdentityIcon from "@mui/icons-material/PermIdentity"
import LinkOffIcon from "@mui/icons-material/LinkOff"
import LogoutIcon from "@mui/icons-material/Logout"
import LoginIcon from "@mui/icons-material/Login"
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined"
import { useUiSettings } from "../../context/ui-settings"
import { useUmi } from "../../context/umi"
import { useRouter } from "next/router"
import { useWallets } from "../../context/wallets"
import { useAccess } from "../../context/access"
import { shorten } from "../../helpers/utils"
import { useTheme } from "../../context/theme"
import { SignUp } from "../SignUp"
import { useCluster } from "../../context/cluster"
import { PriorityFeesSelector } from "../PriorityFeesSelector"
import { NetworkSelector } from "../NetworkSelector"

type UserMenuProps = {
  large?: boolean
  toggleSolTransferOpen: Function
  allowDevnet?: boolean
}

export const UserMenu: FC<UserMenuProps> = ({ large, toggleSolTransferOpen, allowDevnet }) => {
  const { setVisible, visible } = useWalletModal()
  const [signUpShowing, setSignUpShowing] = useState(false)
  const { user, account } = useAccess()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const { profileModalShowing, setProfileModalShowing, showAllWallets, setShowAllWallets } = useUiSettings()
  const open = Boolean(anchorEl)
  const wallet = useWallet()
  const { isLedger, setIsLedger } = useWallets()
  const theme = useTheme()

  const toggleVisible = () => {
    handleClose()
    setVisible(!visible)
  }

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget)
  }
  const handleClose = () => {
    setVisible(false)
    setAnchorEl(null)
  }

  function toggleProfileModal() {
    setProfileModalShowing(!profileModalShowing)
  }

  function openProfile() {
    setProfileModalShowing(true)
    handleClose()
  }

  const isXs = useMediaQuery((theme: Theme) => theme.breakpoints.down("sm"))

  return (
    <Box>
      <IconButton
        //@ts-ignore
        onClick={handleClick}
        aria-controls={open ? "basic-menu" : undefined}
        aria-haspopup="true"
        aria-expanded={open ? "true" : undefined}
        sx={{
          color: wallet.connected ? (user?.id ? "gold.main" : user ? "primary" : "#999") : "unset",
        }}
      >
        <Stack alignItems="center">
          <AccountBalanceWallet fontSize={large ? "large" : "inherit"} />
          {wallet.connected && user && (
            <Typography fontStyle="italic" variant="body2" fontWeight="bold" sx={{ fontSize: "10px" }}>
              {account.toUpperCase()}
            </Typography>
          )}
        </Stack>
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          "aria-labelledby": "basic-button",
        }}
        sx={{
          "& .MuiMenuItem-root: hover": {
            backgroundColor: darken(theme.palette.background.default, 0.1),
          },
        }}
      >
        <MenuList
          sx={{
            width: "220px",
          }}
        >
          <MenuItem onClick={toggleVisible} sx={{ marginBottom: wallet.connected ? 2 : 0 }}>
            <ListItemIcon>
              <AccountBalanceWalletOutlinedIcon color={wallet.connected ? "primary" : "inherit"} />
            </ListItemIcon>
            <ListItemText>
              <Link underline="none" fontWeight="bold">
                {wallet.connected ? shorten(wallet.publicKey?.toBase58() as string) : "Connect wallet"}
              </Link>
            </ListItemText>
          </MenuItem>
          {wallet.connected && (
            <div>
              {user && (
                <>
                  {user.id ? (
                    <MenuItem onClick={openProfile}>
                      <ListItemIcon sx={{ width: "50px" }}>
                        <PermIdentityIcon />
                      </ListItemIcon>
                      <ListItemText>Profile</ListItemText>
                    </MenuItem>
                  ) : (
                    <MenuItem onClick={() => setSignUpShowing(true)}>
                      <ListItemIcon sx={{ width: "50px" }}>
                        <PermIdentityIcon />
                      </ListItemIcon>
                      <ListItemText sx={{ color: "gold.default" }}>Create account</ListItemText>
                    </MenuItem>
                  )}
                </>
              )}

              <MenuItem onClick={wallet.disconnect}>
                <ListItemIcon sx={{ width: "50px" }}>
                  <LinkOffIcon />
                </ListItemIcon>
                <ListItemText>Disconnect</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => toggleSolTransferOpen()}>
                <ListItemIcon sx={{ width: "50px" }}>
                  <MonetizationOn />
                </ListItemIcon>
                <ListItemText>Transfer SOL</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => setShowAllWallets(!showAllWallets)}>
                <ListItemIcon sx={{ width: "50px" }}>
                  <Switch
                    checked={showAllWallets}
                    onChange={(e) => setShowAllWallets(e.target.checked)}
                    inputProps={{ "aria-label": "controlled" }}
                    size="small"
                  />
                </ListItemIcon>
                <ListItemText>View all wallets</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => setIsLedger(!isLedger, wallet.publicKey?.toBase58())}>
                <ListItemIcon sx={{ width: "50px" }}>
                  <Switch
                    checked={isLedger}
                    onChange={(e) => setIsLedger(e.target.checked, wallet.publicKey?.toBase58())}
                    inputProps={{ "aria-label": "controlled" }}
                    size="small"
                  />
                </ListItemIcon>
                <ListItemText>Using Ledger?</ListItemText>
              </MenuItem>
              <MenuItem>
                <ListItemIcon sx={{ width: "50px" }}>
                  <Lan />
                </ListItemIcon>
                <ListItemText>
                  <NetworkSelector />
                </ListItemText>
              </MenuItem>
              <MenuItem>
                <ListItemIcon sx={{ width: "50px" }}>
                  <Tooltip
                    title={`Increase this to prioritise your transactions in times of network congestion. We recommend always using at-least "MEDIUM" priority to ensure your transactions are processed.`}
                  >
                    <Info sx={{ cursor: "help" }} />
                  </Tooltip>
                </ListItemIcon>
                <PriorityFeesSelector />
              </MenuItem>
            </div>
          )}
        </MenuList>
      </Menu>
      {user && (
        <Dialog
          open={profileModalShowing}
          onClose={toggleProfileModal}
          fullWidth={true}
          maxWidth="md"
          fullScreen={isXs}
        >
          <Profile user={user} publicKey={user.publicKey} onClose={toggleProfileModal} />
        </Dialog>
      )}
      <Dialog
        open={signUpShowing}
        onClose={() => setSignUpShowing(false)}
        fullWidth={true}
        maxWidth="md"
        fullScreen={isXs}
      >
        <SignUp onClose={() => setSignUpShowing(false)} />
      </Dialog>
    </Box>
  )
}
