import { useWallet } from "@solana/wallet-adapter-react"
import { useRouter } from "next/router"
import { FC, ReactNode, createContext, useContext, useEffect, useState } from "react"
import { noop, sortBy } from "lodash"
import { useUmi } from "./umi"
import { useWalletBypass } from "./wallet-bypass"
import { getWallets } from "../helpers/wallets"
import { DAS } from "helius-sdk"
import axios from "axios"
import { getDandies } from "../helpers/helius"

type AccountType = "basic" | "advanced" | "pro" | "unlimited"

type AccessContextProps = {
  publicKey: string | null
  user: any
  dandies: DAS.GetAssetResponse[]
  publicKeys: string[]
  isInScope: boolean
  isAdmin: boolean
  nonce: string
  refresh: Function
  account: AccountType
  userWallets: string[]
}

const initial = {
  publicKey: null,
  user: null,
  dandies: [],
  publicKeys: [],
  isInScope: false,
  isAdmin: false,
  nonce: "",
  refresh: noop,
  account: "basic" as AccountType,
  userWallets: [],
}

export const AccessContext = createContext<AccessContextProps>(initial)

type AccessProviderProps = {
  children: ReactNode
  nonce: string
}

export const AccessProvider: FC<AccessProviderProps> = ({ children, nonce: originalNonce }) => {
  const [nonce, setNonce] = useState(originalNonce)
  const { bypassWallet } = useWalletBypass()
  const [user, setUser] = useState<any | null>({})
  const [publicKeys, setPublicKeys] = useState<string[]>([])
  const [userWallets, setUserWallets] = useState<string[]>([])
  const [dandies, setDandies] = useState<DAS.GetAssetResponse[]>([])
  const [isActive, setIsActive] = useState(false)
  const [publicKey, setPublicKey] = useState("")
  const umi = useUmi()
  const wallet = useWallet()
  const router = useRouter()

  useEffect(() => {
    if (originalNonce) {
      setNonce(originalNonce)
    }
  }, [originalNonce])

  async function refresh() {
    const { data } = await axios.post(`/api/get-user/`, { publicKey: wallet?.publicKey?.toBase58() })
    setUser(data)
  }

  useEffect(() => {
    if (bypassWallet || !wallet.publicKey) {
      return
    }
    refresh()
  }, [wallet.publicKey])

  useEffect(() => {
    if (!publicKey) {
      setPublicKeys([])
      return
    }
    ;(async () => {
      const { data } = await axios.post(`/api/get-user/`, { publicKey })
      if (!data.id) {
        setPublicKeys([publicKey])
      } else {
        setPublicKeys(data.wallets.map((d: any) => d.public_key))
      }
    })()
  }, [publicKey])

  useEffect(() => {
    if (bypassWallet) {
      console.log("Wallet listener bypassed, returning")
      return
    }
    const publicKey = (router.query.publicKey as string) || wallet.publicKey?.toBase58()
    if (!publicKey) {
      setPublicKey("")
    } else {
      setPublicKey(publicKey)
    }
  }, [router.query.publicKey, wallet.publicKey, isActive, bypassWallet])

  useEffect(() => {
    if (!user?.id) {
      setDandies([])
      return
    }
    ;(async () => {
      setUserWallets(user.wallets.map((w: any) => w.public_key))
      const dandies = await getDandies(
        user.wallets.filter((w: any) => w.chain === "solana").map((w: any) => w.public_key)
      )
      console.log({ dandies })
      setDandies(dandies)
    })()
  }, [user])

  let account: AccountType = "basic"

  if (dandies.length >= 10) {
    account = "unlimited"
  } else if (dandies.length >= 5) {
    account = "pro"
  } else if (dandies.length) {
    account = "advanced"
  }

  return (
    <AccessContext.Provider
      value={{
        user,
        dandies,
        publicKey,
        publicKeys,
        isInScope: publicKey === wallet.publicKey?.toBase58(),
        nonce,
        isAdmin: publicKey.includes(wallet.publicKey?.toBase58() || ""),
        refresh,
        account,
        userWallets,
      }}
    >
      {children}
    </AccessContext.Provider>
  )
}

export const useAccess = () => {
  return useContext(AccessContext)
}
