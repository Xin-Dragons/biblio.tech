import { Plus, Trash2 } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { Creator, Attribute, CreateFormErrors } from "@/lib/creator-studio/types"

interface RoyaltiesCreatorsSectionProps {
  royaltiesPercent: number
  creators: Creator[]
  errors: CreateFormErrors
  onRoyaltiesChange: (value: number) => void
  onCreatorChange: (index: number, field: "address" | "share", value: string | number) => void
  onAddCreator: () => void
  onRemoveCreator: (index: number) => void
  onBlur?: () => void
  disabled?: boolean
}

export function RoyaltiesCreatorsSection({
  royaltiesPercent,
  creators,
  errors,
  onRoyaltiesChange,
  onCreatorChange,
  onAddCreator,
  onRemoveCreator,
  onBlur,
  disabled = false,
}: RoyaltiesCreatorsSectionProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Royalties</Label>
          <span className="text-sm font-medium">{royaltiesPercent}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={0.5}
          value={royaltiesPercent}
          onChange={(e) => onRoyaltiesChange(parseFloat(e.target.value))}
          disabled={disabled}
          className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary disabled:opacity-50"
        />
        {errors.royaltiesPercent && <p className="text-sm text-destructive">{errors.royaltiesPercent}</p>}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Creators</Label>
          <Button type="button" variant="outline" size="sm" className="h-8" onClick={onAddCreator} disabled={disabled}>
            <Plus className="h-4 w-4 mr-1" />
            Add Creator
          </Button>
        </div>

        {errors.creators && <p className="text-sm text-destructive">{errors.creators}</p>}

        <div className="space-y-2">
          {creators.map((creator, index) => (
            <div key={index} className="flex items-start gap-2">
              <div className="flex-1">
                <Input
                  value={creator.address}
                  onChange={(e) => onCreatorChange(index, "address", e.target.value)}
                  onBlur={onBlur}
                  placeholder="Wallet address"
                  disabled={disabled}
                  error={!!errors.creatorAddresses?.[index]}
                />
                {errors.creatorAddresses?.[index] && (
                  <p className="text-xs text-destructive mt-1">{errors.creatorAddresses[index]}</p>
                )}
              </div>
              <div className="w-24">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={creator.share}
                  onChange={(e) => onCreatorChange(index, "share", parseInt(e.target.value) || 0)}
                  onBlur={onBlur}
                  placeholder="%"
                  disabled={disabled}
                  error={!!errors.creatorShares?.[index]}
                />
              </div>
              {creators.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-10 w-10 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => onRemoveCreator(index)}
                  disabled={disabled}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">Creator shares must sum to 100%.</p>
      </div>
    </div>
  )
}

interface AttributesSectionProps {
  attributes: Attribute[]
  onAttributeChange: (index: number, field: "traitType" | "value", value: string) => void
  onAddAttribute: () => void
  onRemoveAttribute: (index: number) => void
  disabled?: boolean
}

export function AttributesSection({
  attributes,
  onAttributeChange,
  onAddAttribute,
  onRemoveAttribute,
  disabled = false,
}: AttributesSectionProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Attributes</Label>
        <Button type="button" variant="outline" size="sm" className="h-8" onClick={onAddAttribute} disabled={disabled}>
          <Plus className="h-4 w-4 mr-1" />
          Add Attribute
        </Button>
      </div>

      <div className="space-y-2">
        {attributes.map((attr, index) => (
          <div key={index} className="flex items-start gap-2">
            <div className="flex-1">
              <Input
                value={attr.traitType}
                onChange={(e) => onAttributeChange(index, "traitType", e.target.value)}
                placeholder="Trait type"
                disabled={disabled}
              />
            </div>
            <div className="flex-1">
              <Input
                value={attr.value}
                onChange={(e) => onAttributeChange(index, "value", e.target.value)}
                placeholder="Value"
                disabled={disabled}
              />
            </div>
            {attributes.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-10 w-10 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => onRemoveAttribute(index)}
                disabled={disabled}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">Attributes with empty trait type will be ignored.</p>
    </div>
  )
}

interface ProgressBarProps {
  completed: number
  total: number
  failed: number
}

export function BatchProgressBar({ completed, total, failed }: ProgressBarProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span>Progress</span>
        <span className="font-mono">
          {completed}/{total}
          {failed > 0 && <span className="text-destructive ml-2">({failed} failed)</span>}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${(completed / total) * 100}%` }}
        />
      </div>
    </div>
  )
}
