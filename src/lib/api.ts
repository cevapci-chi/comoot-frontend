import type { GeocoderResult, PlanRequest, PlanResponse, SegmentReport } from './types';

/** Basis-URL für alle API-Aufrufe. Default '/api' für den Vite-Proxy-Betrieb. */
let baseUrl = '/api';

/** Setzt die Basis-URL (z. B. für Tests oder direkten Backend-Betrieb). */
export function setBaseUrl(url: string): void {
	baseUrl = url.replace(/\/+$/, '');
}

/** Fehler bei non-2xx-Antworten mit HTTP-Status und Body-Text des Backends. */
export class ApiError extends Error {
	status: number;

	constructor(status: number, message: string) {
		super(message);
		this.name = 'ApiError';
		this.status = status;
	}
}

async function request(path: string, init?: RequestInit): Promise<Response> {
	const res = init
		? await fetch(`${baseUrl}${path}`, init)
		: await fetch(`${baseUrl}${path}`);
	if (!res.ok) {
		const text = await res.text();
		throw new ApiError(res.status, text || res.statusText);
	}
	return res;
}

const jsonPost = (body: unknown): RequestInit => ({
	method: 'POST',
	headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify(body),
});

export const api = {
	/** Route berechnen: POST /routing/plan */
	async planRoute(req: PlanRequest): Promise<PlanResponse> {
		const res = await request('/routing/plan', jsonPost(req));
		return (await res.json()) as PlanResponse;
	},

	/** GPX-Download: GET /routing/export?format=gpx&route_id=… */
	async exportGpx(routeId: string): Promise<Blob> {
		const res = await request(
			`/routing/export?format=gpx&route_id=${encodeURIComponent(routeId)}`
		);
		return res.blob();
	},

	/** Segment melden: POST /feedback/report-segment */
	async reportSegment(report: SegmentReport): Promise<void> {
		await request('/feedback/report-segment', jsonPost(report));
	},

	/** Geocoder-Suche: GET /geocoder/search */
	async geocoderSearch(q: string): Promise<GeocoderResult[]> {
		const res = await request(
			`/geocoder/search?q=${encodeURIComponent(q)}&limit=5&countrycodes=de`
		);
		return (await res.json()) as GeocoderResult[];
	},
};
