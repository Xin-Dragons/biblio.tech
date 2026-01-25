import { atom } from "jotai"

/**
 * Wallet connection state stored in Jotai for stable subscriptions.
 * Components that only need isConnected should use this atom instead of useWallet()
 * to avoid re-renders when other wallet state (like account) changes.
 */
export const isConnectedAtom = atom<boolean>(false)
