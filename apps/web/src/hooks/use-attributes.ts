import { useState, useCallback } from "react"
import type { Attribute } from "@/lib/creator-studio/types"

interface UseAttributesOptions {
  initialAttributes?: Attribute[]
}

interface UseAttributesReturn {
  attributes: Attribute[]
  setAttributes: React.Dispatch<React.SetStateAction<Attribute[]>>
  handleAttributeChange: (index: number, field: "traitType" | "value", value: string) => void
  handleAddAttribute: () => void
  handleRemoveAttribute: (index: number) => void
  getValidAttributes: () => Attribute[]
  resetAttributes: (newAttributes?: Attribute[]) => void
}

export function useAttributes(options: UseAttributesOptions = {}): UseAttributesReturn {
  const { initialAttributes = [{ traitType: "", value: "" }] } = options

  const [attributes, setAttributes] = useState<Attribute[]>(initialAttributes)

  const handleAttributeChange = useCallback((index: number, field: "traitType" | "value", value: string) => {
    setAttributes((prev) => {
      const newAttributes = [...prev]
      newAttributes[index] = { ...newAttributes[index], [field]: value }
      return newAttributes
    })
  }, [])

  const handleAddAttribute = useCallback(() => {
    setAttributes((prev) => [...prev, { traitType: "", value: "" }])
  }, [])

  const handleRemoveAttribute = useCallback((index: number) => {
    setAttributes((prev) => {
      const newAttributes = prev.filter((_, i) => i !== index)
      return newAttributes.length > 0 ? newAttributes : [{ traitType: "", value: "" }]
    })
  }, [])

  const getValidAttributes = useCallback((): Attribute[] => {
    return attributes.filter((attr) => attr.traitType.trim() && attr.value.trim())
  }, [attributes])

  const resetAttributes = useCallback((newAttributes?: Attribute[]) => {
    setAttributes(newAttributes || [{ traitType: "", value: "" }])
  }, [])

  return {
    attributes,
    setAttributes,
    handleAttributeChange,
    handleAddAttribute,
    handleRemoveAttribute,
    getValidAttributes,
    resetAttributes,
  }
}
