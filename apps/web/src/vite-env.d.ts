/// <reference types="vite/client" />

import type { Buffer as BufferType } from "buffer"

declare global {
  // eslint-disable-next-line no-var
  var Buffer: typeof BufferType
}

interface ImportMetaEnv {
  readonly VITE_RPC_ENDPOINT: string
  readonly VITE_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
