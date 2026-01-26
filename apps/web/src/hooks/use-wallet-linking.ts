import { useState, useCallback, useRef, useEffect } from "react"
import { useSetAtom, useAtomValue } from "jotai"
import { getWallets } from "@wallet-standard/app"
import { toast } from "sonner"
import { linkWalletAtom, fetchLinkedWalletsAtom, linkedWalletsAtom } from "@/stores/linked-wallets"
import { sessionAtom, connectedWalletAtom } from "@/stores/auth"
import { skipAuthWalletSwitchAtom } from "@/stores/wallet-operations"

const POLL_INTERVAL = 500
const LINK_TIMEOUT = 120000 // 2 minutes

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

interface WalletProvider {
  name: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  provider: any
}

interface InstalledWallet {
  name: string
  icon: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  provider: any
}

function getWalletProviders(): WalletProvider[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const win = window as any
  return [
    { name: "Phantom", provider: win.phantom?.solana },
    { name: "Backpack", provider: win.backpack },
    { name: "Solflare", provider: win.solflare },
    { name: "Coinbase", provider: win.coinbaseSolana },
  ].filter((p) => p.provider)
}

function getWalletIcon(name: string): string {
  const { get } = getWallets()
  const wallets = get()
  const wallet = wallets.find((w) => w.name.toLowerCase() === name.toLowerCase())
  return wallet?.icon ?? ""
}

export function getOtherInstalledWallets(currentWalletName: string | null): InstalledWallet[] {
  const providers = getWalletProviders()
  return providers
    .filter((p) => p.name !== currentWalletName)
    .map((p) => ({
      name: p.name,
      icon: getWalletIcon(p.name),
      provider: p.provider,
    }))
}

function getAddressFromProvider(provider: WalletProvider["provider"]): string | null {
  if (!provider?.publicKey) return null
  return provider.publicKey.toBase58?.() ?? provider.publicKey.toString?.() ?? null
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

async function detectAccountChange(
  connectedWalletName: string | null,
  sessionWallet: string,
  linkedWallets: string[]
): Promise<{ address: string; providerName: string } | null> {
  if (!connectedWalletName) return null

  const providers = getWalletProviders()
  const connectedProvider = providers.find((p) => p.name.toLowerCase() === connectedWalletName.toLowerCase())
  if (!connectedProvider) return null

  const isPhantom = connectedProvider.name.toLowerCase() === "phantom"
  const address = isPhantom ? await getPhantomAccount() : getAddressFromProvider(connectedProvider.provider)

  if (address && address !== sessionWallet && !linkedWallets.includes(address)) {
    return { address, providerName: connectedProvider.name }
  }

  return null
}

interface UseWalletLinkingResult {
  isWatching: boolean
  detectedWallet: { address: string; providerName: string } | null
  connectedWalletName: string | null
  otherWallets: InstalledWallet[]
  startWatching: () => void
  cancelWatching: () => void
  connectOtherWallet: (wallet: InstalledWallet) => Promise<void>
  confirmLink: (isLedger: boolean) => Promise<boolean>
}

export function useWalletLinking(): UseWalletLinkingResult {
  const [isWatching, setIsWatching] = useState(false)
  const [detectedWallet, setDetectedWallet] = useState<{ address: string; providerName: string } | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const session = useAtomValue(sessionAtom)
  const connectedWallet = useAtomValue(connectedWalletAtom)
  const linkedWallets = useAtomValue(linkedWalletsAtom)
  const linkWallet = useSetAtom(linkWalletAtom)
  const fetchLinkedWallets = useSetAtom(fetchLinkedWalletsAtom)
  const setSkipAuthWalletSwitch = useSetAtom(skipAuthWalletSwitchAtom)

  const linkedAddresses = linkedWallets.map((w) => w.publicKey)
  const connectedWalletName = connectedWallet?.name ?? null
  const otherWallets = getOtherInstalledWallets(connectedWalletName)

  const cancelWatching = useCallback(() => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    setIsWatching(false)
    setDetectedWallet(null)
    setSkipAuthWalletSwitch(false)
  }, [setSkipAuthWalletSwitch])

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  const startWatching = useCallback(() => {
    if (!session?.wallet) {
      toast.error("Please sign in first")
      return
    }

    abortControllerRef.current?.abort()
    abortControllerRef.current = new AbortController()

    setIsWatching(true)
    setDetectedWallet(null)
    setSkipAuthWalletSwitch(true)

    const signal = abortControllerRef.current.signal
    const startTime = Date.now()

    const poll = async () => {
      while (!signal.aborted) {
        const detected = await detectAccountChange(connectedWalletName, session.wallet, linkedAddresses)
        if (detected) {
          setDetectedWallet(detected)
          return
        }

        if (Date.now() - startTime > LINK_TIMEOUT) {
          toast.error("Wallet detection timed out. Please try again.")
          cancelWatching()
          return
        }

        await sleep(POLL_INTERVAL)
      }
    }

    poll()
  }, [session?.wallet, connectedWalletName, linkedAddresses, cancelWatching, setSkipAuthWalletSwitch])

  const connectOtherWallet = useCallback(
    async (wallet: InstalledWallet) => {
      if (!session?.wallet) {
        toast.error("Please sign in first")
        return
      }

      try {
        // Connect to the other wallet
        const response = await wallet.provider.connect()
        const address = response?.publicKey?.toBase58?.() ?? response?.publicKey?.toString?.()

        if (!address) {
          throw new Error("Could not get wallet address")
        }

        if (address === session.wallet) {
          toast.error("This is your currently connected wallet")
          return
        }

        if (linkedAddresses.includes(address)) {
          toast.error("This wallet is already linked")
          return
        }

        setDetectedWallet({ address, providerName: wallet.name })
      } catch (err) {
        if (err instanceof Error && !err.message.includes("User rejected")) {
          console.error("Error connecting wallet:", err)
          toast.error("Failed to connect wallet")
        }
      }
    },
    [session?.wallet, linkedAddresses]
  )

  const confirmLink = useCallback(
    async (isLedger: boolean): Promise<boolean> => {
      if (!session?.token || !detectedWallet) {
        return false
      }

      const { address } = detectedWallet

      try {
        await sleep(200)

        let signature: string
        const nonce = Math.random().toString(36).substring(2, 15)
        const message = `Link this wallet to your Biblio account.\n\nNonce: ${nonce}`

        if (isLedger) {
          throw new Error("Ledger linking not yet implemented. Please use a wallet that supports message signing.")
        }

        // Find the provider with the detected address
        const providers = getWalletProviders()
        let walletProvider = null

        for (const { provider } of providers) {
          const addr = getAddressFromProvider(provider)
          if (addr === address && provider?.signMessage) {
            walletProvider = provider
            break
          }
        }

        if (!walletProvider?.signMessage) {
          throw new Error("Wallet does not support message signing")
        }

        const encodedMessage = new TextEncoder().encode(message)
        const signatureResponse = await walletProvider.signMessage(encodedMessage)
        const signatureBytes = signatureResponse.signature ?? signatureResponse
        signature = Buffer.from(signatureBytes).toString("base64")

        const linkPromise = linkWallet({
          publicKey: address,
          signature,
          message,
          isLedger,
        })

        toast.promise(linkPromise, {
          loading: "Linking wallet...",
          success: "Wallet linked successfully!",
          error: (err) => err.message || "Failed to link wallet",
        })

        await linkPromise
        await fetchLinkedWallets()

        return true
      } catch (err) {
        if (err instanceof Error) {
          console.error("Wallet linking error:", err)
        }
        return false
      } finally {
        setIsWatching(false)
        setDetectedWallet(null)
        abortControllerRef.current = null
        setSkipAuthWalletSwitch(false)
      }
    },
    [session?.token, detectedWallet, linkWallet, fetchLinkedWallets, setSkipAuthWalletSwitch]
  )

  return {
    isWatching,
    detectedWallet,
    connectedWalletName,
    otherWallets,
    startWatching,
    cancelWatching,
    connectOtherWallet,
    confirmLink,
  }
}
