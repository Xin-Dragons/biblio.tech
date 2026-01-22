import { useEffect } from "react"
import { Outlet, useLocation } from "react-router"
import { useWallet } from "@solana/connector/react"
import { useSetAtom } from "jotai"
import { Header } from "./header"
import { Sidebar } from "./sidebar"
import { Toolbar } from "../toolbar"
import { NftDetailModal } from "../nft-detail-modal"
import { ToastContainer } from "../toast"
import { ErrorWatcher } from "../error-watcher"
import { fetchNftsAtom } from "@/stores/nfts"

const PAGES_WITHOUT_TOOLBAR = ["/stake"]

function DataFetcher() {
  const { isConnected, account } = useWallet()
  const fetchNfts = useSetAtom(fetchNftsAtom)

  useEffect(() => {
    if (isConnected && account) {
      fetchNfts(account)
    }
  }, [isConnected, account, fetchNfts])

  return null
}

export function Layout() {
  const location = useLocation()
  const showToolbar = !PAGES_WITHOUT_TOOLBAR.includes(location.pathname)

  return (
    <div className="flex h-screen bg-background">
      <DataFetcher />
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        {showToolbar && <Toolbar />}
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">
          <Outlet />
        </main>
      </div>
      <NftDetailModal />
      <ToastContainer />
      <ErrorWatcher />
    </div>
  )
}
