# ホームポータル

SwitchBot Hub Mini経由でエアコン・温湿度センサーを操作/閲覧し、家族で共有リストを使える、自宅サーバー上で動くWebアプリ（PWA対応）。

## セットアップ（開発）

```bash
npm install
cp .env.example .env
# .env の JWT_SECRET, INITIAL_ADMIN_USERNAME, INITIAL_ADMIN_PASSWORD を編集
npx prisma migrate deploy
npm run dev
```

初回起動時、管理者ユーザーが1人も存在しない場合に限り `.env` の `INITIAL_ADMIN_USERNAME` / `INITIAL_ADMIN_PASSWORD` で管理者アカウントが自動作成される。2人目以降のユーザーは管理画面（`/admin`）から追加する。

## SwitchBotトークンの取得

SwitchBotアプリ → プロフィール → 設定 → アプリバージョンを10回タップ → 開発者向けオプション → Get Token で `SWITCHBOT_TOKEN` / `SWITCHBOT_SECRET` を取得し `.env` に設定する。

## デプロイ

Windows mini PC上でDocker（Docker DesktopまたはWSL2）＋Cloudflare Tunnelで運用する（`docker-compose.yml`は実装計画のE9で追加予定）。
