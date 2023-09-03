import { SelectionProvider } from "@/context/selection"
import { TensorProvider } from "@/context/tensor"
import { TransactionStatusProvider } from "@/context/transactions"
import { DigitalAssetsProviders } from "../DigitalAssetsProviders"
import { Client } from "./client"

export default function Listings({ params }: { params: Record<string, string> }) {
  return (
    <DigitalAssetsProviders defaultSort="price.asc" collectionId={params.collectionId} listing>
      <TransactionStatusProvider>
        <TensorProvider>
          <SelectionProvider>
            <Client />
          </SelectionProvider>
        </TensorProvider>
      </TransactionStatusProvider>
    </DigitalAssetsProviders>
  )
}
