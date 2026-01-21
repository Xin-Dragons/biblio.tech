import { useEffect, useRef, type ReactNode } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { useAtomValue, useSetAtom } from "jotai"
import { sessionAtom, signInAtom, signOutAtom } from "@/stores/auth"

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { connected, publicKey, signMessage, disconnecting } = useWallet()
  const session = useAtomValue(sessionAtom)
  const signIn = useSetAtom(signInAtom)
  const signOut = useSetAtom(signOutAtom)
  const signingInRef = useRef(false)

  useEffect(() => {
    if (disconnecting) {
      signOut()
      return
    }

    if (!connected || !publicKey || !signMessage) return

    const walletAddress = publicKey.toBase58()

    // Already signed in with this wallet
    if (session?.wallet === walletAddress && session.expiresAt > Date.now()) {
      return
    }

    // Prevent concurrent sign-in attempts
    if (signingInRef.current) return
    signingInRef.current = true

    signIn({ publicKey: walletAddress, signMessage }).finally(() => {
      signingInRef.current = false
    })
  }, [connected, publicKey, signMessage, disconnecting, session, signIn, signOut])

  return <>{children}</>
}
