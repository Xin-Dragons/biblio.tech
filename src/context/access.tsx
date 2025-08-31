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
import { getNiftyDandies } from "../helpers/utils"
import { Asset } from "@nifty-oss/asset"
import { ACCOUNT_TYPE } from "../constants"

type AccessContextProps = {
  publicKey: string | null
  user: any
  dandies: Array<DAS.GetAssetResponse | Asset>
  publicKeys: string[]
  isInScope: boolean
  isAdmin: boolean
  nonce: string
  refresh: Function
  account: ACCOUNT_TYPE
  nextLevel: ACCOUNT_TYPE
  userWallets: string[]
  dandiesNeeded: number
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
  account: ACCOUNT_TYPE.basic,
  nextLevel: ACCOUNT_TYPE.advanced,
  userWallets: [],
  dandiesNeeded: 0,
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
  const [dandies, setDandies] = useState<Array<DAS.GetAssetResponse | Asset>>([])

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
      const wallets = user.wallets.filter((w: any) => w.chain === "solana").map((w: any) => w.public_key)
      const dandies = await getDandies(wallets)
      const niftyDandies = await getNiftyDandies(umi, wallets)
      setDandies([...dandies, ...niftyDandies])
    })()
  }, [user])

  let account = ACCOUNT_TYPE.basic
  let nextLevel = ACCOUNT_TYPE.advanced
  let dandiesNeeded = 1
  account = ACCOUNT_TYPE.unlimited
  nextLevel = ACCOUNT_TYPE.unlimited
  dandiesNeeded = 0

  // if (dandies.length >= 10) {
  //   account = ACCOUNT_TYPE.unlimited
  //   nextLevel = ACCOUNT_TYPE.unlimited
  //   dandiesNeeded = 0
  // } else if (dandies.length >= 5) {
  //   account = ACCOUNT_TYPE.pro
  //   nextLevel = ACCOUNT_TYPE.unlimited
  //   dandiesNeeded = 10 - dandies.length
  // } else if (dandies.length) {
  //   account = ACCOUNT_TYPE.advanced
  //   nextLevel = ACCOUNT_TYPE.pro
  //   dandiesNeeded = 5 - dandies.length
  // }

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
        nextLevel,
        dandiesNeeded,
      }}
    >
      {children}
    </AccessContext.Provider>
  )
}

export const useAccess = () => {
  return useContext(AccessContext)
}
