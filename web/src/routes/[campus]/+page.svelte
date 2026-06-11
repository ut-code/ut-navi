<script lang="ts">
	import MapView from "$lib/map/MapView.svelte";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>ut-navi — {data.campus.name}マップ</title>
</svelte:head>

<MapView config={data.campus} />
