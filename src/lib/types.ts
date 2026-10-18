// Comoot API-Typen — abgeleitet aus den Backend-Pydantic-Schemas
// (comoot-backend/app/main.py). Forward-kompatibel ergänzt um Felder aus
// den Backend-Tickets BE-05/07/08, die noch nicht implementiert sind.

/** Profil: Rennrad, Gravel oder Bikepacking. */
export type Profile = 'road' | 'gravel' | 'bikepacking';

/** Ein Waypoint (Geo-Koordinate). */
export interface Waypoint {
  lat: number;
  lng: number;
}

/** Routing-Präferenzen (werden aktuell nur validiert, nicht ausgewertet). */
export interface RoutingPreferences {
  scenic: number; // 0.0..1.0
  avoid_traffic: number; // 0.0..1.0
  wind_optimize: boolean;
  max_gradient: number; // >= 1.0 (in %)
}

/** Request-Body für POST /api/routing/plan. */
export interface PlanRequest {
  waypoints: Waypoint[];
  profile: Profile;
  preferences: RoutingPreferences;
}

/** Granulare Oberflächen-Klassifizierung (DB-Enum `surface_class`, schema.sql). */
export type SurfaceClass =
  | 'blocked'
  | 'road_good'
  | 'road_ok'
  | 'road_poor'
  | 'gravel_ideal'
  | 'gravel_ok'
  | 'gravel_poor'
  | 'avoid'
  | 'unknown';

/** Ein Routen-Segment. */
export interface Segment {
  distance_m: number;
  surface: string; // grob: 'asphalt' | 'gravel' | 'trail'
  surface_class?: SurfaceClass; // forward-kompatibel (BE-05)
  surface_quality: string;
  traffic_level: string;
  scenic_score: number;
  gradient_avg: number;
  tire_width_mm: number;
}

/** Anstiegs-Kategorie: 0 = HC, 1–4 (analog Komoot). */
export type ClimbCategory = 0 | 1 | 2 | 3 | 4;

/** Ein erkannter Anstieg. */
export interface Climb {
  name: string;
  category: ClimbCategory;
  length_km: number;
  avg_gradient: number;
  max_gradient: number;
}

/** Surface-Verteilung in Prozent. */
export interface SurfaceBreakdown {
  asphalt: number;
  gravel: number;
  trail: number;
}

/** Response von POST /api/routing/plan. */
export interface PlanResponse {
  geometry: { type: 'LineString'; coordinates: [number, number][] };
  distance_km: number;
  elevation_gain: number;
  surface_breakdown: SurfaceBreakdown;
  segments: Segment[];
  climbs: Climb[];
  route_id?: string; // forward-kompatibel (BE-07: GPX-Export)
}

/** Meldetyp für "Segment melden" (FE-10 / BE-08). */
export type ReportType = 'surface_wrong' | 'tire_wrong' | 'other';

/** Request-Body für POST /api/feedback/report-segment. */
export interface SegmentReport {
  lat: number;
  lon: number;
  report_type: ReportType;
  note?: string;
}

/** Ein Geocoder-Treffer (FE-09). */
export interface GeocoderResult {
  lat: number;
  lon: number;
  label: string;
}
