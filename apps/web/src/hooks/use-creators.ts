import { useState, useCallback, useEffect } from "react"
import type { Creator } from "@/lib/creator-studio/types"
import { validateCreatorsSimple, isValidSolanaAddress } from "@/lib/creator-studio/validation"

interface UseCreatorsOptions {
  initialCreators?: Creator[]
  autoPopulateAddress?: string | null
}

interface UseCreatorsReturn {
  creators: Creator[]
  setCreators: React.Dispatch<React.SetStateAction<Creator[]>>
  creatorsError: string | null
  creatorAddressErrors: Record<number, string>
  creatorShareErrors: Record<number, string>
  handleCreatorChange: (index: number, field: "address" | "share", value: string | number) => void
  handleAddCreator: () => void
  handleRemoveCreator: (index: number) => void
  validateCreatorsOnBlur: () => void
  validateAllCreators: () => boolean
  resetCreators: (newCreators?: Creator[]) => void
}

export function useCreators(options: UseCreatorsOptions = {}): UseCreatorsReturn {
  const { initialCreators = [{ address: "", share: 100 }], autoPopulateAddress } = options

  const [creators, setCreators] = useState<Creator[]>(initialCreators)
  const [creatorsError, setCreatorsError] = useState<string | null>(null)
  const [creatorAddressErrors, setCreatorAddressErrors] = useState<Record<number, string>>({})
  const [creatorShareErrors, setCreatorShareErrors] = useState<Record<number, string>>({})

  useEffect(() => {
    if (autoPopulateAddress && creators.length === 1 && !creators[0].address) {
      setCreators([{ address: autoPopulateAddress, share: 100 }])
    }
  }, [autoPopulateAddress, creators])

  const handleCreatorChange = useCallback((index: number, field: "address" | "share", value: string | number) => {
    setCreators((prev) => {
      const newCreators = [...prev]
      newCreators[index] = { ...newCreators[index], [field]: value }
      return newCreators
    })
    setCreatorsError(null)
    if (field === "address") {
      setCreatorAddressErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[index]
        return newErrors
      })
    } else {
      setCreatorShareErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[index]
        return newErrors
      })
    }
  }, [])

  const handleAddCreator = useCallback(() => {
    setCreators((prev) => [...prev, { address: "", share: 0 }])
  }, [])

  const handleRemoveCreator = useCallback((index: number) => {
    setCreators((prev) => {
      const newCreators = prev.filter((_, i) => i !== index)
      return newCreators.length > 0 ? newCreators : [{ address: "", share: 100 }]
    })
    setCreatorAddressErrors((prev) => {
      const newErrors = { ...prev }
      delete newErrors[index]
      return newErrors
    })
    setCreatorShareErrors((prev) => {
      const newErrors = { ...prev }
      delete newErrors[index]
      return newErrors
    })
  }, [])

  const validateCreatorsOnBlur = useCallback(() => {
    const addressErrors: Record<number, string> = {}
    const shareErrors: Record<number, string> = {}

    creators.forEach((creator, index) => {
      if (creator.address && !isValidSolanaAddress(creator.address)) {
        addressErrors[index] = "Invalid Solana address"
      }
      if (creator.share < 0 || creator.share > 100) {
        shareErrors[index] = "Share must be 0-100"
      }
    })

    setCreatorAddressErrors(addressErrors)
    setCreatorShareErrors(shareErrors)

    const totalShare = creators.reduce((sum, c) => sum + c.share, 0)
    if (totalShare !== 100 && creators.some((c) => c.address)) {
      setCreatorsError(`Creator shares must sum to 100% (currently ${totalShare}%)`)
    } else {
      setCreatorsError(null)
    }
  }, [creators])

  const validateAllCreators = useCallback((): boolean => {
    const result = validateCreatorsSimple(creators)
    setCreatorsError(result.error)

    const addressErrors: Record<number, string> = {}
    creators.forEach((creator, index) => {
      if (creator.address && !isValidSolanaAddress(creator.address)) {
        addressErrors[index] = "Invalid Solana address"
      }
    })
    setCreatorAddressErrors(addressErrors)

    return result.isValid && Object.keys(addressErrors).length === 0
  }, [creators])

  const resetCreators = useCallback((newCreators?: Creator[]) => {
    setCreators(newCreators || [{ address: "", share: 100 }])
    setCreatorsError(null)
    setCreatorAddressErrors({})
    setCreatorShareErrors({})
  }, [])

  return {
    creators,
    setCreators,
    creatorsError,
    creatorAddressErrors,
    creatorShareErrors,
    handleCreatorChange,
    handleAddCreator,
    handleRemoveCreator,
    validateCreatorsOnBlur,
    validateAllCreators,
    resetCreators,
  }
}
