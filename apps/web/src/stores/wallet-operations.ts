import { atom } from "jotai"

/**
 * When true, auth.tsx will skip automatic wallet switch handling.
 * Set this during operations that manage wallet switching themselves
 * (e.g., wallet linking, multi-wallet signing).
 */
export const skipAuthWalletSwitchAtom = atom<boolean>(false)
