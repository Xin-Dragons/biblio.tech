/// <reference types="vite/client" />

import type { Buffer as BufferType } from "buffer"

declare global {
  // eslint-disable-next-line no-var
  var Buffer: typeof BufferType
}

interface ImportMetaEnv {
  readonly VITE_RPC_ENDPOINT: string
  readonly VITE_API_URL: string
  readonly VITE_FEATURE_CREATOR_STUDIO?: string
  readonly VITE_FEATURE_SHOWCASE?: string
  readonly VITE_FEATURE_ALL_NFTS?: string
  readonly VITE_FEATURE_SORT?: string
  readonly VITE_FEATURE_SELECT?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
