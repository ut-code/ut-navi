<script lang="ts">
	import maplibregl from "maplibre-gl";
	import { onMount } from "svelte";
	import "maplibre-gl/dist/maplibre-gl.css";
	import {
		BASE_STYLE,
		CAMPUS_BEARING,
		CAMPUS_BOUNDS,
		CAMPUS_CENTER,
		OSM_ATTRIBUTION,
		ZOOM,
	} from "./campus.ts";
	import FloorView from "./FloorView.svelte";
	import { FLOOR_DATA, hasFloors, searchRooms, type RoomHit } from "$lib/data/floors.ts";

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
	let map: maplibregl.Map | undefined;
	let selected = $state<Selected | null>(null);

	// 建物名・部屋名検索
	let buildings = $state<Building[]>([]);
	let query = $state("");
	const results = $derived.by(() => {
		const q = query.trim().toLowerCase();
		if (q === "") return [];
		return buildings
			.filter((b) => b.name.toLowerCase().includes(q) || (b.en?.toLowerCase().includes(q) ?? false))
			.slice(0, 6);
	});
	const roomResults = $derived(searchRooms(query, 6));

	// 階層図ビュー (部屋データを持つ建物のみ)
	let floorBuildingId = $state<string | null>(null);
	let focusLevel = $state<number | null>(null);
	let focusRoom = $state<string | null>(null);
	const floorData = $derived(
		floorBuildingId === null ? null : (FLOOR_DATA[floorBuildingId] ?? null),
	);

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

	function closeFloors() {
		floorBuildingId = null;
		focusLevel = null;
		focusRoom = null;
	}

	function openFloors(buildingId: string, level: number | null, room: string | null) {
		floorBuildingId = buildingId;
		focusLevel = level;
		focusRoom = room;
	}

	function clearSelection() {
		selected = null;
		closeFloors();
		// 何にもマッチしない式に戻してハイライトを消す
		highlight("");
	}

	/** 検索結果から建物を選択 → ハイライト + その建物へ寄る */
	function selectBuilding(b: Building) {
		selected = { id: b.id, name: b.name, levels: b.levels, en: b.en };
		highlight(b.id);
		query = "";
		map?.flyTo({ center: b.center, zoom: Math.max(map.getZoom(), 16.5), duration: 800 });
	}

	/** 部屋検索の結果を選択 → 親建物へ寄って階層図を該当階・部屋で開く */
	function selectRoom(hit: RoomHit) {
		const b = buildings.find((x) => x.id === hit.buildingId);
		if (b) selectBuilding(b);
		else query = "";
		openFloors(hit.buildingId, hit.level, hit.room.number);
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
			center: CAMPUS_CENTER,
			zoom: ZOOM.initial,
			minZoom: ZOOM.min,
			maxZoom: ZOOM.max,
			bearing: CAMPUS_BEARING, // 正門が下に来る向きに固定
			maxBounds: CAMPUS_BOUNDS, // キャンパス外へ大きく流れないよう固定
			// 斜め(3D)に見えないよう回転・傾きを完全に無効化し純 2D に固定
			dragRotate: false,
			pitchWithRotate: false,
			touchZoomRotate: true,
			// 自前 GeoJSON は OSM 由来なので ODbL 出典を必ず添える
			attributionControl: { customAttribution: OSM_ATTRIBUTION },
		});
		map.touchZoomRotate.disableRotation(); // ピンチ回転だけ殺す (ピンチズームは残す)
		// コンパス不要 (回転しないため)。ズームボタンのみ
		map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

		map.on("load", () => {
			if (!map) return;

			map.addSource("campus-boundary", {
				type: "geojson",
				data: "/data/hongo-boundary.geojson",
			});
			map.addSource("campus-roads", {
				type: "geojson",
				data: "/data/hongo-roads.geojson",
			});
			map.addSource("campus-buildings", {
				type: "geojson",
				data: "/data/hongo-buildings.geojson",
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

			// 建物ポリゴン (あたたかいクリーム色)
			map.addLayer({
				id: "campus-buildings-fill",
				type: "fill",
				source: "campus-buildings",
				paint: { "fill-color": "#fbeede", "fill-opacity": 0.95 },
			});
			map.addLayer({
				id: "campus-buildings-outline",
				type: "line",
				source: "campus-buildings",
				paint: { "line-color": "#e6cfac", "line-width": 1.2 },
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
				minzoom: 15,
				layout: {
					"text-field": ["get", "name"],
					"text-font": ["Noto Sans Regular"],
					"text-size": ["interpolate", ["linear"], ["zoom"], 15, 10, 18, 13],
					"text-max-width": 8,
				},
				paint: {
					"text-color": "#5a4a3a",
					"text-halo-color": "#ffffff",
					"text-halo-width": 1.6,
				},
			});

			// 検索インデックスを構築 (実行時の地図描画とは別に生データを取得)
			fetch("/data/hongo-buildings.geojson")
				.then((r) => r.json())
				.then((data: unknown) => buildIndex(data))
				.catch(() => {}); // 失敗してもクリック選択は機能するので握り潰す

			// 建物クリックで選択
			map.on("click", "campus-buildings-fill", (e) => {
				if (!map) return;
				const f = e.features?.[0];
				if (!f?.properties) return;
				const id = asString(f.properties.id);
				if (id === null) return; // id がなければハイライト不能なので無視
				selected = {
					id,
					name: asString(f.properties.name) ?? "(名称未設定の建物)",
					levels: asString(f.properties["building:levels"]),
					en: asString(f.properties["name:en"]),
				};
				highlight(id);
			});

			// 建物以外の余白をクリックしたら選択解除
			map.on("click", (e) => {
				if (!map) return;
				const hits = map.queryRenderedFeatures(e.point, {
					layers: ["campus-buildings-fill"],
				});
				if (hits.length === 0) clearSelection();
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
			placeholder="建物名で検索"
			bind:value={query}
			onkeydown={onSearchKeydown}
			aria-label="建物名で検索"
		/>
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
	{/if}
</div>

{#if selected}
	<div class="info-card">
		<button class="close" onclick={clearSelection} aria-label="閉じる">×</button>
		<h2>{selected.name}</h2>
		{#if selected.en}<p class="sub">{selected.en}</p>{/if}
		{#if selected.levels}<p class="meta">🏢 地上 {selected.levels} 階</p>{/if}
		{#if hasFloors(selected.id)}
			<button class="floors-btn" onclick={() => selected && openFloors(selected.id, null, null)}>
				階層図を見る
			</button>
		{/if}
	</div>
{/if}

{#if floorData}
	<FloorView data={floorData} {focusLevel} {focusRoom} onclose={closeFloors} />
{/if}

<style>
	.map {
		position: absolute;
		inset: 0;
	}

	/* 検索 */
	.search {
		position: absolute;
		top: 1rem;
		left: 50%;
		transform: translateX(-50%);
		width: min(26rem, calc(100% - 2rem));
		font-family: system-ui, sans-serif;
		z-index: 10;
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

	/* 情報カード */
	.info-card {
		position: absolute;
		left: 1rem;
		bottom: 1rem;
		min-width: 14rem;
		max-width: min(20rem, calc(100% - 2rem));
		padding: 1rem 1.2rem;
		padding-left: 1.4rem;
		background: #ffffff;
		border-radius: 1rem;
		border-left: 5px solid #ff6b4a;
		box-shadow: 0 8px 28px rgba(45, 70, 50, 0.2);
		font-family: system-ui, sans-serif;
	}
	.info-card h2 {
		margin: 0 1.5rem 0 0;
		font-size: 1.1rem;
		font-weight: 700;
		color: #2f3a32;
	}
	.info-card .sub {
		margin: 0.25rem 0 0;
		font-size: 0.8rem;
		color: #8aa890;
	}
	.info-card .meta {
		margin: 0.55rem 0 0;
		font-size: 0.85rem;
		color: #55624f;
	}
	.floors-btn {
		margin-top: 0.7rem;
		border: none;
		background: #ff6b4a;
		color: #ffffff;
		padding: 0.45rem 0.9rem;
		border-radius: 999px;
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
	}
	.floors-btn:hover {
		background: #f1542f;
	}
	.close {
		position: absolute;
		top: 0.5rem;
		right: 0.6rem;
		border: none;
		background: none;
		font-size: 1.3rem;
		line-height: 1;
		color: #b7c4b8;
		cursor: pointer;
	}
	.close:hover {
		color: #55624f;
	}
</style>
