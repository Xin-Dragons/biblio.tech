import { getSmartMoney } from "../get-smart-money"
import { HelloMoonLeaderboard } from "../HelloMoonLeaderboard"

export default async function SmartMoney() {
  const collections = await getSmartMoney("smartMoneyInflow", 1)

  return <HelloMoonLeaderboard collections={collections} title="Smart money inflow" filter="smartMoneyInflow" />
}
