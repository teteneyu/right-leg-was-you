# テストプレイ共有手順

## 同じWi-Fiで遊ぶ

1. ホストPCで起動します。

```powershell
npm.cmd run start:share
```

2. 表示された `Same Wi-Fi / LAN` のURLを友人に送ります。

例:

```text
http://192.168.0.15:4000/
```

3. 1人が部屋を作り、表示された4文字の参加コードを通話で伝えます。

友人が開けない場合は、Windows Defender ファイアウォールで Node.js のプライベートネットワーク通信を許可してください。同じWi-Fiにいない友人は、このLAN URLでは参加できません。

## 遠隔の友人と遊ぶ

遠隔テストには公開URLが必要です。すぐ試す場合は Cloudflare Quick Tunnel を使います。

```powershell
npm.cmd run start:remote
```

ターミナルに `https://....trycloudflare.com` のURLが出たら、それを友人に送ってください。1人が部屋を作り、4文字の参加コードを通話で共有します。

このコマンドは初回に `cloudflared` を一時取得して実行します。終了すると公開URLも閉じます。

ホストPCを起動しなくても遊べる常設URLにしたい場合は、[常設公開手順](./always-on-hosting.md) を使ってRenderなどのWeb Serviceにデプロイします。

もしCloudflareの一時トンネルが使えない場合は、localtunnelのフォールバックもあります。

```powershell
npm.cmd run build
npm.cmd run start
npm.cmd run tunnel:localtunnel
```

### Renderで常設URLを作る

より安定して遊ぶ場合はRenderにデプロイします。現状は `render.yaml` を用意済みなので、Renderにデプロイすればブラウザだけで参加できます。

- Build Command: `npm install && npm run build`
- Start Command: `npm run start`
- Node: `24`

無料プランでは初回アクセス時にスリープ解除で少し待つ可能性があります。

## 開発モードで共有する場合

フロントをViteの `5173` で開いた場合でも、LANのホスト名に合わせてSocket.IOの接続先を自動で `:4000` にします。

```powershell
npm.cmd run dev
```

友人には次のように `5173` のURLを送ります。

```text
http://<ホストPCのLAN IP>:5173/
```
