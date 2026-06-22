import type { BuildingFloors } from "./index.ts";

// データ・フロア図画像は JSME 2022 年次大会の会場案内から拝借した暫定。本来の構内データに差し替える前提
export const HONGO_BUILDINGS: BuildingFloors[] = [
	{
		campusId: "hongo",
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
	},
];
