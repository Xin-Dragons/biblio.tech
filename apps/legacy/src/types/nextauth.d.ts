interface Nft {
  mint: string;
  collection_name: string
  metadata: JsonMetadata
  active?: boolean
  number_wallets: number
  time_staked: number
  hours_active: number | null
}

interface User {
  active: boolean;
  wallets: any[];
  id: string;
  nfts: Nft[];
  offline?: boolean;
}

declare module "next-auth" {
  interface Session extends DefaultSession {
    publicKey
    user?: User;
  }
}

import { JsonMetadata } from '@metaplex-foundation/mpl-token-metadata'
import 'next-auth'

declare module 'next-auth/client' {
  export interface Session {
    publicKey?: string;
    user?: User;
  }
}
