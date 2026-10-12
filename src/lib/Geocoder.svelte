<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		placeholder?: string;
		value?: string;
		onSelect?: (lat: number, lon: number, label: string) => void;
	}

	export let placeholder = 'Ort suchen…';
	export let value = '';
	export let onSelect: ((lat: number, lon: number, label: string) => void) | undefined;

	let query = '';
	let results: Array<{lat: number; lon: number; label: string}> = [];
	let loading = false;
	let selected = false;
	let debounceTimer: number | undefined;

	// Expose value to parent
	function handleResult(lat: number, lon: number, label: string) {
		value = label;
		query = label;
		selected = true;
		results = [];
		if (onSelect) onSelect(lat, lon, label);
	}

	async function search(q: string) {
		if (q.length < 3) { results = []; return; }
		loading = true;
		try {
			const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&countrycodes=de`);
			if (!res.ok) return;
			const data = await res.json();
			results = data.map((r: any) => ({
				lat: parseFloat(r.lat),
				lon: parseFloat(r.lon),
				label: r.display_name.split(',')[0]
			}));
		} catch (e) {
			results = [];
		} finally {
			loading = false;
		}
	}

	$: {
		if (query && !selected && query.length >= 3) {
			clearTimeout(debounceTimer);
			debounceTimer = setTimeout(() => search(query), 400);
		} else if (query.length < 3) {
			results = [];
		}
		selected = false;
	}
</script>

<div class="relative">
	<input
		type="text"
		class="w-full px-2 py-1.5 border rounded text-sm"
		placeholder={placeholder}
		bind:value={query}
		autocomplete="off"
	/>
	{#if loading}
		<div class="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 text-xs">🔍</div>
	{/if}
	{#if results.length > 0}
		<div class="absolute z-50 top-full left-0 right-0 mt-0.5 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
			{#each results as r}
				<button
					class="w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 cursor-pointer border-b border-neutral-100 last:border-b-0"
					on:click={() => handleResult(r.lat, r.lon, r.label)}
				>
					{r.label}
				</button>
			{/each}
		</div>
	{/if}
</div>