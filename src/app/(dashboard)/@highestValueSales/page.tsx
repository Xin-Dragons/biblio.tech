import { Client } from "./Client"
import { getSalesForPeriod } from "./get-sales-for-period"

// 30 mins
export const revalidate = 60 * 30

export default async function HigestValueSales() {
  const sales = await getSalesForPeriod(168)

  return <Client sales={sales} />
}
