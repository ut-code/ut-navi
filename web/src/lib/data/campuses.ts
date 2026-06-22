import type { LngLatBoundsLike } from "maplibre-gl";
import * as v from "valibot";

export type CampusConfig = {
	id: string;
	name: string;
	center: [number, number];
	/**
	 * 地図の固定向き (度)。正門→象徴的建物のメイン軸を画面上向きにした結果、正門が下に来る。
	 * 算出根拠は各キャンパスの値の隣のコメント参照。
	 */
	bearing: number;
	/**
	 * パン範囲の制限。キャンパス外へ大きくはみ出さないよう余白付きで囲う。
	 * 地図を bearing で回転しているため、回転した画面矩形の対角が axis-aligned な
	 * この箱に引っかかる。縮小時に端までパンできなくなるのを避けるため実寸の約2倍の余白を取る。
	 * 背景は単色なので外側に余白が見えても問題ない。
	 */
	bounds: LngLatBoundsLike;
	fitBounds: LngLatBoundsLike;
	zoom: { min: number; max: number; initial: number };
};

export const CAMPUSES = {
	hongo: {
		id: "hongo",
		name: "本郷キャンパス",
		center: [139.7634, 35.7117] as [number, number],
		bearing: 77, // 正門 node 1623971579 → 安田講堂 way 134668789 の軸
		bounds: [
			[139.754, 35.704],
			[139.773, 35.72],
		],
		fitBounds: [
			[139.7589, 35.7078],
			[139.7678, 35.7156],
		],
		zoom: { min: 14.5, max: 19, initial: 15.3 },
	},
	komaba: {
		id: "komaba",
		name: "駒場キャンパス",
		center: [139.6841, 35.6605] as [number, number],
		bearing: -13, // 正門 → 1号館・時計台のメイン軸
		bounds: [
			[139.674, 35.653],
			[139.694, 35.668],
		],
		fitBounds: [
			[139.679, 35.657],
			[139.689, 35.664],
		],
		zoom: { min: 14.5, max: 19, initial: 15.5 },
	},
} satisfies Record<string, CampusConfig>;

export type CampusId = keyof typeof CAMPUSES;

export const CampusIdSchema = v.fallback(
	v.picklist(Object.keys(CAMPUSES) as [CampusId, ...CampusId[]]),
	"komaba" satisfies CampusId,
);
