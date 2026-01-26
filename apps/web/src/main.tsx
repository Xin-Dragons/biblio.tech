import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router"
import { Toaster } from "sonner"
import { App } from "./App"
import { WalletProvider } from "./providers/wallet"
import { AuthProvider } from "./providers/auth"
import { TooltipProvider } from "./components/ui/tooltip"
import "./index.css"

createRoot(document.getElementById("root")!).render(
  <WalletProvider>
    <StrictMode>
      <BrowserRouter>
        <AuthProvider>
          <TooltipProvider>
            <App />
            <Toaster position="bottom-right" theme="dark" richColors />
          </TooltipProvider>
        </AuthProvider>
      </BrowserRouter>
    </StrictMode>
  </WalletProvider>
)
