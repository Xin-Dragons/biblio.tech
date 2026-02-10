import { lazy, Suspense } from "react"
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
import { TagPage } from "./routes/tag"

const CreatorStudioPage = lazy(() =>
  import("./routes/creator-studio").then((m) => ({ default: m.CreatorStudioPage }))
)

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        {import.meta.env.VITE_FEATURE_ALL_NFTS === "true" && (
          <Route path="nfts" element={<NftsPage />} />
        )}
        <Route path="collection/:id" element={<CollectionPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="starred" element={<StarredPage />} />
        <Route path="junk" element={<JunkPage />} />
        <Route path="spl" element={<SplPage />} />
        {import.meta.env.VITE_FEATURE_SHOWCASE === "true" && (
          <>
            <Route path="showcase" element={<ShowcasePage />} />
            <Route path="showcase/:username" element={<ShowcasePage />} />
          </>
        )}
        <Route path="membership" element={<MembershipPage />} />
        <Route path="vault" element={<VaultPage />} />
        <Route path="tags/:id" element={<TagPage />} />
        {import.meta.env.VITE_FEATURE_CREATOR_STUDIO === "true" && (
          <Route path="tools/creator-studio" element={<Suspense><CreatorStudioPage /></Suspense>} />
        )}
      </Route>
    </Routes>
  )
}
