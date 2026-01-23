import { Sparkles } from "lucide-react"
import { WalletButton } from "./wallet-button"

export function WelcomeScreen() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center animate-fade-up">
        <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse" />
          <Sparkles className="relative h-10 w-10 text-primary" />
        </div>
        <h1 className="font-display text-3xl font-bold">Welcome to Biblio</h1>
        <p className="mt-3 text-muted-foreground max-w-sm mx-auto">
          Connect your wallet to view and manage your NFT collection
        </p>
        <div className="mt-6">
          <WalletButton />
        </div>
      </div>
    </div>
  )
}
