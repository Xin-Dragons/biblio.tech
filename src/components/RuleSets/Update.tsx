// import { RuleSet, MPL_TOKEN_AUTH_RULES_PROGRAM_ID, fetchAllRuleSet } from "@metaplex-foundation/mpl-token-auth-rules"
// import { isAllRuleV1 } from "@metaplex-foundation/mpl-token-auth-rules/dist/src/revisions/v1/all"
// import { Key } from "@metaplex-foundation/mpl-token-auth-rules"
// import {
//   Card,
//   CardContent,
//   Stack,
//   Typography,
//   Alert,
//   CircularProgress,
//   Table,
//   TableHead,
//   TableRow,
//   TableCell,
//   TableBody,
//   Box,
//   List,
//   ListItem,
// } from "@mui/material"
// import { useConnection } from "@solana/wallet-adapter-react"
// import { map, omit } from "lodash"
// import { useState, useEffect } from "react"
// import toast from "react-hot-toast"
// import { useUmi } from "../../context/umi"
// import { shorten } from "../../helpers/utils"
// import { PROBLEM_KEY } from "./constants"
// import { publicKey as publicKeySerializer } from "@metaplex-foundation/umi/serializers"

// import * as Auth from "@metaplex-foundation/mpl-token-auth-rules"

// export function Update() {
//   const [ruleSets, setRuleSets] = useState<RuleSet[]>([])
//   const [loading, setLoading] = useState(false)
//   const [rules, setRules] = useState([])
//   const umi = useUmi()
//   const { connection } = useConnection()

//   async function getRuleSets() {
//     if (!umi.identity.publicKey) {
//       setRuleSets([])
//       return
//     }
//     try {
//       setLoading(true)
//       // Array.from(new Array(1000).keys()).reduce((promise, index) => {
//       // return promise.then(async () => {
//       const accs = (
//         await umi.rpc.getProgramAccounts(MPL_TOKEN_AUTH_RULES_PROGRAM_ID, {
//           filters: [
//             {
//               memcmp: {
//                 offset: 0,
//                 bytes: new Uint8Array([Key.RuleSet]),
//               },
//             },
//           ],
//         })
//       ).filter((acc) => acc.publicKey !== PROBLEM_KEY)

//       const myRuleSets = (
//         await fetchAllRuleSet(
//           umi,
//           accs.map((a) => a.publicKey)
//         )
//       )
//         .filter((ruleSet) =>
//           ruleSet.revisions.find((r) => {
//             return (
//               (Array.isArray(r.owner) ? publicKeySerializer().deserialize(new Uint8Array(r.owner))[0] : r.owner) ===
//               umi.identity.publicKey
//             )
//           })
//         )
//         .sort((a, b) => b.publicKey.localeCompare(a.publicKey))

//       console.log(myRuleSets)

//       setRuleSets(myRuleSets)
//     } catch (err) {
//       console.log(err)
//       toast.error("Error looking up ruleSets")
//       return err
//     } finally {
//       setLoading(false)
//     }
//   }

//   useEffect(() => {
//     getRuleSets()
//   }, [umi.identity.publicKey])

//   return (
//     <Card>
//       <CardContent>
//         <Stack spacing={2}>
//           <Typography variant="h4">Manage RuleSets</Typography>
//           <Alert severity="info">
//             If you update a ruleSet that's currently in use, every NFT that uses this ruleSet will be affected
//             immediately
//           </Alert>
//           {loading ? (
//             <CircularProgress />
//           ) : (
//             <Table>
//               <TableHead>
//                 <TableRow>
//                   <TableCell>
//                     <Typography>Public Key</Typography>
//                   </TableCell>
//                   <TableCell>
//                     <Typography>Name</Typography>
//                   </TableCell>
//                   <TableCell>
//                     <Typography>Operations</Typography>
//                   </TableCell>
//                 </TableRow>
//               </TableHead>
//               <TableBody>
//                 {ruleSets.map((ruleSet) => {
//                   const revision = ruleSet.latestRevision
//                   return (
//                     <TableRow>
//                       <TableCell>
//                         <Typography>{shorten(ruleSet.publicKey)}</Typography>
//                       </TableCell>
//                       <TableCell>
//                         <Typography>{revision.libVersion === 1 ? revision.ruleSetName : revision.name}</Typography>
//                       </TableCell>
//                       <TableCell>
//                         <Operations operations={revision.operations} />
//                       </TableCell>
//                     </TableRow>
//                   )
//                 })}
//               </TableBody>
//             </Table>
//           )}
//         </Stack>
//       </CardContent>
//     </Card>
//   )
// }

// const Operations = ({ operations }: { operations: Record<string, Auth.RuleV1 | Auth.RuleV2> }) => {
//   return (
//     <Table>
//       {Object.keys(operations)
//         .filter((key) => operations[key] !== "Namespace")
//         .map((key) => {
//           const rule = operations[key]
//           return (
//             <TableRow>
//               <TableCell>
//                 <Typography fontWeight="bold">{key}</Typography>
//               </TableCell>
//               <TableCell>{Auth.isRuleV1(rule) ? <RuleV1 rule={rule} /> : <RuleV2 rule={rule} />}</TableCell>
//             </TableRow>
//           )
//         })}
//     </Table>
//   )
// }

// const RuleV2 = ({ rule }: { rule: Auth.RuleV2 }) => {
//   return (
//     <Stack ml={2}>
//       <Typography fontWeight="bold" color="primary">
//         {rule.type}
//       </Typography>
//       <Box mb={1}>
//         {Auth.isAllRuleV2(rule) || Auth.isAnyRuleV2(rule)
//           ? rule.rules.map((rule) => <RuleV2 rule={rule} />)
//           : map(omit(rule, "type"), (value, key) => {
//               return (
//                 <Typography>
//                   {key}: {value}
//                 </Typography>
//               )
//             })}
//       </Box>
//     </Stack>
//   )
// }

// const RuleV1 = ({ rule }: { rule: Auth.RuleV1 }) => {
//   return (
//     <Stack ml={2} sx={{ backgroundColor: "background.default" }}>
//       <Typography fontWeight="bold" color="primary">
//         {Object.keys(rule)[0]}
//       </Typography>
//       <Box mb={1}>
//         {isAllRuleV1(rule) && rule.All[0].map((rule) => <RuleV1 rule={rule} />)}
//         {Auth.isAnyRuleV1(rule) && rule.Any[0].map((rule) => <RuleV1 rule={rule} />)}
//         {Auth.isAmountRuleV1(rule) && (
//           <Stack>
//             <Typography>Amount: {rule.Amount[0]}</Typography>
//             <Typography>Operator: {rule.Amount[1]}</Typography>
//             <Typography>Field: {rule.Amount[2]}</Typography>
//           </Stack>
//         )}
//         {Auth.isProgramOwnedListRuleV1(rule) && (
//           <Stack>
//             <List>
//               {rule.ProgramOwnedList[0].map((address) => (
//                 <ListItem>{publicKeySerializer().deserialize(new Uint8Array(address))}</ListItem>
//               ))}
//             </List>
//             <Typography>Field: {rule.ProgramOwnedList[1]}</Typography>
//           </Stack>
//         )}
//         {Auth.isNotRuleV1(rule) && <RuleV1 rule={rule.Not[0]} />}
//         {(("IsWallet" in rule) as object) && <Typography>{rule.IsWallet[0]}</Typography>}
//       </Box>
//     </Stack>
//   )
//   // <Stack>
//   //   {Object.keys(rule).map((key) => {
//   //     const value = rule[key]
//   //     const isRule = typeof value === "object" && Auth.isRuleV1(value)
//   //     if (isRule) {
//   //       console.log(key)
//   //     }
//   //     return (
//   //       <Stack ml={2}>
//   //         <Typography>{key}</Typography>
//   //         {["All", "Any"].includes(key) ? value.map((rule) => <Rule rule={rule} />) : null}
//   //       </Stack>
//   //     )
//   //   })}
//   // </Stack>
//   // )
// }
