"use client"
import { Link, Stack, Tooltip, Typography } from "@mui/material"
import { FC, useEffect, useState } from "react"
import { default as NextLink } from "next/link"

import ContentCopyIcon from "@mui/icons-material/ContentCopy"
import DoneIcon from "@mui/icons-material/Done"
import { shorten } from "@/helpers/utils"
import { useUiSettings } from "@/context/ui-settings"
import { useUmi } from "@/context/umi"
import { PROGRAMS } from "@/components/RuleSets/constants"
import { unwrapOptionRecursively } from "@metaplex-foundation/umi"

type CopyAddressProps = {
  children: any
  chain?: string
  linkPath?: string
}

export const CopyAddress: FC<CopyAddressProps> = ({ children, chain = "solana", linkPath }) => {
  const [copied, setCopied] = useState(false)
  const [nameOverride, setNameOverride] = useState<string | null>(null)
  const umi = useUmi()
  const { lightMode } = useUiSettings()

  function copyPk() {
    navigator.clipboard.writeText(children)
    setCopied(true)
  }

  async function getOwner() {
    if (chain !== "solana") {
      setNameOverride(null)
      return
    }
    try {
      const da = await umi.rpc.getAccount(children)
      if (da.exists) {
        const ownedBy = PROGRAMS.find((p) => p.value === da.owner)
        if (ownedBy) {
          setNameOverride(ownedBy.label)
        } else {
          setNameOverride(null)
        }
      } else {
        setNameOverride(null)
      }
    } catch {
      setNameOverride(null)
    }
  }

  useEffect(() => {
    getOwner()
  }, [chain, children])

  useEffect(() => {
    if (!copied) return

    const id = setTimeout(() => {
      setCopied(false)
    }, 2000)

    return () => {
      clearTimeout(id)
    }
  }, [copied])

  const targets = {
    eth: {
      name: "Etherscan",
      url: "https://etherscan.io/address/",
      image: lightMode ? "etherscan-light.svg" : "/etherscan.svg",
    },
    solana: {
      name: "Solscan",
      url: "https://solscan.io/token/",
      image: "/solscan.png",
    },
    matic: {
      name: "Polygonscan",
      url: "https://polygonscan.com/address/",
      image: "/polygonscan.svg",
    },
  }

  const target = targets[chain as keyof object] as any

  return (
    <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
      <Tooltip title={`View on ${target.name}`}>
        <Link href={`${target.url}${children}`} target="_blank">
          <Link underline="hover" component="span">
            <img src={target.image} width="15px" style={{ display: "block" }} />
          </Link>
        </Link>
      </Tooltip>
      {linkPath ? (
        <Link component={NextLink} href={`/${linkPath}/${children}`}>
          {shorten(children)}
        </Link>
      ) : (
        <Typography>{nameOverride || shorten(children)}</Typography>
      )}

      {copied ? (
        <DoneIcon fontSize="small" color="success" />
      ) : (
        <Tooltip title="Copy address">
          <ContentCopyIcon sx={{ cursor: "pointer" }} fontSize="small" onClick={copyPk} />
        </Tooltip>
      )}
    </Stack>
  )
}
