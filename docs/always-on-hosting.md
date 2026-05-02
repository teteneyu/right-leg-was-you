# 常設公開手順

## 目的

ホストPCで `npm run start` やトンネルを起動しなくても、友人がいつでもURLを開いて遊べる状態にします。

このゲームはSocket.IOを使うリアルタイム通信ゲームなので、静的サイトではなくNode.jsのWeb Serviceとして公開します。

## 推奨構成

- Hosting: Render Web Service
- Region: Singapore
- Runtime: Node.js
- Build Command: `npm ci && npm run build`
- Start Command: `npm run start`
- Health Check Path: `/health`

## 無料で公開する場合

`render.yaml` を使います。

```yaml
plan: free
```

ホストPCを起動しなくてもURLから遊べます。ただし無料Web Serviceは無通信が続くとスリープし、次回アクセス時に起動待ちが発生します。

## いつでもすぐ遊べる状態にする場合

`render.always-on.yaml` の設定をRenderに反映します。

```yaml
plan: starter
```

これは有料インスタンス用です。スリープを避けたい場合はこちらを使います。課金が発生するため、Renderダッシュボードで料金を確認してから切り替えてください。

## デプロイ前チェック

```powershell
npm.cmd run deploy:check
```

確認するもの:

- TypeScriptビルド
- クライアントの配布ファイル
- サーバーの配布ファイル
- 主要な画像・音声アセット
- Render設定ファイル

## デプロイ手順

1. このプロジェクトをGitHubにpushします。
2. RenderでNew BlueprintまたはNew Web Serviceを作成します。
3. GitHubリポジトリを接続します。
4. 無料テストなら `render.yaml` を使います。
5. 常時起動にするなら `render.always-on.yaml` 相当の設定、またはRender画面でStarter以上の有料インスタンスを選びます。
6. デプロイ後、表示された `https://...onrender.com/` を友人に送ります。
7. 1人が部屋を作り、4文字の参加コードを通話で共有します。

## 注意

- 部屋情報はサーバーのメモリ上にあります。デプロイ・再起動・スリープ復帰で部屋は消えます。
- 長期的な戦績保存や常設ロビーを作る場合は、後でDBを追加します。
- WebSocketを使うため、Vercelなどの静的ホスティング単体には向きません。
