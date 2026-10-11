<script lang="ts">
	import { page } from '$app/stores';

	let ready = $state(false);

	$page.url; // trigger page store
</script>

<svelte:head>
	<link rel="preconnect" href="https://tile.openstreetmap.org" />
</svelte:head>

<div class="min-h-screen flex flex-col">
	<header class="bg-neutral-900 text-white px-4 py-3 flex items-center gap-4">
		<h1 class="text-xl font-bold">Comoot</h1>
		<span class="text-sm opacity-70">Rennrad · Gravel · Bikepacking</span>
	</header>

	<main class="flex-1 flex items-center justify-center text-center p-8">
		<div class="max-w-md">
			<p class="text-4xl mb-4">🚴‍♂️</p>
			<h2 class="text-2xl font-semibold mb-2">Routenplaner</h2>
			<p class="text-neutral-500 mb-6">
				Bessere Strecken für Rennrad, Gravel & Bikepacking.<br />
				Surface-bewusst · Verkehrsarm · Landschaftlich
			</p>
			<button class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium">
				Route planen
			</button>
		</div>
	</main>
</div>

<style>
	:global(body) {
		margin: 0;
		font-family: system-ui, sans-serif;
	}
</style>