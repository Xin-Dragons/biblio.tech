import "@solana/wallet-adapter-react-ui/styles.css"
import { Layout } from "@/components/Layout"
import { SharedProviders } from "./SharedProviders"

export const metadata = {
  title: "BIBLIO | Smart Wallet Manager",
  description: "The only dApp you'll ever need",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SharedProviders>
          <Layout>{children}</Layout>
        </SharedProviders>
      </body>
    </html>
  )
}
