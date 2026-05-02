# OtoLogic SE placement

このフォルダにはOtoLogicの効果音を配置する想定です。

この実行環境からはOtoLogicのzip直ダウンロードがCloudflare確認でブロックされたため、SE本体は未配置です。  
ブラウザで以下をダウンロードし、zip内のmp3をこのフォルダに置き、`manifest.json` に使用するファイルを登録するとゲーム内で使用されます。
未登録または未配置の場合は、ブラウザで404を出さずに簡易合成SEへフォールバックします。

- `Motion-Slam06.mp3`
  - 用途: パンチ/キック命中
  - 配布ページ: https://otologic.jp/free/se/motion-slam01.html
- `Hit-Punch02.mp3`
  - 用途: ロボ被弾
- `Victory.mp3`
  - 用途: 勝利ジングル
- `Vacuum_Cleaner04.mp3`
  - 用途: 吸い込み攻撃
  - 配布ページ: https://otologic.jp/free/se/vacuum-cleaner01.html
- `Warning-Siren05.mp3`
  - 用途: ボス予兆/危険
  - 配布ページ: https://otologic.jp/free/se/warning01.html

`manifest.json` 例:

```json
{
  "warning": "/assets/audio/se/Warning-Siren05.mp3",
  "suck": "/assets/audio/se/Vacuum_Cleaner04.mp3",
  "hit": "/assets/audio/se/Motion-Slam06.mp3",
  "robotHit": "/assets/audio/se/Hit-Punch02.mp3",
  "fall": "/assets/audio/se/Motion-Slam06.mp3",
  "victory": "/assets/audio/se/Victory.mp3"
}
```

クレジット:

```text
効果音: OtoLogic (https://otologic.jp/)
ライセンス: CC BY 4.0
```
