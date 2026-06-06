import type { LngLatBoundsLike, StyleSpecification } from "maplibre-gl";

/**
 * 本郷キャンパスの地図定数。
 * 値は OSM relation 5414648 (東京大学本郷キャンパス) の bounds から算出。
 */

/** 初期表示の中心 [lng, lat] */
export const CAMPUS_CENTER: [number, number] = [139.7634, 35.7117];

/**
 * 地図の固定向き (度)。正門→安田講堂のメイン軸 (イチョウ並木) を画面の上に向け、
 * 正門が手前 (下) に来るようにする。OSM の正門 node 1623971579 と
 * 安田講堂 way 134668789 の座標から算出した方位 ≈77°。
 */
export const CAMPUS_BEARING = 77;

/**
 * パン範囲の制限。キャンパス外へ大きくはみ出さないよう余白付きで囲う。
 * MapLibre は [[west, south], [east, north]]。
 * 地図を 77° 回転しているため、回転した画面矩形の対角が axis-aligned な
 * この箱に早く引っかかり、縮小時に端 (上端) までパンできなくなる。
 * それを避けるためキャンパス実寸 (CAMPUS_FIT_BOUNDS) の約2倍まで余白を取る。
 * 背景は単色なので外側に余白が見えても問題ない。
 */
export const CAMPUS_BOUNDS: LngLatBoundsLike = [
	[139.754, 35.704],
	[139.773, 35.72],
];

export const ZOOM: { min: number; max: number; initial: number } = {
	min: 14.5,
	max: 19,
	initial: 15.3,
};

/** キャンパス全体が収まるフィット範囲 (実際の建物境界) */
export const CAMPUS_FIT_BOUNDS: LngLatBoundsLike = [
	[139.7589, 35.7078],
	[139.7678, 35.7156],
];

/** OSM 由来データの出典表記 (ODbL 義務) */
export const OSM_ATTRIBUTION =
	'地図データ &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';

/**
 * ベースマップのスタイル。
 * 周辺の道路・建物・店舗まで写る通常の地図タイルは使わず、単色背景だけの
 * 最小スタイルにする。この上に自前のキャンパス境界・建物 GeoJSON だけを描き、
 * 「キャンパス以外が写らないシンプルな 2D マップ」にするのが狙い。
 * glyphs は建物名ラベル用フォント。OpenFreeMap のものを借りる (日本語対応)。
 */
export const BASE_STYLE: StyleSpecification = {
	version: 8,
	glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
	sources: {},
	layers: [
		{
			id: "background",
			// キャンパスの緑地を思わせる柔らかいミントグリーン。学生向けに親しみやすく
			type: "background",
			paint: { "background-color": "#e7f1e8" },
		},
	],
};
