import { useState, useCallback } from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { Tags, Pencil, Trash2, Plus, Loader2, X, Check } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { tagsAtom, nftTagsAtom, createTagAtom, updateTagAtom, deleteTagAtom, type Tag } from "@/stores/user"

const PRESET_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899"] as const

interface TagManagementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TagManagementDialog({ open, onOpenChange }: TagManagementDialogProps) {
  const tags = useAtomValue(tagsAtom)
  const nftTags = useAtomValue(nftTagsAtom)
  const createTag = useSetAtom(createTagAtom)
  const updateTag = useSetAtom(updateTagAtom)
  const deleteTag = useSetAtom(deleteTagAtom)

  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [newTagName, setNewTagName] = useState("")
  const [newTagColor, setNewTagColor] = useState<string>(PRESET_COLORS[5])
  const [editName, setEditName] = useState("")
  const [editColor, setEditColor] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)

  const getNftCountForTag = useCallback(
    (tagId: string) => {
      return Object.values(nftTags).filter((tagIds) => tagIds.includes(tagId)).length
    },
    [nftTags]
  )

  const handleCreate = async () => {
    if (!newTagName.trim()) {
      toast.error("Tag name is required")
      return
    }
    if (newTagName.length > 30) {
      toast.error("Tag name must be 30 characters or less")
      return
    }

    setIsLoading(true)
    try {
      await createTag({ name: newTagName.trim(), color: newTagColor })
      toast.success("Tag created")
      setNewTagName("")
      setNewTagColor(PRESET_COLORS[5])
      setIsCreating(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create tag")
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) {
      toast.error("Tag name is required")
      return
    }
    if (editName.length > 30) {
      toast.error("Tag name must be 30 characters or less")
      return
    }

    setIsLoading(true)
    try {
      await updateTag({ id, updates: { name: editName.trim(), color: editColor } })
      toast.success("Tag updated")
      setEditingId(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update tag")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    setIsLoading(true)
    try {
      await deleteTag(id)
      toast.success("Tag deleted")
      setDeleteConfirmId(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete tag")
    } finally {
      setIsLoading(false)
    }
  }

  const startEdit = (tag: Tag) => {
    setEditingId(tag.id)
    setEditName(tag.name)
    setEditColor(tag.color)
    setIsCreating(false)
    setDeleteConfirmId(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName("")
    setEditColor("")
  }

  const startCreate = () => {
    setIsCreating(true)
    setEditingId(null)
    setDeleteConfirmId(null)
  }

  const cancelCreate = () => {
    setIsCreating(false)
    setNewTagName("")
    setNewTagColor(PRESET_COLORS[5])
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tags className="h-5 w-5 text-primary" />
            Manage Tags
          </DialogTitle>
          <DialogDescription>Create and organize tags to categorize your NFTs. Maximum 20 tags.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-4 max-h-[400px] overflow-y-auto">
          {tags.length === 0 && !isCreating && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No tags yet. Create your first tag to start organizing your NFTs.
            </p>
          )}

          {tags.map((tag) => (
            <div key={tag.id}>
              {deleteConfirmId === tag.id ? (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3">
                  <span className="flex-1 text-sm">Delete "{tag.name}"?</span>
                  <Button variant="ghost" size="icon-sm" onClick={() => setDeleteConfirmId(null)} disabled={isLoading}>
                    <X className="h-4 w-4" />
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(tag.id)} disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
                  </Button>
                </div>
              ) : editingId === tag.id ? (
                <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Tag name"
                    maxLength={30}
                    disabled={isLoading}
                    autoFocus
                  />
                  <div className="flex items-center gap-1">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setEditColor(color)}
                        className={cn(
                          "h-6 w-6 rounded-full transition-all",
                          editColor === color ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
                        )}
                        style={{ backgroundColor: color }}
                        disabled={isLoading}
                      />
                    ))}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={cancelEdit} disabled={isLoading}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={() => handleUpdate(tag.id)} disabled={isLoading}>
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3 group">
                  <div className="h-4 w-4 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                  <span className="flex-1 text-sm font-medium truncate">{tag.name}</span>
                  <span className="text-xs text-muted-foreground">{getNftCountForTag(tag.id)} NFTs</span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => startEdit(tag)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setDeleteConfirmId(tag.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ))}

          {isCreating && (
            <div className="space-y-2 rounded-lg border border-primary/50 bg-primary/5 p-3">
              <Input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="New tag name"
                maxLength={30}
                disabled={isLoading}
                autoFocus
              />
              <div className="flex items-center gap-1">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewTagColor(color)}
                    className={cn(
                      "h-6 w-6 rounded-full transition-all",
                      newTagColor === color ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
                    )}
                    style={{ backgroundColor: color }}
                    disabled={isLoading}
                  />
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={cancelCreate} disabled={isLoading}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleCreate} disabled={isLoading || !newTagName.trim()}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
          {!isCreating && tags.length < 20 && (
            <Button onClick={startCreate} disabled={isLoading}>
              <Plus className="mr-2 h-4 w-4" />
              New Tag
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
