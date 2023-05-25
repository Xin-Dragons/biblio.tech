import { getCsrfToken, signIn, signOut, useSession } from "next-auth/react"
import { AccountBalanceWallet } from "@mui/icons-material"
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
} from "@mui/material"
import { FC, MouseEvent, useEffect, useState } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { useWalletModal } from "@solana/wallet-adapter-react-ui"
import base58 from "bs58"
import { SigninMessage } from "../../utils/SigninMessge"
import { shorten } from "../Item"
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

export const UserMenu: FC = () => {
  const { setVisible, visible } = useWalletModal()
  const [isSigningIn, setIsSigningIn] = useState(false)
  const { data: session, status } = useSession()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [profileModalShowing, setProfileModalShowing] = useState(false)
  const open = Boolean(anchorEl)
  const wallet = useWallet()
  const { usingLedger, setUsingLedger } = useUiSettings()
  const umi = useUmi()
  const router = useRouter()

  async function signOutIn() {
    await signOut({ redirect: false })
    await handleSignIn()
  }

  useEffect(() => {
    if (wallet.publicKey && session?.publicKey && wallet.publicKey.toBase58() !== session?.publicKey) {
      signOutIn()
    }
  }, [wallet.publicKey, session])

  useEffect(() => {
    if (wallet.connected && status === "unauthenticated" && document.hasFocus()) {
      handleSignIn()
    }
  }, [wallet.publicKey])

  async function walletSignIn(isUsingLedger: boolean = false): Promise<void> {
    if (isUsingLedger) {
      try {
        const txn = await addMemo(umi, {
          memo: "Sign in to Biblio",
        }).buildWithLatestBlockhash(umi)

        const signed = await umi.identity.signTransaction(txn)

        const result = await signIn("credentials", {
          redirect: false,
          rawTransaction: base58.encode(umi.transactions.serialize(signed)),
          publicKey: wallet.publicKey?.toBase58(),
          usingLedger,
        })

        console.log(result)

        if (!result?.ok) {
          throw new Error("Failed to sign in")
        }
      } catch (err: any) {
        console.error(err)

        if (err.message.includes("Something went wrong")) {
          throw new Error(
            "Looks like the Solana app on your Ledger is out of date. Please update using the Ledger Live application and try again."
          )
        }

        if (err.message.includes("Cannot destructure property 'signature' of 'r' as it is undefined")) {
          throw new Error(
            'Unable to connect to Ledger, please make sure the device is unlocked with the Solana app open, and "Blind Signing" enabled'
          )
        }

        throw err
      }
    } else {
      try {
        const csrf = await getCsrfToken()
        if (!wallet.publicKey || !csrf || !wallet.signMessage) return

        const message = new SigninMessage({
          domain: window.location.host,
          publicKey: wallet.publicKey?.toBase58(),
          statement: `Sign this message to sign in to Biblio.\n\n`,
          nonce: csrf,
        })

        const data = new TextEncoder().encode(message.prepare())
        const signature = await wallet.signMessage(data)
        const serializedSignature = base58.encode(signature)

        const result = await signIn("credentials", {
          message: JSON.stringify(message),
          redirect: false,
          signature: serializedSignature,
        })

        if (!result?.ok) {
          throw new Error("Failed to sign in")
        }
      } catch (err: any) {
        if (err.message.includes("Signing off chain messages with Ledger is not yet supported")) {
          toast(
            "Looks like you're using Ledger!\n\nLedger doesn't support offchain message signing (yet) so please sign this memo transaction to sign in."
          )
          setUsingLedger(true, wallet.publicKey?.toBase58())
          return await walletSignIn(true)
        }
        throw err
      }
    }
  }

  async function handleSignIn(): Promise<void> {
    try {
      setIsSigningIn(true)
      const signInPromise = walletSignIn(usingLedger)

      toast.promise(signInPromise, {
        loading: "Signing in...",
        success: "Signed in",
        error: "Error signing in",
      })

      await signInPromise

      router.push("/")
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSigningIn(false)
    }
  }

  async function handleSignOut() {
    await signOut({ redirect: false })
  }

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
        <AccountBalanceWallet />
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
            backgroundColor: "#1f1f1f",
          },
        }}
      >
        <MenuList
          sx={{
            width: "180px",
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
                <MenuItem onClick={openProfile} disabled={isSigningIn}>
                  <ListItemIcon sx={{ width: "50px" }}>
                    <PermIdentityIcon />
                  </ListItemIcon>
                  <ListItemText>Profile</ListItemText>
                </MenuItem>
              )}
              <MenuItem onClick={wallet.disconnect} disabled={isSigningIn}>
                <ListItemIcon sx={{ width: "50px" }}>
                  <LinkOffIcon />
                </ListItemIcon>
                <ListItemText>Disconnect</ListItemText>
              </MenuItem>
              {session?.user ? (
                <MenuItem onClick={handleSignOut} disabled={isSigningIn}>
                  <ListItemIcon sx={{ width: "50px" }}>
                    <LogoutIcon />
                  </ListItemIcon>
                  <ListItemText>Sign out</ListItemText>
                </MenuItem>
              ) : (
                <MenuItem onClick={(e) => handleSignIn()} disabled={isSigningIn}>
                  <ListItemIcon sx={{ width: "50px" }}>
                    <LoginIcon />
                  </ListItemIcon>
                  <ListItemText>Sign in</ListItemText>
                </MenuItem>
              )}
              <MenuItem onClick={() => setUsingLedger(!usingLedger)} disabled={isSigningIn}>
                <ListItemIcon sx={{ width: "50px" }}>
                  <Switch
                    checked={usingLedger}
                    onChange={(e) => setUsingLedger(e.target.checked, wallet.publicKey?.toBase58())}
                    inputProps={{ "aria-label": "controlled" }}
                    disabled={isSigningIn}
                    size="small"
                  />
                </ListItemIcon>
                <ListItemText>Using Ledger?</ListItemText>
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
