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
import { fetchNftsAtom, nftsAtom } from "@/stores/nfts"
import { fetchTierAtom } from "@/stores/tier"
import { detectVaultedNftsAtom } from "@/stores/vault"
import { linkedWalletsAtom, fetchLinkedWalletsAtom } from "@/stores/linked-wallets"

const PAGES_WITHOUT_TOOLBAR: string[] = []

function isViewingOthersShowcase(pathname: string): boolean {
  return pathname.startsWith("/showcase/") && pathname !== "/showcase"
}

function DataFetcher() {
  const { isConnected, account } = useWallet()
  const fetchNfts = useSetAtom(fetchNftsAtom)
  const fetchTier = useSetAtom(fetchTierAtom)
  const fetchLinkedWallets = useSetAtom(fetchLinkedWalletsAtom)
  const nfts = useAtomValue(nftsAtom)
  const linkedWallets = useAtomValue(linkedWalletsAtom)
  const detectVaultedNfts = useSetAtom(detectVaultedNftsAtom)

  useEffect(() => {
    if (isConnected && account) {
      fetchNfts(account)
      fetchTier()
      fetchLinkedWallets()
    }
  }, [isConnected, account, fetchNfts, fetchTier, fetchLinkedWallets])

  useEffect(() => {
    if (nfts.length > 0) {
      detectVaultedNfts(account ?? null)
    }
  }, [nfts, linkedWallets, account, detectVaultedNfts])

  return null
}

export function Layout() {
  const location = useLocation()
  const { isConnected } = useWallet()
  const showToolbar = !PAGES_WITHOUT_TOOLBAR.includes(location.pathname)
  const viewingOthersShowcase = isViewingOthersShowcase(location.pathname)
  const showWelcome = !isConnected && !viewingOthersShowcase

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
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">
          {showWelcome ? <WelcomeScreen /> : <Outlet />}
        </main>
      </div>
      <NftDetailModal />
      <ToastContainer />
      <ErrorWatcher />
    </div>
  )
}
