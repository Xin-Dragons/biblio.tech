// import { NextPage } from "next"
// import { Layout } from "../components/Layout"
// import { useAccess } from "../context/access"
// import { useEffect, useState } from "react"
// import { Connection, LAMPORTS_PER_SOL } from "@solana/web3.js"
// import { PublicKey } from "@metaplex-foundation/js"
// import axios from "axios"
// import { ListItem, Table, TableBody, TableCell, TableRow } from "@mui/material"
// import { useMetaplex } from "../context/metaplex"

// const Item = ({ item }) => {
//   const [nft, setNft] = useState(null)
//   const [dest, setDest] = useState(null)
//   const metaplex = useMetaplex()

//   async function loadNft(parsed) {
//     try {
//       if (parsed.mint) {
//         const nft = await metaplex.nfts().findByMint({ mintAddress: new PublicKey(parsed.mint) })
//         setNft(nft)
//       } else if (parsed.sourceMint) {
//         const nft = await metaplex.nfts().findByMint({ mintAddress: new PublicKey(parsed.sourceMint) })
//         setNft(nft)
//         const dest = await metaplex.nfts().findByMint({ mintAddress: new PublicKey(parsed.destinationMint) })
//         setDest(dest)
//       }
//     } catch {}
//   }

//   useEffect(() => {
//     if (item.parsedInfo) {
//       loadNft(item.parsedInfo)
//     }
//   }, [item])
//   console.log(item)

//   const spent = item.type === "NFT_LISTING/DELISTING" ? item.parsedInfo.price / LAMPORTS_PER_SOL : item.parsedInfo.price
//   const source = item.parsedInfo.sourceAmount ? item.parsedInfo.sourceAmount / Math.pow(10, nft?.mint?.decimals) : null

//   return (
//     <TableRow>
//       <TableCell>{(nft || dest) && <img src={nft?.json?.image || dest?.json?.image} width={30} />}</TableCell>
//       <TableCell>
//         {spent ? spent.toLocaleString() : source && source.toLocaleString()} {nft && (nft.symbol || nft?.json.symbol)}
//       </TableCell>
//       <TableCell>{new Date(item.blockTime * 1000).toUTCString()}</TableCell>
//       <TableCell>{item.type}</TableCell>
//       <TableCell>{item.parsedInfo.market || item.parsedInfo.programName || item.parsedInfo.aggregatorName}</TableCell>
//       <TableCell></TableCell>
//       <TableCell>{dest && (dest.name || dest?.json.name)}</TableCell>
//     </TableRow>
//   )
// }

// const Activity: NextPage = () => {
//   const [activity, setActivity] = useState([])
//   const { publicKey } = useAccess()

//   async function getRecentTransactions(publicKey: string, paginationToken?: string) {
//     const { data } = await axios.post(
//       "https://rest-api.hellomoon.io/v0/solana/txns-by-user",
//       { userAccount: publicKey, paginationToken, limit: 1000 },
//       {
//         headers: {
//           authorization: `Bearer ${process.env.NEXT_PUBLIC_HELLO_MOON_API_KEY}`,
//         },
//       }
//     )
//     console.log(data.data)
//     setActivity((prev) => {
//       return [...prev, ...data.data]
//     })
//     if (data.paginationToken) {
//       return await getRecentTransactions(publicKey, data.paginationToken)
//     }
//   }

//   useEffect(() => {
//     if (!publicKey) return
//     getRecentTransactions(publicKey)
//   }, [publicKey])

//   return (
//     <Layout>
//       <Table>
//         <TableBody>
//           {activity.map((item) => (
//             <Item item={item} />
//           ))}
//         </TableBody>
//       </Table>
//     </Layout>
//   )
// }

// export default Activity
