import { TransactionBuilder, Umi, transactionBuilder } from "@metaplex-foundation/umi"
import { chunkBy } from "chunkier"
import { findKey } from "lodash"
import { FEES } from "../constants"

export type MultimediaCategory = "image" | "video" | "audio" | "vr"

export function getMultimediaType(ext: string): MultimediaCategory {
  const types = {
    image: ["jpg", "jpeg", "jpng", "gif"],
    video: ["mp4", "mov"],
    audio: ["mp3", "wav", "flac"],
    vr: ["glb", "gltf"],
  }
  return findKey(types, (items) => items.includes(ext)) as MultimediaCategory
}

export function getUmiChunks(umi: Umi, transactionBuilders: TransactionBuilder[]) {
  return chunkBy(transactionBuilders, (ch: TransactionBuilder[], i: number) => {
    if (!transactionBuilders[i + 1]) {
      return true
    }

    const t = transactionBuilder()
      .add(ch)
      .add(transactionBuilders[i + 1])

    return !t.fitsInOneTransaction(umi)
  }).reduce((txns, builders) => {
    return [...txns, builders.reduce((builder, item) => builder.add(item), transactionBuilder())]
  }, [])
}

function getLevel(dandies: number) {
  if (!dandies) {
    return "basic"
  }
  if (dandies >= 10) {
    return "free"
  }
  if (dandies >= 5) {
    return "pro"
  }
  if (dandies >= 1) {
    return "advanced"
  }
}

export function getFee(type: string, dandies: number) {
  const level = getLevel(dandies)
  if (level === "free") {
    return 0
  }

  return FEES[type as keyof typeof FEES][level as keyof object]
}

export function shorten(address: string) {
  return `${address.substring(0, 4)}...${address.substring(address.length - 4, address.length)}`
}
