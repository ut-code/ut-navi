<script lang="ts">
	import MapView from "$lib/map/MapView.svelte";
	import type { PageProps } from "./$types";

	let { data }: PageProps = $props();
</script>

<svelte:head><title>{data.campus.name} — ut-navi</title></svelte:head>

<MapView config={data.campus} />
