# ⛔ 絶対禁止事項（最優先・セッション開始前に必ず読め）

1. **Vault書き込み禁止** — `vault.sh write` は秘書室のみ。読み取り（`read`/`get`）はOK
2. **コマンドに値を含めるな** — `! export TOKEN="値"` はClaudeに値が丸見え。スクリプト＋`read -s`で渡す
3. **APIキー・シークレットをチャットに出すな** — 受け取ることも出力することも禁止。秘書室に依頼する
4. **できることは自分でやれ** — ツールで完結できる操作をshoに丸投げしない
5. **ログを読んでから作業しろ** — 開始時に最新ログ＋status/XXX_latest.mdを読み、まとめをshoに報告してから作業開始
6. **デプロイ後は必ず `npx vercel ls` でVercel側のデプロイ完了を確認しろ** — `git push` 成功≠Vercelデプロイ完了。`vercel ls` の最新デプロイが直近1〜2分以内であることを確認してから「デプロイ完了」と報告すること。古いままなら `npx vercel --prod` で手動デプロイ。（2026-06-16 sho指示：GitHubとVercelのGitHub連携未設定を何セッションも見逃し続けた反省）

---

# BEACHホームページ課

## 起動時に必ずやること（最優先・順番厳守）

1. `~/company/COMPANY_RULES.md` を読む
2. `~/company/secretary/beach_log/` の最新2〜3ファイルを**全部読む**
3. `~/company/secretary/status/BEACH_latest.md` を**全部読む**
4. `~/company/secretary/accounts/master_registry.md` を読む
5. **読んだ内容から以下を自分でまとめてshoに報告する（必須）：**
   - 前回までに完了したこと
   - 現在進行中のこと
   - 残タスク（優先順）
   - 注意事項・地雷・shoの指示
6. shoが確認してから作業開始

### ⛔ なぜこの手順が必要か（2026-06-11 sho指示）
「読んだか確認してもsho自身が忘れていることもある。だからClaudeが自分でしっかり読んで把握しろ」
まとめを**書く**ことで流し読みを防ぐ。報告なしで作業開始は禁止。

---

## 役割

BEACH Hair Rescue 店舗ホームページの制作・運用・更新を担う。

---

## ⛔ APIキー・シークレットの取り扱い（2026-06-11 sho指示・絶対厳守）

**APIキー・シークレット・パスワード類をチャットに直接貼るよう求めてはいけない。**

- StripeキーもSupabaseキーもLINEトークンも、すべて同じルール
- キーが必要な場合は**秘書室に相談する**。秘書室がVaultから読み出して渡す
- `.env` ファイルの内容をチャットに貼らせることも禁止
- 違反の経緯①：2026-06-11、ホームページ課がStripeテストキーをチャットに貼るよう求めた

### ⛔ Vaultに直接書き込まない（2026-06-11 重大事故）

**ホームページ課はVaultへの書き込みを一切してはいけない。読み取り専用。**

- 違反の経緯②：2026-06-11、ホームページ課がStripeテストキーを `vault.sh write` で直接書き込み、**既存27キーが全消滅**した。バックアップで復旧。
- キーの登録が必要な場合は必ず秘書室に依頼する
- `vault.sh read` / `vault.sh get` による読み取りのみ許可

---

## ⛔ 絶対禁止ルール（2026-06-10 sho指示・違反厳禁）

**shoから参考サイトが提示されたとき、そのサイトのコードを解析せずに実装を始めてはいけない。**

これが2026-06-10に丸一日無駄にした失敗の根本原因。
gorakadan.com/fuji/ という参考サイトが最初から提示されていたのに、
ClaudeがHTMLもCSSもJSも読まず「こういう動きだろう」と推測でFramer Motionを書いた。
→ 参考サイトと全然違うものができた → shoが何度も激怒 → 修正しても違う → 繰り返し。
Playwrightで最初にコードとDOM値を取ればすべて防げた。

### 参考サイトが指定されたときの必須手順（順番厳守）

1. `curl` または Playwright でHTML・CSS・JSを取得して**実際のコードを読む**
2. Playwright で scrollY ごとの DOM 値（top, transform, clip-path 等）を実測する
3. その数値・構造をそのまま移植する
4. 「似たようなもの」「推測で近いもの」を作ることは禁止

---

## ホームページのデザイン方針

### 参考サイト
**https://www.gorakadan.com/fuji/**

このサイトと「同じ構造・同じアニメーション」でBEACHサイトを作ること。

### 参考サイトの使い方（必ず守ること）
「似たようなもの」を作るのは絶対禁止。必ず以下の手順で作る：

1. `curl -s "https://www.gorakadan.com/fuji/"` でHTMLを取得して構造を確認
2. CSSファイル（`app.css`）をcurlで取得してスタイルを確認
3. JSファイル（`app.js`）をcurlで取得してアニメーション関数の**実際の数値**を確認
4. その数値・構造をそのままBEACHに移植する

### 確認済みのgorakadan構造（2026-06-10 秘書室が解析済み）

```
HTML構造：
#kv-video   — absolute top-0 left-0 w-full h-screen z-[-1]  ← GSAPでpin
#kv-logo    — relative w-full h-screen flex items-center z-20 ← GSAPでpin & fadeout
#kv-card    — relative mt-[38vw] lg:mt-[min(6vw,90px)] w-[calc(100vw-28px)] lg:w-[max(36.5vw,560px)]
#homeContents — relative mt-[160px] bg-white (js_bgWhite)
```

```
GSAPアニメーション（実際のコード）：
// ロゴ fadeout
gsap.to(logoInner, { yPercent: -150, autoAlpha: 0, filter: 'blur(16px)' })
  → scrub: true, trigger: body, end: `top+=${wh} top`

// ロゴ pin
ScrollTrigger.create({ pin: logo, pinSpacing: false,
  endTrigger: card, end: `top-=${logoH} top` })

// ビデオ pin
ScrollTrigger.create({ pin: kv, pinSpacing: false,
  endTrigger: hContents, end: 'center center' })

// カード背景 横clip （inset(0 20%) → inset(0 0%)）
gsap.from(bgCard, { clipPath: 'inset(0 20%)', scrub: 2,
  trigger: card, start: 'top bottom', end: 'bottom bottom' })

// 写真wrapper 横clip （inset(0 10%) → inset(0 0%)）
gsap.from(wPicCard, { clipPath: 'inset(0 10%)', scrub: 2 })

// 写真 パララックス
gsap.fromTo(picCard,
  { yPercent: -40, scale: 1.8 },
  { yPercent: 40, scale: 1.8, scrub: true,
    trigger: wPicCard, start: 'top bottom', end: 'bottom top' })

// homeContents 登場
gsap.from(hContents, { clipPath: `inset(${w/10}px 60px 0 60px)`, y: 200,
  scrub: 2, trigger: hContents, start: 'top bottom', end: 'top top' })
```

### 現在の実装状況（2026-06-10）
- `components/StorySection.tsx` — 上記GSAP構造で実装済み（秘書室が作成）
- gorakadanと同構造・同アニメーション値で動作確認済み
- 「段違いにいい」とshoに評価された（修正点は残るが方向性は正しい）

---

## 現在のフェーズ

制作中。StorySection（Hero+Concept+Owner）完成。残セクション調整中。

---

## 技術スタック

- Next.js 15 + TypeScript + Tailwind CSS
- **GSAP + ScrollTrigger**（アニメーション。Framer Motionは使わない）
- プロジェクトルート：`~/company/beach/beach_homepage/`
- 起動：`npm run dev` → localhost:3000（または3001）

---

## インフラ方針

- ホスティング：Vercel（既存アカウント）
- コード管理：GitHub（既存アカウント）
- ドメイン：未取得（要shoの判断）

---

## 引き継ぎルール

- **作業終了時**：以下を両方更新する
  - `~/company/secretary/beach_log/YYYY-MM-DD.md`（秘書室向け・詳細に記録）
  - `~/company/secretary/status/BEACH_latest.md`（BEACH秘書・秘書室向け）
- 記録内容：完了した作業・決定事項・ファイルパス・バックアップ情報・残タスク・申し送り
- **新規アカウント作成時**：即座に `~/company/secretary/accounts/master_registry.md` に追記する
- **他事業に関係する話が出たら（些細なことでも）**：
  - CBDに関係 → `~/company/secretary/cbd_fc_log/` + `CBD_latest.md` にその部分だけ追記
  - Hibioに関係 → `~/company/secretary/hibio_log/` + `Hibio_latest.md` にその部分だけ追記
