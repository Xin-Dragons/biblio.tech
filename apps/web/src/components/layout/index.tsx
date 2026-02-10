import { useEffect, useRef } from "react"
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
import { fetchNftsAtom, refreshNftsAtom, nftsAtom, fetchedWalletAtom, cacheLoadedAtom, userNftsFetchedAtom, tokensFetchedWalletAtom, tokensAtom } from "@/stores/nfts"
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
  const refreshNfts = useSetAtom(refreshNftsAtom)
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

  const setFetchedWallet = useSetAtom(fetchedWalletAtom)
  const setCacheLoaded = useSetAtom(cacheLoadedAtom)
  const setUserNftsFetched = useSetAtom(userNftsFetchedAtom)
  const setTokensFetchedWallet = useSetAtom(tokensFetchedWalletAtom)
  const setTokens = useSetAtom(tokensAtom)
  const prevAccountRef = useRef<string | null>(null)

  // Clear stale data when wallet changes so fetch runs fresh
  useEffect(() => {
    if (!account) return
    const prev = prevAccountRef.current
    prevAccountRef.current = account
    if (prev && prev !== account) {
      setFetchedWallet(null)
      setCacheLoaded(false)
      setUserNftsFetched(false)
      setTokensFetchedWallet(null)
      setTokens([])
    }
  }, [account, setFetchedWallet, setCacheLoaded, setUserNftsFetched, setTokensFetchedWallet, setTokens])

  // Fetch NFTs for connected wallet (public endpoint)
  useEffect(() => {
    if (!isConnected || !account) return
    fetchNfts(account)
  }, [isConnected, account, fetchNfts])

  // Re-fetch NFTs for all linked wallets after sign-in
  useEffect(() => {
    if (!session?.token) return
    refreshNfts()
  }, [session?.token, refreshNfts])

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
