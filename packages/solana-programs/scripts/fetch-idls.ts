import { writeFileSync, mkdirSync } from "fs"
import { dirname, join } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const idlsDir = join(__dirname, "..", "idls")

const IDL_SOURCES = {
  "token-metadata":
    "https://raw.githubusercontent.com/metaplex-foundation/mpl-token-metadata/main/idls/token_metadata.json",
  bubblegum: "https://raw.githubusercontent.com/metaplex-foundation/mpl-bubblegum/main/idls/bubblegum.json",
  "mpl-core": "https://raw.githubusercontent.com/metaplex-foundation/mpl-core/main/idls/mpl_core.json",
  asset: "https://raw.githubusercontent.com/nifty-oss/asset/main/idls/asset_program.json",
}

interface IdlType {
  name: string
  type: {
    kind: string
    fields?: Array<{ name: string; type: unknown }>
    variants?: Array<{ name: string; fields?: Array<{ name: string; type: unknown }> }>
  }
}

interface Idl {
  version: string
  name: string
  instructions: unknown[]
  types: IdlType[]
  errors: unknown[]
  metadata: unknown
}

const ASSET_MISSING_TYPES: IdlType[] = [
  {
    name: "Standard",
    type: {
      kind: "enum",
      variants: [{ name: "NonFungible" }, { name: "Managed" }, { name: "Soulbound" }, { name: "Proxied" }],
    },
  },
  {
    name: "DelegateRole",
    type: {
      kind: "enum",
      variants: [{ name: "None" }, { name: "Transfer" }, { name: "Lock" }, { name: "Burn" }],
    },
  },
  {
    name: "ExtensionType",
    type: {
      kind: "enum",
      variants: [
        { name: "None" },
        { name: "Attributes" },
        { name: "Blob" },
        { name: "Creators" },
        { name: "Links" },
        { name: "Metadata" },
        { name: "Grouping" },
        { name: "Royalties" },
        { name: "Manager" },
        { name: "Proxy" },
        { name: "Properties" },
        { name: "Bucket" },
      ],
    },
  },
]

function patchAssetIdl(idl: Idl): Idl {
  const existingTypeNames = new Set(idl.types.map((t) => t.name))

  for (const missingType of ASSET_MISSING_TYPES) {
    if (!existingTypeNames.has(missingType.name)) {
      idl.types.push(missingType)
      console.log(`    Added missing type: ${missingType.name}`)
    }
  }

  return idl
}

async function fetchIdls() {
  mkdirSync(idlsDir, { recursive: true })

  for (const [name, url] of Object.entries(IDL_SOURCES)) {
    console.log(`Fetching ${name} IDL from ${url}...`)
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      let idl = (await response.json()) as Idl

      if (name === "asset") {
        idl = patchAssetIdl(idl)
      }

      const outPath = join(idlsDir, `${name}.json`)
      writeFileSync(outPath, JSON.stringify(idl, null, 2))
      console.log(`  ✓ Saved to ${outPath}`)
    } catch (error) {
      console.error(`  ✗ Failed to fetch ${name}:`, error)
    }
  }
}

fetchIdls()
