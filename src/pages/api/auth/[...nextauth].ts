import { NextApiRequest, NextApiResponse } from "next";
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getCsrfToken } from "next-auth/react";
import { SigninMessage } from "../../../utils/SigninMessge";
import axios from "axios";
import base58 from "bs58";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { Connection } from "@solana/web3.js";
import { toWeb3JsTransaction } from "@metaplex-foundation/umi-web3js-adapters";
import { Nft } from "../../../types/nextauth";

const umi = createUmi(process.env.NEXT_PUBLIC_RPC_HOST!)
const connection = new Connection(process.env.NEXT_PUBLIC_RPC_HOST!, { commitment: "confirmed" })

export default async function auth(req: NextApiRequest, res: NextApiResponse) {
  const providers = [
    CredentialsProvider({
      name: "Solana",
      credentials: {
        message: {
          label: "Message",
          type: "text",
        },
        signature: {
          label: "Signature",
          type: "text",
        },
        isLedger: {
          label: "Using ledger",
          type: "boolean"
        },
        rawTransaction: {
          label: "Sign in transaction",
          type: "text"
        },
        publicKey: {
          label: "Public key",
          type: "text"
        }
      },
      async authorize(credentials, req) {
        try {
          if (credentials?.isLedger === 'true') {
            const txn = umi.transactions.deserialize(base58.decode(credentials?.rawTransaction));
            const web3txn = toWeb3JsTransaction(txn);
            const confirm = await connection.simulateTransaction(web3txn);

            if (confirm.value.err) {
              throw new Error("Error signing in")
            }

            return {
              id: credentials?.publicKey,
            };
          } else {
            const signinMessage = new SigninMessage(
              JSON.parse(credentials?.message || "{}")
            );
            const nextAuthUrl = new URL(process.env.NEXTAUTH_URL!);
            if (signinMessage.domain !== nextAuthUrl.host) {
              return null;
            }
  
            const csrfToken = await getCsrfToken({ req: { ...req, body: null } });
  
            if (signinMessage.nonce !== csrfToken) {
              return null;
            }
  
            const validationResult = await signinMessage.validate(
              credentials?.signature || ""
            );
  
            if (!validationResult)
              throw new Error("Could not validate the signed message");
  
            return {
              id: signinMessage.publicKey,
            };
          }
        } catch (e) {
          console.log(e)
          return null;
        }
      },
    }),
  ];

  const isDefaultSigninPage =
    req.method === "GET" && req.query.nextauth?.includes("signin");

  // Hides Sign-In with Solana from the default sign page
  if (isDefaultSigninPage) {
    providers.pop();
  }

  return await NextAuth(req, res, {
    providers,
    session: {
      strategy: "jwt",
    },
    secret: process.env.NEXTAUTH_SECRET,
    callbacks: {
      async session({ session, token }) {
        // @ts-ignore
        session.publicKey = token.sub;
        console.log(session)
        if (session.user) {
          try {
            const headers = {
              'Authorization': `Bearer ${process.env.API_SECRET_KEY}`
            }

            const { data: user } = await axios.get(`${process.env.API_URL}/biblio/${token.sub}`, { headers });
            Object.assign(session.user, user)
            session.user.wallets = session.user.wallets || []
            session.user.active = user?.nfts?.some((item: Nft) => {
              if (!item || !item.active) {
                return false
              }
              if (!item.hours_active) {
                return true;
              }

              const stakedHours = item.time_staked * 3600

              return stakedHours < item.hours_active;
            })
          } catch (err) {
            console.log(err)
            session.user.offline = true;
          }
        }
        return session;
      },
    },
  });
}

