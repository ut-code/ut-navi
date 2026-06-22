import type { CampusId } from "$lib/data/campuses.ts";
import { HONGO_BUILDINGS } from "./hongo.ts";
import { KOMABA_BUILDINGS } from "./komaba.ts";

export type Room = {
	number: string;
	name: string;
	/** 会場記号 "A室" 等。このデータ源固有のラベル (なければ null) */
	hall: string | null;
};

export type Floor = {
	level: number;
	label: string;
	/** フロア図画像のパス (static 配下) */
	image: string;
	rooms: Room[];
};

export type BuildingFloors = {
	campusId: CampusId;
	/** OSM の建物 id ("relation/123" 形式)。建物ポリゴンと対応づける */
	buildingId: string;
	buildingName: string;
	source: string;
	websiteUrl?: string;
	floors: Floor[];
};

export const FLOOR_DATA: Record<string, BuildingFloors> = Object.fromEntries(
	[...HONGO_BUILDINGS, ...KOMABA_BUILDINGS].map((b) => [b.buildingId, b]),
);

export type RoomHit = {
	campusId: CampusId;
	buildingId: string;
	buildingName: string;
	level: number;
	floorLabel: string;
	room: Room;
};

const ROOM_INDEX: RoomHit[] = Object.values(FLOOR_DATA).flatMap((b) =>
	b.floors.flatMap((f) =>
		f.rooms.map((room) => ({
			campusId: b.campusId,
			buildingId: b.buildingId,
			buildingName: b.buildingName,
			level: f.level,
			floorLabel: f.label,
			room,
		})),
	),
);

/**
 * 部屋を検索。号室番号・部屋名・会場記号・建物名にマッチ。
 * campusId を指定すると同キャンパスのみに絞る。
 *
 * 現状は同キャンパスのみを想定。他キャンパスへの対応は以下が必要:
 * - 他キャンパスの結果を別セクションで表示
 * - クリックで /?campus=xxx に遷移 + 建物フォーカス
 * - フォーカスを URL パラメータ (?building=relation/xxx) で表現し、
 *   ページロード時に flyTo + DetailPanel を開く
 */
export function searchRooms(query: string, limit: number, campusId?: CampusId): RoomHit[] {
	const q = query.trim().toLowerCase();
	if (q === "") return [];
	return ROOM_INDEX.filter((hit) => {
		if (campusId !== undefined && hit.campusId !== campusId) return false;
		const hall = hit.room.hall?.toLowerCase() ?? "";
		return (
			hit.room.number.includes(q) ||
			hit.room.name.toLowerCase().includes(q) ||
			hall.includes(q) ||
			hit.buildingName.toLowerCase().includes(q)
		);
	}).slice(0, limit);
}

export function hasFloors(buildingId: string): boolean {
	return buildingId in FLOOR_DATA;
}

export function getWebsiteUrl(buildingId: string): string | null {
	return FLOOR_DATA[buildingId]?.websiteUrl ?? null;
}
