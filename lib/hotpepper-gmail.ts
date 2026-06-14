import { google } from 'googleapis'

function getGmailClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    'http://localhost:8080/'
  )
  oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
  })
  return google.gmail({ version: 'v1', auth: oauth2Client })
}

export type HotpepperEmail = {
  gmailId: string
  type: 'new' | 'cancel'
  reservationId: string
  guestName: string
  date: string   // YYYY-MM-DD
  time: string   // HH:MM
  menuName: string
  blockMinutes: number
  stylistId: string | null
  amount: number | null
}

function parseDuration(text: string): number {
  const hours = text.match(/(\d+)時間/)
  const mins = text.match(/(\d+)分/)
  return (hours ? parseInt(hours[1]) * 60 : 0) + (mins ? parseInt(mins[1]) : 0)
}

function parseDate(text: string): { date: string; time: string } | null {
  const m = text.match(/(\d{4})年(\d{2})月(\d{2})日.*?(\d{2}):(\d{2})/)
  if (!m) return null
  return {
    date: `${m[1]}-${m[2]}-${m[3]}`,
    time: `${m[4]}:${m[5]}`,
  }
}

function parseEmail(body: string): Omit<HotpepperEmail, 'gmailId'> | null {
  const isCancel = body.includes('ご予約のキャンセルがありました')
  const type: 'new' | 'cancel' = isCancel ? 'cancel' : 'new'

  const reservationId = body.match(/■予約番号\s*\n\s*(\S+)/)?.[1]
  const guestRaw = body.match(/■氏名\s*\n\s*([^\n（]+)/)?.[1]?.trim()
  const guestName = guestRaw?.replace(/（.*）/, '').trim() ?? ''
  const dateRaw = body.match(/■来店日時\s*\n\s*([^\n]+)/)?.[1]?.trim() ?? ''
  const menuName = body.match(/■メニュー\s*\n\s*([^\n]+)/)?.[1]?.trim() ?? ''
  const durationRaw = body.match(/施術時間目安：([^\)）]+)/)?.[1]?.trim() ?? ''
  const stylistRaw = body.match(/■スタイリスト\s*\n\s*([^\n]+)/)?.[1]?.trim() ?? ''
  const amountRaw = body.match(/お支払い予定金額\s*(\d[\d,]+)円/)?.[1]

  if (!reservationId || !guestName || !dateRaw) return null

  const parsed = parseDate(dateRaw)
  if (!parsed) return null

  const blockMinutes = parseDuration(durationRaw) || 60
  const stylistId = stylistRaw.includes('藤野') ? 'fujino' : null
  const amount = amountRaw ? parseInt(amountRaw.replace(/,/g, '')) : null

  return {
    type,
    reservationId,
    guestName,
    date: parsed.date,
    time: parsed.time,
    menuName,
    blockMinutes,
    stylistId,
    amount,
  }
}

export async function fetchHotpepperEmails(since?: Date): Promise<HotpepperEmail[]> {
  const gmail = getGmailClient()

  const afterDate = since
    ? Math.floor(since.getTime() / 1000)
    : Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 7 // 直近7日

  const res = await gmail.users.messages.list({
    userId: 'me',
    q: `from:yoyaku_system@salonboard.com after:${afterDate}`,
    maxResults: 50,
  })

  const messages = res.data.messages ?? []
  const results: HotpepperEmail[] = []

  for (const msg of messages) {
    const detail = await gmail.users.messages.get({
      userId: 'me',
      id: msg.id!,
      format: 'full',
    })

    const payload = detail.data.payload
    let body = ''

    if (payload?.body?.data) {
      body = Buffer.from(payload.body.data, 'base64').toString('utf-8')
    } else if (payload?.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          body = Buffer.from(part.body.data, 'base64').toString('utf-8')
          break
        }
      }
    }

    const parsed = parseEmail(body)
    if (parsed) {
      results.push({ gmailId: msg.id!, ...parsed })
    }
  }

  return results
}
