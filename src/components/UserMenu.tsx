"use client"
import { useSession } from "next-auth/react"
import { AccountBalanceWallet, MonetizationOn, PersonAdd, Star } from "@mui/icons-material"
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
  Stack,
  Switch,
  Theme,
  Typography,
  darken,
  useMediaQuery,
} from "@mui/material"
import { FC, MouseEvent, useState } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { useWalletModal } from "@solana/wallet-adapter-react-ui"
import { Profile } from "./Profile"
import PermIdentityIcon from "@mui/icons-material/PermIdentity"
import LinkOffIcon from "@mui/icons-material/LinkOff"
import LogoutIcon from "@mui/icons-material/Logout"
import LoginIcon from "@mui/icons-material/Login"
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined"
import { useUiSettings } from "../context/ui-settings"
import { useUmi } from "../context/umi"
import { useRouter } from "next/router"
import { useWallets } from "../context/wallets"
import { useAccess } from "../context/access"
import { shorten } from "../helpers/utils"
import { useTheme } from "../context/theme"
import { SignUp } from "./SignUp"
import { useCluster } from "../context/cluster"

type UserMenuProps = {
  large?: boolean
  allowDevnet?: boolean
}

export const UserMenu: FC<UserMenuProps> = ({ large, allowDevnet }) => {
  const { cluster, setCluster } = useCluster()
  const { setVisible, visible } = useWalletModal()
  const { multiWallet, signOut, signIn, isSigningIn, isAdmin } = useAccess()
  const [signUpShowing, setSignUpShowing] = useState(false)
  const { data: session, status } = useSession()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const { profileModalShowing, setProfileModalShowing, showAllWallets, setShowAllWallets } = useUiSettings()
  const open = Boolean(anchorEl)
  const wallet = useWallet()
  const { isLedger, setIsLedger } = useWallets()
  const theme = useTheme()

  async function signOutIn() {
    await signOut()
    await signIn()
  }

  console.log(visible)

  // useEffect(() => {
  //   if (status !== "authenticated") {
  //     return
  //   }
  //   if (!session?.user?.active && wallet.publicKey && wallet.publicKey?.toBase58() !== session?.publicKey) {
  //     signOutIn()
  //   }
  // }, [wallet.publicKey, session])

  // useEffect(() => {
  //   if (wallet.connected && status === "unauthenticated" && document.hasFocus()) {
  //     signIn()
  //   }
  // }, [wallet.publicKey])

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
          color: wallet.connected ? (session?.user?.id ? "gold.main" : session?.user ? "primary" : "#999") : "unset",
        }}
      >
        <Stack alignItems="center">
          <AccountBalanceWallet fontSize={large ? "large" : "inherit"} />
          {wallet.connected && session?.user && (
            <Typography fontStyle="italic" variant="body2" fontWeight="bold" sx={{ fontSize: "10px" }}>
              {session?.user?.id ? "PREMIUM" : "BASIC"}
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
              {session?.user && (
                <>
                  {session.user.id ? (
                    <MenuItem onClick={openProfile} disabled={isSigningIn}>
                      <ListItemIcon sx={{ width: "50px" }}>
                        <PermIdentityIcon />
                      </ListItemIcon>
                      <ListItemText>Profile</ListItemText>
                    </MenuItem>
                  ) : (
                    <MenuItem onClick={() => setSignUpShowing(true)} disabled={isSigningIn}>
                      <ListItemIcon sx={{ width: "50px" }}>
                        <Star
                          // @ts-ignore
                          color="gold"
                        />
                      </ListItemIcon>
                      <ListItemText sx={{ color: "gold.default" }}>PREMIUM</ListItemText>
                    </MenuItem>
                  )}
                </>
              )}

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
              <MenuItem>
                <ListItemIcon sx={{ width: "50px" }}>
                  <MonetizationOn />
                </ListItemIcon>
                <ListItemText>Transfer SOL</ListItemText>
              </MenuItem>
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
              {/* <MenuItem onClick={() => setCluster(cluster === "devnet" ? "mainnet" : "devnet")} disabled={isSigningIn}>
                <ListItemIcon sx={{ width: "50px" }}>
                  <Switch
                    checked={cluster === "devnet"}
                    onChange={(e) => setCluster(cluster === "devnet" ? "mainnet" : "devnet")}
                    inputProps={{ "aria-label": "controlled" }}
                    disabled={isSigningIn}
                    size="small"
                  />
                </ListItemIcon>
                <ListItemText>Devnet</ListItemText>
              </MenuItem> */}
            </div>
          )}
        </MenuList>
      </Menu>
      {session?.user?.id && (
        <Dialog
          open={profileModalShowing}
          onClose={toggleProfileModal}
          fullWidth={true}
          maxWidth="md"
          fullScreen={isXs}
        >
          <Profile user={session.user} publicKey={session.publicKey} onClose={toggleProfileModal} />
        </Dialog>
      )}
      <Dialog
        open={signUpShowing}
        onClose={() => setSignUpShowing(false)}
        fullWidth={true}
        maxWidth="md"
        fullScreen={isXs}
      >
        <SignUp />
      </Dialog>
    </Box>
  )
}
