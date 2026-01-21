import { TransactionBuilder, Umi, transactionBuilder, Transaction, PublicKey } from "@metaplex-foundation/umi"
import { chunkBy } from "chunkier"
import { findKey, get } from "lodash"
import { FEES } from "../constants"
import { ACCOUNT_TYPE } from "../../../constants"

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

export function getLevel(dandies: number): ACCOUNT_TYPE {
  if (!dandies) {
    return ACCOUNT_TYPE.basic
  }
  if (dandies >= 10) {
    return ACCOUNT_TYPE.unlimited
  }
  if (dandies >= 5) {
    return ACCOUNT_TYPE.pro
  }
  if (dandies >= 1) {
    return ACCOUNT_TYPE.advanced
  }

  return ACCOUNT_TYPE.pro
}

export function getFee(type: string, level: ACCOUNT_TYPE) {
  if (level === ACCOUNT_TYPE.unlimited) {
    return 0
  }

  return get(FEES, type)?.[level] || 0
}

export function shorten(address: string) {
  return `${address.substring(0, 4)}...${address.substring(address.length - 4, address.length)}`
}
