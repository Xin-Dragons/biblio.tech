import { useEffect } from "react"
import { Outlet, useLocation } from "react-router"
import { useWallet } from "@solana/connector/react"
import { useAtomValue, useSetAtom } from "jotai"
import { Header } from "./header"
import { Sidebar } from "./sidebar"
import { Toolbar } from "../toolbar"
import { NftDetailModal } from "../nft-detail-modal"
import { ToastContainer } from "../toast"
import { ErrorWatcher } from "../error-watcher"
import { WelcomeScreen } from "../welcome-screen"
import { fetchNftsAtom, fetchUserNftsAtom, nftsAtom } from "@/stores/nfts"
import { fetchTierAtom } from "@/stores/tier"
import { detectVaultedNftsAtom } from "@/stores/vault"
import { linkedWalletsAtom, fetchLinkedWalletsAtom } from "@/stores/linked-wallets"
import { sessionAtom } from "@/stores/auth"
import { isConnectedAtom } from "@/stores/wallet"
import { searchQueryAtom } from "@/stores/ui"
import { fetchTagsAtom, fetchNftTagsAtom } from "@/stores/user"

const PAGES_WITHOUT_TOOLBAR: string[] = []

function isViewingOthersShowcase(pathname: string): boolean {
  return pathname.startsWith("/showcase/") && pathname !== "/showcase"
}

function DataFetcher() {
  const { isConnected, account } = useWallet()
  const session = useAtomValue(sessionAtom)
  const setIsConnected = useSetAtom(isConnectedAtom)
  const fetchNfts = useSetAtom(fetchNftsAtom)
  const fetchUserNfts = useSetAtom(fetchUserNftsAtom)
  const fetchTier = useSetAtom(fetchTierAtom)
  const fetchLinkedWallets = useSetAtom(fetchLinkedWalletsAtom)
  const fetchTags = useSetAtom(fetchTagsAtom)
  const fetchNftTags = useSetAtom(fetchNftTagsAtom)
  const nfts = useAtomValue(nftsAtom)
  const linkedWallets = useAtomValue(linkedWalletsAtom)
  const detectVaultedNfts = useSetAtom(detectVaultedNftsAtom)

  // Sync isConnected to atom - for authenticated users, having a session means "connected" for UI purposes
  useEffect(() => {
    const effectivelyConnected = isConnected || !!session?.token
    setIsConnected(effectivelyConnected)
  }, [isConnected, session?.token, setIsConnected])

  // Fetch tier and linked wallets - only on connection or session change, not on linked wallet switch
  useEffect(() => {
    if (!isConnected) return
    fetchTier()
    fetchLinkedWallets()
  }, [isConnected, session?.token, fetchTier, fetchLinkedWallets])

  // Fetch tags and nft-tag associations - only for authenticated users
  useEffect(() => {
    if (!session?.token) return
    fetchTags()
    fetchNftTags()
  }, [session?.token, fetchTags, fetchNftTags])

  // Authenticated: fetch for all linked wallets (no dependency on connected account)
  useEffect(() => {
    if (!isConnected || !session?.token) return
    fetchUserNfts()
  }, [isConnected, session?.token, fetchUserNfts])

  // Non-authenticated: fetch for connected wallet only
  useEffect(() => {
    if (!isConnected || session?.token || !account) return
    fetchNfts(account)
  }, [isConnected, session?.token, account, fetchNfts])

  // Detect vaulted NFTs - authenticated users (use session.wallet, stable across linked wallet switches)
  useEffect(() => {
    if (!session?.token || nfts.length === 0) return
    detectVaultedNfts(session.wallet)
  }, [nfts, linkedWallets, session?.token, session?.wallet, detectVaultedNfts])

  // Detect vaulted NFTs - non-authenticated users
  useEffect(() => {
    if (session?.token || nfts.length === 0 || !account) return
    detectVaultedNfts(account)
  }, [nfts, linkedWallets, session?.token, account, detectVaultedNfts])

  return null
}

export function Layout() {
  const location = useLocation()
  const isConnected = useAtomValue(isConnectedAtom)
  const setSearchQuery = useSetAtom(searchQueryAtom)
  const showToolbar = !PAGES_WITHOUT_TOOLBAR.includes(location.pathname)
  const viewingOthersShowcase = isViewingOthersShowcase(location.pathname)
  const showWelcome = !isConnected && !viewingOthersShowcase

  // Clear search on route change
  useEffect(() => {
    setSearchQuery("")
  }, [location.pathname, setSearchQuery])

  return (
    <div className="relative flex h-screen bg-mesh">
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-50"
        style={{
          backgroundImage: 'url("/tapestry.svg")',
          backgroundRepeat: "repeat",
          backgroundSize: "106.4px 166.6px",
        }}
      />
      <DataFetcher />
      <Sidebar />
      <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
        <Header />
        {showToolbar && <Toolbar />}
        <main className="flex min-h-0 flex-1 flex-col overflow-auto p-4">
          {showWelcome ? <WelcomeScreen /> : <Outlet />}
        </main>
      </div>
      <NftDetailModal />
      <ToastContainer />
      <ErrorWatcher />
    </div>
  )
}
