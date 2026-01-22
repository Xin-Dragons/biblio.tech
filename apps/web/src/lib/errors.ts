export const ANCHOR_ERROR_CODES: Record<number, string> = {
  3000: "AccountDiscriminatorAlreadySet",
  3001: "AccountDiscriminatorNotFound",
  3002: "AccountDiscriminatorMismatch",
  3003: "AccountDidNotDeserialize",
  3004: "AccountDidNotSerialize",
  3005: "AccountNotEnoughKeys",
  3006: "AccountNotMutable",
  3007: "AccountOwnedByWrongProgram",
  3008: "InvalidProgramId",
  3009: "InvalidProgramExecutable",
  3010: "AccountNotSigner",
  3011: "AccountNotSystemOwned",
  3012: "AccountNotInitialized - A required account does not exist",
  3013: "AccountNotProgramData",
  3014: "AccountNotAssociatedTokenAccount",
  3015: "AccountSysvarMismatch",
}

export function decodeSimulationError(err: { InstructionError?: [number, { Custom?: number }] }): string | null {
  if (!err.InstructionError) return null
  const [ixIndex, errDetail] = err.InstructionError
  if (typeof errDetail === "object" && errDetail.Custom !== undefined) {
    const code = errDetail.Custom
    const anchorMsg = ANCHOR_ERROR_CODES[code]
    if (anchorMsg) {
      return `Instruction ${ixIndex} failed: ${anchorMsg} (code ${code})`
    }
    return `Instruction ${ixIndex} failed with custom error: ${code}`
  }
  return `Instruction ${ixIndex} failed: ${JSON.stringify(errDetail)}`
}
