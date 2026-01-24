import { useEffect, useRef, type ReactNode } from "react"
import { useWallet, useTransactionSigner, useDisconnectWallet, useConnectWallet } from "@solana/connector/react"
import { getWallets } from "@wallet-standard/app"
import { useAtomValue, useSetAtom } from "jotai"
import { sessionAtom, signInAtom, signOutAtom, explicitlySignedOutAtom } from "@/stores/auth"
import { clearLinkedWalletsAtom, linkedWalletsAtom } from "@/stores/linked-wallets"
import { isLinkingWalletAtom } from "@/hooks/use-wallet-linking"

interface AuthProviderProps {
  children: ReactNode
}

type WalletConnectorId = Parameters<ReturnType<typeof useConnectWallet>["connect"]>[0]

async function getSolflareAccount(): Promise<string | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const solflare = (window as any).solflare
  if (!solflare?.connect) return null
  try {
    const resp = await solflare.connect({ onlyIfTrusted: true })
    return resp?.publicKey?.toString() ?? null
  } catch {
    return null
  }
}

async function getPhantomAccount(): Promise<string | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const phantom = (window as any).phantom?.solana
  if (!phantom?.request) return null
  try {
    const resp = await phantom.request({ method: "connect", params: { onlyIfTrusted: true } })
    return resp?.publicKey?.toString() ?? null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { isConnected, account, status } = useWallet()
  const { signer, capabilities } = useTransactionSigner()
  const session = useAtomValue(sessionAtom)
  const linkedWallets = useAtomValue(linkedWalletsAtom)
  const isLinkingWallet = useAtomValue(isLinkingWalletAtom)
  const explicitlySignedOut = useAtomValue(explicitlySignedOutAtom)
  const setExplicitlySignedOut = useSetAtom(explicitlySignedOutAtom)
  const signIn = useSetAtom(signInAtom)
  const signOut = useSetAtom(signOutAtom)
  const clearLinkedWallets = useSetAtom(clearLinkedWalletsAtom)
  const { disconnect } = useDisconnectWallet()
  const { connect } = useConnectWallet()
  const signingInRef = useRef(false)
  const wasConnectedRef = useRef(false)

  // Listen to Wallet Standard events for account changes (only for connected wallet)
  useEffect(() => {
    if (!session?.wallet || isLinkingWallet || !isConnected) return

    const { get } = getWallets()
    const wallets = get()

    // Find the wallet that contains the session wallet
    const connectedWallet = wallets.find((w) => w.accounts.some((a) => a.address === session.wallet))
    if (!connectedWallet) return

    const handleAccountChange = async () => {
      const freshWallets = get()
      const freshWallet = freshWallets.find((w) => w.name === connectedWallet.name)
      const accounts = freshWallet?.accounts ?? []
      const walletId = `wallet-standard:${connectedWallet.name.toLowerCase().replace(/\s+/g, "-")}` as WalletConnectorId

      // If accounts is empty, check injected provider directly (Solflare clears accounts on switch)
      if (accounts.length === 0) {
        if (connectedWallet.name.toLowerCase() === "solflare") {
          const solflareAccount = await getSolflareAccount()
          if (solflareAccount && solflareAccount !== session.wallet) {
            clearLinkedWallets()
            signOut()
            await disconnect()
            await connect(walletId)
            return
          }
        }
        // No fallback available - sign out
        clearLinkedWallets()
        signOut()
        await disconnect()
        return
      }

      // Check if session wallet is still in this wallet's accounts
      const hasSessionWallet = accounts.some((a) => a.address === session.wallet)
      if (!hasSessionWallet) {
        clearLinkedWallets()
        signOut()
        await disconnect()
        await connect(walletId)
      }
    }

    const eventsFeature = connectedWallet.features["standard:events"] as
      | { on: (event: "change", listener: () => void) => () => void }
      | undefined

    if (!eventsFeature?.on) return

    const unsub = eventsFeature.on("change", handleAccountChange)
    return () => unsub()
  }, [session?.wallet, isLinkingWallet, isConnected, clearLinkedWallets, signOut, disconnect, connect])

  // Polling fallback for Phantom (doesn't properly emit Wallet Standard change events)
  useEffect(() => {
    if (!session?.wallet || isLinkingWallet) return

    const { get } = getWallets()
    const wallets = get()
    const phantomWallet = wallets.find((w) => w.name.toLowerCase() === "phantom")
    const isPhantomSession = phantomWallet?.accounts.some((a) => a.address === session.wallet) ?? false

    if (!isPhantomSession) return

    const checkPhantomAccount = async () => {
      const phantomAccount = await getPhantomAccount()
      if (phantomAccount && phantomAccount !== session.wallet) {
        clearLinkedWallets()
        signOut()
        await disconnect()
        await connect("wallet-standard:phantom" as WalletConnectorId)
      }
    }

    const interval = setInterval(checkPhantomAccount, 2000)
    return () => clearInterval(interval)
  }, [session?.wallet, isLinkingWallet, clearLinkedWallets, signOut, disconnect, connect])

  // Main auth flow
  useEffect(() => {
    if (isLinkingWallet) return

    if (isConnected) {
      wasConnectedRef.current = true
    }

    // Handle disconnect - clear explicit sign out flag
    if (status === "disconnected" && wasConnectedRef.current) {
      wasConnectedRef.current = false
      setExplicitlySignedOut(false)
      clearLinkedWallets()
      signOut()
      return
    }

    if (!isConnected || !account || !signer || !capabilities.canSignMessage) return

    // Already signed in with this wallet
    if (session?.wallet === account && session.expiresAt > Date.now()) {
      return
    }

    // Account is a linked wallet - session is still valid
    const isLinkedWallet = linkedWallets.some((w) => w.publicKey === account)
    if (session && isLinkedWallet && session.expiresAt > Date.now()) {
      return
    }

    // User explicitly signed out - don't auto-sign-in
    if (explicitlySignedOut) return

    // Wallet changed - clear old data first and wait for next render
    if (session && session.wallet !== account) {
      clearLinkedWallets()
      signOut()
      return
    }

    // No session - sign in
    if (!session) {
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
    }
  }, [
    isConnected,
    account,
    signer,
    capabilities.canSignMessage,
    status,
    session,
    linkedWallets,
    isLinkingWallet,
    explicitlySignedOut,
    signIn,
    signOut,
    clearLinkedWallets,
    setExplicitlySignedOut,
  ])

  return <>{children}</>
}
