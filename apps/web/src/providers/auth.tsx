import { useEffect, useRef, type ReactNode } from "react"
import { useWallet, useTransactionSigner } from "@solana/connector/react"
import { useAtomValue, useSetAtom } from "jotai"
import { sessionAtom, signInAtom, signOutAtom } from "@/stores/auth"

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { isConnected, account, status } = useWallet()
  const { signer, capabilities } = useTransactionSigner()
  const session = useAtomValue(sessionAtom)
  const signIn = useSetAtom(signInAtom)
  const signOut = useSetAtom(signOutAtom)
  const signingInRef = useRef(false)
  const wasConnectedRef = useRef(false)

  useEffect(() => {
    if (isConnected) {
      wasConnectedRef.current = true
    }

    if (status === "disconnected" && wasConnectedRef.current) {
      wasConnectedRef.current = false
      signOut()
      return
    }

    if (!isConnected || !account || !signer || !capabilities.canSignMessage) return

    // Already signed in with this wallet
    if (session?.wallet === account && session.expiresAt > Date.now()) {
      return
    }

    // Prevent concurrent sign-in attempts
    if (signingInRef.current) return
    signingInRef.current = true

    const signMessage = async (message: Uint8Array) => {
      if (!signer.signMessage) throw new Error("Wallet does not support message signing")
      return signer.signMessage(message)
    }

    signIn({ publicKey: account, signMessage }).finally(() => {
      signingInRef.current = false
    })
  }, [isConnected, account, signer, capabilities.canSignMessage, status, session, signIn, signOut])

  return <>{children}</>
}
