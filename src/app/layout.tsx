import "@solana/wallet-adapter-react-ui/styles.css"
import { Layout } from "@/components/Layout"
import { SharedProviders } from "./SharedProviders"
import { ReactNode } from "react"

export const metadata = {
  title: "BIBLIO | Smart Wallet Manager",
  description: "The only dApp you'll ever need",
}

export default function RootLayout(props: { children: ReactNode; modal: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SharedProviders>
          <Layout>{props.children}</Layout>
          {props.modal}
        </SharedProviders>
      </body>
    </html>
  )
}
