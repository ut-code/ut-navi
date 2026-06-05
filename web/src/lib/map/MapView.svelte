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
	} from "./campus";

	type Selected = {
		id: string;
		name: string;
		levels: string | null;
		en: string | null;
	};

	let container: HTMLDivElement;
	let map: maplibregl.Map | undefined;
	let selected = $state<Selected | null>(null);

	/** GeoJSON プロパティは unknown。文字列のときだけ取り出す (assertion 不可なので実行時判定) */
	function asString(v: unknown): string | null {
		return typeof v === "string" ? v : null;
	}

	function clearSelection() {
		selected = null;
		// 何にもマッチしない式に戻してハイライトを消す
		map?.setFilter("campus-buildings-selected", ["==", ["get", "id"], ""]);
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

			// 道路・歩道。建物の下に敷くため最初に追加 (描画は追加順=下から)。
			// footway/path/steps は細く、それ以外(車道系)は太めにして主従をつける
			map.addLayer({
				id: "campus-roads-line",
				type: "line",
				source: "campus-roads",
				layout: { "line-cap": "round", "line-join": "round" },
				paint: {
					"line-color": "#cbd2db",
					"line-width": [
						"interpolate",
						["linear"],
						["zoom"],
						14,
						["match", ["get", "highway"], ["footway", "path", "steps", "pedestrian"], 1, 2],
						18,
						["match", ["get", "highway"], ["footway", "path", "steps", "pedestrian"], 3, 7],
					],
				},
			});

			// 境界線
			map.addLayer({
				id: "campus-boundary-line",
				type: "line",
				source: "campus-boundary",
				paint: { "line-color": "#2563eb", "line-width": 2, "line-opacity": 0.6 },
			});

			// 建物ポリゴン
			map.addLayer({
				id: "campus-buildings-fill",
				type: "fill",
				source: "campus-buildings",
				paint: { "fill-color": "#60a5fa", "fill-opacity": 0.35 },
			});
			map.addLayer({
				id: "campus-buildings-outline",
				type: "line",
				source: "campus-buildings",
				paint: { "line-color": "#2563eb", "line-width": 1 },
			});

			// 選択中の建物だけを強調するレイヤー。初期は何にもマッチしない式
			map.addLayer({
				id: "campus-buildings-selected",
				type: "line",
				source: "campus-buildings",
				filter: ["==", ["get", "id"], ""],
				paint: { "line-color": "#f97316", "line-width": 3 },
			});

			// 建物名ラベル。フォントは OpenFreeMap の glyphs を利用 (日本語対応)
			map.addLayer({
				id: "campus-buildings-label",
				type: "symbol",
				source: "campus-buildings",
				filter: ["has", "name"],
				layout: {
					"text-field": ["get", "name"],
					"text-font": ["Noto Sans Regular"],
					"text-size": 11,
					"text-max-width": 8,
				},
				paint: {
					"text-color": "#1e3a8a",
					"text-halo-color": "#ffffff",
					"text-halo-width": 1.5,
				},
			});

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
				map.setFilter("campus-buildings-selected", ["==", ["get", "id"], id]);
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

{#if selected}
	<div class="info-card">
		<button class="close" onclick={clearSelection} aria-label="閉じる">×</button>
		<h2>{selected.name}</h2>
		{#if selected.en}<p class="sub">{selected.en}</p>{/if}
		{#if selected.levels}<p class="meta">地上 {selected.levels} 階</p>{/if}
	</div>
{/if}

<style>
	.map {
		position: absolute;
		inset: 0;
	}
	.info-card {
		position: absolute;
		left: 1rem;
		bottom: 1rem;
		min-width: 14rem;
		max-width: min(20rem, calc(100% - 2rem));
		padding: 0.9rem 1.1rem;
		background: #ffffff;
		border-radius: 0.6rem;
		box-shadow: 0 6px 24px rgba(0, 0, 0, 0.18);
		font-family: system-ui, sans-serif;
	}
	.info-card h2 {
		margin: 0 1.5rem 0 0;
		font-size: 1.05rem;
		color: #1e293b;
	}
	.info-card .sub {
		margin: 0.2rem 0 0;
		font-size: 0.8rem;
		color: #64748b;
	}
	.info-card .meta {
		margin: 0.4rem 0 0;
		font-size: 0.85rem;
		color: #334155;
	}
	.close {
		position: absolute;
		top: 0.4rem;
		right: 0.5rem;
		border: none;
		background: none;
		font-size: 1.2rem;
		line-height: 1;
		color: #94a3b8;
		cursor: pointer;
	}
	.close:hover {
		color: #475569;
	}
</style>
