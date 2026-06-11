<script lang="ts">
	import type { BuildingFloors } from "$lib/data/floors.ts";

	type Props = {
		data: BuildingFloors;
		/** 部屋検索などで開いた階。null なら最下階 */
		focusLevel: number | null;
		/** 強調したい号室番号。null なら強調なし */
		focusRoom: string | null;
		onclose: () => void;
	};
	let { data, focusLevel, focusRoom, onclose }: Props = $props();

	// フォーカス階が来たら追従、なければ最下階。writable $derived なので
	// タブクリックで上書きでき、focusLevel/data が変われば再計算でリセットされる
	let activeLevel = $derived(focusLevel ?? data.floors[0]?.level ?? 1);
	const activeFloor = $derived(data.floors.find((f) => f.level === activeLevel) ?? data.floors[0]);
</script>

<aside class="floor">
	<header>
		<div>
			<h2>{data.buildingName}</h2>
			<div class="meta">
				<p class="src">階層図: {data.source}</p>
				{#if data.websiteUrl}
					<a href={data.websiteUrl} target="_blank" rel="external noopener noreferrer" class="link">
						関連サイト
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="12"
							height="12"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
							<polyline points="15 3 21 3 21 9" />
							<line x1="10" y1="14" x2="21" y2="3" />
						</svg>
					</a>
				{/if}
			</div>
		</div>
		<button class="close" onclick={onclose} aria-label="閉じる">×</button>
	</header>

	<div class="tabs" role="tablist">
		{#each data.floors as f (f.level)}
			<button
				role="tab"
				aria-selected={f.level === activeLevel}
				class:active={f.level === activeLevel}
				onclick={() => (activeLevel = f.level)}
			>
				{f.label}
			</button>
		{/each}
	</div>

	{#if activeFloor}
		<div class="image">
			<img src={activeFloor.image} alt="{data.buildingName} {activeFloor.label} のフロア図" />
		</div>
		<ul class="rooms">
			{#each activeFloor.rooms as room (room.number)}
				<li class:focus={room.number === focusRoom}>
					{#if room.hall}<span class="hall">{room.hall}</span>{/if}
					<span class="name">{room.name}</span>
				</li>
			{/each}
		</ul>
	{:else}
		<div class="no-floor">
			<p>階層図が見当たりません。</p>
		</div>
	{/if}
</aside>

<style>
	.no-floor {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #9bafa0;
		font-size: 0.9rem;
	}
	.floor {
		position: absolute;
		top: 0;
		right: 0;
		bottom: 0;
		width: min(24rem, 100%);
		display: flex;
		flex-direction: column;
		background: #ffffff;
		box-shadow: -8px 0 28px rgba(45, 70, 50, 0.18);
		font-family: system-ui, sans-serif;
		z-index: 20;
	}
	header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 1rem 1.1rem 0.6rem;
		border-bottom: 1px solid #eef2ee;
	}
	header h2 {
		margin: 0;
		font-size: 1.15rem;
		font-weight: 700;
		color: #2f3a32;
	}
	header .src {
		margin: 0;
		font-size: 0.72rem;
		color: #9bafa0;
	}
	.meta {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-top: 0.2rem;
	}
	.link {
		font-size: 0.72rem;
		color: #4a8c5f;
		text-decoration: none;
		display: flex;
		align-items: center;
		gap: 0.2rem;
	}
	.link:hover {
		text-decoration: underline;
	}
	.close {
		border: none;
		background: none;
		font-size: 1.4rem;
		line-height: 1;
		color: #b7c4b8;
		cursor: pointer;
	}
	.close:hover {
		color: #55624f;
	}
	.tabs {
		display: flex;
		gap: 0.35rem;
		padding: 0.7rem 1.1rem;
		flex-wrap: wrap;
	}
	.tabs button {
		border: none;
		background: #f1f7f1;
		color: #55624f;
		padding: 0.35rem 0.9rem;
		border-radius: 999px;
		font-size: 0.9rem;
		cursor: pointer;
	}
	.tabs button.active {
		background: #ff6b4a;
		color: #ffffff;
	}
	.image {
		flex: 1;
		min-height: 0;
		overflow: auto;
		padding: 0 1.1rem;
		background: #f7faf7;
	}
	.image img {
		display: block;
		width: 100%;
		height: auto;
	}
	.rooms {
		list-style: none;
		margin: 0;
		padding: 0.7rem 1.1rem 1.1rem;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		border-top: 1px solid #eef2ee;
	}
	.rooms li {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.45rem 0.6rem;
		border-radius: 0.6rem;
	}
	.rooms li.focus {
		background: #fff0eb;
		outline: 2px solid #ff6b4a;
	}
	.hall {
		flex: none;
		min-width: 2.4rem;
		text-align: center;
		font-size: 0.78rem;
		font-weight: 700;
		color: #ff6b4a;
		background: #fff0eb;
		border-radius: 0.4rem;
		padding: 0.15rem 0.4rem;
	}
	.name {
		font-size: 0.92rem;
		color: #2f3a32;
	}
</style>
