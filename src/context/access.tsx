import { useWallet } from "@solana/wallet-adapter-react"
import { useRouter } from "next/router"
import { FC, ReactNode, createContext, useContext, useEffect, useState } from "react"
import { noop, sortBy } from "lodash"
import { useUmi } from "./umi"
import { useWalletBypass } from "./wallet-bypass"
import { getWallets } from "../helpers/wallets"
import { DAS } from "helius-sdk"
import axios from "axios"

type AccessContextProps = {
  publicKey: string | null
  user: any
  dandies: DAS.GetAssetResponse[]
  publicKeys: string[]
  isInScope: boolean
}

const initial = {
  publicKey: null,
  user: null,
  dandies: [],
  publicKeys: [],
  isInScope: false,
}

export const AccessContext = createContext<AccessContextProps>(initial)

type AccessProviderProps = {
  children: ReactNode
}

export const AccessProvider: FC<AccessProviderProps> = ({ children }) => {
  const { bypassWallet } = useWalletBypass()
  const [user, setUser] = useState<any | null>(null)
  const [publicKeys, setPublicKeys] = useState<string[]>([])
  const [dandies, setDandies] = useState<DAS.GetAssetResponse[]>([])
  const [isActive, setIsActive] = useState(false)
  const [publicKey, setPublicKey] = useState("")
  const umi = useUmi()
  const wallet = useWallet()
  const router = useRouter()

  useEffect(() => {
    if (bypassWallet || !wallet.publicKey || !user || !user?.wallets?.length) {
      return
    }
    ;(async () => {
      const { data } = await axios.get(`/api/get-user/${wallet.publicKey!.toBase58()}`)
      console.log(data)
    })()
  }, [wallet.publicKey])

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
    if (!user) {
      setDandies([])
      return
    }
    ;(async () => {
      // const dandies = await getDandies(user.wallets.map((w: any) => w.publicKey))
    })()
  }, [user])

  return (
    <AccessContext.Provider
      value={{
        user,
        dandies,
        publicKey,
        publicKeys,
        isInScope: publicKeys.includes(publicKey),
      }}
    >
      {children}
    </AccessContext.Provider>
  )
}

export const useAccess = () => {
  return useContext(AccessContext)
}
