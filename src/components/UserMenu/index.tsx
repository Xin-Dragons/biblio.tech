import { useSession } from "next-auth/react"
import { AccountBalanceWallet, MonetizationOn } from "@mui/icons-material"
import {
  Box,
  Dialog,
  IconButton,
  Link,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  MenuList,
  Switch,
  darken,
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
import { toast } from "react-hot-toast"
import { useUiSettings } from "../../context/ui-settings"
import { useUmi } from "../../context/umi"
import { sol, transactionBuilder } from "@metaplex-foundation/umi"
import { addMemo, transferSol } from "@metaplex-foundation/mpl-essentials"
import { useRouter } from "next/router"
import { useWallets } from "../../context/wallets"
import { useAccess } from "../../context/access"
import { shorten } from "../../helpers/utils"
import { useTheme } from "../../context/theme"

type UserMenuProps = {
  large?: boolean
  toggleSolTransferOpen: Function
}

export const UserMenu: FC<UserMenuProps> = ({ large, toggleSolTransferOpen }) => {
  const { setVisible, visible } = useWalletModal()
  const { multiWallet, signOut, signIn, isSigningIn, isAdmin } = useAccess()
  const { data: session, status } = useSession()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const { profileModalShowing, setProfileModalShowing, showAllWallets, setShowAllWallets } = useUiSettings()
  const open = Boolean(anchorEl)
  const wallet = useWallet()
  const { isLedger, setIsLedger } = useWallets()
  const theme = useTheme()
  const umi = useUmi()
  const router = useRouter()

  async function signOutIn() {
    await signOut()
    await signIn()
  }

  useEffect(() => {
    if (status !== "authenticated") {
      return
    }
    if (!session?.user?.active && wallet.publicKey && wallet.publicKey?.toBase58() !== session?.publicKey) {
      signOutIn()
    }
  }, [wallet.publicKey, session])

  useEffect(() => {
    if (wallet.connected && status === "unauthenticated" && document.hasFocus()) {
      signIn()
    }
  }, [wallet.publicKey])

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

  return (
    <Box>
      <IconButton
        color={wallet.connected ? "primary" : "default"}
        onClick={handleClick}
        aria-controls={open ? "basic-menu" : undefined}
        aria-haspopup="true"
        aria-expanded={open ? "true" : undefined}
      >
        <AccountBalanceWallet fontSize={large ? "large" : "inherit"} />
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
          <MenuItem onClick={toggleVisible} sx={{ marginBottom: wallet.connected ? 2 : 0 }} disabled={isSigningIn}>
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
              {multiWallet && isAdmin && (
                <MenuItem onClick={() => setShowAllWallets(!showAllWallets)}>
                  <ListItemIcon sx={{ width: "50px" }}>
                    <Switch
                      checked={showAllWallets}
                      onChange={(e) => setShowAllWallets(e.target.checked)}
                      inputProps={{ "aria-label": "controlled" }}
                      disabled={isSigningIn}
                      size="small"
                    />
                  </ListItemIcon>
                  <ListItemText>Show all wallets</ListItemText>
                </MenuItem>
              )}
              <MenuItem onClick={() => setIsLedger(!isLedger, wallet.publicKey?.toBase58())} disabled={isSigningIn}>
                <ListItemIcon sx={{ width: "50px" }}>
                  <Switch
                    checked={isLedger}
                    onChange={(e) => setIsLedger(e.target.checked, wallet.publicKey?.toBase58())}
                    inputProps={{ "aria-label": "controlled" }}
                    disabled={isSigningIn}
                    size="small"
                  />
                </ListItemIcon>
                <ListItemText>Using Ledger?</ListItemText>
              </MenuItem>
              {session?.user && (
                <MenuItem onClick={openProfile} disabled={isSigningIn}>
                  <ListItemIcon sx={{ width: "50px" }}>
                    <PermIdentityIcon />
                  </ListItemIcon>
                  <ListItemText>Profile</ListItemText>
                </MenuItem>
              )}

              <MenuItem onClick={() => toggleSolTransferOpen()}>
                <ListItemIcon sx={{ width: "50px" }}>
                  <MonetizationOn />
                </ListItemIcon>
                <ListItemText>Transfer SOL</ListItemText>
              </MenuItem>
              {session?.user ? (
                <MenuItem onClick={() => signOut()} disabled={isSigningIn}>
                  <ListItemIcon sx={{ width: "50px" }}>
                    <LogoutIcon />
                  </ListItemIcon>
                  <ListItemText>Sign out</ListItemText>
                </MenuItem>
              ) : (
                <MenuItem onClick={() => signIn()} disabled={isSigningIn}>
                  <ListItemIcon sx={{ width: "50px" }}>
                    <LoginIcon />
                  </ListItemIcon>
                  <ListItemText>Sign in</ListItemText>
                </MenuItem>
              )}
              <MenuItem onClick={wallet.disconnect} disabled={isSigningIn}>
                <ListItemIcon sx={{ width: "50px" }}>
                  <LinkOffIcon />
                </ListItemIcon>
                <ListItemText>Disconnect</ListItemText>
              </MenuItem>
            </div>
          )}
        </MenuList>
      </Menu>
      {session?.user?.id && (
        <Dialog open={profileModalShowing} onClose={toggleProfileModal} fullWidth={true} maxWidth="md">
          <Profile user={session.user} publicKey={session.publicKey} onClose={toggleProfileModal} />
        </Dialog>
      )}
    </Box>
  )
}
