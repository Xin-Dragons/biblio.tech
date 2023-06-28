import { Link, Stack, Tooltip, Typography } from "@mui/material"
import { FC, useEffect, useState } from "react"
import { default as NextLink } from "next/link"

import ContentCopyIcon from "@mui/icons-material/ContentCopy"
import DoneIcon from "@mui/icons-material/Done"
import { shorten } from "../../helpers/utils"
import { useUiSettings } from "../../context/ui-settings"
import { useBasePath } from "../../context/base-path"

type CopyAddressProps = {
  children: any
  chain?: string
  wallet?: Boolean
}

export const CopyAddress: FC<CopyAddressProps> = ({ children, chain = "solana", wallet }) => {
  const [copied, setCopied] = useState(false)
  const { lightMode } = useUiSettings()

  function copyPk() {
    navigator.clipboard.writeText(children)
    setCopied(true)
  }

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

  const basePath = useBasePath()

  const target = targets[chain as keyof object] as any

  return (
    <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
      <Tooltip title={`View on ${target.name}`}>
        <Link href={`${target.url}${children}`} target="_blank">
          <img src={target.image} width="15px" style={{ display: "block" }} />
        </Link>
      </Tooltip>
      {wallet ? (
        <NextLink href={`${basePath}/wallet/${children}`} passHref>
          <Link underline="hover">{shorten(children)}</Link>
        </NextLink>
      ) : (
        <Typography>{shorten(children)}</Typography>
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
