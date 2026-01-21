import { createFromRoot } from "codama"
import { rootNodeFromAnchor } from "@codama/nodes-from-anchor"
import { renderVisitor } from "@codama/renderers-js"
import { readFileSync, existsSync, mkdirSync } from "fs"
import { dirname, join } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const idlsDir = join(__dirname, "..", "idls")
const generatedDir = join(__dirname, "..", "src", "generated")

const PROGRAMS = ["token-metadata", "bubblegum", "mpl-core"]

async function generate() {
  mkdirSync(generatedDir, { recursive: true })

  for (const program of PROGRAMS) {
    const idlPath = join(idlsDir, `${program}.json`)

    if (!existsSync(idlPath)) {
      console.log(`⚠ IDL not found for ${program}, skipping...`)
      continue
    }

    console.log(`Generating client for ${program}...`)

    try {
      const idlJson = JSON.parse(readFileSync(idlPath, "utf-8"))
      const rootNode = rootNodeFromAnchor(idlJson)
      const codama = createFromRoot(rootNode)

      const outDir = join(generatedDir, program)
      mkdirSync(outDir, { recursive: true })

      await codama.accept(
        renderVisitor(outDir, {
          formatCode: true,
          prettierOptions: {
            semi: false,
            singleQuote: false,
            trailingComma: "es5",
            printWidth: 100,
          },
        })
      )

      console.log(`  ✓ Generated ${program} client in ${outDir}`)
    } catch (error) {
      console.error(`  ✗ Failed to generate ${program}:`, error)
    }
  }

  console.log("\nDone!")
}

generate()
