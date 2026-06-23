<script lang="ts">
	import MapView from "$lib/map/MapView.svelte";
	import type { PageProps } from "./$types";

	let { data }: PageProps = $props();
</script>

<svelte:head><title>{data.campus.name} — ut-navi</title></svelte:head>

<!-- #key でキャンパス切替時に MapView を再マウントする。
     $effect で config 変化に反応する案もあるが、
     selected・query 等のローカル状態も一緒にリセットしたいため {#key} が正解。
     onMount は「マウント時に一度だけ」と意味が明確で、非同期 map.on("load") との相性もいい。 -->
{#key data.campus.id}
	<MapView config={data.campus} />
{/key}
