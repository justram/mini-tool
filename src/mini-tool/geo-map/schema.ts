import { type Static, Type } from "@sinclair/typebox";
import { MiniToolIdSchema, MiniToolReceiptSchema, MiniToolRoleSchema } from "../../shared/schema.js";
import { ajv } from "../../shared/validator.js";

const LatitudeSchema = Type.Number({ minimum: -90, maximum: 90 });
const LongitudeSchema = Type.Number({ minimum: -180, maximum: 180 });
const HttpUrlSchema = Type.String({ format: "uri" });

const GeoMapMarkerIconDotSchema = Type.Object({
  type: Type.Literal("dot"),
  color: Type.Optional(Type.String()),
  borderColor: Type.Optional(Type.String()),
  radius: Type.Optional(Type.Number({ minimum: 3, maximum: 16 })),
});

const GeoMapMarkerIconEmojiSchema = Type.Object({
  type: Type.Literal("emoji"),
  value: Type.String({ minLength: 1 }),
  size: Type.Optional(Type.Number({ minimum: 16, maximum: 40 })),
  bgColor: Type.Optional(Type.String()),
  borderColor: Type.Optional(Type.String()),
});

const GeoMapMarkerIconImageSchema = Type.Object({
  type: Type.Literal("image"),
  url: HttpUrlSchema,
  width: Type.Optional(Type.Number({ minimum: 16, maximum: 64 })),
  height: Type.Optional(Type.Number({ minimum: 16, maximum: 64 })),
  borderRadius: Type.Optional(Type.Number({ minimum: 0, maximum: 999 })),
  borderColor: Type.Optional(Type.String()),
});

export const GeoMapMarkerIconSchema = Type.Union([
  GeoMapMarkerIconDotSchema,
  GeoMapMarkerIconEmojiSchema,
  GeoMapMarkerIconImageSchema,
]);

export const GeoMapMarkerSchema = Type.Object({
  id: Type.Optional(Type.String({ minLength: 1 })),
  lat: LatitudeSchema,
  lng: LongitudeSchema,
  label: Type.Optional(Type.String()),
  description: Type.Optional(Type.String()),
  tooltip: Type.Optional(Type.Union([Type.Literal("none"), Type.Literal("hover"), Type.Literal("always")])),
  icon: Type.Optional(GeoMapMarkerIconSchema),
});

export const GeoMapRoutePointSchema = Type.Object({
  lat: LatitudeSchema,
  lng: LongitudeSchema,
});

export const GeoMapRouteSchema = Type.Object({
  id: Type.Optional(Type.String({ minLength: 1 })),
  points: Type.Array(GeoMapRoutePointSchema, { minItems: 2 }),
  label: Type.Optional(Type.String()),
  description: Type.Optional(Type.String()),
  tooltip: Type.Optional(Type.Union([Type.Literal("none"), Type.Literal("hover"), Type.Literal("always")])),
  color: Type.Optional(Type.String()),
  weight: Type.Optional(Type.Number({ minimum: 1, maximum: 12 })),
  opacity: Type.Optional(Type.Number({ minimum: 0, maximum: 1 })),
  dashArray: Type.Optional(Type.String()),
});

export const GeoMapClusteringSchema = Type.Object({
  enabled: Type.Optional(Type.Boolean()),
  radius: Type.Optional(Type.Number({ minimum: 20, maximum: 120 })),
  maxZoom: Type.Optional(Type.Number({ minimum: 1, maximum: 22 })),
  minPoints: Type.Optional(Type.Number({ minimum: 2, maximum: 20 })),
});

export const GeoMapFitTargetSchema = Type.Union([Type.Literal("markers"), Type.Literal("routes"), Type.Literal("all")]);

const GeoMapFitViewportSchema = Type.Object({
  mode: Type.Literal("fit"),
  padding: Type.Optional(Type.Number({ minimum: 0 })),
  maxZoom: Type.Optional(Type.Number({ minimum: 1, maximum: 22 })),
  target: Type.Optional(GeoMapFitTargetSchema),
});

const GeoMapCenterViewportSchema = Type.Object({
  mode: Type.Literal("center"),
  center: Type.Object({
    lat: LatitudeSchema,
    lng: LongitudeSchema,
  }),
  zoom: Type.Number({ minimum: 1, maximum: 22 }),
});

export const GeoMapViewportSchema = Type.Union([GeoMapFitViewportSchema, GeoMapCenterViewportSchema]);

export const SerializableGeoMapSchema = Type.Object({
  id: MiniToolIdSchema,
  role: Type.Optional(MiniToolRoleSchema),
  receipt: Type.Optional(MiniToolReceiptSchema),
  title: Type.Optional(Type.String()),
  description: Type.Optional(Type.String()),
  markers: Type.Array(GeoMapMarkerSchema, { minItems: 1 }),
  routes: Type.Optional(Type.Array(GeoMapRouteSchema)),
  clustering: Type.Optional(GeoMapClusteringSchema),
  viewport: Type.Optional(GeoMapViewportSchema),
  showZoomControl: Type.Optional(Type.Boolean()),
  theme: Type.Optional(Type.Union([Type.Literal("light"), Type.Literal("dark")])),
});

export type GeoMapMarkerIcon = Static<typeof GeoMapMarkerIconSchema>;
export type GeoMapMarker = Static<typeof GeoMapMarkerSchema>;
export type GeoMapRoutePoint = Static<typeof GeoMapRoutePointSchema>;
export type GeoMapRoute = Static<typeof GeoMapRouteSchema>;
export type GeoMapClustering = Static<typeof GeoMapClusteringSchema>;
export type GeoMapFitTarget = Static<typeof GeoMapFitTargetSchema>;
export type GeoMapViewport = Static<typeof GeoMapViewportSchema>;
export type SerializableGeoMap = Static<typeof SerializableGeoMapSchema>;

const validateSerializableGeoMap = ajv.compile<SerializableGeoMap>(SerializableGeoMapSchema);

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function ensureUniqueIds(ids: string[], label: string): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) {
      throw new Error(`Duplicate ${label} id '${id}'.`);
    }
    seen.add(id);
  }
}

function ensureSerializableGeoMapInvariants(payload: SerializableGeoMap): void {
  const markerIds = payload.markers.map((marker) => marker.id).filter((id): id is string => typeof id === "string");
  ensureUniqueIds(markerIds, "marker");

  const routeIds = (payload.routes ?? []).map((route) => route.id).filter((id): id is string => typeof id === "string");
  ensureUniqueIds(routeIds, "route");

  for (const marker of payload.markers) {
    if (marker.icon?.type === "image" && !isHttpUrl(marker.icon.url)) {
      throw new Error("Expected marker image icon URL to use http or https protocol.");
    }
  }
}

export function parseSerializableGeoMap(input: unknown): SerializableGeoMap {
  if (!validateSerializableGeoMap(input)) {
    throw new Error(ajv.errorsText(validateSerializableGeoMap.errors));
  }

  ensureSerializableGeoMapInvariants(input);
  return input;
}

export function safeParseSerializableGeoMap(input: unknown): SerializableGeoMap | null {
  if (!validateSerializableGeoMap(input)) {
    return null;
  }

  try {
    ensureSerializableGeoMapInvariants(input);
    return input;
  } catch {
    return null;
  }
}
