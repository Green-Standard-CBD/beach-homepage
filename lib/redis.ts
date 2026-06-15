import { Redis } from '@upstash/redis'

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const HP_SYNC_KEY = 'hp_last_sync_ts'
const SYNC_INTERVAL_MS = 25 * 60 * 1000  // 25分

export async function shouldRunHpSync(): Promise<boolean> {
  const last = await redis.get<number>(HP_SYNC_KEY)
  if (!last) return true
  return Date.now() - last > SYNC_INTERVAL_MS
}

export async function markHpSyncDone(): Promise<void> {
  await redis.set(HP_SYNC_KEY, Date.now(), { ex: 3600 })
}
