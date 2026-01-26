import { useSearchParams } from "react-router"
import { Hammer, Plus, Pencil, Layers } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

type TabValue = "create" | "update" | "batch"

const VALID_TABS: TabValue[] = ["create", "update", "batch"]

function isValidTab(value: string | null): value is TabValue {
  return value !== null && VALID_TABS.includes(value as TabValue)
}

export function CreatorStudioPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get("tab")
  const activeTab: TabValue = isValidTab(tabParam) ? tabParam : "create"

  const handleTabChange = (value: string) => {
    const newParams = new URLSearchParams(searchParams)
    if (value === "create") {
      newParams.delete("tab")
    } else {
      newParams.set("tab", value)
    }
    setSearchParams(newParams, { replace: true })
  }

  return (
    <div className="h-full flex flex-col animate-fade-up">
      <div className="border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-primary/10" />
            <Hammer className="relative h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold">Creator Studio</h1>
            <p className="text-sm text-muted-foreground">Create, update, and manage your NFTs</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col">
        <div className="border-b px-6 pt-4">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="create" className="gap-2">
              <Plus className="h-4 w-4" />
              Create
            </TabsTrigger>
            <TabsTrigger value="update" className="gap-2">
              <Pencil className="h-4 w-4" />
              Update
            </TabsTrigger>
            <TabsTrigger value="batch" className="gap-2">
              <Layers className="h-4 w-4" />
              Batch
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 h-full">
            <div className="min-h-0">
              <TabsContent value="create" className="mt-0 h-full">
                <CreateTabPlaceholder />
              </TabsContent>
              <TabsContent value="update" className="mt-0 h-full">
                <UpdateTabPlaceholder />
              </TabsContent>
              <TabsContent value="batch" className="mt-0 h-full">
                <BatchTabPlaceholder />
              </TabsContent>
            </div>
            <div className="hidden lg:block">
              <PreviewPlaceholder />
            </div>
          </div>
        </div>
      </Tabs>
    </div>
  )
}

function CreateTabPlaceholder() {
  return (
    <div className="rounded-lg border border-dashed p-8 h-full flex items-center justify-center">
      <div className="text-center text-muted-foreground">
        <Plus className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <p className="font-medium">Create New NFT</p>
        <p className="text-sm mt-1">Form fields will be added here</p>
      </div>
    </div>
  )
}

function UpdateTabPlaceholder() {
  return (
    <div className="rounded-lg border border-dashed p-8 h-full flex items-center justify-center">
      <div className="text-center text-muted-foreground">
        <Pencil className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <p className="font-medium">Update Existing NFT</p>
        <p className="text-sm mt-1">Load an NFT to modify its metadata</p>
      </div>
    </div>
  )
}

function BatchTabPlaceholder() {
  return (
    <div className="rounded-lg border border-dashed p-8 h-full flex items-center justify-center">
      <div className="text-center text-muted-foreground">
        <Layers className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <p className="font-medium">Batch Operations</p>
        <p className="text-sm mt-1">Manage multiple NFTs at once</p>
      </div>
    </div>
  )
}

function PreviewPlaceholder() {
  return (
    <div className="rounded-lg border bg-muted/30 p-6 h-full flex items-center justify-center sticky top-6">
      <div className="text-center text-muted-foreground">
        <div className="w-32 h-32 rounded-lg bg-muted mx-auto mb-4" />
        <p className="font-medium">NFT Preview</p>
        <p className="text-sm mt-1">Live preview will appear here</p>
      </div>
    </div>
  )
}
