"use client"

import { useUiSettings } from "@/context/ui-settings"

export function ImageWithFallback({ src, size = 400 }: { src: string; size?: number }) {
  const { lightMode } = useUiSettings()
  return (
    <img
      src={`https://img-cdn.magiceden.dev/rs:fill:${size}:${size}:0:0/plain/${src}`}
      width="100%"
      style={{ aspectRatio: "1 / 1" }}
      onError={(e: any) => {
        e.target.src = src
        e.target.onerror = (er: any) => {
          er.target.src = lightMode ? "/books-lightest.svg" : "/books-lighter.svg"
        }
      }}
    />
  )
}
