import { en } from "@dsojevic/profanity-list"

export function hasProfanity(content: string) {
  return !!en
    .filter((item: any) => item.severity > 1)
    .filter((item: any) => {
      const matches = [...content.matchAll(item.match)]
      if (!matches.length) {
        return
      }

      let str = content
      const actualMatches = matches.filter((m) => {
        const term = m[0]
        const exceptions = (item.exceptions || []).map((ex: any) => ex.replace("*", term))
        if (!exceptions.length) {
          return true
        }
        const matches = str.match(exceptions.join("|"))
        if (matches) {
          str = str.slice(matches[0].length)
          return false
        }
        str = str.slice(term.length)
        return true
      })

      return !!actualMatches.length
    }).length
}
