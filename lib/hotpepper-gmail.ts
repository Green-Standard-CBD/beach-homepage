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

// 店のメニュー基準によるブロック時間（Hotpepperの施術時間目安は使わない）
function getShopBlockMinutes(menuSection: string): number {
  const t = menuSection
  // 複合メニュー（長い順に判定）
  if (/縮毛矯正|ストレートパーマ/.test(t) && /カラー|マニキュア|ヘナ|白髪/.test(t)) return 420
  if (/デジタルパーマ|デジパー/.test(t) && /カラー|マニキュア|ヘナ|白髪/.test(t)) return 390
  if (/パーマ/.test(t) && /カラー|マニキュア|ヘナ|白髪/.test(t)) return 330
  if (/縮毛矯正|ストレートパーマ/.test(t)) return 330
  if (/デジタルパーマ|デジパー/.test(t)) return 300
  if (/パーマ/.test(t)) return 240
  if (/カラー|ヘアマニキュア|マニキュア|ヘナ|白髪染め|白髪カラー/.test(t)) return 210 // カットも含むと判断
  if (/ヘッドスパ|スカルプスパ/.test(t)) return 120
  if (/トリートメント/.test(t)) return 120
  return 90 // カットのみ or 不明
}

// メニューセクションから実際のサービス名を抽出してわかりやすい名前を組み立てる
function extractMenuName(menuSection: string): string {
  const services: string[] = []

  // カットの判定（カット別=カット有り・シャンプーブロー込み=カット有り・カット明記）
  const impliesKatto = /カット|シャンプー.*ブロー|ブロー.*シャンプー/.test(menuSection)
  if (impliesKatto) services.push('カット')

  // カラー系（優先度順）
  if (/ヘアマニキュア|マニキュア/.test(menuSection)) services.push('ヘアマニキュア')
  else if (/ヘナ/.test(menuSection)) services.push('ヘナカラー')
  else if (/白髪染め|白髪カラー/.test(menuSection)) services.push('白髪染め')
  else if (/カラーリング|カラー/.test(menuSection)) services.push('カラー')

  // パーマ系（優先度順）
  if (/デジタルパーマ|デジパー/.test(menuSection)) services.push('デジタルパーマ')
  else if (/縮毛矯正/.test(menuSection)) services.push('縮毛矯正')
  else if (/ストレートパーマ/.test(menuSection)) services.push('ストレートパーマ')
  else if (/パーマ/.test(menuSection)) services.push('パーマ')

  // その他
  if (/ヘッドスパ|スカルプスパ/.test(menuSection)) services.push('ヘッドスパ')
  if (/トリートメント/.test(menuSection)) services.push('トリートメント')

  if (services.length > 0) return services.join('＋')

  // フォールバック：最初の意味のある行を使う
  return menuSection.split('\n')
    .map(l => l.trim())
    .find(l => l && !l.startsWith('（') && !l.match(/^\d|^[¥￥]/))
    ?? 'メニュー不明'
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
  const stylistRaw = body.match(/■スタイリスト\s*\n\s*([^\n]+)/)?.[1]?.trim() ?? ''
  const amountRaw = body.match(/お支払い予定金額\s*(\d[\d,]+)円/)?.[1]

  if (!reservationId || !guestName || !dateRaw) return null

  const parsed = parseDate(dateRaw)
  if (!parsed) return null

  // ■メニューセクション全体を取得（次の■まで）
  const menuSectionMatch = body.match(/■メニュー\s*\n([\s\S]*?)(?=\n■)/)
  const menuSection = menuSectionMatch?.[1] ?? ''

  const menuName = extractMenuName(menuSection)
  const blockMinutes = getShopBlockMinutes(menuSection)

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
