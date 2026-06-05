# web/AGENTS.md

東大本郷キャンパスの構内マップ (SvelteKit + MapLibre GL)。

## コマンド

- `bun run dev` — 開発サーバ
- `bun run check` — svelte-check (型チェック)
- `bun run lint` — prettier --check + eslint
- `bun run format` — prettier --write
- `bun run scripts/fetch-buildings.ts` — 地図データ再生成 (下記)

## 地図データ

`static/data/*.geojson` は OSM/Overpass から焼いた生成物で **リポジトリにコミット済み**。
アプリは実行時に Overpass を叩かない (ランタイム外部依存なし)。再生成は `scripts/fetch-buildings.ts`。

- 本郷キャンパス = OSM **relation 5414648**。その area 内部の要素だけ抽出 (周辺マンション等は混ざらない)
- `hongo-buildings.geojson` — 建物ポリゴン (name 付き多数)
- `hongo-roads.geojson` — 道路・歩道 (`highway=*`。footway/path/steps も含む。構内は歩行者動線が主役)
- `hongo-boundary.geojson` — キャンパス境界
- 各 feature は一意の `id` (`"relation/123"` 形式) を top-level と `properties.id` の両方に持つ → 建物の選択・ハイライトに使う

## 地図の設計方針 (`src/lib/map/`)

定数・スタイルは `campus.ts` に集約。地図本体は `MapView.svelte`。

- **周辺地図を出さない**: 通常の地図タイル (道路/店舗まで写る) は使わず、単色背景の最小スタイル + 自前 GeoJSON だけを描く。「キャンパス以外を写さない」ための意図的な選択 (`BASE_STYLE`)
- **正門が下**: `bearing` を **77°** で固定。正門 → 安田講堂のメイン軸 (イチョウ並木) を画面上向きにした結果 (`CAMPUS_BEARING`)
- **純2D**: 回転・傾きを無効化 (3D に見せない)
- ラベル用フォント (glyphs) だけ OpenFreeMap から借りる (日本語対応)
- 建物クリック → `properties.id` でフィルタしてハイライト + 情報カード表示

## 規約

- **No Assertion** (ルート `AGENTS.md`): `as` / `!` 禁止。`typeof` 等のランタイム型チェックを使う
- lint/format は **prettier + eslint**。biome は `.svelte` の markup 内での変数/import 使用を追跡できず `noUnusedVariables` 等を誤検知するため**不採用** (再導入しないこと)
- インデントはタブ、文字列はダブルクォート (`.prettierrc`)
- `scripts/` は svelte-kit 生成 tsconfig の include 外 → `scripts/tsconfig.json` で個別に型付けしている

## UI

Tailwind v4。shadcn-svelte 初期化済み (`components.json`, `$lib/utils.ts` の `cn`) だが UI コンポーネントは未導入。
