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
import { Variant } from "@mui/material/styles/createTypography"

type CopyAddressProps = {
  children: any
  chain?: string
  linkPath?: string
  plainLink?: boolean
  tx?: boolean
  link?: boolean
  variant?: Variant
  align?: "right" | "left"
}

export const CopyAddress: FC<CopyAddressProps> = ({
  children,
  chain = "SOL",
  linkPath,
  plainLink,
  tx,
  link = true,
  variant = "body1",
  align = "right",
}) => {
  const [copied, setCopied] = useState(false)
  const [nameOverride, setNameOverride] = useState<string | null>(null)
  const umi = useUmi()
  const { lightMode } = useUiSettings()

  function copyPk() {
    navigator.clipboard.writeText(children)
    setCopied(true)
  }

  async function getOwner() {
    if (chain !== "SOL") {
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

  const path = tx ? "tx" : "token"

  const targets = {
    ETH: {
      name: "Etherscan",
      url: "https://etherscan.io/address/",
      image: lightMode ? "etherscan-light.svg" : "/etherscan.svg",
    },
    SOL: {
      name: "Solscan",
      url: `https://solscan.io/${path}/`,
      image: "/solscan.png",
    },
    MATIC: {
      name: "Polygonscan",
      url: "https://polygonscan.com/address/",
      image: "/polygonscan.svg",
    },
  }

  const target = targets[chain as keyof object] as any

  return (
    <Stack
      direction="row"
      spacing={1}
      justifyContent={align === "left" ? "flex-start" : "flex-end"}
      alignItems="center"
    >
      {!plainLink && link && (
        <Tooltip title={`View on ${target.name}`}>
          <Link href={`${target.url}${children}`} target="_blank">
            <Link underline="hover" component="span">
              <img src={target.image} width="15px" style={{ display: "block" }} />
            </Link>
          </Link>
        </Tooltip>
      )}

      {linkPath ? (
        <Link component={NextLink} href={`/${linkPath}/${children}`}>
          <Typography variant={variant}>{tx ? `${children.subtring(0, 10)}...` : shorten(children)}</Typography>
        </Link>
      ) : plainLink ? (
        <Link href={children}>
          <Typography variant={variant}>{children.substring(0, 20)}...</Typography>
        </Link>
      ) : (
        <Typography variant={variant}>
          {nameOverride || tx ? `${children.substring(0, 10)}...` : shorten(children)}
        </Typography>
      )}

      {copied ? (
        <DoneIcon fontSize="small" color="success" />
      ) : (
        <Tooltip title={`Copy ${tx ? "transaction" : "address"}`}>
          <ContentCopyIcon sx={{ cursor: "pointer" }} fontSize="small" onClick={copyPk} />
        </Tooltip>
      )}
    </Stack>
  )
}
