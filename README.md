# すぽいと帳

🌍 日本語 / English / 한국어 / Français / Español / 繁體中文 / Deutsch / Italiano / Nederlands / Português (BR)

トモダチコレクション わくわく生活のペイント機能で使える色合わせツール。

画像から色を拾い、ゲーム内パレットや手順を表示します。

## 主な機能

- 画像のドラッグ&ドロップでアップロード（PNG / JPG / GIF / WEBP）
- 1:1の正方形クロップ（ハンドルでサイズ変更可能）
- ゲーム内84色パレットへの自動変換（ディザON/OFF切替可能）
- 各ピクセルの色を取得（HEX / RGB / HSV）
- ゲーム内HSV手順の自動算出
- 使用色レシピ表示（変換ビュー時、各色の使用セル数）
- パレット/レシピのhoverハイライト連動
- HEXコード直接入力
- ドット絵PNGダウンロード（ロゴ・タイトル帯付き）
- 10言語対応（ブラウザ言語による自動判定 + 手動切替可能）

## 多言語対応

10言語に対応しています。ヘッダー右上の歯車アイコンから切替できます。

| | |
|---|---|
| 日本語 | English |
| 한국어 | Français |
| Español | 繁體中文 |
| Deutsch | Italiano |
| Nederlands | Português (BR) |

初回アクセス時はブラウザの言語設定から自動判定されます。選択した言語はブラウザに保存され、次回以降も維持されます。

**翻訳PR歓迎です。** 翻訳の改善や新しい言語の追加方法は [I18N.md](./I18N.md) をご覧ください。

## 技術

すべてブラウザ内で動作。サーバー処理なし。

- Vanilla JavaScript（フレームワーク不使用）
- HTML / CSS / JS のみ

## 使い方

オンラインで使う：https://yu08083.github.io/Tomodachi-Life-Palette-Tool/

ローカルで動かす場合：`index.html` をブラウザで開くか、リポジトリのルートで `python -m http.server 8000` などの簡易サーバーを起動してアクセスしてください。

## ライセンス

[MIT License](./LICENSE)

ご自由に使用・改造・再配布いただいて構いません。

## 連絡先

- X: [@yu_](https://x.com/yu_)
- Issues: [GitHub Issues](https://github.com/Yu08083/Tomodachi-Life-Palette-Tool/issues)
