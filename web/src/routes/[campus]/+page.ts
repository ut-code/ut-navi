import { error } from "@sveltejs/kit";
import { CAMPUSES } from "$lib/map/campuses";
import type { PageLoad } from "./$types";

export const load: PageLoad = ({ params }) => {
	const campus = CAMPUSES[params.campus];
	if (!campus) {
		throw error(404, "Campus not found");
	}
	return { campus };
};

export const entries = () => {
	return Object.keys(CAMPUSES).map((campus) => ({ campus }));
};
