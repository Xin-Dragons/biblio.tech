import { PublicKey } from "@metaplex-foundation/js"
import { useWallet } from "@solana/wallet-adapter-react"
import axios from "axios"
import { signOut as authSignOut, signIn as authSignIn, useSession, getCsrfToken } from "next-auth/react"
import { useRouter } from "next/router"
import { FC, ReactNode, createContext, useContext, useEffect, useState } from "react"
import { getPublicKeyFromSolDomain } from "../components/WalletSearch"
import { Nft, User } from "../types/nextauth"
import { noop, partition, sortBy } from "lodash"
import { addMemo } from "@metaplex-foundation/mpl-essentials"
import { useUmi } from "./umi"
import { toast } from "react-hot-toast"
import base58 from "bs58"
import { SigninMessage } from "../utils/SigninMessge"
import { useWallets } from "./wallets"
import { useWalletBypass } from "./wallet-bypass"
import { getAddressType } from "../helpers/utils"

type AccessContextProps = {
  publicKey: string | null
  user: any
  isAdmin: boolean
  isActive: boolean
  isOffline: boolean
  userId: string | null
  multiWallet: boolean
  publicKeys: string[]
  availableWallets: number
  signOut: Function
  signIn: Function
  isSigningIn: boolean
}

const initial = {
  publicKey: null,
  userId: null,
  user: null,
  isAdmin: false,
  isActive: false,
  isOffline: false,
  multiWallet: false,
  publicKeys: [],
  availableWallets: 0,
  signOut: noop,
  signIn: noop,
  isSigningIn: false,
}

export const AccessContext = createContext<AccessContextProps>(initial)

type AccessProviderProps = {
  children: ReactNode
}

export const AccessProvider: FC<AccessProviderProps> = ({ children }) => {
  const { bypassWallet } = useWalletBypass()
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [multiWallet, setMultiWallet] = useState(false)
  const [publicKeys, setPublicKeys] = useState<string[]>([])
  const [ethPublicKeys, setEthPublicKeys] = useState<string[]>([])
  const [availableWallets, setAvailableWallets] = useState(0)
  const [userId, setUserId] = useState<string | null>(null)
  const [publicKey, setPublicKey] = useState<string>("")
  const [isAdmin, setIsAdmin] = useState(false)
  const [isOffline, setIsOffline] = useState(false)
  const [isActive, setIsActive] = useState(false)
  const { isLedger, setIsLedger } = useWallets()
  const umi = useUmi()
  const wallet = useWallet()
  const { data: session } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (bypassWallet) {
      return
    }
    const publicKey = (router.query.publicKey as string) || wallet.publicKey?.toBase58()
    if (!publicKey) {
      setPublicKey("")
    } else {
      setPublicKey(publicKey)
    }
  }, [router.query.publicKey, wallet.publicKey, isActive, isOffline, bypassWallet])

  async function getUser() {
    if (session?.user) {
      setUser(session?.user)
      setUserId(session?.user?.id)

      console.log(session.user.nfts)

      const active =
        session?.user?.nfts
          ?.filter((item: Nft) => {
            if (!item || !item.active) {
              return false
            }
            const isUnlimited =
              item.metadata?.attributes?.find((att) => att?.trait_type === "Access")?.value === "Unlimited"
            if (!item.hours_active || isUnlimited) {
              return true
            }

            const stakedHours = item.time_staked * 3600

            return stakedHours < item.hours_active
          })
          .reduce((sum, nft) => {
            const numFromMeta = nft.metadata.attributes?.find((att) => att?.trait_type === "Wallets")?.value
            if (numFromMeta) {
              return sum + Number(numFromMeta)
            }
            return sum + nft.number_wallets
          }, 0) || 0

      const publicKeys = sortBy(
        session?.user?.wallets?.filter((w) => w.active),
        (item) => !item.active
      ).slice(0, active)

      setAvailableWallets(active)
      setPublicKeys(publicKeys.map((item) => item.public_key))
    } else {
      setUser(null)
      setUserId(null)
    }
  }

  useEffect(() => {
    setMultiWallet(publicKeys.length > 1)
  }, [publicKeys])

  useEffect(() => {
    setIsActive(Boolean(session?.user?.active))
  }, [session?.user?.active])

  useEffect(() => {
    setIsOffline(Boolean(session?.user?.offline))
    const isActive = session?.user?.active || session?.user?.offline
    const isLocalScope = !router.query.publicKey
    const isAdmin = (session?.user?.wallets || [])
      .filter((wallet) => wallet.active)
      .map((wallet: any) => wallet.public_key)
      .includes(wallet.publicKey?.toBase58())

    setIsAdmin(Boolean(isAdmin && isLocalScope && isActive) || isOffline)
  }, [session, user, wallet.publicKey, router.query])

  useEffect(() => {
    getUser()
  }, [session?.user])

  async function signIn() {
    try {
      setIsSigningIn(true)
      const signInPromise = walletSignIn(isLedger)

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

  async function signOut() {
    await authSignOut({ redirect: false })
  }

  async function walletSignIn(isLedger: boolean = false): Promise<void> {
    if (isLedger) {
      try {
        const txn = await addMemo(umi, {
          memo: "Sign in to Biblio",
        }).buildWithLatestBlockhash(umi)

        const signed = await umi.identity.signTransaction(txn)

        const result = await authSignIn("credentials", {
          redirect: false,
          rawTransaction: base58.encode(umi.transactions.serialize(signed)),
          publicKey: wallet.publicKey?.toBase58(),
          isLedger,
        })

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

        const result = await authSignIn("credentials", {
          message: JSON.stringify(message),
          redirect: false,
          signature: serializedSignature,
        })

        if (!result?.ok) {
          throw new Error("Failed to sign in")
        }
      } catch (err: any) {
        console.error(err)
        if (err.message.includes("Signing off chain messages with Ledger is not yet supported")) {
          toast(
            "Looks like you're using Ledger!\n\nLedger doesn't support offchain message signing (yet) so please sign this memo transaction to sign in."
          )
          setIsLedger(true, wallet.publicKey?.toBase58())
          return await walletSignIn(true)
        }
        throw err
      }
    }
  }

  return (
    <AccessContext.Provider
      value={{
        user,
        isAdmin,
        publicKey,
        isActive,
        userId,
        isOffline,
        multiWallet,
        publicKeys,
        availableWallets,
        signOut,
        signIn,
        isSigningIn,
      }}
    >
      {children}
    </AccessContext.Provider>
  )
}

export const useAccess = () => {
  return useContext(AccessContext)
}
