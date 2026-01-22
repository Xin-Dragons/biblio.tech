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

async function fetchIdls() {
  mkdirSync(idlsDir, { recursive: true })

  for (const [name, url] of Object.entries(IDL_SOURCES)) {
    console.log(`Fetching ${name} IDL from ${url}...`)
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      const idl = await response.json()
      const outPath = join(idlsDir, `${name}.json`)
      writeFileSync(outPath, JSON.stringify(idl, null, 2))
      console.log(`  ✓ Saved to ${outPath}`)
    } catch (error) {
      console.error(`  ✗ Failed to fetch ${name}:`, error)
    }
  }
}

fetchIdls()
