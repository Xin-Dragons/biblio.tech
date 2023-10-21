import { Collection } from "@/types/database"
import { Language } from "@mui/icons-material"
import { Link, Stack, SvgIcon } from "@mui/material"
import XLogo from "@/../public/x.svg"
import DiscordLogo from "@/../public/discord.svg"

export function Socials({ collection }: { collection: Collection }) {
  if (!collection.twitter && !collection.website && !collection.discord) {
    return null
  }
  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      {collection.twitter && (
        <Link href={collection.twitter} target="_blank" rel="noreferrer" sx={{ "&:hover": { color: "unset" } }}>
          <SvgIcon fontSize="small">
            <XLogo />
          </SvgIcon>
        </Link>
      )}

      {collection.discord && (
        <Link href={collection.discord} target="_blank" rel="noreferrer" sx={{ "&:hover": { color: "unset" } }}>
          <SvgIcon>
            <DiscordLogo />
          </SvgIcon>
        </Link>
      )}

      {collection.website && (
        <Link href={collection.website} target="_blank" rel="noreferrer" sx={{ "&:hover": { color: "unset" } }}>
          <Language />
        </Link>
      )}
    </Stack>
  )
}
