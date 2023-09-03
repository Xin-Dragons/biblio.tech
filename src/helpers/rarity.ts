export function getTier(rank: number, total: number) {
  const percent = Math.ceil((rank / total) * 100)
  if (percent === 1) {
    return "Mythic"
  }

  if (percent <= 5) {
    return "Legendary"
  }

  if (percent <= 15) {
    return "Epic"
  }

  if (percent <= 35) {
    return "Rare"
  }

  if (percent <= 60) {
    return "Uncommon"
  }

  return "Common"
}
