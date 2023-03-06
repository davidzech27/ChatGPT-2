import { WebhookClient } from "discord.js"
import { env } from "~/env.mjs"

export const webhookClient = new WebhookClient({ url: env.DISCORD_WEBHOOK_URL })
