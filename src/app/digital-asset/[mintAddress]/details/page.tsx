import { umi } from "@/app/helpers/umi"
import { CheckCross } from "@/components/CheckCross"
import { CopyAddress } from "@/components/CopyAddress"
import { getDigitalAsset } from "@/helpers/digital-assets"
import {
  Edition,
  MasterEdition,
  Metadata,
  TokenDelegateRole,
  TokenRecord,
  TokenStandard,
  TokenState as TokenRecordState,
  fetchDigitalAssetWithTokenByMint,
  Key,
} from "@metaplex-foundation/mpl-token-metadata"
import { Mint, Token, TokenState } from "@metaplex-foundation/mpl-toolbox"
import { AccountHeader, publicKey, unwrapOption, unwrapOptionRecursively } from "@metaplex-foundation/umi"
import { Check, Close, ExpandMore, GridView } from "@mui/icons-material"
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Grid,
  Link,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Typography,
} from "@mui/material"
import { LAMPORTS_PER_SOL } from "@solana/web3.js"
import { redirect } from "next/navigation"
import { FC, PropsWithChildren, ReactNode } from "react"

function AccountItem({ title, children }: PropsWithChildren & { title: string }) {
  return (
    <TableRow sx={{ maxWidth: "100%" }}>
      <TableCell>
        <Typography fontWeight="bold">{title}</Typography>
      </TableCell>
      <TableCell align="right" sx={{ overflow: "hidden", maxWidth: "75%" }}>
        {children}
      </TableCell>
    </TableRow>
  )
}

function Header({ header }: { header: AccountHeader }) {
  return (
    <Table>
      <TableBody>
        <AccountItem title="Owner">
          <CopyAddress>{header.owner}</CopyAddress>
        </AccountItem>
        <AccountItem title="SOL">
          <Typography>{Number(header.lamports.basisPoints) / LAMPORTS_PER_SOL}</Typography>
        </AccountItem>
        <AccountItem title="Executable">
          <CheckCross value={header.executable} />
        </AccountItem>
        <AccountItem title="Rent epoch">
          <Typography>{header.rentEpoch}</Typography>
        </AccountItem>
      </TableBody>
    </Table>
  )
}

export function MetadataAccount({ account }: { account: Metadata }) {
  const creators = unwrapOption(account.creators)
  const collection = unwrapOption(account.collection)
  const programmableConfig = unwrapOptionRecursively(account.programmableConfig)
  const tokenStandard = unwrapOption(account.tokenStandard)
  const editionNonce = unwrapOption(account.editionNonce)
  const uses = unwrapOption(account.uses)
  const collectionDetails = unwrapOption(account.collectionDetails)
  return (
    <Box>
      <Table>
        <TableBody>
          <AccountItem title="Public key">
            <CopyAddress linkPath="account">{account.publicKey}</CopyAddress>
          </AccountItem>
          <AccountItem title="Mint">
            <CopyAddress linkPath="account">{account.mint}</CopyAddress>
          </AccountItem>
          <AccountItem title="Update authority">
            <CopyAddress linkPath="account">{account.updateAuthority}</CopyAddress>
          </AccountItem>
          {tokenStandard === TokenStandard.ProgrammableNonFungible && programmableConfig?.ruleSet && (
            <AccountItem title="Programmable config">
              <CopyAddress linkPath="account">{programmableConfig.ruleSet}</CopyAddress>
            </AccountItem>
          )}
          <AccountItem title="Collection">
            <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="flex-end" width="100%">
              <CheckCross value={collection?.verified} />
              <CopyAddress>{collection?.key}</CopyAddress>
            </Stack>
          </AccountItem>
          {collectionDetails && (
            <AccountItem title="Collection details - size">
              <Typography>{Number(collectionDetails.size)}</Typography>
            </AccountItem>
          )}
          <AccountItem title="Token standard">
            <Typography>{tokenStandard ? TokenStandard[tokenStandard] : "NONE"}</Typography>
          </AccountItem>
          <AccountItem title="Name">
            <Typography>{account.name}</Typography>
          </AccountItem>

          <AccountItem title="Symbol">
            <Typography>{account.symbol}</Typography>
          </AccountItem>
          <AccountItem title="Seller fee basis points">
            <Typography>{account.sellerFeeBasisPoints / 100}%</Typography>
          </AccountItem>
          <AccountItem title="Uri">
            <CopyAddress plainLink>{account.uri}</CopyAddress>
          </AccountItem>
          <AccountItem title="Creators">
            {creators && (
              <Table sx={{ td: { border: "none", py: 0, my: 0 } }}>
                <TableBody>
                  {creators.map((c, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <CheckCross value={c.verified} />
                      </TableCell>
                      <TableCell>
                        <CopyAddress linkPath="wallet">{c.address}</CopyAddress>
                      </TableCell>
                      <TableCell>
                        <Typography>{c.share}%</Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </AccountItem>

          <AccountItem title="Is mutable">
            <CheckCross value={account.isMutable} />
          </AccountItem>
          <AccountItem title="Primary sale happened">
            <CheckCross value={account.primarySaleHappened} />
          </AccountItem>
          <AccountItem title="Edition nonce">
            <Typography>{editionNonce || "NONE"}</Typography>
          </AccountItem>
          {uses && (
            <AccountItem title="Uses">
              {Number(uses.remaining)} / {Number(uses.total)}
            </AccountItem>
          )}
          <AccountItem title="key">
            <Typography>{Key[account.key]}</Typography>
          </AccountItem>
        </TableBody>
      </Table>
    </Box>
  )
}

export function MintAccount({ account }: { account: Mint }) {
  const freezeAuthority = unwrapOption(account.freezeAuthority)
  const mintAuthority = unwrapOption(account.mintAuthority)
  return (
    <Table>
      <TableBody>
        <AccountItem title="Public key">
          <CopyAddress linkPath="account">{account.publicKey}</CopyAddress>
        </AccountItem>

        <AccountItem title="Freeze Authority">
          {freezeAuthority ? <CopyAddress linkPath="account">{freezeAuthority}</CopyAddress> : "NONE"}
        </AccountItem>
        <AccountItem title="Mint Authority">
          {freezeAuthority ? <CopyAddress linkPath="account">{mintAuthority}</CopyAddress> : "NONE"}
        </AccountItem>
        <AccountItem title="Supply">
          <Typography>{Number(account.supply)}</Typography>
        </AccountItem>
        <AccountItem title="Decimals">
          <Typography>{account.decimals}</Typography>
        </AccountItem>
        <AccountItem title="Is initialized">
          <CheckCross value={account.isInitialized} />
        </AccountItem>
      </TableBody>
    </Table>
  )
}

export function TokenAccount({ account }: { account: Token }) {
  const delegate = unwrapOption(account.delegate)
  const closeAuthority = unwrapOption(account.closeAuthority)
  return (
    <Table>
      <TableBody>
        <AccountItem title="Public key">
          <CopyAddress linkPath="account">{account.publicKey}</CopyAddress>
        </AccountItem>
        <AccountItem title="Mint">
          <CopyAddress linkPath="account">{account.mint}</CopyAddress>
        </AccountItem>
        <AccountItem title="Owner">
          <CopyAddress linkPath="account">{account.owner}</CopyAddress>
        </AccountItem>
        <AccountItem title="State">
          <Typography>{TokenState[account.state]}</Typography>
        </AccountItem>
        <AccountItem title="Amount">
          <Typography>{Number(account.amount)}</Typography>
        </AccountItem>
        <AccountItem title="Delegate">
          {delegate ? <CopyAddress>{delegate}</CopyAddress> : <Typography>NONE</Typography>}
        </AccountItem>
        <AccountItem title="Delegated amount">
          <Typography>{Number(account.delegatedAmount)}</Typography>
        </AccountItem>
        <AccountItem title="Close authority">
          {closeAuthority ? <CopyAddress>{closeAuthority}</CopyAddress> : <Typography>NONE</Typography>}
        </AccountItem>
        <AccountItem title="Is native">
          <CheckCross value={Boolean(account.isNative)} />
        </AccountItem>
      </TableBody>
    </Table>
  )
}

export function EditionAccount({ account }: { account: Edition }) {
  return (
    <Table>
      <TableBody>
        <AccountItem title="Public key">
          <CopyAddress linkPath="account">{account.publicKey}</CopyAddress>
        </AccountItem>
        <AccountItem title="Parent">
          <CopyAddress linkPath="account">{account.parent}</CopyAddress>
        </AccountItem>
        <AccountItem title="Edition">
          <Typography>{Number(account.edition)}</Typography>
        </AccountItem>
        <AccountItem title="Key">
          <Typography>{Key[account.key]}</Typography>
        </AccountItem>
      </TableBody>
    </Table>
  )
}

export function MasterEditionAccount({ account }: { account: MasterEdition }) {
  const maxSupply = unwrapOption(account.maxSupply)
  return (
    <Table>
      <TableBody>
        <AccountItem title="Public key">
          <CopyAddress linkPath="account">{account.publicKey}</CopyAddress>
        </AccountItem>
        <AccountItem title="Supply">
          <Typography>{Number(account.supply)}</Typography>
        </AccountItem>
        <AccountItem title="Max supply">
          <Typography>{maxSupply ? Number(maxSupply) : "NONE"}</Typography>
        </AccountItem>
        <AccountItem title="Key">
          <Typography>{Key[account.key]}</Typography>
        </AccountItem>
      </TableBody>
    </Table>
  )
}

export function TokenRecordAccount({ account }: { account: TokenRecord }) {
  const delegate = unwrapOption(account.delegate)
  const delegateRole = unwrapOption(account.delegateRole)
  const lockedTransfer = unwrapOption(account.lockedTransfer)
  const ruleSetRevision = unwrapOption(account.ruleSetRevision)
  return (
    <Table>
      <TableBody>
        <AccountItem title="Public key">
          <CopyAddress linkPath="account">{account.publicKey}</CopyAddress>
        </AccountItem>
        <AccountItem title="State">
          <Typography>{TokenRecordState[account.state]}</Typography>
        </AccountItem>
        <AccountItem title="Delegate">
          {delegate ? <CopyAddress linkPath="account">{delegate}</CopyAddress> : <Typography>NONE</Typography>}
        </AccountItem>
        <AccountItem title="Delegate role">
          <Typography>{delegateRole ? TokenDelegateRole[delegateRole] : "NONE"}</Typography>
        </AccountItem>
        <AccountItem title="Locked transfer">
          {lockedTransfer ? <CopyAddress>{lockedTransfer}</CopyAddress> : <Typography>NONE</Typography>}
        </AccountItem>
        <AccountItem title="Rule set revision">
          <Typography>{ruleSetRevision ? Number(ruleSetRevision) : "NONE"}</Typography>
        </AccountItem>
        <AccountItem title="Bump">
          <Typography>{account.bump}</Typography>
        </AccountItem>
        <AccountItem title="Key">
          <Typography>{Key[account.key]}</Typography>
        </AccountItem>
      </TableBody>
    </Table>
  )
}

function Account({
  title,
  Component,
  account,
}: PropsWithChildren & {
  title: string
  Component: FC<any>
  account: Metadata | Mint | Token | Edition | MasterEdition | TokenRecord
}) {
  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMore />}>
        <Typography variant="h6">{title}</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Box width="100%">
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="h6">Account header</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Header header={account.header} />
            </AccordionDetails>
          </Accordion>

          <Component account={account} />
        </Box>
      </AccordionDetails>
    </Accordion>
  )
}

export default async function Page({ params }: { params: Record<string, string> }) {
  const da = await getDigitalAsset(params.mintAddress)
  if (da.compression.compressed) {
    return redirect(`/digital-asset/${params.mintAddress}/compression`)
  }
  const digitalAsset = await fetchDigitalAssetWithTokenByMint(umi, publicKey(params.mintAddress))

  const isOriginal = digitalAsset.edition?.isOriginal

  return (
    <Grid container spacing={5} my={1}>
      <Grid item xs={6}>
        <Account title="Metadata" account={digitalAsset.metadata} Component={MetadataAccount} />
      </Grid>
      <Grid item xs={6}>
        <Account title="Token account" account={digitalAsset.token} Component={TokenAccount} />
      </Grid>
      <Grid item xs={6}>
        <Account title="Mint account" account={digitalAsset.mint} Component={MintAccount} />
      </Grid>

      {digitalAsset.edition && (
        <>
          {isOriginal ? (
            <Grid item xs={6}>
              <Account title="Master edition" account={digitalAsset.edition} Component={MasterEditionAccount} />
            </Grid>
          ) : (
            <Grid item xs={6}>
              <Account title="Edition" account={digitalAsset.edition} Component={EditionAccount} />
            </Grid>
          )}
        </>
      )}
      {digitalAsset.tokenRecord && (
        <Grid item xs={6}>
          <Account title="Token record" account={digitalAsset.tokenRecord} Component={TokenRecordAccount} />
        </Grid>
      )}
    </Grid>
  )
}
