import * as v from "valibot";
import { CAMPUSES, CampusIdSchema, type CampusConfig } from "$lib/map/campuses.ts";
import type { PageLoad } from "./$types";

export const load: PageLoad = ({ url }): { campus: CampusConfig } => {
	const id = v.parse(CampusIdSchema, url.searchParams.get("campus"));
	return { campus: CAMPUSES[id] };
};
