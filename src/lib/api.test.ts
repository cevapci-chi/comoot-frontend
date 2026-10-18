import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError, setBaseUrl } from './api';
import type { PlanRequest, SegmentReport } from './types';

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});
}

describe('api', () => {
	let fetchMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);
		setBaseUrl('/api');
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe('planRoute', () => {
		it('POSTet an /api/routing/plan und gibt die Antwort zurück', async () => {
			const req: PlanRequest = {
				waypoints: [
					{ lat: 51.3, lng: 12.3 },
					{ lat: 51.4, lng: 12.4 },
				],
				profile: 'gravel',
				preferences: { scenic: 0.5, avoid_traffic: 0.5, wind_optimize: false, max_gradient: 15 },
			};
			const response = {
				geometry: { type: 'LineString', coordinates: [] },
				distance_km: 10,
				elevation_gain: 100,
				surface_breakdown: { asphalt: 50, gravel: 50, trail: 0 },
				segments: [],
				climbs: [],
			};
			fetchMock.mockResolvedValue(jsonResponse(response));

			const result = await api.planRoute(req);

			expect(fetchMock).toHaveBeenCalledWith('/api/routing/plan', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(req),
			});
			expect(result).toEqual(response);
		});

		it('wirft ApiError mit Backend-Body-Text bei non-2xx', async () => {
			fetchMock.mockResolvedValue(new Response('BRouter error: kaputt', { status: 502 }));

			await expect(api.planRoute({} as PlanRequest)).rejects.toMatchObject({
				name: 'ApiError',
				status: 502,
				message: 'BRouter error: kaputt',
			});
		});

		it('fällt auf statusText zurück, wenn der Body leer ist', async () => {
			fetchMock.mockResolvedValue(
				new Response(null, { status: 500, statusText: 'Internal Server Error' })
			);

			await expect(api.planRoute({} as PlanRequest)).rejects.toMatchObject({
				status: 500,
				message: 'Internal Server Error',
			});
		});
	});

	describe('exportGpx', () => {
		it('ruft den Export-Endpoint auf und gibt einen Blob zurück', async () => {
			fetchMock.mockResolvedValue(new Response('<gpx/>', { status: 200 }));

			const result = await api.exportGpx('route-123');

			expect(fetchMock).toHaveBeenCalledWith('/api/routing/export?format=gpx&route_id=route-123');
			expect(result).toBeInstanceOf(Blob);
		});

		it('encodiert die Route-ID in der URL', async () => {
			fetchMock.mockResolvedValue(new Response('<gpx/>', { status: 200 }));

			await api.exportGpx('route 1/2');

			expect(fetchMock).toHaveBeenCalledWith(
				'/api/routing/export?format=gpx&route_id=route%201%2F2'
			);
		});

		it('wirft ApiError bei non-2xx', async () => {
			fetchMock.mockResolvedValue(new Response('unknown route', { status: 404 }));

			await expect(api.exportGpx('nope')).rejects.toMatchObject({
				status: 404,
				message: 'unknown route',
			});
		});
	});

	describe('reportSegment', () => {
		it('POSTet den Report und resolved void', async () => {
			fetchMock.mockResolvedValue(new Response(null, { status: 200 }));

			const report: SegmentReport = {
				lat: 48.1,
				lon: 11.5,
				report_type: 'surface_wrong',
				note: 'Schotter',
			};
			await expect(api.reportSegment(report)).resolves.toBeUndefined();

			expect(fetchMock).toHaveBeenCalledWith('/api/feedback/report-segment', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(report),
			});
		});

		it('wirft ApiError bei non-2xx (z. B. 429)', async () => {
			fetchMock.mockResolvedValue(new Response('rate limited', { status: 429 }));

			await expect(api.reportSegment({} as SegmentReport)).rejects.toMatchObject({ status: 429 });
		});
	});

	describe('geocoderSearch', () => {
		it('liefert Treffer als GeocoderResult[]', async () => {
			fetchMock.mockResolvedValue(
				jsonResponse([{ lat: 48.13, lon: 11.57, label: 'München' }])
			);

			const results = await api.geocoderSearch('München');

			expect(fetchMock).toHaveBeenCalledWith(
				'/api/geocoder/search?q=M%C3%BCnchen&limit=5&countrycodes=de'
			);
			expect(results).toEqual([{ lat: 48.13, lon: 11.57, label: 'München' }]);
		});
	});

	describe('setBaseUrl', () => {
		it('verwendet eine abweichende Basis-URL', async () => {
			setBaseUrl('https://example.com/api');
			fetchMock.mockResolvedValue(jsonResponse([]));

			await api.geocoderSearch('x');

			expect(fetchMock).toHaveBeenCalledWith(
				'https://example.com/api/geocoder/search?q=x&limit=5&countrycodes=de'
			);
		});

		it('normalisiert einen Trailing-Slash in der Basis-URL', async () => {
			setBaseUrl('https://example.com/api/');
			fetchMock.mockResolvedValue(jsonResponse([]));

			await api.geocoderSearch('x');

			expect(fetchMock).toHaveBeenCalledWith(
				'https://example.com/api/geocoder/search?q=x&limit=5&countrycodes=de'
			);
		});
	});
});
