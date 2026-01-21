import { useEffect } from "react"
import { Outlet } from "react-router"
import { useWallet } from "@solana/wallet-adapter-react"
import { useSetAtom } from "jotai"
import { Header } from "./header"
import { Sidebar } from "./sidebar"
import { Toolbar } from "../toolbar"
import { NftDetailModal } from "../nft-detail-modal"
import { ToastContainer } from "../toast"
import { ErrorWatcher } from "../error-watcher"
import { fetchNftsAtom } from "@/stores/nfts"

function DataFetcher() {
  const { connected, publicKey } = useWallet()
  const fetchNfts = useSetAtom(fetchNftsAtom)

  useEffect(() => {
    if (connected && publicKey) {
      fetchNfts(publicKey.toBase58())
    }
  }, [connected, publicKey, fetchNfts])

  return null
}

export function Layout() {
  return (
    <div className="flex h-screen bg-background">
      <DataFetcher />
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <Toolbar />
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
