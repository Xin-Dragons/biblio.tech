import { Hono } from "hono"
import type { HonoEnv } from "../types"
import { authMiddleware } from "../middleware/auth"

export const userRoutes = new Hono<HonoEnv>()

// All user routes require authentication
userRoutes.use("*", authMiddleware)

// Helper to get UserDO for current user
function getUserDO(c: { env: HonoEnv["Bindings"]; get: (key: string) => string | undefined }) {
  const userId = c.get("userId")
  if (!userId) throw new Error("No userId in context")
  return c.env.USER_DO.get(c.env.USER_DO.idFromName(userId))
}

// Tags
userRoutes.get("/tags", async (c) => {
  const userDO = getUserDO(c)
  const res = await userDO.fetch(new Request("http://do/tags"))
  return c.json(await res.json())
})

userRoutes.post("/tags", async (c) => {
  const userDO = getUserDO(c)
  const body = await c.req.json()
  const res = await userDO.fetch(
    new Request("http://do/tags", {
      method: "POST",
      body: JSON.stringify(body),
    })
  )
  return c.json(await res.json())
})

userRoutes.patch("/tags/:id", async (c) => {
  const userDO = getUserDO(c)
  const id = c.req.param("id")
  const body = await c.req.json()
  const res = await userDO.fetch(
    new Request(`http://do/tags/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    })
  )
  if (!res.ok) return c.json({ error: "Not found" }, 404)
  return c.json(await res.json())
})

userRoutes.delete("/tags/:id", async (c) => {
  const userDO = getUserDO(c)
  const id = c.req.param("id")
  const res = await userDO.fetch(new Request(`http://do/tags/${id}`, { method: "DELETE" }))
  if (!res.ok) return c.json({ error: "Not found" }, 404)
  return c.body(null, 204)
})

// Tagged NFTs
userRoutes.get("/tagged", async (c) => {
  const userDO = getUserDO(c)
  const res = await userDO.fetch(new Request("http://do/tagged"))
  return c.json(await res.json())
})

userRoutes.put("/tagged/:tagId", async (c) => {
  const userDO = getUserDO(c)
  const tagId = c.req.param("tagId")
  const body = await c.req.json()
  await userDO.fetch(
    new Request(`http://do/tagged/${tagId}`, {
      method: "PUT",
      body: JSON.stringify(body),
    })
  )
  return c.body(null, 204)
})

userRoutes.delete("/tagged/:tagId", async (c) => {
  const userDO = getUserDO(c)
  const tagId = c.req.param("tagId")
  const body = await c.req.json()
  await userDO.fetch(
    new Request(`http://do/tagged/${tagId}`, {
      method: "DELETE",
      body: JSON.stringify(body),
    })
  )
  return c.body(null, 204)
})

// Starred
userRoutes.get("/starred", async (c) => {
  const userDO = getUserDO(c)
  const res = await userDO.fetch(new Request("http://do/starred"))
  return c.json(await res.json())
})

userRoutes.put("/starred", async (c) => {
  const userDO = getUserDO(c)
  const body = await c.req.json()
  await userDO.fetch(
    new Request("http://do/starred", {
      method: "PUT",
      body: JSON.stringify(body),
    })
  )
  return c.body(null, 204)
})

userRoutes.delete("/starred", async (c) => {
  const userDO = getUserDO(c)
  const body = await c.req.json()
  await userDO.fetch(
    new Request("http://do/starred", {
      method: "DELETE",
      body: JSON.stringify(body),
    })
  )
  return c.body(null, 204)
})

// Preferences
userRoutes.get("/preferences", async (c) => {
  const userDO = getUserDO(c)
  const context = c.req.query("context") ?? "defaults"
  const res = await userDO.fetch(new Request(`http://do/preferences?context=${context}`))
  return c.json(await res.json())
})

userRoutes.put("/preferences", async (c) => {
  const userDO = getUserDO(c)
  const context = c.req.query("context") ?? "defaults"
  const body = await c.req.json()
  await userDO.fetch(
    new Request(`http://do/preferences?context=${context}`, {
      method: "PUT",
      body: JSON.stringify(body),
    })
  )
  return c.body(null, 204)
})

// Custom order
userRoutes.get("/order/:context", async (c) => {
  const userDO = getUserDO(c)
  const context = c.req.param("context")
  const res = await userDO.fetch(new Request(`http://do/order/${context}`))
  return c.json(await res.json())
})

userRoutes.put("/order/:context", async (c) => {
  const userDO = getUserDO(c)
  const context = c.req.param("context")
  const body = await c.req.json()
  await userDO.fetch(
    new Request(`http://do/order/${context}`, {
      method: "PUT",
      body: JSON.stringify(body),
    })
  )
  return c.body(null, 204)
})

// Collage sizes
userRoutes.get("/sizes/:context", async (c) => {
  const userDO = getUserDO(c)
  const context = c.req.param("context")
  const res = await userDO.fetch(new Request(`http://do/sizes/${context}`))
  return c.json(await res.json())
})

userRoutes.put("/sizes/:context", async (c) => {
  const userDO = getUserDO(c)
  const context = c.req.param("context")
  const body = await c.req.json()
  await userDO.fetch(
    new Request(`http://do/sizes/${context}`, {
      method: "PUT",
      body: JSON.stringify(body),
    })
  )
  return c.body(null, 204)
})

// Collage layout
userRoutes.get("/layout/:context", async (c) => {
  const userDO = getUserDO(c)
  const context = c.req.param("context")
  const res = await userDO.fetch(new Request(`http://do/layout/${context}`))
  return c.json(await res.json())
})

userRoutes.put("/layout/:context", async (c) => {
  const userDO = getUserDO(c)
  const context = c.req.param("context")
  const body = await c.req.json()
  await userDO.fetch(
    new Request(`http://do/layout/${context}`, {
      method: "PUT",
      body: JSON.stringify(body),
    })
  )
  return c.body(null, 204)
})

// Wallets
userRoutes.get("/wallets", async (c) => {
  const userDO = getUserDO(c)
  const res = await userDO.fetch(new Request("http://do/wallets"))
  return c.json(await res.json())
})

userRoutes.post("/wallets", async (c) => {
  const userDO = getUserDO(c)
  const body = await c.req.json()
  const res = await userDO.fetch(
    new Request("http://do/wallets", {
      method: "POST",
      body: JSON.stringify(body),
    })
  )
  return c.json(await res.json())
})

userRoutes.delete("/wallets/:publicKey", async (c) => {
  const userDO = getUserDO(c)
  const publicKey = c.req.param("publicKey")
  const res = await userDO.fetch(new Request(`http://do/wallets/${publicKey}`, { method: "DELETE" }))
  if (!res.ok) return c.json({ error: "Not found" }, 404)
  return c.body(null, 204)
})

// Dandies
userRoutes.get("/dandies", async (c) => {
  const userDO = getUserDO(c)
  const res = await userDO.fetch(new Request("http://do/dandies"))
  return c.json(await res.json())
})

userRoutes.put("/dandies", async (c) => {
  const userDO = getUserDO(c)
  const body = await c.req.json()
  await userDO.fetch(
    new Request("http://do/dandies", {
      method: "PUT",
      body: JSON.stringify(body),
    })
  )
  return c.body(null, 204)
})
