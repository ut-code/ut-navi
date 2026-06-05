/**
 * 本郷キャンパスの建物・境界を Overpass API から取得し GeoJSON に焼く。
 *   bun run scripts/fetch-buildings.ts
 *
 * OSM relation 5414648 = 東京大学本郷キャンパス。その area 内部の building だけを
 * 抽出するので周辺のマンション等は混ざらない。実行時に Overpass を叩かないよう、
 * 結果は static/data/*.geojson にコミットして使う。
 */
import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
// osmtogeojson は CJS。bun はそのまま解決できる。
import osmtogeojson from "osmtogeojson";

// 混雑時は 504 を返すので複数ミラーを順に試す
const ENDPOINTS = [
	"https://overpass-api.de/api/interpreter",
	"https://overpass.kumi.systems/api/interpreter",
	"https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];
const CAMPUS_RELATION = 5414648; // 東京大学本郷キャンパス
const OUT_DIR = resolve(
	dirname(fileURLToPath(import.meta.url)),
	"../static/data",
);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function overpass(query: string): Promise<unknown> {
	let lastErr: unknown;
	for (let attempt = 0; attempt < 6; attempt++) {
		const endpoint = ENDPOINTS[attempt % ENDPOINTS.length];
		if (endpoint === undefined) continue; // modulo で必ず範囲内だが型を絞るため
		try {
			const res = await fetch(endpoint, {
				method: "POST",
				// User-Agent が無いと 406 で弾かれる
				headers: { "User-Agent": "ut-navi/0.1 (campus map; dev)" },
				body: new URLSearchParams({ data: query }),
			});
			if (!res.ok)
				throw new Error(
					`Overpass ${res.status}: ${(await res.text()).slice(0, 200)}`,
				);
			return await res.json();
		} catch (e) {
			lastErr = e;
			console.warn(`  retry ${attempt + 1}: ${endpoint} failed`);
			await sleep(2000 * (attempt + 1));
		}
	}
	throw lastErr;
}

async function main() {
	console.log("fetching buildings inside Hongo campus...");
	const buildings = await overpass(
		`[out:json][timeout:90];rel(${CAMPUS_RELATION});map_to_area->.campus;` +
			`(way["building"](area.campus);relation["building"](area.campus););out geom;`,
	);

	console.log("fetching campus boundary...");
	const boundary = await overpass(
		`[out:json][timeout:60];rel(${CAMPUS_RELATION});out geom;`,
	);

	console.log("fetching roads/paths inside Hongo campus...");
	// highway=* は車道だけでなく footway/path/steps も含む。構内は歩行者動線が主役
	const roads = await overpass(
		`[out:json][timeout:90];rel(${CAMPUS_RELATION});map_to_area->.campus;` +
			`(way["highway"](area.campus););out geom;`,
	);

	// osmtogeojson の引数型は any なので unknown をそのまま渡せる
	const buildingsGeo = osmtogeojson(buildings);
	const boundaryGeo = osmtogeojson(boundary);
	const roadsGeo = osmtogeojson(roads);

	// 建物はポリゴンのみ残す (ノード等を除外)
	buildingsGeo.features = buildingsGeo.features.filter(
		(f) =>
			f.geometry?.type === "Polygon" || f.geometry?.type === "MultiPolygon",
	);
	// 道路はラインのみ残す
	roadsGeo.features = roadsGeo.features.filter(
		(f) =>
			f.geometry?.type === "LineString" ||
			f.geometry?.type === "MultiLineString",
	);

	await writeFile(
		resolve(OUT_DIR, "hongo-buildings.geojson"),
		`${JSON.stringify(buildingsGeo)}\n`,
	);
	await writeFile(
		resolve(OUT_DIR, "hongo-boundary.geojson"),
		`${JSON.stringify(boundaryGeo)}\n`,
	);
	await writeFile(
		resolve(OUT_DIR, "hongo-roads.geojson"),
		`${JSON.stringify(roadsGeo)}\n`,
	);

	const named = buildingsGeo.features.filter((f) => f.properties?.name).length;
	console.log(
		`done: ${buildingsGeo.features.length} buildings (${named} named), ` +
			`${roadsGeo.features.length} roads -> ${OUT_DIR}`,
	);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
