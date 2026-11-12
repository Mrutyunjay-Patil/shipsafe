export type Env = {
  DB: D1Database
  PHOTOS: R2Bucket
  ASSETS: Fetcher
  PAYPAL_BASE: string
  PAYPAL_WEB: string
  VISION_MODEL: string
  LOGIN_REDIRECT_URI?: string
  // secrets
  PAYPAL_CLIENT_ID: string
  PAYPAL_CLIENT_SECRET: string
  PAYPAL_WEBHOOK_ID: string
  ANTHROPIC_API_KEY: string
  SESSION_SECRET: string
}

export type Vars = { sellerId: string }
export type AppEnv = { Bindings: Env; Variables: Vars }

export const newId = (prefix: string) =>
  `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`
