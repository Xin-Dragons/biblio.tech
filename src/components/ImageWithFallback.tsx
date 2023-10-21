"use client"

export function ImageWithFallback({ src, size = 400, jsonUri }: { src: string; size?: number; jsonUri?: string }) {
  return (
    <img
      src={`https://img-cdn.magiceden.dev/rs:fill:${size}:${size}:0:0/plain/${src}`}
      width={"100%"}
      style={{
        // aspectRatio: "1 / 1",
        display: "block",
        backgroundImage: "url(/loading-slow.gif)",
        backgroundSize: "100%",
      }}
      onLoad={(e: any) => {
        e.target.style.backgroundImage = "none"
      }}
      onError={(e: any) => {
        e.target.src = src
        e.target.onerror = (er: any) => {
          er.target.src = "/books-lighter.svg"
          er.target.style.backgroundColor = "black"
          er.target.style.backgroundImage = "none"
        }
      }}
    />
  )
}
