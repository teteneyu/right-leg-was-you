# 右足お前かよ

友人と通話しながら遊ぶ、リアルタイム協力ボス戦バカゲーのMVPです。  
全員で1体の段ボール工作ロボを操作し、暴走掃除機ボス「スイトルンバMk.0」を倒します。

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/teteneyu/right-leg-was-you)

## 現在の実装

- React + Vite + Canvas 2D のクライアント
- Node.js + Express + Socket.IO のサーバー
- Socket.IO Rooms による部屋作成・参加コード
- 1〜4人の担当割り当て。1人プレイ時は全パーツ担当
- サーバー権威型のロボット/ボス状態更新
- ボス行動: 吸い込み、突進、ゴミ噴射、弱点露出
- 勝敗: ボスHP0、ロボHP0、時間切れ
- リザルトと事故ログ
- 採用済み画像素材によるロボ/ボス表示
- ボス行動ごとの大きな操作指示
- 自分が操作できるパーツの青い囲み表示
- ロボHPとダウン状態。転倒しても即終了せず、一定時間無防備になる
- W入力による歩行と距離要素。近いほど弱点攻撃のダメージが大きい
- Space短押しで前方突き、長押しで背中側へ360度回転チャージ。離すと前方まで回り切ってから攻撃判定
- 両足担当がWを入れるとジャンプ。傾いたまま跳ぶと飛ぶ方向も流れる
- A/Dは全員共通の顔パーツ操作。首の根元を起点に顔が傾き、姿勢補正中だと分かる
- リザルトでMVPとスコアを表示
- ロボ被弾時の赤フラッシュと被弾SE
- BGM: `Enemy battle.ogg`

## 採用したビジュアル方針

- `assets/concepts/cardboard-robot-design.png` の段ボール工作ロボを採用
- `assets/concepts/vacuum-boss-design.png` の暴走掃除機ボスを採用
- `assets/concepts/gameplay-mockup.png` の工作UI/HUD方向を採用
- `assets/concepts/main-visual.png` は仮置き。正式メインビジュアルは後で差し替え予定

## ローカル起動

```bash
npm install
npm run dev
```

起動後:

- クライアント: http://localhost:5173
- サーバー: http://localhost:4000
- ヘルスチェック: http://localhost:4000/health

2つ以上のブラウザタブを開き、片方で部屋作成、もう片方で参加コード入力をすると同期確認できます。

## 操作

担当部位によって意味が少し変わります。

| キー | 足担当 | 腕担当 |
|---|---|---|
| W | 足を上げる、歩く。両足ならジャンプ | 腕を上げる |
| A / D | 傾きを左/右へ戻す | 傾きを左/右へ戻す |
| S | 踏ん張る | ガード |
| Space | 短押し突き。長押し回転キック | 短押し突き。長押し回転パンチ |

ゲーム中は画面中央に「今起きていること」と「押すべきキー」が表示されます。  
自分が操作できるパーツは青い点線で囲まれます。左右表記はロボ基準ではなく画面基準です。
ダウン中はSpaceを押し直す連打で早く起き上がれます。

## 音素材

- BGM: `assets/bgm/Enemy battle.ogg` を `apps/client/public/assets/audio/bgm/enemy-battle.ogg` として使用
- SE: OtoLogicの以下を使用
  - `Motion-Slam06.mp3`: 攻撃命中
  - `Vacuum_Cleaner04.mp3`: 吸い込み
  - `Warning-Siren05.mp3`: ボス予兆
  - `Hit-Punch02.mp3`: ロボ被弾
  - `Victory.mp3`: 勝利

```text
効果音: OtoLogic (https://otologic.jp/)
ライセンス: CC BY 4.0
```

## 開発コマンド

```bash
npm run build
npm run start
```

Windows PowerShellで `npm` が実行ポリシーに止められる場合は、以下のように `npm.cmd` を使ってください。

```powershell
npm.cmd install
npm.cmd run dev
```

## Renderデプロイ

`render.yaml` を使う想定です。

- Build Command: `npm ci --include=dev && npm run build`
- Start Command: `npm run start`
- Node: 24
- Health Check: `/health`

無料枠では初回アクセス時にスリープ復帰で時間がかかる可能性があります。ホストPC不要でいつでもすぐ遊べる状態にする場合は、`render.always-on.yaml` を参考にStarter以上の有料Web Serviceへ切り替えます。

デプロイ前チェック:

```bash
npm run deploy:check
```

詳しくは `docs/always-on-hosting.md` を参照してください。
