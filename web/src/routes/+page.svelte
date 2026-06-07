<script lang="ts">
	import { CAMPUSES } from "$lib/map/campuses.ts";
</script>

<svelte:head><title>ut-navi — 東京大学キャンパスマップ</title></svelte:head>

<main>
	<div class="hero">
		<h1>ut-navi</h1>
		<p>東京大学キャンパスマップ</p>
	</div>

	<div class="campus-selector">
		{#each Object.values(CAMPUSES) as campus}
			<a href="/{campus.id}" class="campus-card">
				<div class="card-content">
					<h2>{campus.name}</h2>
					<p>{campus.id.charAt(0).toUpperCase() + campus.id.slice(1)} Campus</p>
				</div>
				<div class="arrow">→</div>
			</a>
		{/each}
	</div>
</main>

<style>
	:global(body) {
		background-color: #f4f7f4;
		margin: 0;
		font-family:
			system-ui,
			-apple-system,
			sans-serif;
	}

	main {
		max-width: 800px;
		margin: 0 auto;
		padding: 4rem 2rem;
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		justify-content: center;
	}

	.hero {
		text-align: center;
		margin-bottom: 4rem;
	}

	.hero h1 {
		font-size: 4rem;
		font-weight: 800;
		color: #2f3a32;
		margin: 0;
		letter-spacing: -0.02em;
	}

	.hero p {
		font-size: 1.2rem;
		color: #8aa890;
		margin: 0.5rem 0 0;
		font-weight: 500;
	}

	.campus-selector {
		display: grid;
		gap: 1.5rem;
		width: 100%;
		max-width: 500px;
		margin: 0 auto;
	}

	.campus-card {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 2rem 2.5rem;
		background: #ffffff;
		border-radius: 1.5rem;
		text-decoration: none;
		color: inherit;
		box-shadow: 0 4px 20px rgba(45, 70, 50, 0.08);
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
		border: 2px solid transparent;
	}

	.campus-card:hover {
		transform: translateY(-4px);
		box-shadow: 0 12px 30px rgba(45, 70, 50, 0.12);
		border-color: #ff6b4a;
	}

	.card-content h2 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 700;
		color: #2f3a32;
	}

	.card-content p {
		margin: 0.2rem 0 0;
		font-size: 1rem;
		color: #8aa890;
	}

	.arrow {
		font-size: 1.5rem;
		color: #b7c4b8;
		transition: transform 0.2s ease;
	}

	.campus-card:hover .arrow {
		color: #ff6b4a;
		transform: translateX(4px);
	}

	@media (max-width: 600px) {
		.hero h1 {
			font-size: 3rem;
		}
		.campus-card {
			padding: 1.5rem 2rem;
		}
	}
</style>
