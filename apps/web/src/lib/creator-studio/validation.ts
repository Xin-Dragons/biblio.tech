import type { Creator } from "./types"

export const MAX_NAME_LENGTH = 32
export const MAX_SYMBOL_LENGTH = 10

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif"]
export const ACCEPTED_IMAGE_EXTENSIONS = ".jpg,.jpeg,.png,.gif"
export const MAX_IMAGE_SIZE_MB = 20
export const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024

export const ACCEPTED_MULTIMEDIA_EXTENSIONS = ".mp4,.mov,.mp3,.flac,.wav,.glb,.gltf"
export const MAX_MULTIMEDIA_SIZE_MB = 100
export const MAX_MULTIMEDIA_SIZE_BYTES = MAX_MULTIMEDIA_SIZE_MB * 1024 * 1024

export const VIDEO_EXTENSIONS = [".mp4", ".mov"]
export const AUDIO_EXTENSIONS = [".mp3", ".flac", ".wav"]
export const VR_EXTENSIONS = [".glb", ".gltf"]

const BASE58_CHARS = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"

export function isValidSolanaAddress(address: string): boolean {
  if (!address) return false
  if (address.length < 32 || address.length > 44) return false
  for (const char of address) {
    if (!BASE58_CHARS.includes(char)) return false
  }
  return true
}

export function validateUrl(url: string): boolean {
  if (!url) return true
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

export function getMultimediaCategory(filename: string): "video" | "audio" | "vr" | null {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf("."))
  if (VIDEO_EXTENSIONS.includes(ext)) return "video"
  if (AUDIO_EXTENSIONS.includes(ext)) return "audio"
  if (VR_EXTENSIONS.includes(ext)) return "vr"
  return null
}

export interface CreatorsValidationResult {
  isValid: boolean
  error: string | null
}

export function validateCreatorsSimple(creators: Creator[]): CreatorsValidationResult {
  if (creators.length === 0) {
    return { isValid: false, error: "At least one creator is required" }
  }

  const totalShare = creators.reduce((sum, c) => sum + c.share, 0)
  if (totalShare !== 100) {
    return { isValid: false, error: `Creator shares must sum to 100% (currently ${totalShare}%)` }
  }

  for (const creator of creators) {
    if (!isValidSolanaAddress(creator.address)) {
      return { isValid: false, error: "One or more creator addresses are invalid" }
    }
  }

  return { isValid: true, error: null }
}

export interface CreatorsDetailedValidationResult {
  isValid: boolean
  errors: {
    creators?: string
    creatorAddresses?: Record<number, string>
    creatorShares?: Record<number, string>
  }
}

export function validateCreators(creators: Creator[]): CreatorsDetailedValidationResult {
  const errors: CreatorsDetailedValidationResult["errors"] = {
    creatorAddresses: {},
    creatorShares: {},
  }

  let totalShare = 0
  let hasErrors = false

  for (let i = 0; i < creators.length; i++) {
    const creator = creators[i]

    if (!creator.address.trim()) {
      errors.creatorAddresses![i] = "Address is required"
      hasErrors = true
    } else if (!isValidSolanaAddress(creator.address.trim())) {
      errors.creatorAddresses![i] = "Invalid Solana address"
      hasErrors = true
    }

    if (creator.share < 0 || creator.share > 100) {
      errors.creatorShares![i] = "Share must be 0-100"
      hasErrors = true
    }

    totalShare += creator.share
  }

  if (totalShare !== 100) {
    errors.creators = `Creator shares must sum to 100% (currently ${totalShare}%)`
    hasErrors = true
  }

  return { isValid: !hasErrors, errors }
}

export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return "Please select a JPG, PNG, or GIF image"
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return `Image must be smaller than ${MAX_IMAGE_SIZE_MB}MB`
  }
  return null
}

export function validateMultimediaFile(file: File): string | null {
  if (file.size > MAX_MULTIMEDIA_SIZE_BYTES) {
    return `File must be smaller than ${MAX_MULTIMEDIA_SIZE_MB}MB`
  }
  const category = getMultimediaCategory(file.name)
  if (!category) {
    return "Unsupported file type. Use MP4, MOV, MP3, FLAC, WAV, GLB, or GLTF"
  }
  return null
}
