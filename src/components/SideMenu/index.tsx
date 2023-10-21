// "use client"
// import { Accordion, AccordionDetails, AccordionSummary, Button, SvgIcon, Typography } from "@mui/material"
// import { Stack } from "@mui/system"
// import Link from "next/link"

// import ExpandMoreIcon from "@mui/icons-material/ExpandMore"

// import DeleteIcon from "@mui/icons-material/Delete"
// import { Tags } from "../Tags"
// import { FC, ReactNode } from "react"
// import VaultIcon from "../Actions/vault.svg"
// import MonetizationOnIcon from "@mui/icons-material/MonetizationOn"
// import { useAccess } from "../../context/access"
// import { Sell } from "@mui/icons-material"
// import { isAddress } from "viem"
// import { usePathname } from "next/navigation"
// import { MenuSection } from "../MenuSection"

// type SideMenuProps = {
//   noAccordions?: boolean
//   large?: boolean
// }

// export const SideMenu: FC<SideMenuProps> = ({ noAccordions, large }) => {
//   const path = usePathname() as string
//   const { isAdmin } = useAccess()

//   // const [_, section, page] = router.asPath.split("/")

//   const isEthWallet = isAddress("to do")

//   function relative(path: string) {
//     return `${""}${path}`
//   }

//   // const route = router.asPath.replace(basePath, "")
//   const route = path

//   const page = ""
//   const section = "" as string

//   return (
//     <Stack>
//       <MenuSection accordion={!noAccordions} title="Wallet">
//         <Link href={relative("/")} passHref>
//           <Button variant={["/", ""].includes(route) ? "contained" : "outlined"} size={large ? "large" : "medium"}>
//             Collections
//           </Button>
//         </Link>
//         <Link href={relative("/nfts")} passHref>
//           <Button variant={route === "/nfts" ? "contained" : "outlined"} size={large ? "large" : "medium"}>
//             NFTs
//           </Button>
//         </Link>
//         {!isEthWallet && [
//           <Link href={relative("/editions")} passHref key={0}>
//             <Button variant={route === "/editions" ? "contained" : "outlined"} size={large ? "large" : "medium"}>
//               NFT Editions
//             </Button>
//           </Link>,
//           <Link href={relative("/sfts")} passHref key={1}>
//             <Button variant={route === "/sfts" ? "contained" : "outlined"} size={large ? "large" : "medium"}>
//               SFTs
//             </Button>
//           </Link>,
//           <Link href={relative("/spl")} passHref key={2}>
//             <Button variant={route === "/spl" ? "contained" : "outlined"} size={large ? "large" : "medium"}>
//               SPL Tokens
//             </Button>
//           </Link>,
//         ]}
//       </MenuSection>
//       {!isEthWallet && (
//         <MenuSection accordion={!noAccordions} title="Go to">
//           <Stack spacing={2}>
//             <Link href={relative("/vault")} passHref>
//               <Button
//                 variant={route === "/vault" ? "contained" : "outlined"}
//                 startIcon={
//                   <SvgIcon fontSize="large">
//                     <VaultIcon />
//                   </SvgIcon>
//                 }
//                 size={large ? "large" : "medium"}
//               >
//                 The Vault
//               </Button>
//             </Link>

//             <Link href={relative("/loans")} passHref>
//               <Button
//                 variant={route === "/loans" ? "contained" : "outlined"}
//                 startIcon={<MonetizationOnIcon />}
//                 size={large ? "large" : "medium"}
//               >
//                 Loans
//               </Button>
//             </Link>
//             <Link href={relative("/listings")} passHref>
//               <Button
//                 variant={route === "/listings" ? "contained" : "outlined"}
//                 startIcon={<Sell />}
//                 size={large ? "large" : "medium"}
//               >
//                 Listings
//               </Button>
//             </Link>
//             <Link href={relative("/junk")} passHref>
//               <Button
//                 variant={route === "/junk" ? "contained" : "outlined"}
//                 startIcon={<DeleteIcon />}
//                 size={large ? "large" : "medium"}
//               >
//                 Junk
//               </Button>
//             </Link>
//           </Stack>
//         </MenuSection>
//       )}

//       {isAdmin && (
//         <MenuSection accordion={!noAccordions} title="Tags">
//           <Tags large={large} />
//         </MenuSection>
//       )}
//       {/* {filters && (
//           <Accordion
//             defaultExpanded
//             sx={{
//               backgroundColor: "transparent",
//               backgroundImage: "none !important",
//               padding: "0 !important",
//             }}
//             disableGutters
//           >
//             <AccordionSummary expandIcon={<ExpandMoreIcon />}>
//               <Typography variant="h5">Filters</Typography>
//             </AccordionSummary>
//             <AccordionDetails>
//               <Filters nfts={nfts} />
//             </AccordionDetails>
//           </Accordion>
//         )} */}
//     </Stack>
//   )
// }
