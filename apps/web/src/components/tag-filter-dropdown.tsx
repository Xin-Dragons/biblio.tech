import { useEffect } from "react"
import { useAtom, useAtomValue } from "jotai"
import { useSearchParams } from "react-router"
import { Filter, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { tagFilterAtom, showUntaggedFilterAtom } from "@/stores/ui"
import { tagsAtom, type Tag } from "@/stores/user"
import { isAuthenticatedAtom } from "@/stores/auth"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

export function TagFilterDropdown() {
  const tags = useAtomValue(tagsAtom)
  const isAuthenticated = useAtomValue(isAuthenticatedAtom)
  const [tagFilter, setTagFilter] = useAtom(tagFilterAtom)
  const [showUntagged, setShowUntagged] = useAtom(showUntaggedFilterAtom)
  const [searchParams, setSearchParams] = useSearchParams()

  // Sync URL params to state on mount
  useEffect(() => {
    const tagsParam = searchParams.get("tags")
    const untaggedParam = searchParams.get("untagged")

    if (tagsParam) {
      const tagIds = tagsParam.split(",").filter(Boolean)
      setTagFilter(new Set(tagIds))
    }

    if (untaggedParam === "true") {
      setShowUntagged(true)
    }
  }, [])

  // Sync state to URL params
  useEffect(() => {
    const newParams = new URLSearchParams(searchParams)

    if (tagFilter.size > 0) {
      newParams.set("tags", Array.from(tagFilter).join(","))
    } else {
      newParams.delete("tags")
    }

    if (showUntagged) {
      newParams.set("untagged", "true")
    } else {
      newParams.delete("untagged")
    }

    const currentSearch = searchParams.toString()
    const newSearch = newParams.toString()
    if (currentSearch !== newSearch) {
      setSearchParams(newParams, { replace: true })
    }
  }, [tagFilter, showUntagged, searchParams, setSearchParams])

  const handleTagToggle = (tagId: string) => {
    const newFilter = new Set(tagFilter)
    if (newFilter.has(tagId)) {
      newFilter.delete(tagId)
    } else {
      newFilter.add(tagId)
    }
    setTagFilter(newFilter)
  }

  const handleClearAll = () => {
    setTagFilter(new Set())
    setShowUntagged(false)
  }

  const activeFilterCount = tagFilter.size + (showUntagged ? 1 : 0)

  if (!isAuthenticated || tags.length === 0) {
    return null
  }

  return (
    <div className="flex items-center gap-1.5">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={activeFilterCount > 0 ? "default" : "outline"}
            size="sm"
            className={cn("gap-1.5", activeFilterCount > 0 && "pr-2")}
          >
            <Filter className="h-3.5 w-3.5" />
            Tags
            {activeFilterCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-foreground/20 px-1.5 text-xs font-medium">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Filter by tag</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {tags.map((tag: Tag) => (
            <DropdownMenuCheckboxItem
              key={tag.id}
              checked={tagFilter.has(tag.id)}
              onCheckedChange={() => handleTagToggle(tag.id)}
              className="cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: tag.color }} />
                {tag.name}
              </span>
            </DropdownMenuCheckboxItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            checked={showUntagged}
            onCheckedChange={() => setShowUntagged(!showUntagged)}
            className="cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full border border-muted-foreground/50" />
              Untagged
            </span>
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {activeFilterCount > 0 && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleClearAll}
          title="Clear tag filter"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  )
}
