import { Chip } from "@mui/material"
import HowRare from "@/../public/howrare.svg"
import { useUiSettings } from "@/context/ui-settings"
import DiamondIcon from "@mui/icons-material/Diamond"

const colors = {
  Mythic: "#c62828",
  Legendary: "#e65100",
  Epic: "#7b1fa2",
  Rare: "#1565c0",
  Uncommon: "#1b5e20",
  Common: "#333333",
}

export function Rarity({ rank, tier, type }: { rank: number; tier: string; type: "howRare" | "moonRank" | "tt" }) {
  const { layoutSize } = useUiSettings()

  const sizes = {
    small: "12px",
    medium: "16x",
    large: "16px",
  }

  return (
    <Chip
      icon={
        type === "howRare" ? (
          <HowRare style={{ marginLeft: "0.5em" }} />
        ) : type === "tt" ? (
          <DiamondIcon fontSize="small" sx={{ marginLeft: "6px !important", marginTop: "1px !important" }} />
        ) : undefined
      }
      label={`${type === "moonRank" ? "⍜" : ""} ${rank}`}
      sx={{
        backgroundColor: colors[tier as keyof object],
        fontSize: sizes[layoutSize as keyof object] || "inherit",
        color: "white",
      }}
      size={"small"}
    />
  )
}
