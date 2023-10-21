"use client"

import { useUiSettings } from "@/context/ui-settings"
import { Slider, Stack } from "@mui/material"
import PhotoSizeSelectLarge from "@mui/icons-material/PhotoSizeSelectLarge"
import PhotoSizeSelectActual from "@mui/icons-material/PhotoSizeSelectActual"

const sizes = ["small", "medium", "large"]

export function SizeSlider() {
  const { layoutSize, setLayoutSize } = useUiSettings()

  return (
    <Stack direction="row" spacing={2} width={150} alignItems="center">
      <PhotoSizeSelectLarge />
      <Slider
        value={sizes.indexOf(layoutSize)}
        onChange={(e, value) => setLayoutSize(sizes[value as number])}
        min={0}
        max={2}
      />
      <PhotoSizeSelectActual />
    </Stack>
  )
}
