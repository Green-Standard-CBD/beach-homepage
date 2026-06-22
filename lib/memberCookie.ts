import { createHmac, timingSafeEqual } from 'crypto'

export type MemberCookiePayload = Record<string, unknown>

// 専用シークレット未設定時はSUPABASE_SERVICE_ROLE_KEYを流用する（必ず設定済みのため即時に保護を有効化できる）。
// 本番では専用のHP_MEMBER_COOKIE_SECRETを別途発行・設定することを推奨。
function getSecret(): string {
  const secret = process.env.HP_MEMBER_COOKIE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) throw new Error('cookie signing secret not configured')
  return secret
}

function sign(b64: string): string {
  return createHmac('sha256', getSecret()).update(b64).digest('base64url')
}

/** 会員セッションcookieの値を生成する（base64url(JSON) + "." + HMAC署名） */
export function signMemberCookie(payload: MemberCookiePayload): string {
  const b64 = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${b64}.${sign(b64)}`
}

/** cookie値を検証し、改ざんがなければpayloadを返す。署名不一致・形式不正ならnull */
export function verifyMemberCookie(raw: string | undefined | null): MemberCookiePayload | null {
  if (!raw) return null
  const dotIndex = raw.lastIndexOf('.')
  if (dotIndex === -1) return null
  const b64 = raw.slice(0, dotIndex)
  const sig = raw.slice(dotIndex + 1)
  if (!b64 || !sig) return null

  let expected: Buffer
  let actual: Buffer
  try {
    expected = Buffer.from(sign(b64))
    actual = Buffer.from(sig)
  } catch {
    return null
  }
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null

  try {
    const payload = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8'))
    return payload && typeof payload === 'object' ? payload : null
  } catch {
    return null
  }
}

/** hp_memberクッキーを検証し、本人のmember idを返す（改ざん・未ログイン時はnull） */
export function getMemberIdFromRequest(req: { cookies: { get(name: string): { value: string } | undefined } }): string | null {
  const raw = req.cookies.get('hp_member')?.value
  const data = verifyMemberCookie(raw)
  return typeof data?.id === 'string' ? data.id : null
}
