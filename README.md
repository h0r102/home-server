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

## デプロイ（Windows mini PC + Docker + Cloudflare Tunnel）

前提: Windows mini PCにDocker Desktop（またはWSL2 + Docker）がインストール済みであること。

### 1. リポジトリを配置し `.env` を設定する

```bash
git clone <このリポジトリのURL>
cd home-server
cp .env.example .env
```

`.env` を編集し、以下を必ず設定する。

- `JWT_SECRET`: `openssl rand -hex 32` 等で生成したランダム値
- `SWITCHBOT_TOKEN` / `SWITCHBOT_SECRET`: 上記の手順で取得したもの
- `INITIAL_ADMIN_USERNAME` / `INITIAL_ADMIN_PASSWORD`: 初回起動時に作成される管理者アカウント
- `WEBAUTHN_RP_ID` / `WEBAUTHN_ORIGIN`: 実際に使う独自ドメイン（例: `home.example.com` / `https://home.example.com`）。ここが実際のアクセスURLと一致していないとFace IDが動作しない
- `CLOUDFLARE_TUNNEL_TOKEN`: 次の手順で取得する

### 2. Cloudflare Tunnelを設定する

1. [Cloudflare Zero Trustダッシュボード](https://one.dash.cloudflare.com/) → **Networks > Tunnels** → **Create a tunnel** を選択
2. トンネル名を入力して作成し、表示される「Install and run a connector」のトークン（`--token` の後ろの文字列）をコピーして `.env` の `CLOUDFLARE_TUNNEL_TOKEN` に設定する
3. 同じ画面の **Public Hostname** タブで、使いたい独自ドメイン（例: `home.example.com`）を追加し、Service欄に `http://app:3000` を指定する
   （`app` は `docker-compose.yml` 内のサービス名。ポート開放は不要）

### 3. 起動する

```bash
docker compose up -d --build
```

初回起動時に自動でDBマイグレーションが適用され、管理者アカウントが作成される。`docker compose logs -f app` でログを確認できる。

### 4. 動作確認

- 独自ドメイン（例: `https://home.example.com`）にアクセスしてログイン画面が表示されること
- （LAN内であれば）`http://<ミニPCのIP>:3000` でも直接アクセス可能
- `http://<ミニPCのIP>:3000/api/health` が `{"status":"ok"}` を返すこと

### 再起動・更新

ミニPCの再起動時は `restart: unless-stopped` により `app` / `cloudflared` とも自動的に起動する。コード更新時は以下で反映する。

```bash
git pull
docker compose up -d --build
```

## 制約・既知の注意点

- 「その他(Others)」タイプのSwitchBotリモコンはSwitchBot APIがボタン名一覧を公開しないため、初期リリースでは対応していない（エアコン・温湿度センサーのみ対応）
- 温湿度センサーの履歴データは180日を超えると自動的に削除される（監査ログは無期限保存）
