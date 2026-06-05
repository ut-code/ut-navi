import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** shadcn-svelte 標準の class 合成ヘルパ。 */
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}
