import { PublicKey } from "@metaplex-foundation/js"
import { useWallet } from "@solana/wallet-adapter-react"
import axios from "axios"
import { useSession } from "next-auth/react"
import { useRouter } from "next/router"
import { FC, ReactNode, createContext, useContext, useEffect, useState } from "react"
import { getPublicKeyFromSolDomain } from "../components/WalletSearch"
import { User } from "../types/nextauth"

type AccessContextProps = {
  publicKey: string | null
  user: any
  isAdmin: boolean
  isActive: boolean
  userId: string | null
}

const initial = {
  publicKey: null,
  userId: null,
  user: null,
  isAdmin: false,
  isActive: false,
}

export const AccessContext = createContext<AccessContextProps>(initial)

type AccessProviderProps = {
  children: ReactNode
}

export const AccessProvider: FC<AccessProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
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
    if (session?.user) {
      setUser(session?.user)
      setUserId(session?.user?.id)
    } else {
      setUser(null)
      setUserId(null)
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
  }, [session?.user])

  return (
    <AccessContext.Provider value={{ user, isAdmin, publicKey, isActive, userId }}>{children}</AccessContext.Provider>
  )
}

export const useAccess = () => {
  return useContext(AccessContext)
}
