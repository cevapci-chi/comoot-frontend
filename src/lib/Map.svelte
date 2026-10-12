<script lang="ts">
	export let initialCenter: [number, number] = [11.5756, 48.1374];
	export let initialZoom = 12;
	export let onMapClick: ((lon: number, lat: number) => void) | undefined = undefined;
	export let waypoints: Array<{lon: number; lat: number; label: string; color: string}> = [];
	export let routeCoords: Array<[number, number]> = [];

	let container: HTMLDivElement;
	let mapReady = false;

	function initLeaflet() {
		const L = (window as any).L;
		if (!L || !container) { setTimeout(initLeaflet, 200); return; }

		const map = L.map(container).setView([initialCenter[1], initialCenter[0]], initialZoom);

		L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
			maxZoom: 19,
			attribution: '© OpenStreetMap'
		}).addTo(map);

		L.tileLayer('https://a.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png', {
			maxZoom: 18
		}).addTo(map);

		// Add markers for waypoints
		function refreshMarkers() {
			// Remove old markers (simple approach: just clear)
		}

		for (const wp of waypoints) {
			L.marker([wp.lat, wp.lon]).addTo(map);
		}

		// Route line
		if (routeCoords.length > 1) {
			L.polyline(routeCoords.map(c => [c[1], c[0]]), {color: '#2563eb', weight: 5}).addTo(map);
		}

		map.on('click', (e: any) => {
			if (onMapClick) onMapClick(e.latlng.lng, e.latlng.lat);
		});

		mapReady = true;
		console.log('[Map] Ready');
	}
</script>

<svelte:head>
	<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
	<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
</svelte:head>

<div bind:this={container} class="map-container w-full h-full" style="min-height:500px">
	<div class="absolute inset-0 flex items-center justify-center text-neutral-400 z-10">
		Lade Karte…
	</div>
</div>

<style>
	:global(.map-container) { position: relative; }
	:global(.map-container.leaflet-ready > div:first-child) { display: none; }
	:global(body) { margin: 0; }
</style>