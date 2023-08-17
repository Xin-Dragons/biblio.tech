import { PublicKey, publicKey, some } from "@metaplex-foundation/umi"
import {
  Card,
  CardContent,
  Stack,
  Typography,
  Alert,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  IconButton,
  Autocomplete,
  Box,
} from "@mui/material"
import { useState, useEffect } from "react"
import toast from "react-hot-toast"
import { useUmi } from "../../context/umi"
import { RuleSetRevisionV2, createOrUpdateV1, findRuleSetPda } from "@metaplex-foundation/mpl-token-auth-rules"
import * as Auth from "@metaplex-foundation/mpl-token-auth-rules"
import { FIELD_CONFIG, OPERATIONS, Operation, PROGRAMS } from "./constants"
import { findKey, get, merge, omit, set, unset, upperFirst } from "lodash"
import { AddCircle, ContactSupportOutlined, RemoveCircle } from "@mui/icons-material"

const NOPES = ["Uninitialized", "IsWallet", "Frequency", "Namespace"]

const EMPTY_RULE = {
  type: "AdditionalSigner",
  publicKey: "",
}

function Rule({
  rule,
  setRule,
  path = "",
  addItem,
  removeItem,
}: {
  rule: Auth.RuleV2 | null
  setRule: Function
  path: string
  addItem: Function
  removeItem: Function
}) {
  if (!rule) {
    return
  }

  const { rule: child, rules: children, type, ...rest } = rule as any
  return (
    <Stack width="100%" spacing={2}>
      <FormControl fullWidth>
        <InputLabel>Rule</InputLabel>
        <Select value={type} label="Rule" onChange={(e) => setRule(`${path}.type`, e.target.value)}>
          {Object.keys(Auth.RuleTypeV2)
            .filter((i) => isNaN(i as any))
            .filter((i) => !NOPES.includes(i))
            .map((key) => (
              <MenuItem value={key}>{key}</MenuItem>
            ))}
        </Select>
      </FormControl>
      <Stack pl={4} spacing={2} width="100%">
        {child && (
          <Rule path={`${path}.rule`} rule={child} setRule={setRule} addItem={addItem} removeItem={removeItem} />
        )}
        {children && (
          <Stack direction="row" alignItems="flex-start" width="100%">
            <IconButton sx={{ padding: 2 }} onClick={() => addItem(`${path}.rules`, EMPTY_RULE)}>
              <AddCircle />
            </IconButton>
            <Stack spacing={2} width="100%">
              {children.map((child, index, all) => {
                console.log(child, index, all)
                return (
                  <Stack direction="row" alignItems="flex-start" width="100%">
                    <Rule
                      rule={child}
                      path={`${path}.rules.${index}`}
                      setRule={setRule}
                      addItem={addItem}
                      removeItem={removeItem}
                    />
                    <IconButton
                      sx={{ padding: 2 }}
                      onClick={() => removeItem(`${path}.rules`, index)}
                      disabled={all.length <= 1}
                    >
                      <RemoveCircle />
                    </IconButton>
                  </Stack>
                )
              })}
            </Stack>
          </Stack>
        )}
        {Object.keys(rest).map((key) => (
          <Field
            type={key}
            value={rest[key]}
            setRule={setRule}
            path={`${path}.${key}`}
            addItem={addItem}
            removeItem={removeItem}
          />
        ))}
      </Stack>
    </Stack>
  )
}

function Field({
  type,
  value,
  setRule,
  path,
  addItem,
  removeItem,
}: {
  type: string
  value: any
  setRule: Function
  path: string
  addItem: Function
  removeItem: Function
}) {
  const config = FIELD_CONFIG[type as keyof typeof FIELD_CONFIG] as any

  if (Array.isArray(value)) {
    return (
      <Stack width="100%">
        <Stack direction="row" alignItems="flex-start" width="100%">
          <IconButton sx={{ padding: 2 }} onClick={() => addItem(path, "")}>
            <AddCircle />
          </IconButton>
          <Stack spacing={2} width="100%">
            {value.map((item, index) => (
              <Stack sx={{ width: "100%" }} direction="row" alignItems="flex-start" key={index}>
                <Field
                  value={item}
                  type={type}
                  label={`${upperFirst(type)} ${index}`}
                  setRule={setRule}
                  path={`${path}.${index}`}
                  addItem={addItem}
                  removeItem={removeItem}
                />
                <IconButton sx={{ padding: 2 }} onClick={() => removeItem(path, index)} disabled={value.length <= 1}>
                  <RemoveCircle />
                </IconButton>
              </Stack>
            ))}
          </Stack>
        </Stack>
      </Stack>
    )
  }

  if (!config) {
    return <TextField label={upperFirst(type)} value={value} onChange={(e) => setRule(path, e.target.value)} />
  }

  if (config.field === "select") {
    return (
      <Select value={value} label="Rule" onChange={(e) => setRule(path, e.target.value)}>
        {config.options.map((opt: string) => (
          <MenuItem value={opt}>{opt}</MenuItem>
        ))}
      </Select>
    )
  }

  if (config.field === "publicKey") {
    return (
      <Box sx={{ width: "100%" }}>
        <PublicKeyField
          label={upperFirst(type)}
          value={value}
          onChange={(pk: PublicKey) => {
            return setRule(path, pk)
          }}
        />
      </Box>
    )
  }
  if (config.field === "program") {
    return <ProgramField label={upperFirst(type)} value={value} onChange={(val: PublicKey) => setRule(path, val)} />
  }

  return <TextField label={upperFirst(type)} value={value} onChange={(e) => setRule(path, e.target.value)} />
}

function ProgramField({ value, label, onChange }: { value: any; label: string; onChange: Function }) {
  const [programError, setProgramError] = useState<string | null>(null)
  const umi = useUmi()

  async function validateProgram() {
    if (!value) {
      setProgramError(null)
      return
    }
    try {
      const pk = publicKey(value)
      const acc = await umi.rpc.getAccount(pk)
      const valid = acc.exists && acc.executable
      if (valid) {
        setProgramError(null)
      } else {
        setProgramError("Invalid program address - this account is not executable")
      }
    } catch {
      setProgramError("Invalid public key")
    }
  }

  useEffect(() => {
    validateProgram()
  }, [value])

  console.log(value)

  return (
    <Autocomplete
      freeSolo
      disablePortal
      fullWidth
      groupBy={(option) => option.type}
      value={findKey(PROGRAMS, (p) => p === value)}
      id="combo-box-demo"
      options={PROGRAMS}
      sx={{ width: "100%", flexGrow: 1 }}
      onChange={(event: any, newValue: string | null) => onChange(newValue?.value || "")}
      onInputChange={(event, newValue) => onChange(newValue)}
      renderInput={(params) => {
        return (
          <TextField
            error={!!programError}
            {...params}
            inputProps={{ ...params.inputProps, value: value }}
            value={value}
            label={label}
            fullWidth
            helperText={programError}
          />
        )
      }}
    />
  )
}

function PublicKeyField({ label, value, onChange }) {
  const [publicKeyError, setPublicKeyError] = useState<string | null>(null)

  useEffect(() => {
    if (!value) {
      setPublicKeyError(null)
      return
    }
    try {
      publicKey(value)
      setPublicKeyError(null)
    } catch {
      setPublicKeyError("Invalid public key")
    }
  }, [value])

  return (
    <TextField
      error={!!publicKeyError}
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      helperText={publicKeyError}
      fullWidth
    />
  )
}

function Operation({
  operation,
  rule,
  setRule,
  addItem,
  removeItem,
}: {
  operation: Operation
  rule: Auth.RuleV2
  setRule: Function
  addItem: Function
  removeItem: Function
}) {
  return (
    <Stack spacing={2} sx={{ padding: 4, backgroundColor: "rgba(0, 0, 0, 0.2)", borderRadius: 2 }}>
      <Stack direction="row" spacing={2} alignItems="center">
        <Typography variant="h5">{operation}</Typography>
      </Stack>
      <Rule rule={rule} setRule={setRule} addItem={addItem} removeItem={removeItem} />
    </Stack>
  )
}

export function Create() {
  const [name, setName] = useState("")
  const [operations, setOperations] = useState<Record<string, Auth.RuleV2 | null>>({})
  const umi = useUmi()

  function addOperation() {
    const operation = Object.values(OPERATIONS)[0]
    console.log(operation, {
      [operation]: null,
    })
    setOperations((prevState) => {
      return {
        ...prevState,
        [operation]: EMPTY_RULE,
      }
    })
  }

  function setOperation(key, newKey) {
    setOperations((prevState) => {
      return {
        ...omit(prevState, key),
        [newKey]: prevState[key],
      }
    })
  }

  function normalize(operation: Operation, rule: Auth.RuleV2): Auth.RuleV2 {
    const isTransfer = operation.includes("Transfer")
    if (rule.type === "All" || rule.type === "Any") {
      return {
        type: rule.type,
        rules: (rule.rules || [EMPTY_RULE]).map((r) => normalize(operation, r as Auth.RuleV2)),
      }
    }
    if (rule.type === "Not") {
      return {
        type: rule.type,
        rule: normalize(operation, rule.rule || EMPTY_RULE),
      }
    }
    if (rule.type === "PdaMatch") {
      return {
        type: rule.type,
        pdaField: rule.pdaField || "",
        program: rule.program || "",
        seedsField: rule.seedsField || "",
      }
    }
    if (rule.type === "ProgramOwned") {
      return {
        type: rule.type,
        field: rule.field || isTransfer ? "Source|Destination|Authority" : "Delegate",
        program: rule.program || "",
      }
    }
    if (rule.type === "ProgramOwnedList") {
      return {
        type: rule.type,
        field: rule.field || isTransfer ? "Source|Destination|Authority" : "Delegate",
        programs: rule.programs || [""],
      }
    }
    if (rule.type === "ProgramOwnedTree") {
      return {
        type: rule.type,
        pubkeyField: rule.pubkeyField || "",
        proofField: rule.proofField || "",
        root: [],
      }
    }
    if (rule.type === "AdditionalSigner") {
      return {
        type: rule.type,
        publicKey: rule.publicKey || "",
      }
    }
    if (rule.type === "Amount") {
      return {
        type: rule.type,
        field: rule.field || "Amount",
        operator: rule.operator || "=",
        amount: rule.amount || 1,
      }
    }
    if (rule.type === "Pass") {
      return {
        type: rule.type,
      }
    }
    if (rule.type === "PubkeyMatch") {
      return {
        type: rule.type,
        field: rule.field || "",
        publicKey: rule.publicKey || "",
      }
    }
    if (rule.type === "PubkeyListMatch") {
      return {
        type: rule.type,
        field: rule.field || "",
        publicKeys: rule.publicKeys || [""],
      }
    }
    if (rule.type === "PubkeyTreeMatch") {
      return {
        type: rule.type,
        pubkeyField: rule.pubkeyField || "",
        proofField: rule.proofField || "",
        root: [],
      }
    }
    return omit(rule, "rule", "rules") || EMPTY_RULE
  }

  function setRule(key: Operation, path: string, value: any) {
    if (path.charAt(0) === ".") {
      path = path.substring(1)
    }
    setOperations((prevState) => {
      return {
        ...prevState,
        [key]: normalize(key, set(merge({}, prevState[key]), path, value)),
      }
    })
  }

  function addItem(key: Operation, path: string, item: any) {
    if (path.charAt(0) === ".") {
      path = path.substring(1)
    }
    setOperations((prevState) => {
      const vals = get(prevState[key], path)
      const newVals = merge({}, prevState[key])
      set(newVals, path, [...vals, item])
      return {
        ...prevState,
        [key]: normalize(key, newVals),
      }
    })
  }

  function removeItem(key: Operation, path: string, index: number) {
    console.log(key, path, index)
    if (path.charAt(0) === ".") {
      path = path.substring(1)
    }
    setOperations((prevState) => {
      return {
        ...prevState,
        [key]: normalize(
          key,
          set(
            merge({}, prevState[key]),
            path,
            get(prevState[key], path).filter((_: any, i: number) => i !== index)
          )
        ),
      }
    })
  }

  async function createRuleSet() {
    const createPromise = createOrUpdateV1(umi, {
      ruleSetPda: findRuleSetPda(umi, {
        owner: umi.identity.publicKey,
        name: name,
      }),
      ruleSetRevision: some({
        libVersion: 2,
        name,
        owner: umi.identity.publicKey,
        operations: {
          "Transfer:Holder": {
            type: "All",
            rules: [
              {
                type: "AdditionalSigner",
                publicKey: umi.identity.publicKey,
              },
              {
                type: "Amount",
                field: "Amount",
                operator: "=",
                amount: 1,
              },
            ],
          },
        },
      } as RuleSetRevisionV2),
    }).sendAndConfirm(umi)

    toast.promise(createPromise, {
      loading: "Creating ruleSet",
      success: "RuleSet created",
      error: "Error creating ruleSet",
    })

    await createPromise
  }

  function reset() {
    setOperations({})
  }

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="h4">Create new RuleSet</Typography>
          <Alert severity="info">
            RuleSets are write only - you can create a new rule set and push changes but once created a ruleSet account
            cannot be deleted. You can check your existing ruleSets in the Manage tab
          </Alert>
          <Stack direction="row" flexGrow={1} spacing={4}>
            <Stack spacing={2} width="100%">
              <TextField
                label="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                inputProps={{ maxLength: 32 }}
              />

              {Object.keys(operations).map((key) => (
                <Operation
                  rule={operations[key]}
                  operation={key}
                  setOperation={(operation) => setOperation(key, operation)}
                  setRule={(path, rule) => setRule(key, path, rule)}
                  removeItem={(path, index) => removeItem(key, path, index)}
                  addItem={(path, item) => addItem(key, path, item)}
                />
              ))}

              <Button onClick={addOperation}>Add new rule</Button>
            </Stack>
            <TextField
              multiline
              fullWidth
              label="RuleSet"
              value={JSON.stringify(operations, null, 2)}
              maxRows={JSON.stringify(operations, null, 2).split("\n").length}
              sx={{
                "& .MuiInputBase-input.Mui-disabled": {
                  WebkitTextFillColor: "#ffffff",
                },
              }}
              InputProps={{
                sx: {
                  fontFamily: "monospace !important",
                  whiteSpace: "prewrap",
                  color: "white !important",
                },
                spellCheck: false,
              }}
              disabled
            />
          </Stack>

          <Stack direction="row" spacing={2} justifyContent="space-between">
            <Button color="error" onClick={reset}>
              Reset
            </Button>
            <Button variant="contained" onClick={createRuleSet} size="large">
              Create
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}
