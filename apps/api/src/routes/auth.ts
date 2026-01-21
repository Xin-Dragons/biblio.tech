import { Hono } from "hono"
import type { HonoEnv } from "../types"

export const authRoutes = new Hono<HonoEnv>()

// Get a nonce for signing
authRoutes.get("/nonce", async (c) => {
  const nonce = crypto.randomUUID()
  // In production, store nonce in D1 with expiry
  return c.json({ nonce })
})

// Verify signature and create session
authRoutes.post("/verify", async (c) => {
  const { publicKey, signature, message } = await c.req.json<{
    publicKey: string
    signature: string
    message: string
  }>()

  // TODO: Verify the signature using tweetnacl or similar
  // For now, we'll trust the signature (implement proper verification)

  // Look up or create user
  const { results } = await c.env.DB.prepare("SELECT user_id FROM wallet_users WHERE wallet = ?").bind(publicKey).all()

  let userId: string

  if (results.length === 0) {
    // New user - create
    userId = crypto.randomUUID()
    await c.env.DB.batch([
      c.env.DB.prepare("INSERT INTO users (id) VALUES (?)").bind(userId),
      c.env.DB.prepare("INSERT INTO wallet_users (wallet, user_id) VALUES (?, ?)").bind(publicKey, userId),
    ])

    // Initialize UserDO with the wallet
    const userDO = c.env.USER_DO.get(c.env.USER_DO.idFromName(userId))
    await userDO.fetch(
      new Request("http://do/wallets", {
        method: "POST",
        body: JSON.stringify({ publicKey, isMain: true }),
      })
    )
  } else {
    userId = results[0].user_id as string
  }

  // Create session token
  const sessionToken = crypto.randomUUID()
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days

  await c.env.DB.prepare("INSERT INTO sessions (token, user_id, wallet, expires_at) VALUES (?, ?, ?, ?)")
    .bind(sessionToken, userId, publicKey, expiresAt)
    .run()

  return c.json({
    token: sessionToken,
    userId,
    expiresAt,
  })
})

// Logout
authRoutes.post("/logout", async (c) => {
  const authHeader = c.req.header("Authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "No token provided" }, 400)
  }

  const token = authHeader.slice(7)
  await c.env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run()

  return c.json({ success: true })
})

// Get current session
authRoutes.get("/me", async (c) => {
  const authHeader = c.req.header("Authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "No token provided" }, 401)
  }

  const token = authHeader.slice(7)
  const { results } = await c.env.DB.prepare(
    "SELECT user_id, wallet, expires_at FROM sessions WHERE token = ? AND expires_at > ?"
  )
    .bind(token, Date.now())
    .all()

  if (results.length === 0) {
    return c.json({ error: "Invalid or expired session" }, 401)
  }

  const session = results[0]
  return c.json({
    userId: session.user_id,
    wallet: session.wallet,
    expiresAt: session.expires_at,
  })
})
