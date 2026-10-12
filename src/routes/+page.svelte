<script lang="ts">
	import Map from '$lib/Map.svelte';
	import Geocoder from '$lib/Geocoder.svelte';

	let selectedProfile = 'gravel';

	// Waypoints
	let waypoints: Array<{lon: number; lat: number; label: string; color: string}> = [];
	let startLabel = '';
	let destLabel = '';

	// Route state
	let routeCoords: Array<[number, number]> = [];
	let distanceKm = 0;
	let elevationGain = 0;
	let surfaceBreakdown = '–';
	let loading = false;
	let errorMsg = '';
	let routeResult: any = null;

	// Recent center
	let mapCenter: [number, number] = [11.5756, 48.1374];
	let mapZoom = 8;

	function setWaypoint(lat: number, lon: number, label: string) {
		if (waypoints.length === 0) {
			waypoints = [{lon, lat, label: 'S', color: '#22c55e'}];
			startLabel = label;
		} else if (waypoints.length === 1) {
			waypoints = [...waypoints, {lon, lat, label: 'Z', color: '#ef4444'}];
			destLabel = label;
		} else {
			const n = waypoints.length - 1;
			waypoints = [...waypoints, {lon, lat, label: String.fromCharCode(65 + n), color: '#3b82f6'}];
		}
		mapCenter = [lon, lat];
	}

	function onMapClick(lon: number, lat: number) {
		const label = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
		setWaypoint(lat, lon, label);
	}

	function onStartSelect(lat: number, lon: number, label: string) {
		if (waypoints.length === 0) {
			setWaypoint(lat, lon, label);
		} else if (waypoints.length >= 1) {
			// Replace start point
			if (waypoints.length > 1) routeCoords = [];
			const oldAddr = startLabel;
			waypoints[0] = {lon, lat, label: 'S', color: '#22c55e'};
			startLabel = label;
		}
	}

	function onDestSelect(lat: number, lon: number, label: string) {
		if (waypoints.length === 0) {
			// Set start as approximate center, dest as selected
			setWaypoint(lat, lon, label);
		} else if (waypoints.length === 1) {
			setWaypoint(lat, lon, label);
		} else if (waypoints.length >= 2) {
			if (waypoints.length > 2) routeCoords = [];
			waypoints[waypoints.length - 1] = {lon, lat, label: 'Z', color: '#ef4444'};
			destLabel = label;
		}
	}

	function removeLast() {
		if (waypoints.length === 0) return;
		waypoints = waypoints.slice(0, -1);
		if (waypoints.length <= 1) {
			destLabel = '';
			if (waypoints.length === 0) startLabel = '';
		}
		routeCoords = []; routeResult = null;
		distanceKm = 0; elevationGain = 0; surfaceBreakdown = '–';
	}

	function resetAll() {
		waypoints = []; startLabel = ''; destLabel = '';
		routeCoords = []; routeResult = null;
		distanceKm = 0; elevationGain = 0; surfaceBreakdown = '–';
		errorMsg = '';
	}

	async function planRoute() {
		if (waypoints.length < 2) return;
		loading = true; errorMsg = '';
		const pts = waypoints.filter((_, i) => i === 0 || i === waypoints.length - 1);
		if (waypoints.length > 2) pts.splice(1, 0, ...waypoints.slice(1, waypoints.length - 1).map((w) => w));

		const body = {
			waypoints: pts.map(wp => ({lat: wp.lat, lng: wp.lon})),
			profile: selectedProfile,
			preferences: { scenic: 0.5, avoid_traffic: 0.5, wind_optimize: false, max_gradient: 15 }
		};

		try {
			const res = await fetch('/api/routing/plan', {
				method: 'POST', headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
			if (!res.ok) { throw new Error(await res.text()); }
			const data = await res.json();
			routeResult = data;
			routeCoords = data.geometry?.coordinates || [];
			distanceKm = data.distance_km || 0;
			elevationGain = data.elevation_gain || 0;
			const sb = data.surface_breakdown || {asphalt:0, gravel:0, trail:0};
			surfaceBreakdown = `${sb.asphalt}% Asphalt, ${sb.gravel}% Gravel, ${sb.trail}% Trail`;
		} catch (e: any) {
			errorMsg = e.message || 'Fehler bei der Routenberechnung';
		} finally { loading = false; }
	}
</script>

<svelte:head>
	<link rel="preconnect" href="https://tile.openstreetmap.org" />
	<link rel="preconnect" href="https://a.tile-cyclosm.openstreetmap.fr" />
	<link rel="preconnect" href="https://nominatim.openstreetmap.org" />
</svelte:head>

<div class="min-h-screen flex flex-col">
	<header class="bg-neutral-900 text-white px-4 py-3 flex items-center justify-between shadow-md">
		<div class="flex items-center gap-4">
			<h1 class="text-xl font-bold">Comoot</h1>
			<span class="text-sm opacity-70">Rennrad · Gravel · Bikepacking</span>
		</div>
		<div class="flex items-center gap-2">
			<select class="bg-neutral-800 text-white px-3 py-1 rounded border border-neutral-600 text-sm" bind:value={selectedProfile}>
				<option value="road">🚴 Rennrad</option>
				<option value="gravel" selected>🪨 Gravel</option>
				<option value="bikepacking">🏕️ Bikepacking</option>
			</select>
		</div>
	</header>

	<main class="flex-1 relative">
		<Map
			initialCenter={mapCenter}
			initialZoom={mapZoom}
			onMapClick={onMapClick}
			waypoints={waypoints}
			routeCoords={routeCoords}
		/>

		<!-- Waypoint Input Panel -->
		<div class="absolute top-16 left-4 z-20 bg-white rounded-lg shadow-lg p-4 w-80 {routeResult ? 'hidden' : ''}">
			<h3 class="font-semibold mb-2">📍 Route planen</h3>
			<div class="space-y-2 text-sm">
				<div>
					<label class="block text-neutral-500 mb-1">Start</label>
					<Geocoder placeholder="Ort oder Adresse eingeben…" onSelect={onStartSelect} value={startLabel} />
				</div>
				<div>
					<label class="block text-neutral-500 mb-1">Ziel</label>
					<Geocoder placeholder="Ort oder Adresse eingeben…" onSelect={onDestSelect} value={destLabel} />
				</div>
				{#each waypoints.slice(2) as via, i}
					<div class="text-neutral-500 text-xs flex items-center gap-2">
						<span style="color:{via.color}">●</span> Zwischenstopp {i+1}: {via.lat.toFixed(4)}, {via.lon.toFixed(4)}
					</div>
				{/each}
				<p class="text-xs text-neutral-400 mt-1">
					👉 Klicke auf die Karte oder suche oben
				</p>
				<button class="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium text-sm"
					on:click={planRoute} disabled={loading || waypoints.length < 2}>
					{loading ? 'Berechne…' : '🚲 Route planen'}
				</button>
				<button class="w-full text-neutral-500 text-sm py-1" on:click={removeLast}
					disabled={waypoints.length === 0}>
					Letzten Punkt entfernen
				</button>
				<button class="w-full text-red-500 text-xs py-1" on:click={resetAll}
					disabled={waypoints.length === 0 && routeCoords.length === 0}>
					Alles zurücksetzen
				</button>
			</div>
			<div class="text-[10px] text-neutral-400 mt-2">
				© <a href="https://nominatim.openstreetmap.org" class="underline" target="_blank">Nominatim</a> / <a href="https://www.openstreetmap.org/copyright" class="underline" target="_blank">OSM</a>
			</div>
		</div>

		<!-- Route Result Panel -->
		{#if routeResult}
			<div class="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:bottom-4 md:w-80 bg-white rounded-lg shadow-lg p-4 z-20">
				<h3 class="font-semibold mb-2">📊 Routendetails</h3>
				<div class="text-sm text-neutral-600 space-y-1">
					<div class="flex justify-between">
						<span>Distanz:</span>
						<span class="font-medium text-right">{distanceKm} km</span>
					</div>
					<div class="flex justify-between">
						<span>Höhenmeter:</span>
						<span class="font-medium text-right">{elevationGain} m</span>
					</div>
					<div class="flex justify-between">
						<span>Profil:</span>
						<span class="font-medium text-right">{selectedProfile === 'road' ? 'Rennrad' : selectedProfile === 'gravel' ? 'Gravel' : 'Bikepacking'}</span>
					</div>
					<div class="mt-1">
						<details open>
							<summary class="cursor-pointer text-xs font-medium text-neutral-700">🛣️ Surface ({surfaceBreakdown})</summary>
							<div class="w-full h-2 rounded overflow-hidden mt-1">
								{#if routeResult.surface_breakdown}
									{@const sb = routeResult.surface_breakdown}
									{@const parts = [
										{label:'Asphalt', pct: sb.asphalt, color: '#374151'},
										{label:'Gravel', pct: sb.gravel, color: '#a16207'},
										{label:'Trail', pct: sb.trail, color: '#15803d'}
									]}
									<div class="w-full h-2 flex rounded overflow-hidden text-[0px]">
										{#each parts as p}
											{#if p.pct > 0}
												<div style="width:{p.pct}%;background:{p.color};" title="{p.label} {p.pct}%">&zwnj;</div>
											{/if}
										{/each}
									</div>
									<div class="flex gap-2 text-[10px] mt-1">
										{#each parts as p}
											{#if p.pct > 0}
												<span style="color:{p.color}" class="flex items-center gap-0.5">
													<span class="w-2 h-2 rounded-sm" style="background:{p.color}"></span>{p.label} {p.pct}%
												</span>
											{/if}
										{/each}
									</div>
								{/if}
							</div>
						</details>
					</div>
				</div>
				<div class="mt-2 space-y-1">
					<button class="w-full bg-neutral-200 hover:bg-neutral-300 text-neutral-800 py-2 rounded-lg font-medium text-sm"
						on:click={resetAll}>
						🔄 Neue Route
					</button>
				</div>
			</div>
		{/if}

		{#if errorMsg}
			<div class="absolute top-4 right-4 z-30 bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-sm shadow-lg">
				{errorMsg}
			</div>
		{/if}
	</main>
</div>

<style>
	:global(body) {
		margin: 0;
		font-family: system-ui, sans-serif;
	}
</style>