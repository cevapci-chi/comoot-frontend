<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import * as maplibregl from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';

	interface Props {
		initialCenter?: [number, number];
		initialZoom?: number;
		onMapClick?: (lon: number, lat: number) => void;
		waypoints?: Array<{lon: number; lat: number; label: string; color: string}>;
		routeCoords?: Array<[number, number]>;
	}

	export let initialCenter: [number, number] = [11.5756, 48.1374];
	export let initialZoom = 12;
	export let onMapClick: ((lon: number, lat: number) => void) | undefined = undefined;
	export let waypoints: Array<{lon: number; lat: number; label: string; color: string}> = [];
	export let routeCoords: Array<[number, number]> = [];

	let mapContainer: HTMLDivElement;
	let map: maplibregl.Map | null = null;
	let markers: maplibregl.Marker[] = [];
	let routeSource: maplibregl.GeoJSONSource | null = null;

	function updateMarkers() {
		// Clear old markers
		for (const m of markers) { m.remove(); }
		markers = [];

		for (const wp of waypoints) {
			const el = document.createElement('div');
			el.className = 'waypoint-marker';
			el.style.cssText = `background:${wp.color};width:20px;height:20px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-size:10px;font-weight:bold;cursor:grab;`;
			el.textContent = wp.label;
			const marker = new maplibregl.Marker(el)
				.setLngLat([wp.lon, wp.lat])
				.setDraggable(true);
			marker.onDragEnd = () => {
				const pos = marker.getLngLat();
				// Trigger parent update (handled by onMapClick callback using special type)
			};
			marker.addTo(map!);
			markers.push(marker);
		}
	}

	function updateRoute() {
		if (routeSource) {
			map?.removeLayer('route-line');
			map?.removeLayer('route-casing');
			routeSource = null;
		}
		if (routeCoords.length < 2) return;

		routeSource = new maplibregl.GeoJSONSource({
			data: {
				type: 'Feature',
				geometry: { type: 'LineString', coordinates: routeCoords },
				properties: {}
			}
		});

		// Casing (darker, wider)
		map?.addLayer({
			id: 'route-casing',
			type: 'line',
			source: routeSource,
			paint: {
				'line-color': '#1a1a2e',
				'line-width': 8,
				'line-opacity': 0.6
			}
		});

		// Main line (profile-colored)
		map?.addLayer({
			id: 'route-line',
			type: 'line',
			source: routeSource,
			paint: {
				'line-color': '#2563eb',
				'line-width': 4,
				'line-opacity': 0.9
			}
		});

		// Fit map to route
		const bounds = routeCoords.reduce((b, c) => {
			return [
				Math.min(b[0], c[0]), Math.min(b[1], c[1]),
				Math.max(b[2], c[0]), Math.max(b[3], c[1])
			];
		}, [Infinity, Infinity, -Infinity, -Infinity]);
		map?.fitBounds([[bounds[0], bounds[1]], [bounds[2], bounds[3]]], {padding: 50});
	}

	onMount(() => {
		map = new maplibregl.Map({
			container: mapContainer,
			style: {
				version: 8,
				sources: {
					osm: {
						type: 'raster',
						tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
						tileSize: 256,
						attribution: '© OpenStreetMap contributors'
					},
					cyclosm: {
						type: 'raster',
						tiles: ['https://a.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png'],
						tileSize: 256,
						attribution: '© CyclOSM | © OpenStreetMap contributors'
					}
				},
				layers: [
					{
						id: 'osm-base',
						type: 'raster',
						source: 'osm'
					}
				]
			},
			center: initialCenter,
			zoom: initialZoom
		});

		map.addControl(new maplibregl.NavigationControl(), 'top-right');

		// Click handler
		map.on('click', (e: any) => {
			if (onMapClick) {
				onMapClick(e.lngLat[0], e.lngLat[1]);
			}
		});

		// Layer switcher
		const layerSwitcher = document.createElement('div');
		layerSwitcher.className = 'absolute top-20 right-4 z-10';
		layerSwitcher.innerHTML = `
			<div class="bg-white rounded-lg shadow-lg p-2 text-sm">
				<label class="flex items-center gap-2 cursor-pointer">
					<input type="checkbox" id="cyclosm-layer" class="rounded border-gray-300" checked>
					<span>CyclOSM (Fahrrad)</span>
				</label>
			</div>
		`;
		mapContainer.parentElement?.appendChild(layerSwitcher);

		const checkbox = layerSwitcher.querySelector('#cyclosm-layer') as HTMLInputElement;
		const toggleCyclosm = () => {
			if (!map) return;
			if (checkbox.checked) {
				if (!map.getLayer('cyclosm-layer')) {
					map.addLayer({
						id: 'cyclosm-layer',
						type: 'raster',
						source: 'cyclosm'
					}, 'osm-base');
				}
			} else {
				if (map.getLayer('cyclosm-layer')) {
					map.removeLayer('cyclosm-layer');
				}
			}
		};
		checkbox.addEventListener('change', toggleCyclosm);
		// Start with CyclOSM on
		toggleCyclosm();

		// Initial markers + route if provided
		updateMarkers();
		if (routeCoords.length > 0) updateRoute();
	});

	$: {
		if (map) {
			updateMarkers();
			if (routeCoords.length > 0) updateRoute();
		}
	}

	onDestroy(() => {
		map?.remove();
	});
</script>

<div bind:this={mapContainer} class="w-full h-full"></div>
<style>
	:global(.maplibregl-ctrl-bottom-right) { display: none; }
	:global(.waypoint-marker) { cursor: grab; }
	:global(.waypoint-marker:active) { cursor: grabbing; }
</style>