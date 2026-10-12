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
	let open = false;
	let debounceTimer: number | undefined;

	function handleResult(lat: number, lon: number, label: string) {
		value = label;
		query = label;
		selected = true;
		open = false;
		results = [];
		if (onSelect) onSelect(lat, lon, label);
	}

	async function search(q: string) {
		if (q.length < 3) { open = false; results = []; return; }
		loading = true;
		try {
			const res = await fetch(
				`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&countrycodes=de`,
				{ headers: { 'User-Agent': 'Comoot/1.0 (routing app)' } }
			);
			if (!res.ok) { results = []; open = false; return; }
			const data = await res.json();
			results = data.map((r: any) => ({
				lat: parseFloat(r.lat),
				lon: parseFloat(r.lon),
				label: r.display_name.split(',')[0]
			}));
			open = results.length > 0;
		} catch (e) {
			results = [];
			open = false;
		} finally {
			loading = false;
		}
	}

	$: {
		if (query && query.length >= 3 && !selected) {
			clearTimeout(debounceTimer);
			debounceTimer = setTimeout(() => search(query), 300);
		} else if (query.length < 3) {
			open = false;
			results = [];
		}
		selected = false;
	}
</script>

<div class="relative w-full">
	<input
		type="text"
		class="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
		placeholder={placeholder}
		bind:value={query}
		autocomplete="off"
		on:input={() => { selected = false; }}
		on:blur={() => setTimeout(() => { open = false; }, 200)}
		on:focus={() => { if (results.length > 0) open = true; }}
	/>
	{#if loading}
		<div class="absolute right-3 top-3 text-neutral-400">🔍</div>
	{/if}
	{#if open && results.length > 0}
		<ul class="absolute z-50 left-0 right-0 top-full mt-1 bg-white border rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-neutral-200">
			{#each results as r}
				<li
					class="px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer"
					on:mousedown={() => handleResult(r.lat, r.lon, r.label)}
					role="option"
				>
					<div class="font-medium">{r.label}</div>
					<div class="text-[10px] text-neutral-400">{r.lat.toFixed(4)}, {r.lon.toFixed(4)}</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>