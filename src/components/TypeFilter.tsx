"use client"
import { useFilters } from "@/context/filters"
import { Button, FormControlLabel, Stack, Switch } from "@mui/material"
import { MultipleSelectChip } from "./MultiSelectChip"
import { MultiSelectWithCheckboxes } from "./MultiSelectWithCheckboxes"
import { useOwnedAssets } from "@/context/owned-assets"
import { groupBy } from "lodash"
import { AutocompleteCheckboxes } from "./AutocompleteCheckboxes"
import { useUiSettings } from "@/context/ui-settings"

export function TypeFilter() {
  const { tokenStandards, setTokenStandards, status, setStatus, selectedCollections, setSelectedCollections } =
    useFilters()
  const { digitalAssets, collections } = useOwnedAssets()
  const { includeUnverified, setIncludeUnverified } = useUiSettings()

  function clearFilters() {}

  const tokenStandardOptions = [
    {
      value: -1,
      label: "Compressed",
    },
    {
      value: 0,
      label: "NFT",
    },
    // {
    //   value: 1,
    //   label: "SPL",
    // },
    // {
    //   value: 2,
    //   label: "SFT",
    // },
    {
      value: 3,
      label: "Edition",
    },
    {
      value: 4,
      label: "pNFT",
    },
    {
      value: 5,
      label: "pNFT Edition",
    },
  ]

  function clearAll() {
    setTokenStandards([])
    setStatus([])
    setSelectedCollections([])
  }

  console.log({ collections })

  return (
    <Stack spacing={2}>
      <Button
        href="#"
        onClick={clearAll}
        disabled={!tokenStandards.length && !selectedCollections.length && !status.length}
      >
        Clear all
      </Button>
      {/* <FormControlLabel
        label="Compressed"
        control={<Switch checked={types.compressed} onChange={(e) => setType("compressed", e.target.checked)} />}
      /> */}
      <AutocompleteCheckboxes
        label="Token standard"
        value={tokenStandards}
        setValue={(value: any[]) => setTokenStandards(value)}
        options={tokenStandardOptions}
      />
      <AutocompleteCheckboxes
        label="Collections"
        value={selectedCollections}
        setValue={(value: any[]) => setSelectedCollections(value)}
        options={collections.map((c) => {
          return {
            label: c.name,
            value: c.id,
            secondary: c.mints.length,
            image: c.imageUri,
          }
        })}
      />
      {/* <MultipleSelectChip
        label="Token standard"
        options={tokenStandardOptions}
        
        
      /> */}
      <AutocompleteCheckboxes
        label="Status"
        options={[
          {
            label: "None",
            value: "NONE",
          },
          {
            label: "Listed",
            value: "LISTED",
          },
          {
            label: "Frozen",
            value: "FROZEN",
          },
          {
            label: "Staked",
            value: "STAKED",
          },
          {
            label: "Secured",
            value: "SECURED",
          },
          {
            label: "Collateralized",
            value: "COLLATERALIZED",
          },
          {
            label: "Delegated",
            value: "DELEGATED",
          },
        ]}
        value={status}
        setValue={setStatus}
      />
      {/* <FormControlLabel
        label="NFTs"
        control={<Switch checked={types.nonFungible} onChange={(e) => setType("nonFungible", e.target.checked)} />}
      />
      <FormControlLabel
        label="Editions"
        control={<Switch checked={types.edition} onChange={(e) => setType("edition", e.target.checked)} />}
      /> */}
      <FormControlLabel
        label="Show unverified"
        control={<Switch checked={includeUnverified} onChange={(e) => setIncludeUnverified(e.target.checked)} />}
      />
    </Stack>
  )
}
