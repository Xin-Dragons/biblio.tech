import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router"
import { Toaster } from "react-hot-toast"
import { App } from "./App"
import { WalletProvider } from "./providers/wallet"
import { AuthProvider } from "./providers/auth"
import "./index.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <WalletProvider>
        <AuthProvider>
          <App />
          <Toaster position="bottom-right" />
        </AuthProvider>
      </WalletProvider>
    </BrowserRouter>
  </StrictMode>
)
