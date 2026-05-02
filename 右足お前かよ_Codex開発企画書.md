# 右足お前かよ

## Codex開発企画書 / Boss Battle Concept Brief

**制作方針:** 個人開発・無料枠運用を前提に、友人と通話しながら短時間で笑えるブラウザ協力パニックゲームを作る。  
**ゲーム方針:** 全員で1体の段ボール工作ロボを操作し、暴走掃除機ボスを倒す。  
**技術方針:** Render + Node.js + Socket.IO。クライアントは入力だけを送信し、サーバーがロボット状態とボス状態を authoritative に計算する。  
**想定プレイ人数:** 2〜4人。将来的に6人まで拡張可能。  
**1プレイ:** 30〜60秒。短時間で爆散し、即リトライできるテンポにする。  
**ビジュアル方針:** ゆるい段ボール工作ロボ。クソゲーではないが、見た瞬間に「ちゃんとしてなさそう」と分かるバカゲー感。

---

## 1. コンセプト

### 1.1 一言で言うと

全員で1体のポンコツ段ボール巨大ロボを操作し、暴走掃除機ボスの攻撃を避けたり受け止めたりしながら、パンチとキックで倒すリアルタイム協力ゲーム。

ただし、各プレイヤーは自分の担当部位しか操作できない。左足担当、右足担当、左腕担当、右腕担当がそれぞれ勝手に入力するため、真面目に戦っているのにロボットが転ぶ。

### 1.2 面白さの核

- 全員が協力しているつもりなのに、入力が噛み合わず事故る。
- 「踏ん張れ」「右腕でガード」「今キック」など、通話で指示が飛び交う。
- ボスの攻撃予兆に対して、全員が同じ理解をしていないと即ピンチになる。
- 失敗後のログで「誰が何をしたせいで吸い込まれたか」が分かり、反省会ではなく裁判が始まる。
- 段ボール工作ロボなので、強そうなのに弱い。壊れそうなのに意外と戦える。

### 1.3 目指す会話

```text
「吸い込み来る！ 足、踏ん張って！」
「俺の右？ ロボの右？」
「右腕ガード！」
「ごめんパンチ出た」
「今キック！ 今！」
「右足お前かよ」
```

---

## 2. MVP仕様

### 2.1 MVPの目的

ゲームとして笑えるかを最短で検証する。最初は派手な物理演算や大量ステージより、以下を優先する。

1. 2〜4人で同じ部屋に入れる
2. 部位ごとの担当割り当て
3. ボスの予兆、攻撃、弱点露出
4. ロボットの傾き、転倒、踏ん張り、攻撃
5. ボス撃破またはロボ転倒による終了
6. 終了後の事故ログ

### 2.2 最小プレイ仕様

| 項目 | 内容 |
|---|---|
| ジャンル | リアルタイム協力パニック / ボス戦バカゲー / ブラウザゲーム |
| 画面 | 2D横視点 / Canvas描画 |
| プレイ人数 | 2〜4人 |
| 1ゲーム | 30〜60秒 |
| 操作 | キーボード入力。各プレイヤーは1部位のみ操作 |
| 勝利条件 | 制限時間内に暴走掃除機ボスのHPを0にする |
| 敗北条件 | 転倒ゲージ100%、制限時間切れ、または大転倒イベント |
| 通信 | Socket.IO |
| サーバー | Node.js / Express / Render |
| DB | MVPでは不要。ルーム状態はメモリ管理 |

### 2.3 初期プレイヤー役割

| 役割 | 操作対象 | 基本操作 | ボス戦での意味 |
|---|---|---|---|
| Left Leg | 左足 | 上げる / 踏ん張る / キック | 移動、回避、左キック、吸い込み耐性 |
| Right Leg | 右足 | 上げる / 踏ん張る / キック | 移動、回避、右キック、吸い込み耐性 |
| Left Arm | 左腕 | 上げる / ガード / パンチ | 左パンチ、ゴミ噴射ガード、傾き補正 |
| Right Arm | 右腕 | 上げる / ガード / パンチ | 右パンチ、ゴミ噴射ガード、傾き補正 |

人数ごとの割り当て:

- 2人: 左半身担当、右半身担当。片方の足と腕をまとめて操作する。
- 3人: 左足、右足、両腕担当。
- 4人: 左足、右足、左腕、右腕。

---

## 3. 初回ボス: 暴走掃除機

### 3.1 キャラクター概要

名前案: **スイトルンバMk.0**

家庭用掃除機がなぜか巨大化し、部屋中の段ボール、ネジ、夢、責任を吸い込んで暴走している。丸い本体に無理やり目が貼ってあり、ホースが腕のように暴れる。怖さよりも「なんでこいつに負けてるんだ」という情けなさを重視する。

### 3.2 攻撃パターン

| 攻撃 | 予兆 | 対応 | 失敗時の事故 |
|---|---|---|---|
| 吸い込み | 掃除機の口が大きく開き、風エフェクトが出る | 足担当が左右同時に踏ん張る | ロボが前のめりになり、転倒ゲージ増加 |
| 突進 | 本体が後ろに下がってブルブル震える | 足担当が交互にステップして距離を取る | 胴体が押され、腕が暴発しやすくなる |
| ゴミ噴射 | ホースが上を向き、ゴミ袋が膨らむ | 腕担当がガード | 顔面にゴミが当たり、視界妨害と傾き増加 |
| 弱点露出 | 吸い込み後に紙パック型の弱点が開く | 姿勢を保ってパンチかキック | 攻撃が空振りし、反動で傾く |

### 3.3 ボス戦の流れ

```text
1. ボスが攻撃予兆を出す
2. プレイヤーが通話で対応を相談する
3. 部位担当がそれぞれ入力する
4. 成功すれば反撃チャンス
5. 失敗すれば転倒ゲージと事故ログが増える
6. ボスHP 0 で勝利、転倒ゲージ 100 または時間切れで敗北
```

### 3.4 難易度設計

最初のMVPでは、ボスAIは複雑にしない。一定間隔で攻撃候補を選び、HPが減るほど少しテンポを上げる。

- 序盤: 吸い込み、ゴミ噴射を中心に操作理解を促す
- 中盤: 突進を混ぜて足担当を忙しくする
- 終盤: 弱点露出の時間を短くし、全員の焦りを作る

---

## 4. ロボット操作と疑似物理

### 4.1 ロボット状態

サーバー側で以下の状態を持つ。

```ts
export type RobotState = {
  x: number;
  y: number;
  velocityX: number;
  bodyAngle: number;
  angularVelocity: number;
  balance: number;
  fallGauge: number;
  stunMs: number;
  parts: {
    leftLeg: PartState;
    rightLeg: PartState;
    leftArm: PartState;
    rightArm: PartState;
  };
};

export type PartState = {
  angle: number;
  power: number;
  action: 'idle' | 'lift' | 'brace' | 'attack' | 'guard';
  cooldownMs: number;
};
```

### 4.2 ボス状態

```ts
export type BossState = {
  hp: number;
  maxHp: number;
  phase: 'idle' | 'tell' | 'attack' | 'vulnerable' | 'defeated';
  currentMove?: 'suck' | 'charge' | 'trashShot' | 'weakPoint';
  phaseTimeMs: number;
  positionX: number;
};
```

### 4.3 入力モデル

クライアントは座標を送らない。送るのは担当部位の入力だけ。

```ts
export type PlayerInput = {
  roomId: string;
  playerId: string;
  role: RobotRole;
  seq: number;
  input: {
    up: boolean;
    down: boolean;
    action: boolean;
    guard: boolean;
    power?: number;
  };
  clientTime: number;
};
```

### 4.4 基本ルール

```text
左右の足が同時に踏ん張る → 吸い込みに耐える
片足だけ踏ん張る → 傾きが増える
左右の足が交互に出る → 位置調整や回避ができる
足のaction → キック。威力は高いが外すと大きく傾く
腕のaction → パンチ。弱点露出中に当たると安定してダメージ
腕のguard → ゴミ噴射を軽減し、傾きも少し戻す
傾きと逆方向の腕入力 → バランス回復
傾きと同方向の腕入力 → さらに傾く
```

### 4.5 転倒判定

転倒は一発即死ではなく、段階的に悪化させる。

```text
abs(bodyAngle) > 15度 → 警告
abs(bodyAngle) > 25度 → fallGauge増加
abs(bodyAngle) > 40度 → 大ピンチ
fallGauge >= 100 → 敗北
```

即死ではなくゲージ制にする理由:

- 「まだ戻せるかも」という叫びどころが生まれる。
- 腕担当が救える余地がある。
- 事故が笑いとして積み上がる。

---

## 5. 事故ログ

ゲーム中の重要イベントをサーバーで記録する。

```ts
export type GameLogEntry = {
  t: number;
  type: 'input' | 'boss' | 'warning' | 'damage' | 'fall' | 'goal' | 'system';
  playerId?: string;
  role?: RobotRole;
  message: string;
};
```

表示例:

```text
敗因ログ:
00:08 暴走掃除機が吸い込み開始
00:09 左足担当が踏ん張り、右足担当がキックを選択
00:10 ロボが前のめり 31度
00:12 右腕担当がガードのつもりでパンチ
00:13 ゴミ噴射が顔面に直撃
00:15 全員が「まだいける」と判断
00:16 転倒
```

ログは責めるためではなく、笑える裁判を起こすために使う。言い回しは少し人間くさく、ゲームが実況しているようにする。

---

## 6. リアルタイム同期設計

### 6.1 採用方針

**Render + Node.js + Socket.IO** を採用する。

理由:

- Node.jsで普通のWebSocket/Socket.IOサーバーを書ける。
- RenderはWebSocketを扱える。
- Socket.IOは低遅延・双方向・イベントベース通信に向いている。
- Socket.IO Roomsを使えば、部屋ごとにイベント配信できる。
- MVPではDBを使わず、メモリ上のRoomStateだけで成立する。

### 6.2 サーバー権威型

```text
Client:
  入力だけ送信

Server:
  入力を部屋ごとに集約
  固定tickでRobotStateとBossStateを更新
  最新GameStateを部屋の全員に配信

Client:
  受信したGameStateを補間して描画
```

### 6.3 ティックレート

| 処理 | MVP目標 |
|---|---:|
| クライアント描画 | 60fps |
| クライアント入力送信 | 10〜20Hz |
| サーバーゲーム更新 | 20Hz |
| サーバー状態配信 | 10〜20Hz |

通信は60fpsで送らない。描画はローカル補間で滑らかにする。

### 6.4 Socketイベント案

#### client → server

```ts
type ClientToServerEvents = {
  createRoom: (payload: { name: string }, cb: (res: CreateRoomResponse) => void) => void;
  joinRoom: (payload: { roomCode: string; name: string }, cb: (res: JoinRoomResponse) => void) => void;
  leaveRoom: () => void;
  ready: (payload: { ready: boolean }) => void;
  playerInput: (payload: PlayerInput) => void;
  startGame: () => void;
  restartGame: () => void;
};
```

#### server → client

```ts
type ServerToClientEvents = {
  roomState: (state: PublicRoomState) => void;
  gameState: (state: PublicGameState) => void;
  gameLog: (entries: GameLogEntry[]) => void;
  errorMessage: (message: string) => void;
};
```

### 6.5 RoomState

```ts
export type RoomState = {
  roomCode: string;
  phase: 'lobby' | 'playing' | 'finished';
  players: Record<string, PlayerState>;
  robot: RobotState;
  boss: BossState;
  inputs: Record<string, PlayerInput>;
  logs: GameLogEntry[];
  startedAt?: number;
  createdAt: number;
  lastActiveAt: number;
};
```

---

## 7. UI仕様

### 7.1 ロビー画面

必要要素:

- ゲームタイトル: 右足お前かよ
- 名前入力
- 部屋作成ボタン
- 参加コード入力
- 参加者一覧
- 自分の担当部位表示
- Readyボタン
- Startボタン。ホストのみ表示

### 7.2 ゲーム画面

必要要素:

- 段ボール工作ロボ
- 暴走掃除機ボス
- ボスHP
- 残り時間
- 自分の担当部位
- 現在のボス予兆
- 操作説明
- 転倒ゲージ
- 胴体傾きメーター
- 簡易事故ログ

画面は情報を詰め込みすぎない。通話しながら遊ぶ前提なので、プレイヤーが見るべきものは「自分の担当」「ボス予兆」「転倒ゲージ」「HP」に絞る。

### 7.3 リザルト画面

必要要素:

- 勝利 / 敗北
- ボス残HPまたは撃破タイム
- 最大傾き
- 最も危なかった瞬間
- 事故ログ
- 「もう一回」ボタン
- 「ロビーに戻る」ボタン

---

## 8. ビジュアルコンセプト

### 8.1 全体方針

- 段ボール、ガムテープ、油性ペン、紙皿、割りピン、輪ゴムで作ったような世界観。
- キャラクターは弱そうで親しみやすい。
- 色は茶色一色に寄せすぎず、赤いガムテープ、青い落書き、黄色い注意シールなどを差し色に使う。
- UIは読みやすく、工作ノートや自由研究のラベルのような雰囲気にする。
- 写実ではなく、2Dゲームに落とし込みやすいイラスト調。

### 8.2 主人公ロボ

- 段ボール箱を胴体にした巨大ロボ。
- 腕と足は筒状の段ボールとガムテープで接続。
- 表情は油性ペンで描いたゆるい顔。
- 頭に「安全第一」と書いた紙のヘルメット。
- かっこよさ2、情けなさ8。

### 8.3 暴走掃除機ボス

- 丸い掃除機本体に、貼り付けた目と怒り眉。
- 吸い込み口が大きく、コミカルに怖い。
- ホースが腕のように動く。
- 紙パック型の弱点が背中か腹にある。
- ゴミ、紙くず、ネジ、ガムテープ片を撒き散らす。

---

## 9. GPTIMAGE2 画像生成プロンプト

以下はそのままGPTIMAGE2に渡す想定のプロンプト。全画像で「同じ世界観・同じ画材感」を保つ。

生成済み画像:

- `assets/concepts/main-visual.png`
- `assets/concepts/cardboard-robot-design.png`
- `assets/concepts/vacuum-boss-design.png`
- `assets/concepts/gameplay-mockup.png`

採用状況:

- 主人公ロボ設定画は採用。段ボール箱、筒状の手足、赤テープ、青マーカー、紙皿の目をゲーム内デザイン基準にする。
- 暴走掃除機ボス設定画は採用。丸い掃除機本体、ホース腕、紙パック弱点、攻撃パネルの方向性をゲーム内デザイン基準にする。
- ゲーム画面ラフは採用。工作風HUD、右側の事故ログ、ボスHP、転倒ゲージ、傾きメーターの方向性をゲーム内UI基準にする。
- メインビジュアルは仮置き。正式な宣材画像は後で差し替える。
- 実装上は左右表記の混乱を避けるため、担当部位を青い囲みで直接示す。左右の説明は画面基準に寄せる。
- 転倒は即敗北ではなく、ロボHP制とダウン状態にする。ダウン中は攻撃できず、ボス攻撃を受けると被ダメージが増える。
- W/↑入力で歩行できる。ボスに近づくほど弱点攻撃のダメージが上がる。

### 9.1 メインビジュアル

```text
Use case: stylized-concept
Asset type: game key visual
Primary request: Create a friendly silly boss battle key visual for a browser co-op game titled "右足お前かよ".
Scene/backdrop: a messy handmade craft-room arena with cardboard scraps, masking tape, paper labels, and simple toy-like props.
Subject: a wobbly giant cardboard robot operated by friends, facing a runaway vacuum cleaner boss with a huge suction mouth and hose arms.
Style/medium: charming 2D game concept art, loose hand-drawn shapes, cardboard craft texture, warm and approachable, intentionally silly but polished.
Composition/framing: wide landscape composition, cardboard robot on the left, runaway vacuum boss on the right, dynamic diagonal action, readable silhouettes.
Lighting/mood: bright playful room lighting, chaotic but friendly, funny boss battle energy.
Color palette: cardboard brown base with red tape, blue marker lines, yellow warning labels, soft off-white background accents.
Materials/textures: corrugated cardboard edges, duct tape, marker doodles, paper stickers, plastic vacuum body.
Text (verbatim): "右足お前かよ"
Constraints: text must be exact Japanese title if rendered; keep characters cute and readable; no realistic horror; no gore; no watermark.
Avoid: dark sci-fi mecha, sleek metal robot, photorealism, scary monster design, clutter that hides the characters.
```

### 9.2 主人公ロボ設定画

```text
Use case: stylized-concept
Asset type: character design sheet for game production
Primary request: Design the player-controlled cardboard robot for the co-op boss battle game "右足お前かよ".
Scene/backdrop: clean off-white craft paper background with small handwritten-style labels and light grid hints.
Subject: a goofy giant cardboard robot made from boxes, tubes, duct tape, rubber bands, paper plates, and marker-drawn face details.
Style/medium: 2D game character concept sheet, loose friendly illustration, clear shapes for future sprite creation.
Composition/framing: front view, side view, small exploded parts diagram showing left arm, right arm, left leg, right leg, and torso.
Lighting/mood: bright, playful, readable.
Color palette: cardboard brown, red tape, blue marker, yellow warning sticker, white paper labels.
Materials/textures: visible corrugated cardboard, tape seams, marker doodles, slightly uneven handmade edges.
Text (verbatim): no title text; only tiny decorative pseudo-labels are allowed.
Constraints: make each limb visually distinct; keep it simple enough for 2D game assets; no watermark.
Avoid: complex mechanical joints, realistic metal, intimidating military robot, excessive tiny details.
```

### 9.3 暴走掃除機ボス設定画

```text
Use case: stylized-concept
Asset type: boss design sheet for game production
Primary request: Design a runaway vacuum cleaner boss named "スイトルンバMk.0" for a silly co-op cardboard robot boss battle game.
Scene/backdrop: clean craft paper background with simple callout arrows for attacks and weak point.
Subject: a round vacuum cleaner boss with angry sticker eyes, a huge suction mouth, flexible hose arms, a visible paper-bag weak point, and scattered trash projectiles.
Style/medium: charming 2D game boss concept art, playful, readable, toy-like, not scary.
Composition/framing: main front three-quarter view, small side view, small panels for suction attack, charge attack, trash shot, and weak point exposed.
Lighting/mood: bright comedic boss energy.
Color palette: warm plastic off-white, muted red accents, cardboard brown trash, yellow warning labels, blue marker arrows.
Materials/textures: plastic vacuum body, paper dust bag, taped-on eyes, crumpled paper, screws, tape scraps.
Text (verbatim): "スイトルンバMk.0"
Constraints: text must be exact if rendered; weak point must be visually obvious; no watermark.
Avoid: horror monster, sharp teeth, realistic dirt, gross imagery, over-detailed machinery.
```

### 9.4 ゲーム画面ラフ

```text
Use case: ui-mockup
Asset type: 2D browser game screen mockup
Primary request: Create a readable gameplay mockup for the co-op boss battle game "右足お前かよ".
Scene/backdrop: side-view craft-room arena with simple cardboard floor and scattered paper props.
Subject: player cardboard robot on the left fighting runaway vacuum cleaner boss on the right.
Style/medium: polished 2D game UI mockup, hand-crafted cardboard visual style, clear Canvas-friendly shapes.
Composition/framing: 16:9 landscape game screen. Top left shows remaining time. Top center shows boss HP. Bottom left shows player role and controls. Bottom center shows fall gauge and body tilt meter. Right side shows small accident log.
Lighting/mood: bright, playful, readable, chaotic but not cluttered.
Color palette: cardboard brown, off-white, red tape, blue marker, yellow warning labels, high-contrast UI accents.
Materials/textures: paper labels, tape borders, marker UI icons, simple cardboard panels.
Text (verbatim): "BOSS HP", "転倒ゲージ", "右足担当", "吸い込み注意"
Constraints: UI must be legible; no tiny unreadable text besides decorative marks; no watermark.
Avoid: mobile portrait layout, realistic 3D rendering, dark sci-fi HUD, excessive visual noise.
```

---

## 10. 開発マイルストーン

### Milestone 1: ローカル単体ボス戦

通信なし。1画面でキーボードから全パーツを操作できる状態を作る。

受け入れ条件:

- Canvasに段ボールロボと暴走掃除機ボスが表示される。
- 左足・右足・腕の入力で踏ん張り、攻撃、ガード、傾きが起きる。
- ボスが吸い込み、突進、ゴミ噴射、弱点露出を行う。
- 勝敗判定と事故ログがある。

### Milestone 2: Socket.IOルーム同期

オンラインで2〜4人が参加できる状態を作る。

受け入れ条件:

- 部屋作成ができる。
- 参加コードで同じ部屋に入れる。
- 人数に応じて担当部位が割り当てられる。
- 各プレイヤーの入力がサーバーに届き、ロボット状態に反映される。

### Milestone 3: サーバー権威ゲームループ

サーバー側でロボットとボスを固定tick更新する。

受け入れ条件:

- クライアントは入力のみ送る。
- サーバーがRobotStateとBossStateを更新する。
- クライアントは受信したGameStateを描画する。
- 10〜20Hz配信でも視覚的に破綻しない。

### Milestone 4: Renderデプロイ

Render上で友人がブラウザから遊べる状態にする。

受け入れ条件:

- Render Web Serviceとして起動する。
- クライアントから本番サーバーへ接続できる。
- ルーム作成・参加・プレイ・リザルトまで通る。
- READMEにローカル起動方法とRenderデプロイ方法がある。

### Milestone 5: 面白さ調整

事故が笑えるようにパラメータ、ボス予兆、ログ文言を調整する。

受け入れ条件:

- 2人でも遊べる。
- 4人だと明らかにカオスになる。
- 失敗理由がログで分かる。
- 1ゲーム後に自然に再戦したくなるテンポになっている。

---

## 11. Codexへの実装依頼文

```text
このリポジトリに、ブラウザで遊べるリアルタイム協力ボス戦ゲーム「右足お前かよ」のMVPを実装してください。

前提:
- 個人開発・無料枠運用を想定します。
- 通信は Render + Node.js + Socket.IO 方針です。
- クライアントは React + TypeScript + Vite を使ってください。
- 描画は Canvas 2D API で構いません。
- DBは使わず、MVPではサーバーメモリ上でRoomStateを管理してください。
- クライアントは入力のみを送信し、サーバーがRobotStateとBossStateをauthoritativeに更新してください。
- 1部屋2〜4人、1プレイ30〜60秒を想定してください。
- ビジュアルは緩い段ボール工作ロボ調にしてください。

実装してください:
1. モノレポ構成: apps/client, apps/server, packages/shared
2. 共有型定義: Socketイベント、RoomState、RobotState、BossState、PlayerInput
3. ロビー機能: 部屋作成、参加コード、名前入力、Ready、Start
4. 役割割り当て: 2〜4人に応じて左右足・左右腕を割り当て
5. サーバーゲームループ: 20HzでRobotStateとBossStateを更新
6. クライアント入力送信: 10〜20Hz程度
7. Canvas描画: 段ボールロボ、暴走掃除機ボス、HP、予兆、転倒ゲージ
8. ボス行動: 吸い込み、突進、ゴミ噴射、弱点露出
9. 勝敗判定: ボスHP0、転倒ゲージ100%、タイムアウト
10. 事故ログ: 重要入力、ボス攻撃、傾き警告、転倒理由、リザルト表示
11. Renderデプロイ用設定: render.yamlまたはREADME手順

優先順位:
- 見た目より、オンラインで実際に遊べることを優先してください。
- 本格物理演算は不要です。ルールベースの疑似物理で実装してください。
- ボスAIは複雑にしないでください。予兆と対応が分かりやすいことを優先してください。
- 60fps完全同期は不要です。描画は60fps、通信は10〜20Hzを目安にしてください。
- 最初からスケール対応やDB保存を実装しないでください。

完了条件:
- `npm install` からローカル起動できる。
- 2つ以上のブラウザタブで同じ部屋に入り、担当部位ごとの操作が同期する。
- ボス戦開始からリザルト表示まで一通り遊べる。
- READMEに起動方法、操作方法、Renderへのデプロイ方法が記載されている。
```

---

## 12. 非目標 / 今やらないこと

MVPでは以下をやらない。

- アカウント登録
- 永続DB
- ランキング
- リプレイ動画生成
- スマホ最適化
- 大人数対応
- 複数サーバー構成
- Redis adapter
- 本格物理エンジン
- アバターカスタム
- 課金要素
- 複数ボス
- ステージ選択

---

## 13. リスクと対策

| リスク | 内容 | 対策 |
|---|---|---|
| 操作が難しいだけになる | 部位担当制が理不尽に感じられる | 予兆を分かりやすくし、ガードや踏ん張りで救済できる時間を作る |
| 腕担当が暇になる | 足だけで勝敗が決まると退屈 | ゴミ噴射ガード、パンチ、傾き補正を腕の重要役にする |
| 足担当が責められすぎる | 吸い込みや回避で責任が偏る | ボス攻撃ごとに足と腕の見せ場を分ける |
| ボス戦が複雑になる | 攻撃種類を増やすとMVPが膨らむ | 初回は4行動だけに絞る |
| 無料枠のスリープ | Render無料枠ではアイドル後にスピンダウンする可能性がある | 友人テスト用途では許容。READMEに初回接続が遅い可能性を書く |
| 通信頻度過多 | 入力や状態を毎フレーム送ると負荷が増える | 入力・状態配信は10〜20Hzに抑える |

---

## 14. 調整パラメータ案

```ts
export const GAME_CONFIG = {
  tickRate: 20,
  stateBroadcastRate: 15,
  inputSendRate: 20,
  gameDurationMs: 60_000,
  bossMaxHp: 100,
  fallGaugeMax: 100,
  warningAngleDeg: 15,
  dangerAngleDeg: 25,
  criticalAngleDeg: 40,
  punchDamage: 6,
  kickDamage: 12,
  kickMissTiltPenalty: 8,
  guardReduction: 0.65,
  bracePower: 0.8,
  armBalancePower: 0.65,
  balanceRecoveryRate: 0.02,
  vulnerableDurationMs: 2500,
  bossTellDurationMs: 1200,
};
```

---

## 15. 企画レビュー観点

- 初見で「誰が何を操作するゲームか」が分かるか。
- ボスの攻撃と対応が、画面を見て直感的に分かるか。
- 通話で叫びたくなる短い指示が生まれるか。
- 失敗ログが責め合いではなく笑える裁判になっているか。
- 段ボール工作ロボの緩さと、ボス戦の緊張感が両立しているか。

---

## 16. 参考資料

この仕様は2026-05-01時点の公式情報を前提にしている。

1. Render: WebSockets on Render  
   https://render.com/docs/websocket
2. Render: Deploy for Free  
   https://render.com/docs/free
3. Socket.IO: Introduction  
   https://socket.io/docs/v4/
4. Socket.IO: Rooms  
   https://socket.io/docs/v3/rooms/
5. MDN Web Docs: WebSocket API  
   https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API
