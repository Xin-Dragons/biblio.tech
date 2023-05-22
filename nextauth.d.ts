interface BiblioCollection {
  active?: boolean
  number_wallets?: number
  hours_active?: number
}

interface Collection {
  "biblio-collections": BiblioCollection
  name: string
}

interface Nft {
  mint: string;
  collection: Collection
  metadata: JsonMetadata
}

interface User {
  active: boolean;
  "biblio-wallets": any[];
  id: string;
  access_nft: Nft
}

declare module "next-auth" {
  interface Session extends DefaultSession {
    publicKey
    user?: User;
    
  }
}

import { JsonMetadata } from '@metaplex-foundation/mpl-token-metadata'
import 'next-auth'

/* Not sure if this is needed. */
// declare module 'next-auth' {
//   export interface Session {
//     uid: string
//   }
// }

declare module 'next-auth/client' {
  export interface Session {
    publicKey?: string;
    user?: User;
  }
}
