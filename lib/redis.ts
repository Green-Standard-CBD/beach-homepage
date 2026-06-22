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

/**
 * 固定ウィンドウ方式のレート制限。key単位でカウントし、上限を超えたらfalseを返す。
 * 戻り値: 許可された場合true、上限超過の場合false
 */
export async function checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const fullKey = `ratelimit:${key}`
  const count = await redis.incr(fullKey)
  if (count === 1) {
    await redis.expire(fullKey, windowSeconds)
  }
  return count <= limit
}

/** Vercel/Next.jsでのクライアントIP取得（x-forwarded-forの先頭） */
export function getClientIp(req: { headers: { get(name: string): string | null } }): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return 'unknown'
}
