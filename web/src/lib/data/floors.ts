/**
 * 建物の階層図・部屋データ。建物 (OSM id) → 各階 → 部屋。
 *
 * 現状は工学部2号館のみ。データ・フロア図画像は機械情報科学科ではなく
 * JSME 2022 年次大会の会場案内 (下記 source) から拝借した暫定データ。
 * 本来の構内データに差し替えるまでの「とりあえず」版。
 * 部屋に建物内の座標情報はない (地図上での部屋ハイライトはできない)。
 */

export type Room = {
	/** 号室番号 "212" */
	number: string;
	/** 表示名 "212号講義室" */
	name: string;
	/** 会場記号 "A室" 等。このデータ源固有のラベル (なければ null) */
	hall: string | null;
};

export type Floor = {
	/** 階数 (1 始まり) */
	level: number;
	/** 表示ラベル "1F" */
	label: string;
	/** フロア図画像のパス (static 配下) */
	image: string;
	rooms: Room[];
};

export type BuildingFloors = {
	/** OSM の建物 id ("relation/123" 形式)。建物ポリゴンと対応づける */
	buildingId: string;
	buildingName: string;
	/** 出典 (拝借データなので明示) */
	source: string;
	floors: Floor[];
};

const ENG2: BuildingFloors = {
	buildingId: "relation/9693129",
	buildingName: "工学部2号館",
	source: "JSME 2022 年次大会 会場案内 (暫定)",
	floors: [
		{
			level: 1,
			label: "1F",
			image: "/data/floors/eng2/1f.png",
			rooms: [
				{ number: "211", name: "211号講義室", hall: "B室" },
				{ number: "212", name: "212号講義室", hall: "A室" },
				{ number: "213", name: "213号大講義室", hall: "J室" },
			],
		},
		{
			level: 2,
			label: "2F",
			image: "/data/floors/eng2/2f.png",
			rooms: [
				{ number: "221", name: "221号講義室", hall: "C室" },
				{ number: "222", name: "222号講義室", hall: "D室" },
				{ number: "223", name: "223号講義室", hall: "E室" },
			],
		},
		{
			level: 3,
			label: "3F",
			image: "/data/floors/eng2/3f.png",
			rooms: [{ number: "233", name: "233号講義室", hall: "F室" }],
		},
		{
			level: 4,
			label: "4F",
			image: "/data/floors/eng2/4f.png",
			rooms: [
				{ number: "245", name: "245号講義室", hall: "G室" },
				{ number: "246", name: "246号講義室", hall: "H室" },
			],
		},
	],
};

/** 建物 id → 階層データ */
export const FLOOR_DATA: Record<string, BuildingFloors> = {
	[ENG2.buildingId]: ENG2,
};

/** その建物に階層図データがあるか */
export function hasFloors(buildingId: string): boolean {
	return buildingId in FLOOR_DATA;
}

/** 部屋検索のヒット (建物・階の文脈付き) */
export type RoomHit = {
	buildingId: string;
	buildingName: string;
	level: number;
	floorLabel: string;
	room: Room;
};

/** 全建物の部屋をフラットにした検索インデックス */
export const ROOM_INDEX: RoomHit[] = Object.values(FLOOR_DATA).flatMap((b) =>
	b.floors.flatMap((f) =>
		f.rooms.map((room) => ({
			buildingId: b.buildingId,
			buildingName: b.buildingName,
			level: f.level,
			floorLabel: f.label,
			room,
		})),
	),
);

/** 部屋を検索。号室番号・部屋名・会場記号・建物名にマッチ */
export function searchRooms(query: string, limit: number): RoomHit[] {
	const q = query.trim().toLowerCase();
	if (q === "") return [];
	return ROOM_INDEX.filter((hit) => {
		const hall = hit.room.hall?.toLowerCase() ?? "";
		return (
			hit.room.number.includes(q) ||
			hit.room.name.toLowerCase().includes(q) ||
			hall.includes(q) ||
			hit.buildingName.toLowerCase().includes(q)
		);
	}).slice(0, limit);
}
