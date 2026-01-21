import { useEffect, useState, useCallback, useRef, useMemo } from "react"
import { useParams, Link } from "react-router"
import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { Transaction } from "@solana/web3.js"
import bs58 from "bs58"
import {
  User,
  ExternalLink,
  Check,
  X,
  Loader2,
  Plus,
  Minus,
  Eye,
  EyeOff,
  Settings,
  Heart,
  Trophy,
  Lock,
  Share2,
} from "lucide-react"
import DraggableGrid, { type DraggableGridHandle } from "ruuri"
import { cn } from "@/lib/utils"
import { isAuthenticatedAtom, sessionAtom } from "@/stores/auth"
import { nftsAtom, isLoadingAtom as nftsLoadingAtom } from "@/stores/nfts"
import {
  usernameAtom,
  fetchUsernameAtom,
  claimUsernameAtom,
  checkUsernameAtom,
  usernameAvailabilityAtom,
  showcaseConfigAtom,
  fetchShowcaseConfigAtom,
  updateShowcaseConfigAtom,
  fetchPublicShowcaseAtom,
  remainingVotesAtom,
  fetchRemainingVotesAtom,
  voteForShowcaseAtom,
  leaderboardAtom,
  fetchLeaderboardAtom,
  leaderboardLoadingAtom,
  dandiesAtom,
  dandiesLoadingAtom,
  fetchDandiesAtom,
  buildLockTxAtom,
  type PublicShowcase,
  type ShowcaseSizeClass,
  type DandyInfo,
} from "@/stores/showcase"

const sizeToPixels: Record<ShowcaseSizeClass, number> = {
  small: 120,
  medium: 248,
  large: 376,
  xlarge: 504,
}

function getImageUrl(url: string, size: ShowcaseSizeClass): string {
  if ((size === "large" || size === "xlarge") && url.includes("prod-image-cdn.tensor.trade")) {
    const match = url.match(/freeze=false\/(.+)$/)
    if (match) {
      return decodeURIComponent(match[1])
    }
  }
  return url
}

interface ShowcaseItemProps {
  name: string
  image: string
  size: ShowcaseSizeClass
  isEditing: boolean
  onSizeChange?: (size: ShowcaseSizeClass) => void
}

interface ShowcaseItemWrapperProps extends ShowcaseItemProps {
  mint: string
  onRemove?: () => void
}

function ShowcaseItemWrapper({ mint, name, image, size, isEditing, onSizeChange, onRemove }: ShowcaseItemWrapperProps) {
  const config = useAtomValue(showcaseConfigAtom)
  const actualSize = isEditing ? (config?.sizes[mint] ?? size) : size
  const px = sizeToPixels[actualSize]

  return (
    <div data-id={mint} className="group relative p-1" style={{ width: px + 8, height: px + 8 }}>
      <ShowcaseItem name={name} image={image} size={actualSize} isEditing={isEditing} onSizeChange={onSizeChange} />
      {isEditing && onRemove && (
        <button
          onClick={onRemove}
          className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}

function ShowcaseItem({ name, image, size, isEditing, onSizeChange }: ShowcaseItemProps) {
  const px = sizeToPixels[size]
  const isSmallest = size === "small"
  const isLargest = size === "xlarge"

  const handleIncrease = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (size === "small") onSizeChange?.("medium")
    else if (size === "medium") onSizeChange?.("large")
    else if (size === "large") onSizeChange?.("xlarge")
  }

  const handleDecrease = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (size === "xlarge") onSizeChange?.("large")
    else if (size === "large") onSizeChange?.("medium")
    else if (size === "medium") onSizeChange?.("small")
  }

  return (
    <div
      className="group relative overflow-hidden rounded-lg border border-border bg-card"
      style={{ width: px, height: px }}
    >
      <img
        src={getImageUrl(image, size)}
        alt={name}
        className="h-full w-full object-cover"
        loading="lazy"
        draggable={false}
      />
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
        <h3 className="truncate text-sm font-medium text-white">{name}</h3>
      </div>
      {isEditing && onSizeChange && (
        <div className="absolute left-2 top-2 flex items-center gap-0.5 rounded-md bg-black/60 p-0.5 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
          <button
            onClick={handleDecrease}
            onMouseDown={(e) => e.stopPropagation()}
            disabled={isSmallest}
            className={cn(
              "flex h-6 w-6 cursor-pointer items-center justify-center rounded transition-colors",
              isSmallest ? "cursor-not-allowed opacity-40" : "hover:bg-white/20"
            )}
          >
            <Minus className="h-3.5 w-3.5 text-white" />
          </button>
          <div className="h-4 w-px bg-white/30" />
          <button
            onClick={handleIncrease}
            onMouseDown={(e) => e.stopPropagation()}
            disabled={isLargest}
            className={cn(
              "flex h-6 w-6 cursor-pointer items-center justify-center rounded transition-colors",
              isLargest ? "cursor-not-allowed opacity-40" : "hover:bg-white/20"
            )}
          >
            <Plus className="h-3.5 w-3.5 text-white" />
          </button>
        </div>
      )}
    </div>
  )
}

function DandyLockSelector({ onLockSuccess }: { onLockSuccess: () => void }) {
  const { connection } = useConnection()
  const { publicKey, signTransaction } = useWallet()
  const dandies = useAtomValue(dandiesAtom)
  const dandiesLoading = useAtomValue(dandiesLoadingAtom)
  const fetchDandies = useSetAtom(fetchDandiesAtom)
  const buildLockTx = useSetAtom(buildLockTxAtom)
  const [selectedDandy, setSelectedDandy] = useState<DandyInfo | null>(null)
  const [isLocking, setIsLocking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDandies()
  }, [fetchDandies])

  const lockedDandy = dandies.find((d) => d.lockedToBiblio)
  const availableDandies = dandies.filter((d) => !d.locked)

  const handleLock = async () => {
    if (!selectedDandy || !publicKey || !signTransaction) return

    setIsLocking(true)
    setError(null)

    try {
      const txData = await buildLockTx({ mint: selectedDandy.mint, owner: selectedDandy.owner })
      if (!txData) {
        setError("Failed to build lock transaction")
        setIsLocking(false)
        return
      }

      const tx = Transaction.from(bs58.decode(txData.transaction))
      const signedTx = await signTransaction(tx)
      const sig = await connection.sendRawTransaction(signedTx.serialize())
      await connection.confirmTransaction(
        { signature: sig, blockhash: txData.blockhash, lastValidBlockHeight: txData.lastValidBlockHeight },
        "confirmed"
      )

      await fetchDandies()
      onLockSuccess()
    } catch (err) {
      console.error("Lock failed:", err)
      setError(err instanceof Error ? err.message : "Lock failed")
    } finally {
      setIsLocking(false)
    }
  }

  if (dandiesLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (lockedDandy) {
    return (
      <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4">
        <div className="flex items-center gap-3">
          <img src={lockedDandy.image} alt={lockedDandy.name} className="h-12 w-12 rounded-lg" />
          <div>
            <p className="flex items-center gap-2 font-medium text-green-500">
              <Lock className="h-4 w-4" /> {lockedDandy.name} locked
            </p>
            <p className="text-sm text-muted-foreground">You can claim a username</p>
          </div>
        </div>
      </div>
    )
  }

  if (availableDandies.length === 0) {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
        <p className="text-center text-amber-500">
          You need an unlocked Dandy NFT to claim a username. Dandies that are already locked to other wallets cannot be
          used.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Select a Dandy to lock to Biblio. This enables your custom username.
      </p>
      <div className="grid grid-cols-4 gap-2">
        {availableDandies.map((dandy) => (
          <button
            key={dandy.mint}
            onClick={() => setSelectedDandy(dandy)}
            className={cn(
              "relative aspect-square overflow-hidden rounded-lg border-2 transition-all",
              selectedDandy?.mint === dandy.mint
                ? "border-primary ring-2 ring-primary/30"
                : "border-border hover:border-primary/50"
            )}
          >
            <img src={dandy.image} alt={dandy.name} className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <button
        onClick={handleLock}
        disabled={!selectedDandy || isLocking}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLocking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
        Lock Dandy to Biblio
      </button>
    </div>
  )
}

function WalletShowcaseOption({ onProceed }: { onProceed: () => void }) {
  const session = useAtomValue(sessionAtom)
  const walletAddress = session?.wallet ?? ""
  const shortAddress = walletAddress ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}` : ""

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
          2
        </div>
        <h3 className="font-semibold">Use Wallet Address</h3>
        <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">Everyone</span>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Share your showcase at your wallet address:{" "}
        <span className="font-mono text-foreground">biblio.tech/showcase/{shortAddress}</span>
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={onProceed}
          className="inline-flex items-center gap-2 rounded-md bg-muted px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/80"
        >
          <Share2 className="h-4 w-4" />
          Continue with Wallet
        </button>
        {walletAddress && (
          <span className="text-xs text-muted-foreground">
            Full address: {walletAddress.slice(0, 8)}...{walletAddress.slice(-8)}
          </span>
        )}
      </div>
    </div>
  )
}

function UsernameClaimForm() {
  const [username, setUsername] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showLockStep, setShowLockStep] = useState(true)

  const checkUsername = useSetAtom(checkUsernameAtom)
  const claimUsername = useSetAtom(claimUsernameAtom)
  const availability = useAtomValue(usernameAvailabilityAtom)
  const dandies = useAtomValue(dandiesAtom)
  const fetchDandies = useSetAtom(fetchDandiesAtom)

  const hasLockedDandy = dandies.some((d) => d.lockedToBiblio)

  useEffect(() => {
    fetchDandies()
  }, [fetchDandies])

  useEffect(() => {
    if (hasLockedDandy) {
      setShowLockStep(false)
    }
  }, [hasLockedDandy])

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (username.length >= 3) {
        checkUsername(username)
      }
    }, 300)
    return () => clearTimeout(timeout)
  }, [username, checkUsername])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!availability?.available || !availability?.valid) return

    setIsSubmitting(true)
    setError(null)

    const result = await claimUsername(username)
    if (!result.success) {
      setError(result.error ?? "Failed to claim username")
    }
    setIsSubmitting(false)
  }

  if (showLockStep && !hasLockedDandy) {
    return (
      <div className="space-y-4">
        <div className="mb-4">
          <h3 className="mb-1 text-sm font-medium">Step 1: Lock a Dandy</h3>
          <p className="text-xs text-muted-foreground">Locking a Dandy to Biblio enables custom usernames</p>
        </div>
        <DandyLockSelector onLockSuccess={() => setShowLockStep(false)} />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {hasLockedDandy && (
        <div className="mb-4 flex items-center gap-2 rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-500">
          <Check className="h-4 w-4" /> Dandy locked - ready to claim username
        </div>
      )}
      <div>
        <label className="mb-1 block text-sm font-medium">Choose your username</label>
        <div className="relative">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            placeholder="gentlemonke"
            className="w-full rounded-md border border-border bg-background px-3 py-2 pr-10 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            minLength={3}
            maxLength={30}
          />
          {username.length >= 3 && availability && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {availability.valid && availability.available ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <X className="h-4 w-4 text-destructive" />
              )}
            </div>
          )}
        </div>
        {username.length >= 3 && availability && (
          <p
            className={cn(
              "mt-1 text-xs",
              availability.available && availability.valid ? "text-green-500" : "text-destructive"
            )}
          >
            {!availability.valid
              ? "Invalid format (use letters, numbers, dots, dashes, underscores)"
              : availability.available
                ? "Username available!"
                : "Username already taken"}
          </p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          3-30 characters. Letters, numbers, dots, dashes, and underscores allowed.
        </p>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <button
        type="submit"
        disabled={!availability?.available || !availability?.valid || isSubmitting || !hasLockedDandy}
        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
        Claim Username
      </button>
    </form>
  )
}

function ShowcaseEditor() {
  const nfts = useAtomValue(nftsAtom)
  const nftsLoading = useAtomValue(nftsLoadingAtom)
  const [config, setConfig] = useAtom(showcaseConfigAtom)
  const updateConfig = useSetAtom(updateShowcaseConfigAtom)
  const gridRef = useRef<DraggableGridHandle>(null)

  const showcaseItems = useMemo(() => {
    if (!config) return []
    const mintSet = new Set(config.items)
    const itemsInShowcase = nfts.filter((n) => mintSet.has(n.mint))

    const orderedItems = [...itemsInShowcase]
    if (config.order.length > 0) {
      const orderMap = new Map(config.order.map((mint, idx) => [mint, idx]))
      orderedItems.sort((a, b) => {
        const aIdx = orderMap.get(a.mint) ?? Infinity
        const bIdx = orderMap.get(b.mint) ?? Infinity
        return aIdx - bIdx
      })
    }
    return orderedItems
  }, [nfts, config])

  const availableNfts = useMemo(() => {
    if (!config) return nfts
    const inShowcase = new Set(config.items)
    return nfts.filter((n) => !inShowcase.has(n.mint))
  }, [nfts, config])

  const handleToggleEnabled = async () => {
    if (!config) return
    await updateConfig({ enabled: !config.enabled })
  }

  const handleAddToShowcase = async (mint: string) => {
    if (!config) return
    const newItems = [...config.items, mint]
    const newOrder = [...config.order, mint]
    await updateConfig({ items: newItems, order: newOrder })
  }

  const handleRemoveFromShowcase = async (mint: string) => {
    if (!config) return
    const newItems = config.items.filter((m) => m !== mint)
    const newOrder = config.order.filter((m) => m !== mint)
    const newSizes = { ...config.sizes }
    delete newSizes[mint]
    await updateConfig({ items: newItems, order: newOrder, sizes: newSizes })
  }

  const handleSizeChange = useCallback(
    async (mint: string, size: ShowcaseSizeClass) => {
      if (!config) return
      const newSizes = { ...config.sizes, [mint]: size }
      setConfig({ ...config, sizes: newSizes })
      await updateConfig({ sizes: newSizes })
      setTimeout(() => {
        gridRef.current?.grid?.refreshItems?.()
        gridRef.current?.grid?.layout?.()
      }, 0)
    },
    [config, setConfig, updateConfig]
  )

  const handleDragEnd = useCallback(async () => {
    const grid = gridRef.current?.grid
    if (!grid || !config) return
    const items = grid.getItems()
    const newOrder = items
      .map((item) => {
        const el = item.getElement()
        return el?.dataset?.id || ""
      })
      .filter(Boolean)
    if (newOrder.length > 0) {
      await updateConfig({ order: newOrder })
    }
  }, [config, updateConfig])

  const renderItem = useCallback(
    (item: { id: string; nft: (typeof nfts)[0]; size: ShowcaseSizeClass }) => {
      return (
        <ShowcaseItemWrapper
          key={item.id}
          mint={item.nft.mint}
          name={item.nft.name}
          image={item.nft.image}
          size={item.size}
          isEditing={true}
          onSizeChange={(size) => handleSizeChange(item.id, size)}
          onRemove={() => handleRemoveFromShowcase(item.id)}
        />
      )
    },
    [handleSizeChange, handleRemoveFromShowcase]
  )

  const gridData = useMemo(() => {
    return showcaseItems.map((nft) => ({
      id: nft.mint,
      nft,
      size: config?.sizes[nft.mint] ?? ("small" as ShowcaseSizeClass),
    }))
  }, [showcaseItems, config?.sizes])

  if (nftsLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">Your Showcase</h2>
          <button
            onClick={handleToggleEnabled}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              config?.enabled
                ? "bg-green-500/20 text-green-500 hover:bg-green-500/30"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {config?.enabled ? (
              <>
                <Eye className="h-4 w-4" /> Public
              </>
            ) : (
              <>
                <EyeOff className="h-4 w-4" /> Hidden
              </>
            )}
          </button>
        </div>
        <p className="text-sm text-muted-foreground">{showcaseItems.length} items</p>
      </div>

      {showcaseItems.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border">
          <p className="text-muted-foreground">Add NFTs to your showcase below</p>
        </div>
      ) : (
        <div className="min-h-[200px] rounded-lg border border-border p-2">
          <DraggableGrid
            ref={gridRef}
            data={gridData}
            renderItem={renderItem}
            dragEnabled
            dragSort
            layout={{ fillGaps: true }}
            layoutDuration={300}
            layoutEasing="ease-out"
            dragPlaceholder={{
              enabled: true,
              createElement: (item) => {
                const el = document.createElement("div")
                const rect = item.getElement()?.getBoundingClientRect()
                el.style.width = `${rect?.width || 120}px`
                el.style.height = `${rect?.height || 120}px`
                el.style.borderRadius = "8px"
                const primary = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim()
                el.style.backgroundColor = `hsl(${primary} / 0.2)`
                el.style.border = `2px dashed hsl(${primary})`
                el.style.boxSizing = "border-box"
                return el
              },
            }}
            onDragEnd={handleDragEnd}
          />
        </div>
      )}

      <div>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">Available NFTs</h3>
        <div className="grid grid-cols-6 gap-2 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12">
          {availableNfts.slice(0, 48).map((nft) => (
            <button
              key={nft.mint}
              onClick={() => handleAddToShowcase(nft.mint)}
              className="group relative aspect-square overflow-hidden rounded-md border border-border transition-colors hover:border-primary"
            >
              <img src={nft.image} alt={nft.name} className="h-full w-full object-cover" loading="lazy" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                <Plus className="h-6 w-6 text-white" />
              </div>
            </button>
          ))}
        </div>
        {availableNfts.length > 48 && (
          <p className="mt-2 text-sm text-muted-foreground">Showing 48 of {availableNfts.length} available NFTs</p>
        )}
      </div>
    </div>
  )
}

function PublicShowcaseView({ showcase, onVoteSuccess }: { showcase: PublicShowcase; onVoteSuccess?: () => void }) {
  const gridRef = useRef<DraggableGridHandle>(null)
  const isAuthenticated = useAtomValue(isAuthenticatedAtom)
  const remainingVotes = useAtomValue(remainingVotesAtom)
  const voteForShowcase = useSetAtom(voteForShowcaseAtom)
  const [isVoting, setIsVoting] = useState(false)
  const [voteError, setVoteError] = useState<string | null>(null)

  const hasVotedForThis = remainingVotes?.votedFor.includes(showcase.username) ?? false
  const canVote = isAuthenticated && (remainingVotes?.remaining ?? 0) > 0 && !hasVotedForThis

  const handleVote = async () => {
    setIsVoting(true)
    setVoteError(null)
    const result = await voteForShowcase(showcase.username)
    setIsVoting(false)
    if (!result.success) {
      setVoteError(result.error ?? "Failed to vote")
    } else {
      onVoteSuccess?.()
    }
  }

  const orderedItems = useMemo(() => {
    const items = [...showcase.showcase.items]
    if (showcase.showcase.order.length > 0) {
      const orderMap = new Map(showcase.showcase.order.map((mint, idx) => [mint, idx]))
      items.sort((a, b) => {
        const aIdx = orderMap.get(a.mint) ?? Infinity
        const bIdx = orderMap.get(b.mint) ?? Infinity
        return aIdx - bIdx
      })
    }
    return items
  }, [showcase])

  const gridData = useMemo(() => {
    return orderedItems.map((nft) => ({
      id: nft.mint,
      nft,
      size: showcase.showcase.sizes[nft.mint] ?? ("small" as ShowcaseSizeClass),
    }))
  }, [orderedItems, showcase.showcase.sizes])

  const renderItem = useCallback((item: { id: string; nft: (typeof orderedItems)[0]; size: ShowcaseSizeClass }) => {
    const px = sizeToPixels[item.size]
    return (
      <div data-id={item.id} className="p-1" style={{ width: px + 8, height: px + 8 }}>
        <ShowcaseItem name={item.nft.name} image={item.nft.image} size={item.size} isEditing={false} />
      </div>
    )
  }, [])

  return (
    <div className="flex h-full flex-col">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <User className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">@{showcase.username}</h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>{showcase.showcase.items.length} items</span>
              {showcase.dandyCount > 0 && (
                <span className="flex items-center gap-1 text-amber-500">
                  🎩 {showcase.dandyCount} {showcase.dandyCount === 1 ? "Dandy" : "Dandies"}
                </span>
              )}
              <a
                href={`https://solscan.io/account/${showcase.publicKey}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-foreground"
              >
                {showcase.publicKey.slice(0, 4)}...{showcase.publicKey.slice(-4)}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2">
            <Heart
              className={cn("h-5 w-5", showcase.votes > 0 ? "fill-red-500 text-red-500" : "text-muted-foreground")}
            />
            <span className="text-lg font-semibold">{showcase.votes}</span>
          </div>
          {isAuthenticated && (
            <button
              onClick={handleVote}
              disabled={!canVote || isVoting}
              className={cn(
                "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
                hasVotedForThis
                  ? "bg-green-500/20 text-green-500"
                  : canVote
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "cursor-not-allowed bg-muted text-muted-foreground"
              )}
            >
              {isVoting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : hasVotedForThis ? (
                <>
                  <Check className="h-4 w-4" /> Voted
                </>
              ) : (
                <>
                  <Heart className="h-4 w-4" /> Vote
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {voteError && <p className="mb-4 text-sm text-destructive">{voteError}</p>}

      {orderedItems.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border">
          <p className="text-muted-foreground">This showcase is empty</p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <DraggableGrid
            ref={gridRef}
            data={gridData}
            renderItem={renderItem}
            dragEnabled={false}
            layout={{ fillGaps: true }}
            layoutDuration={300}
            layoutEasing="ease-out"
          />
        </div>
      )}
    </div>
  )
}

function Leaderboard() {
  const leaderboard = useAtomValue(leaderboardAtom)
  const isLoading = useAtomValue(leaderboardLoadingAtom)
  const fetchLeaderboard = useSetAtom(fetchLeaderboardAtom)

  useEffect(() => {
    fetchLeaderboard()
  }, [fetchLeaderboard])

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (leaderboard.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-center">
        <Trophy className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">No showcases have votes yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {leaderboard.slice(0, 10).map((entry, idx) => (
        <Link
          key={entry.username}
          to={`/showcase/${entry.username}`}
          className="flex items-center gap-3 rounded-md border border-border bg-card p-3 transition-colors hover:bg-accent"
        >
          <span
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
              idx === 0 && "bg-amber-500 text-white",
              idx === 1 && "bg-gray-400 text-white",
              idx === 2 && "bg-amber-700 text-white",
              idx > 2 && "bg-muted text-muted-foreground"
            )}
          >
            {idx + 1}
          </span>
          <div className="flex-1">
            <span className="font-medium">@{entry.username}</span>
            {entry.dandyCount > 0 && <span className="ml-2 text-xs text-amber-500">🎩 {entry.dandyCount}</span>}
          </div>
          <div className="flex items-center gap-1 text-sm">
            <Heart className="h-4 w-4 fill-red-500 text-red-500" />
            <span className="font-semibold">{entry.votes}</span>
          </div>
        </Link>
      ))}
    </div>
  )
}

export function ShowcasePage() {
  const { username: urlUsername } = useParams<{ username: string }>()
  const { connected } = useWallet()
  const isAuthenticated = useAtomValue(isAuthenticatedAtom)
  const session = useAtomValue(sessionAtom)

  const currentUsername = useAtomValue(usernameAtom)
  const remainingVotes = useAtomValue(remainingVotesAtom)
  const fetchUsername = useSetAtom(fetchUsernameAtom)
  const fetchShowcaseConfig = useSetAtom(fetchShowcaseConfigAtom)
  const fetchPublicShowcase = useSetAtom(fetchPublicShowcaseAtom)
  const fetchRemainingVotes = useSetAtom(fetchRemainingVotesAtom)

  const [publicShowcase, setPublicShowcase] = useState<PublicShowcase | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [useWalletAddress, setUseWalletAddress] = useState(false)

  const isOwnShowcase = urlUsername && currentUsername && urlUsername.toLowerCase() === currentUsername.toLowerCase()
  const isViewingPublic = urlUsername && !isOwnShowcase

  useEffect(() => {
    if (isAuthenticated) {
      fetchUsername()
      fetchRemainingVotes()
    }
  }, [isAuthenticated, fetchUsername, fetchRemainingVotes])

  useEffect(() => {
    if (isAuthenticated && (currentUsername || useWalletAddress)) {
      fetchShowcaseConfig()
    }
  }, [isAuthenticated, currentUsername, useWalletAddress, fetchShowcaseConfig])

  useEffect(() => {
    if (isViewingPublic && urlUsername) {
      setIsLoading(true)
      setNotFound(false)
      fetchPublicShowcase(urlUsername).then((data) => {
        setPublicShowcase(data)
        setNotFound(!data)
        setIsLoading(false)
      })
    } else {
      setIsLoading(false)
    }
  }, [isViewingPublic, urlUsername, fetchPublicShowcase])

  const refreshShowcase = useCallback(() => {
    if (urlUsername) {
      fetchPublicShowcase(urlUsername).then((data) => {
        if (data) setPublicShowcase(data)
      })
    }
  }, [urlUsername, fetchPublicShowcase])

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (isViewingPublic) {
    if (notFound) {
      return (
        <div className="flex h-full flex-col items-center justify-center">
          <User className="mb-4 h-16 w-16 text-muted-foreground/50" />
          <h1 className="text-2xl font-bold">Showcase Not Found</h1>
          <p className="mt-2 text-muted-foreground">
            The user @{urlUsername} doesn't exist or hasn't enabled their showcase.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Go Home
          </Link>
        </div>
      )
    }

    if (publicShowcase) {
      return <PublicShowcaseView showcase={publicShowcase} onVoteSuccess={refreshShowcase} />
    }
  }

  if (!connected) {
    return (
      <div className="mx-auto max-w-2xl space-y-8 py-8">
        <div className="text-center">
          <User className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
          <h1 className="text-2xl font-bold">Showcase</h1>
          <p className="mt-2 text-muted-foreground">Connect your wallet to create your showcase</p>
        </div>
        <div>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Trophy className="h-5 w-5 text-amber-500" /> Leaderboard
          </h2>
          <Leaderboard />
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-2xl space-y-8 py-8">
        <div className="text-center">
          <User className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
          <h1 className="text-2xl font-bold">Showcase</h1>
          <p className="mt-2 text-muted-foreground">Sign in to create and manage your showcase</p>
        </div>
        <div>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Trophy className="h-5 w-5 text-amber-500" /> Leaderboard
          </h2>
          <Leaderboard />
        </div>
      </div>
    )
  }

  if (!currentUsername && !useWalletAddress) {
    return (
      <div className="mx-auto max-w-lg py-12">
        <div className="mb-8 text-center">
          <User className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
          <h1 className="text-2xl font-bold">Create Your Showcase</h1>
          <p className="mt-2 text-muted-foreground">Share your NFT collection with the world.</p>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                1
              </div>
              <h3 className="font-semibold">Custom Username</h3>
              <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs text-amber-500">Dandies holders</span>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              Lock a Dandy to Biblio to claim a custom username like{" "}
              <span className="font-mono">biblio.tech/showcase/yourname</span>
            </p>
            <UsernameClaimForm />
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-background px-2 text-sm text-muted-foreground">or</span>
            </div>
          </div>

          <WalletShowcaseOption onProceed={() => setUseWalletAddress(true)} />
        </div>
      </div>
    )
  }

  const displayIdentifier =
    currentUsername || (session?.wallet ? `${session.wallet.slice(0, 4)}...${session.wallet.slice(-4)}` : "")
  const showcaseUrl = currentUsername || session?.wallet || ""

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex shrink-0 items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">{currentUsername ? `@${currentUsername}` : displayIdentifier}</h1>
          {!currentUsername && (
            <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">Wallet Address</span>
          )}
          <a
            href={`/showcase/${showcaseUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            View public page <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <div className="flex items-center gap-3">
          {remainingVotes && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Heart className="h-4 w-4" />
              <span>{remainingVotes.remaining} votes left today</span>
            </div>
          )}
          <Link
            to="/settings"
            className="flex items-center gap-2 rounded-md bg-muted px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted/80"
          >
            <Settings className="h-4 w-4" /> Settings
          </Link>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <ShowcaseEditor />
      </div>
    </div>
  )
}
