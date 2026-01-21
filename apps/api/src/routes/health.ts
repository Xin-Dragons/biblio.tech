import { Hono } from "hono"
import type { HonoEnv } from "../types"

export const healthRoutes = new Hono<HonoEnv>()

healthRoutes.get("/", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT,
  })
})
