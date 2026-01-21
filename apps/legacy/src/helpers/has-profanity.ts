import { en } from "@dsojevic/profanity-list"
import { compact } from "lodash"
import { minimatch } from "minimatch"

export function hasProfanity(content: string) {
  return !!en
    .filter((item: any) => item.severity > 2)
    .filter((item: any) => {
      const matches = compact(content.split(/\s+/).map((word) => (minimatch(word, item.match) ? word : null)))
      if (!matches.length) {
        return
      }

      const actualMatches = matches.filter((word) => {
        const exceptions = (item.exceptions || []).map((ex: any) => ex.replace("*", word))
        if (!exceptions.length) {
          return true
        }
        const matches = minimatch(word, exceptions.join("|"))
        if (matches) {
          return false
        }
        return true
      })

      return !!actualMatches.length
    }).length
}
