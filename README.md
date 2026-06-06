# ut-navi

## アプリ概要

本郷キャンパスの構内マップ。周辺地図を出さず、キャンパスの建物・道路だけを 2D 表示する。

### 機能一覧

- [x] マップ表示 (本郷キャンパス。正門が下になる向きに固定)
- [x] 建物クリックで選択・情報表示
- [x] 建物名検索 (該当建物へフォーカス + ハイライト)
- [x] 建物の階層図表示 (工学部2号館のみ。暫定データ)
- [x] 部屋名検索 (号室/部屋名/会場記号。現状は工学部2号館のみ)
- [ ] 場所表示・検索 (給水設備、フリースペースなど)
- [ ] 空きコマ検索機能

## 開発

### セットアップ

- mise をインストール
- `mise install`
- `bun install`

### コマンド

#### Root

- `bun run dev` - start everything
- `bun run check` - run all checks
- `bun run typecheck` - typecheck only
- `bun run autofix` - fix autofix-able issues

#### web

- `bun run dev` — 開発サーバ
- `bun run lint` - lints (prettier + eslint)
- `bun run autofix` - autofixes (prettier + eslint)
- `bun run scripts/fetch-buildings.ts` — 地図データ (GeoJSON) の再生成

## 技術スタック

- SvelteKit (Svelte 5) / Bun
- MapLibre GL — 地図描画
- OpenStreetMap (Overpass API) — 建物・道路データ (取得済みを `web/static/data` にコミット)
- Tailwind CSS v4 / shadcn-svelte
- prettier + eslint / Lefthook (pre-commit)
