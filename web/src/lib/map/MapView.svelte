<script lang="ts">
	import maplibregl from "maplibre-gl";
	import { onMount } from "svelte";
	import "maplibre-gl/dist/maplibre-gl.css";
	import { resolve } from "$app/paths";
	import { BASE_STYLE, CAMPUSES, OSM_ATTRIBUTION, type CampusConfig } from "./campuses.ts";
	import DetailPanel from "./DetailPanel.svelte";
	import { FLOOR_DATA, hasFloors, searchRooms, type RoomHit } from "$lib/data/floors.ts";

	let { config }: { config: CampusConfig } = $props();

	type Selected = {
		id: string;
		name: string;
		levels: string | null;
		en: string | null;
	};

	/** 検索インデックスの1件。flyTo 用に建物の中心座標も持つ */
	type Building = {
		id: string;
		name: string;
		en: string | null;
		levels: string | null;
		center: [number, number];
	};

	let container: HTMLDivElement;
	let map = $state<maplibregl.Map | undefined>();
	let selected = $state<Selected | null>(null);

	// 建物名・部屋名検索
	let buildings = $state<Building[]>([]);
	let query = $state("");
	let searchFocused = $state(false);
	const results = $derived.by(() => {
		const q = query.trim().toLowerCase();
		if (q === "") return [];
		return buildings
			.filter((b) => b.name.toLowerCase().includes(q) || (b.en?.toLowerCase().includes(q) ?? false))
			.slice(0, 6);
	});
	const roomResults = $derived(searchRooms(query, 6));
	// 空欄でフォーカスしたときの候補先出し。タイプ量ゼロで飛べるよう、
	// 階層図など詳細データを持つ建物をクイックアクセスとして並べる
	const suggestions = $derived(buildings.filter((b) => hasFloors(b.id)).slice(0, 8));

	// 選択中の建物の階層図 (なければ null)。選択状態から導出し、別状態を持たない
	const floorData = $derived(selected === null ? null : (FLOOR_DATA[selected.id] ?? null));
	// 階層図を開いた階・部屋のフォーカス (部屋検索からの遷移用)
	let focusLevel = $state<number | null>(null);
	let focusRoom = $state<string | null>(null);

	/** GeoJSON プロパティは unknown。文字列のときだけ取り出す (assertion 不可なので実行時判定) */
	function asString(v: unknown): string | null {
		return typeof v === "string" ? v : null;
	}

	function isRecord(v: unknown): v is Record<string, unknown> {
		return typeof v === "object" && v !== null;
	}

	/** ネストした座標配列から bbox を集めて中心を返す。assertion を使わず再帰で走査 */
	function centerOf(coords: unknown): [number, number] | null {
		let minX = Infinity;
		let minY = Infinity;
		let maxX = -Infinity;
		let maxY = -Infinity;
		const walk = (c: unknown) => {
			if (!Array.isArray(c)) return;
			if (c.length >= 2 && typeof c[0] === "number" && typeof c[1] === "number") {
				minX = Math.min(minX, c[0]);
				minY = Math.min(minY, c[1]);
				maxX = Math.max(maxX, c[0]);
				maxY = Math.max(maxY, c[1]);
				return;
			}
			for (const inner of c) walk(inner);
		};
		walk(coords);
		if (minX === Infinity) return null;
		return [(minX + maxX) / 2, (minY + maxY) / 2];
	}

	/** 建物 GeoJSON を検索用インデックスに変換 (name 付きのみ対象) */
	function buildIndex(data: unknown) {
		if (!isRecord(data) || !Array.isArray(data.features)) return;
		const entries: Building[] = [];
		for (const f of data.features) {
			if (!isRecord(f)) continue;
			const props = f.properties;
			const geom = f.geometry;
			if (!isRecord(props) || !isRecord(geom)) continue;
			const id = asString(props.id);
			const name = asString(props.name);
			if (id === null || name === null) continue; // 名前なしは検索できないので除外
			const center = centerOf(geom.coordinates);
			if (center === null) continue;
			entries.push({
				id,
				name,
				en: asString(props["name:en"]),
				levels: asString(props["building:levels"]),
				center,
			});
		}
		buildings = entries;
	}

	function highlight(id: string) {
		map?.setFilter("campus-buildings-selected", ["==", ["get", "id"], id]);
		map?.setFilter("campus-buildings-selected-fill", ["==", ["get", "id"], id]);
	}

	function clearSelection() {
		selected = null;
		focusLevel = null;
		focusRoom = null;
		// 何にもマッチしない式に戻してハイライトを消す
		highlight("");
	}

	/** 建物を選択 → 詳細パネルを開く。階層図フォーカスはここでリセット (建物検索/クリック共通) */
	function select(s: Selected) {
		selected = s;
		focusLevel = null;
		focusRoom = null;
		highlight(s.id);
	}

	/** 検索結果から建物を選択 → 選択 + その建物へ寄る */
	function selectBuilding(b: Building) {
		select({ id: b.id, name: b.name, levels: b.levels, en: b.en });
		query = "";
		searchFocused = false;
		map?.flyTo({ center: b.center, zoom: Math.max(map.getZoom(), 16.5), duration: 800 });
	}

	/** 部屋検索の結果を選択 → 親建物へ寄り、該当階・部屋を開いた状態にする */
	function selectRoom(hit: RoomHit) {
		const b = buildings.find((x) => x.id === hit.buildingId);
		if (b) selectBuilding(b);
		else query = "";
		// selectBuilding がフォーカスを消すので、その後に部屋フォーカスを乗せる
		focusLevel = hit.level;
		focusRoom = hit.room.number;
	}

	function onSearchKeydown(e: KeyboardEvent) {
		if (e.key === "Escape") {
			query = "";
		} else if (e.key === "Enter") {
			// 部屋の方が具体的なので優先。なければ建物
			const room = roomResults[0];
			const building = results[0];
			if (room) selectRoom(room);
			else if (building) selectBuilding(building);
		}
	}

	onMount(() => {
		map = new maplibregl.Map({
			container,
			style: BASE_STYLE,
			center: config.center,
			zoom: config.zoom.initial,
			minZoom: config.zoom.min,
			maxZoom: config.zoom.max,
			bearing: config.bearing, // 正門が下に来る向きに固定
			maxBounds: config.bounds, // キャンパス外へ大きく流れないよう固定
			// 斜め(3D)に見えないよう回転・傾きを完全に無効化し純 2D に固定
			dragRotate: false,
			pitchWithRotate: false,
			touchZoomRotate: true,
			// 自前 GeoJSON は OSM 由来なので ODbL 出典を必ず添える
			attributionControl: { customAttribution: OSM_ATTRIBUTION },
		});
		map.touchZoomRotate.disableRotation(); // ピンチ回転だけ殺す (ピンチズームは残す)
		// コンパス不要 (回転しないため)。ズームのみ。上部は検索/ナビ、右上は詳細パネルが
		// 使うので、ズーム・出典はまとめて右下へ寄せる
		map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");

		map.on("load", () => {
			if (!map) return;

			map.addSource("campus-boundary", {
				type: "geojson",
				data: `/data/${config.id}-boundary.geojson`,
			});
			map.addSource("campus-roads", {
				type: "geojson",
				data: `/data/${config.id}-roads.geojson`,
			});
			map.addSource("campus-buildings", {
				type: "geojson",
				data: `/data/${config.id}-buildings.geojson`,
			});

			// 道路の縁取り (casing)。白い道に縁を付けて地面から浮かせる
			map.addLayer({
				id: "campus-roads-casing",
				type: "line",
				source: "campus-roads",
				layout: { "line-cap": "round", "line-join": "round" },
				paint: {
					"line-color": "#d6e4d8",
					"line-width": [
						"interpolate",
						["linear"],
						["zoom"],
						14,
						["match", ["get", "highway"], ["footway", "path", "steps", "pedestrian"], 2.5, 4],
						18,
						["match", ["get", "highway"], ["footway", "path", "steps", "pedestrian"], 5, 10],
					],
				},
			});
			// 道路本体 (白)。footway/path/steps は細く、車道系は太めにして主従をつける
			map.addLayer({
				id: "campus-roads-line",
				type: "line",
				source: "campus-roads",
				layout: { "line-cap": "round", "line-join": "round" },
				paint: {
					"line-color": "#ffffff",
					"line-width": [
						"interpolate",
						["linear"],
						["zoom"],
						14,
						["match", ["get", "highway"], ["footway", "path", "steps", "pedestrian"], 1, 2.5],
						18,
						["match", ["get", "highway"], ["footway", "path", "steps", "pedestrian"], 3.5, 8],
					],
				},
			});

			// 境界線。主張しすぎない柔らかい破線
			map.addLayer({
				id: "campus-boundary-line",
				type: "line",
				source: "campus-boundary",
				paint: {
					"line-color": "#b3cdb6",
					"line-width": 2,
					"line-dasharray": [3, 2],
				},
			});

			// 建物ポリゴン。名前付き = あたたかいクリーム色 (押すと情報が出る)、
			// 名前なし = グレーアウト (情報が無いので押す価値が無いことを一目で示す)
			map.addLayer({
				id: "campus-buildings-fill",
				type: "fill",
				source: "campus-buildings",
				paint: {
					"fill-color": ["case", ["has", "name"], "#fbeede", "#e2e7e2"],
					"fill-opacity": ["case", ["has", "name"], 0.95, 0.55],
				},
			});
			map.addLayer({
				id: "campus-buildings-outline",
				type: "line",
				source: "campus-buildings",
				paint: {
					"line-color": ["case", ["has", "name"], "#e6cfac", "#cdd5cd"],
					"line-width": 1.2,
				},
			});

			// 選択中の建物の塗り強調。初期は何にもマッチしない式
			map.addLayer({
				id: "campus-buildings-selected-fill",
				type: "fill",
				source: "campus-buildings",
				filter: ["==", ["get", "id"], ""],
				paint: { "fill-color": "#ff7a59", "fill-opacity": 0.25 },
			});
			map.addLayer({
				id: "campus-buildings-selected",
				type: "line",
				source: "campus-buildings",
				filter: ["==", ["get", "id"], ""],
				paint: { "line-color": "#ff6b4a", "line-width": 3 },
			});

			// 建物名ラベル。混雑回避のためある程度寄らないと出さない。
			// フォントは OpenFreeMap の glyphs を利用 (日本語対応)
			map.addLayer({
				id: "campus-buildings-label",
				type: "symbol",
				source: "campus-buildings",
				filter: ["has", "name"],
				minzoom: 14,
				layout: {
					"text-field": ["get", "name"],
					"text-font": ["Noto Sans Regular"],
					"text-size": ["interpolate", ["linear"], ["zoom"], 14, 10, 18, 13],
					"text-max-width": 8,
				},
				paint: {
					"text-color": "#5a4a3a",
					"text-halo-color": "#ffffff",
					"text-halo-width": 1.6,
				},
			});

			// 検索インデックスを構築 (実行時の地図描画とは別に生データを取得)
			fetch(`/data/${config.id}-buildings.geojson`)
				.then((r) => r.json())
				.then((data: unknown) => buildIndex(data))
				.catch(() => {}); // 失敗してもクリック選択は機能するので握り潰す

			// 建物クリックで選択 → 詳細パネルへ直結 (中間カードは無し)
			map.on("click", "campus-buildings-fill", (e) => {
				if (!map) return;
				const f = e.features?.[0];
				if (!f?.properties) return;
				const id = asString(f.properties.id);
				const name = asString(f.properties.name);
				// 名前なし建物は情報が無くグレーアウト表示。クリックも無反応にする
				if (id === null || name === null) return;
				select({
					id,
					name,
					levels: asString(f.properties["building:levels"]),
					en: asString(f.properties["name:en"]),
				});
			});

			// 余白 (名前付き建物以外) をクリックしたら選択解除。
			// グレーの名前なし建物も「情報なし」なので余白扱いで解除する
			map.on("click", (e) => {
				if (!map) return;
				const hit = map
					.queryRenderedFeatures(e.point, { layers: ["campus-buildings-fill"] })
					.some((f) => asString(f.properties?.name) !== null);
				if (!hit) clearSelection();
			});

			// 建物上でカーソルをポインターに
			map.on("mouseenter", "campus-buildings-fill", () => {
				if (map) map.getCanvas().style.cursor = "pointer";
			});
			map.on("mouseleave", "campus-buildings-fill", () => {
				if (map) map.getCanvas().style.cursor = "";
			});
		});

		return () => map?.remove();
	});
</script>

<div bind:this={container} class="map"></div>

<!-- 上部バー: ホーム/キャンパス切替 (左) + 検索 (残り幅)。1 本にまとめる -->
<div class="topbar">
	<nav class="nav">
		<a class="home" href={resolve("/")} aria-label="キャンパス選択へ戻る" title="キャンパス選択">
			<svg viewBox="0 0 24 24" aria-hidden="true">
				<path
					d="M3 11l9-8 9 8M5 10v9a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1v-9"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
		</a>
		<div class="campus-switch">
			{#each Object.values(CAMPUSES) as c (c.id)}
				<a
					href={resolve("/[campus]", { campus: c.id })}
					class:active={c.id === config.id}
					aria-current={c.id === config.id ? "page" : undefined}
				>
					{c.name.replace("キャンパス", "")}
				</a>
			{/each}
		</div>
	</nav>

	<div class="search">
		<div class="search-box">
			<svg class="search-icon" viewBox="0 0 24 24" aria-hidden="true">
				<path
					d="M21 21l-4.3-4.3M11 18a7 7 0 110-14 7 7 0 010 14z"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
				/>
			</svg>
			<input
				type="search"
				placeholder="建物・部屋を検索"
				bind:value={query}
				onkeydown={onSearchKeydown}
				onfocus={() => (searchFocused = true)}
				onblur={() => setTimeout(() => (searchFocused = false), 120)}
				aria-label="建物・部屋を検索"
			/>
			{#if query !== ""}
				<button class="clear" onclick={() => (query = "")} aria-label="クリア">×</button>
			{/if}
		</div>

		{#if query.trim() !== ""}
			<div class="results">
				{#if roomResults.length > 0}
					<p class="group">部屋</p>
					<ul>
						{#each roomResults as hit (hit.buildingId + hit.room.number)}
							<li>
								<button onclick={() => selectRoom(hit)}>
									<span class="r-name">
										{hit.room.name}
										{#if hit.room.hall}<span class="r-hall">{hit.room.hall}</span>{/if}
									</span>
									<span class="r-en">{hit.buildingName} {hit.floorLabel}</span>
								</button>
							</li>
						{/each}
					</ul>
				{/if}
				{#if results.length > 0}
					<p class="group">建物</p>
					<ul>
						{#each results as b (b.id)}
							<li>
								<button onclick={() => selectBuilding(b)}>
									<span class="r-name">{b.name}</span>
									{#if b.en}<span class="r-en">{b.en}</span>{/if}
								</button>
							</li>
						{/each}
					</ul>
				{/if}
				{#if results.length === 0 && roomResults.length === 0}
					<p class="empty">該当する建物・部屋がないよ</p>
				{/if}
			</div>
		{:else if searchFocused && suggestions.length > 0}
			<!-- 空欄フォーカス時の候補先出し。タイプせずに飛べる -->
			<div class="results">
				<p class="group">クイックアクセス</p>
				<ul>
					{#each suggestions as b (b.id)}
						<li>
							<button onclick={() => selectBuilding(b)}>
								<span class="r-name">{b.name}</span>
								{#if b.en}<span class="r-en">{b.en}</span>{/if}
							</button>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</div>
</div>

{#if selected}
	<DetailPanel
		name={selected.name}
		en={selected.en}
		levels={selected.levels}
		data={floorData}
		{focusLevel}
		{focusRoom}
		onclose={clearSelection}
	/>
{/if}

<style>
	.map {
		position: absolute;
		inset: 0;
	}

	/* 上部バー: ナビ (左) + 検索 (残り) を 1 行に。レスポンシブで自然に縮む */
	.topbar {
		position: absolute;
		top: 1rem;
		left: 1rem;
		right: 1rem;
		display: flex;
		align-items: flex-start;
		gap: 0.6rem;
		font-family: system-ui, sans-serif;
		z-index: 10;
		pointer-events: none; /* 余白部分で地図クリックを止めない。子だけ拾う */
	}
	.topbar > * {
		pointer-events: auto;
	}

	/* ナビ: ホーム + キャンパス切替 */
	.nav {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		flex: none;
	}
	.home,
	.campus-switch {
		background: #ffffff;
		border-radius: 999px;
		box-shadow: 0 4px 18px rgba(45, 70, 50, 0.16);
		height: 2.9rem;
		display: flex;
		align-items: center;
	}
	.home {
		justify-content: center;
		width: 2.9rem;
		color: #55624f;
		flex: none;
	}
	.home:hover {
		color: #ff6b4a;
	}
	.home svg {
		width: 1.3rem;
		height: 1.3rem;
	}
	.campus-switch {
		padding: 0.25rem;
		gap: 0.15rem;
	}
	.campus-switch a {
		display: flex;
		align-items: center;
		padding: 0 0.7rem;
		height: 100%;
		border-radius: 999px;
		font-size: 0.85rem;
		font-weight: 600;
		color: #8aa890;
		text-decoration: none;
		white-space: nowrap;
	}
	.campus-switch a.active {
		background: #ff6b4a;
		color: #ffffff;
	}
	.campus-switch a:not(.active):hover {
		background: #f1f7f1;
		color: #55624f;
	}

	/* 検索: 残り幅いっぱい。結果はその下に被せて出す */
	.search {
		position: relative;
		flex: 1;
		min-width: 0;
		max-width: 26rem;
	}
	.search-box {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		padding: 0 0.9rem;
		background: #ffffff;
		border-radius: 999px;
		box-shadow: 0 4px 18px rgba(45, 70, 50, 0.16);
	}
	.search-icon {
		width: 1.15rem;
		height: 1.15rem;
		color: #8aa890;
		flex: none;
	}
	.search-box input {
		flex: 1;
		border: none;
		outline: none;
		background: none;
		padding: 0.75rem 0;
		font-size: 1rem;
		color: #2f3a32;
	}
	.search-box input::placeholder {
		color: #9bafa0;
	}
	.results {
		margin: 0.5rem 0 0;
		padding: 0.3rem;
		background: #ffffff;
		border-radius: 0.9rem;
		box-shadow: 0 6px 22px rgba(45, 70, 50, 0.18);
		max-height: 60vh;
		overflow-y: auto;
	}
	.results ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.results li {
		margin: 0;
	}
	.results .group {
		margin: 0.35rem 0 0.1rem;
		padding: 0 0.75rem;
		font-size: 0.72rem;
		font-weight: 700;
		color: #9bafa0;
	}
	.r-hall {
		font-size: 0.72rem;
		font-weight: 700;
		color: #ff6b4a;
		background: #fff0eb;
		border-radius: 0.35rem;
		padding: 0.05rem 0.35rem;
		margin-left: 0.3rem;
	}
	.results button {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.1rem;
		width: 100%;
		padding: 0.55rem 0.75rem;
		border: none;
		background: none;
		border-radius: 0.6rem;
		text-align: left;
		cursor: pointer;
	}
	.results button:hover {
		background: #f1f7f1;
	}
	.r-name {
		font-size: 0.95rem;
		color: #2f3a32;
	}
	.r-en {
		font-size: 0.78rem;
		color: #8aa890;
	}
	.results .empty {
		padding: 0.6rem 0.75rem;
		font-size: 0.88rem;
		color: #9bafa0;
	}

	/* 検索クリアボタン */
	.clear {
		flex: none;
		border: none;
		background: #eef2ee;
		color: #8aa890;
		width: 1.5rem;
		height: 1.5rem;
		border-radius: 999px;
		font-size: 1rem;
		line-height: 1;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.clear:hover {
		background: #e0e7e0;
		color: #55624f;
	}
</style>
