import { PublicKey } from "@metaplex-foundation/js"
import { useWallet } from "@solana/wallet-adapter-react"
import axios from "axios"
import { useSession } from "next-auth/react"
import { useRouter } from "next/router"
import { FC, ReactNode, createContext, useContext, useEffect, useState } from "react"
import { getPublicKeyFromSolDomain } from "../components/WalletSearch"

type AccessContextProps = {
  publicKey: string | null
  user: any
  isAdmin: boolean
  isActive: boolean
}

const initial = {
  publicKey: null,
  user: null,
  isAdmin: false,
  isActive: false,
}

export const AccessContext = createContext<AccessContextProps>(initial)

type AccessProviderProps = {
  children: ReactNode
}

export const AccessProvider: FC<AccessProviderProps> = ({ children }) => {
  const [user, setUser] = useState(null)
  const [publicKey, setPublicKey] = useState<string>("")
  const [isAdmin, setIsAdmin] = useState(false)
  const [isActive, setIsActive] = useState(false)
  const wallet = useWallet()
  const { data: session } = useSession()
  const router = useRouter()

  async function getPublicKey(pk: string) {
    try {
      new PublicKey(pk)
      return setPublicKey(pk)
    } catch {
      const bonfida = await getPublicKeyFromSolDomain(pk)

      if (bonfida) {
        setPublicKey(bonfida)
      } else {
        throw new Error("Invalid")
      }
    }
  }

  useEffect(() => {
    if (!isActive) {
      setPublicKey("")
      return
    }
    const publicKey = (router.query.publicKey as string) || wallet.publicKey?.toBase58()
    if (!publicKey) {
      setPublicKey("")
    } else {
      getPublicKey(publicKey)
    }
  }, [router.query.publicKey, wallet.publicKey, isActive])

  async function getUser() {
    const publicKey = router.query.publicKey || wallet.publicKey?.toBase58()
    if (publicKey) {
      const { data } = await axios.get("/api/get-user", { params: { publicKey } })
      setUser(data)
    } else {
      setUser(null)
    }
  }

  useEffect(() => {
    setIsActive(Boolean(session?.user?.active))
  }, [session?.user?.active])

  useEffect(() => {
    const isActive = session?.user?.active
    const isLocalScope = !router.query.publicKey
    const isAdmin =
      (session?.user?.["biblio-wallets" as keyof object] || [])
        .map((wallet: any) => wallet.public_key)
        .includes(wallet.publicKey?.toBase58()) && session?.publicKey === wallet.publicKey?.toBase58()

    setIsAdmin(Boolean(isAdmin && isLocalScope && isActive))
  }, [session, user, wallet.publicKey])

  useEffect(() => {
    getUser()
  }, [router.query.publicKey, wallet.publicKey])

  return <AccessContext.Provider value={{ user, isAdmin, publicKey, isActive }}>{children}</AccessContext.Provider>
}

export const useAccess = () => {
  return useContext(AccessContext)
}
