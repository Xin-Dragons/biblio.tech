import { Layout } from "@/components/Layout"
import { useDatabase } from "@/context/database"
import { Items } from "@/components/Items"
import { useNfts } from "@/context/nfts"
import { VaultInfo } from "@/components/VaultInfo"
import { Tabs, Tab } from "@mui/material"
import { useUiSettings } from "@/context/ui-settings"

type OrderItem = {
  nftMint: string
  sortedIndex: number
}

export default function Loans() {
  const { updateOrder } = useDatabase()
  const { nfts, filtered } = useNfts()
  const { loanType, setLoanType } = useUiSettings()

  async function handleUpdateOrder(items: OrderItem[]) {
    await updateOrder(items, "vault")
  }

  return (
    <Layout
      nfts={nfts}
      filtered={filtered}
      showUntagged
      title={<VaultInfo />}
      actions={
        <Tabs value={loanType} onChange={(e, value) => setLoanType(value)}>
          <Tab label="Borrowed" value="borrowed" />
          <Tab label="Lent" value="lent" />
        </Tabs>
      }
    >
      <Items items={filtered} updateOrder={handleUpdateOrder} sortable />
    </Layout>
  )
}
