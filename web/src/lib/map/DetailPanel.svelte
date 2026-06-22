<script lang="ts">
	import type { BuildingFloors } from "$lib/data/floors/index.ts";

	type Props = {
		/** 選択中の建物の表示情報 (旧・情報カードの中身) */
		name: string;
		en: string | null;
		levels: string | null;
		/** 階層図データ。無ければ null → 名前・階数だけのコンパクト表示 */
		data: BuildingFloors | null;
		/** 部屋検索などで開いた階。null なら最下階 */
		focusLevel: number | null;
		/** 強調したい号室番号。null なら強調なし */
		focusRoom: string | null;
		onclose: () => void;
	};
	let { name, en, levels, data, focusLevel, focusRoom, onclose }: Props = $props();

	// フォーカス階が来たら追従、なければ最下階。writable $derived なので
	// タブクリックで上書きでき、focusLevel/data が変われば再計算でリセットされる
	let activeLevel = $derived(focusLevel ?? data?.floors[0]?.level ?? 1);
	const activeFloor = $derived(
		data?.floors.find((f) => f.level === activeLevel) ?? data?.floors[0],
	);
</script>

<aside class="panel">
	<header>
		<div class="head-text">
			<h2>{name}</h2>
			{#if en}<p class="sub">{en}</p>{/if}
			{#if levels}<p class="meta">🏢 地上 {levels} 階</p>{/if}
		</div>
		<button class="close" onclick={onclose} aria-label="閉じる">×</button>
	</header>

	{#if data}
		<div class="floor-meta">
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

		{#if data.floors.length > 1}
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
		{/if}

		{#if activeFloor}
			<div class="body">
				<div class="image">
					<img src={activeFloor.image} alt="{name} {activeFloor.label} のフロア図" />
				</div>
				{#if activeFloor.rooms.length > 0}
					<ul class="rooms">
						{#each activeFloor.rooms as room (room.number)}
							<li class:focus={room.number === focusRoom}>
								{#if room.hall}<span class="hall">{room.hall}</span>{/if}
								<span class="r-name">{room.name}</span>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		{/if}
	{/if}
</aside>

<style>
	/*
	 * 統合詳細パネル。建物情報 (旧・情報カード) と階層図を 1 枚にまとめ、
	 * 「選択 → カード → 階層図」の中間状態を無くす。
	 * デスクトップ: 右上のフローティングカード。スマホ: 下からのボトムシート。
	 * いずれも内容に合わせて伸縮し、階層図が長いときだけ内部スクロールする。
	 */
	.panel {
		position: absolute;
		z-index: 20;
		display: flex;
		flex-direction: column;
		background: #ffffff;
		border-left: 5px solid #ff6b4a;
		font-family: system-ui, sans-serif;
		animation: appear 0.18s ease;
		/* デスクトップ: 右上フローティング。下端にズーム/出典を残すため余白を取る */
		top: 1rem;
		right: 1rem;
		width: min(23rem, calc(100% - 2rem));
		max-height: calc(100vh - 5.5rem);
		border-radius: 1rem;
		box-shadow: 0 10px 32px rgba(45, 70, 50, 0.22);
		overflow: hidden;
	}
	@keyframes appear {
		from {
			opacity: 0;
			transform: translateY(-0.5rem);
		}
	}

	header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 0.9rem 1.1rem 0.7rem;
		flex: none;
	}
	.head-text {
		min-width: 0;
	}
	header h2 {
		margin: 0;
		font-size: 1.2rem;
		font-weight: 700;
		color: #2f3a32;
		word-break: break-word;
	}
	.sub {
		margin: 0.2rem 0 0;
		font-size: 0.8rem;
		color: #8aa890;
	}
	.meta {
		margin: 0.45rem 0 0;
		font-size: 0.85rem;
		color: #55624f;
	}
	.close {
		flex: none;
		border: none;
		background: none;
		font-size: 1.5rem;
		line-height: 1;
		color: #b7c4b8;
		cursor: pointer;
		padding: 0 0.2rem;
	}
	.close:hover {
		color: #55624f;
	}

	.floor-meta {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0 1.1rem;
		flex: none;
	}
	.src {
		margin: 0;
		font-size: 0.72rem;
		color: #9bafa0;
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

	.tabs {
		display: flex;
		gap: 0.35rem;
		padding: 0.6rem 1.1rem;
		flex-wrap: wrap;
		flex: none;
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

	/* 階層図の本体だけをスクロール領域にする (ヘッダ・タブは固定) */
	.body {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
	}
	.image {
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
	.r-name {
		font-size: 0.92rem;
		color: #2f3a32;
	}

	/* スマホ: 下からせり上がるボトムシート。地図の幅を潰さない */
	@media (max-width: 640px) {
		.panel {
			top: auto;
			left: 0;
			right: 0;
			bottom: 0;
			width: 100%;
			max-height: 82vh;
			border-left: none;
			border-top: 5px solid #ff6b4a;
			border-radius: 1rem 1rem 0 0;
			box-shadow: 0 -8px 28px rgba(45, 70, 50, 0.22);
			animation: rise 0.2s ease;
		}
	}
	@keyframes rise {
		from {
			transform: translateY(100%);
		}
	}
</style>
