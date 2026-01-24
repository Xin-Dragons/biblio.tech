import { Check, X } from "lucide-react"
import { useAtomValue } from "jotai"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Tier, TierBadge } from "@/components/tier-badge"
import { tierAtom } from "@/stores/tier"
import { cn } from "@/lib/utils"

interface MembershipInfoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const TIER_ORDER: Tier[] = [Tier.Free, Tier.Bronze, Tier.Silver, Tier.Gold, Tier.Diamond]

const VOTES_PER_DAY: Record<Tier, number> = {
  [Tier.Free]: 1,
  [Tier.Bronze]: 3,
  [Tier.Silver]: 7,
  [Tier.Gold]: 15,
  [Tier.Diamond]: 25,
}

const FEE_DISCOUNTS: Record<Tier, number> = {
  [Tier.Free]: 0,
  [Tier.Bronze]: 25,
  [Tier.Silver]: 50,
  [Tier.Gold]: 75,
  [Tier.Diamond]: 100,
}

const TIER_RANGES: Record<Tier, string> = {
  [Tier.Free]: "0",
  [Tier.Bronze]: "1-4",
  [Tier.Silver]: "5-14",
  [Tier.Gold]: "15-49",
  [Tier.Diamond]: "50+",
}

export function MembershipInfoModal({ open, onOpenChange }: MembershipInfoModalProps) {
  const tierInfo = useAtomValue(tierAtom)
  const currentTier = tierInfo?.tier ?? Tier.Free

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Membership Benefits</DialogTitle>
          <DialogDescription>Lock Dandies to unlock membership tiers and exclusive benefits</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Tier Benefits Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Tier</th>
                  <th className="px-3 py-2 text-center font-medium text-muted-foreground">Dandies</th>
                  <th className="px-3 py-2 text-center font-medium text-muted-foreground">Votes/Day</th>
                  <th className="px-3 py-2 text-center font-medium text-muted-foreground">Username</th>
                  <th className="px-3 py-2 text-center font-medium text-muted-foreground">Fee Discount</th>
                </tr>
              </thead>
              <tbody>
                {TIER_ORDER.map((tier) => {
                  const isCurrent = tier === currentTier
                  const hasUsername = tier === Tier.Gold || tier === Tier.Diamond

                  return (
                    <tr
                      key={tier}
                      className={cn("border-b border-border/50 transition-colors", isCurrent && "bg-primary/10")}
                    >
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          {tier === Tier.Free ? (
                            <span className="text-muted-foreground">Free</span>
                          ) : (
                            <TierBadge tier={tier} size="sm" />
                          )}
                          {isCurrent && (
                            <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                              You
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-center tabular-nums">{TIER_RANGES[tier]}</td>
                      <td className="px-3 py-2.5 text-center tabular-nums">{VOTES_PER_DAY[tier]}</td>
                      <td className="px-3 py-2.5 text-center">
                        {hasUsername ? (
                          <Check className="mx-auto h-4 w-4 text-green-500" />
                        ) : (
                          <X className="mx-auto h-4 w-4 text-muted-foreground/50" />
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center tabular-nums">
                        {FEE_DISCOUNTS[tier] === 100 ? (
                          <span className="font-medium text-green-500">Free</span>
                        ) : FEE_DISCOUNTS[tier] === 0 ? (
                          <span className="text-muted-foreground">-</span>
                        ) : (
                          `${FEE_DISCOUNTS[tier]}%`
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Fee Structure Section */}
          <details className="group">
            <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
              <span className="transition-transform group-open:rotate-90">&#9654;</span>
              View fee structure
            </summary>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Operation</th>
                    {TIER_ORDER.map((tier) => (
                      <th
                        key={tier}
                        className={cn(
                          "px-2 py-1.5 text-center font-medium",
                          tier === currentTier ? "text-primary" : "text-muted-foreground"
                        )}
                      >
                        {tier}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <FeeRow label="NFT Create" base={0.01} currentTier={currentTier} />
                  <FeeRow label="NFT Update" base={0.002} currentTier={currentTier} />
                  <FeeRow label="Token Create" base={0.05} currentTier={currentTier} />
                  <FeeRow label="Token Update" base={0.025} currentTier={currentTier} />
                  <FeeRow label="Send" base={0.002} currentTier={currentTier} />
                  <FeeRow label="Burn NFT" base={0.002} currentTier={currentTier} />
                  <FeeRow label="Burn Token" base={0.0002} currentTier={currentTier} />
                  <FeeRow label="Vault Basic Lock" base={0.05} currentTier={currentTier} />
                  <FeeRow label="Vault Secure Lock" base={0.1} currentTier={currentTier} />
                  <tr className="border-b border-border/30">
                    <td className="px-2 py-1.5 text-muted-foreground">Vault Unlock</td>
                    {TIER_ORDER.map((tier) => (
                      <td
                        key={tier}
                        className={cn("px-2 py-1.5 text-center", tier === currentTier && "bg-primary/10 font-medium")}
                      >
                        <span className="text-green-500">Free</span>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </details>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface FeeRowProps {
  label: string
  base: number
  currentTier: Tier
}

function FeeRow({ label, base, currentTier }: FeeRowProps) {
  return (
    <tr className="border-b border-border/30">
      <td className="px-2 py-1.5 text-muted-foreground">{label}</td>
      {TIER_ORDER.map((tier) => {
        const discount = FEE_DISCOUNTS[tier] / 100
        const fee = base * (1 - discount)
        const isCurrent = tier === currentTier

        return (
          <td
            key={tier}
            className={cn("px-2 py-1.5 text-center tabular-nums", isCurrent && "bg-primary/10 font-medium")}
          >
            {fee === 0 ? <span className="text-green-500">Free</span> : formatSol(fee)}
          </td>
        )
      })}
    </tr>
  )
}

function formatSol(amount: number): string {
  if (amount >= 0.01) return amount.toFixed(2)
  if (amount >= 0.001) return amount.toFixed(3)
  return amount.toFixed(4)
}
