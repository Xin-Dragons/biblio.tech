import { Routes, Route } from "react-router"
import { Layout } from "./components/layout"
import { HomePage } from "./routes/home"
import { NftsPage } from "./routes/nfts"
import { CollectionPage } from "./routes/collection"
import { SettingsPage } from "./routes/settings"
import { StarredPage } from "./routes/starred"
import { JunkPage } from "./routes/junk"
import { SplPage } from "./routes/spl"
import { ShowcasePage } from "./routes/showcase"
import { MembershipPage } from "./routes/membership"
import { VaultPage } from "./routes/vault"

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="nfts" element={<NftsPage />} />
        <Route path="collection/:id" element={<CollectionPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="starred" element={<StarredPage />} />
        <Route path="junk" element={<JunkPage />} />
        <Route path="spl" element={<SplPage />} />
        <Route path="showcase" element={<ShowcasePage />} />
        <Route path="showcase/:username" element={<ShowcasePage />} />
        <Route path="membership" element={<MembershipPage />} />
        <Route path="vault" element={<VaultPage />} />
      </Route>
    </Routes>
  )
}
