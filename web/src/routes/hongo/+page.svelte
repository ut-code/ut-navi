<script lang="ts">
	import MapView from "$lib/map/MapView.svelte";
	import { CAMPUSES } from "$lib/map/campuses.ts";
</script>

<svelte:head><title>ut-navi — 本郷キャンパスマップ</title></svelte:head>

<MapView config={CAMPUSES.hongo} />
