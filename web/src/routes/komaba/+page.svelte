<script lang="ts">
	import MapView from "$lib/map/MapView.svelte";
	import { CAMPUSES } from "$lib/map/campuses.ts";
</script>

<svelte:head><title>ut-navi — 駒場キャンパスマップ</title></svelte:head>

<MapView config={CAMPUSES.komaba} />
