import type { StyleSpecification } from "maplibre-gl";

/** OSM 由来データの出典表記 (ODbL 義務) */
export const OSM_ATTRIBUTION =
	'地図データ &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';

/**
 * ベースマップのスタイル。
 * 周辺の道路・建物・店舗まで写る通常の地図タイルは使わず、単色背景だけの最小スタイルにする。
 * この上に自前のキャンパス GeoJSON だけを描き、「キャンパス以外が写らない 2D マップ」にするのが狙い。
 * glyphs は建物名ラベル用フォント。OpenFreeMap のものを借りる (日本語対応)。
 */
export const BASE_STYLE: StyleSpecification = {
	version: 8,
	glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
	sources: {},
	layers: [
		{
			id: "background",
			// キャンパスの緑地を思わせる柔らかいミントグリーン
			type: "background",
			paint: { "background-color": "#e7f1e8" },
		},
	],
};

export type { CampusConfig, CampusId } from "$lib/data/campuses.ts";
export { CAMPUSES, CampusIdSchema } from "$lib/data/campuses.ts";
