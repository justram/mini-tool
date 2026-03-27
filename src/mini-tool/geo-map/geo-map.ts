import type { DivIcon, Map as LeafletMap, Marker as LeafletMarker, Polyline } from "leaflet";
import leafletStylesText from "leaflet/dist/leaflet.css?inline";
import { html, LitElement, nothing, unsafeCSS } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import Supercluster from "supercluster";
import localStylesText from "./geo-map.css?inline";
import type { GeoMapMarker, GeoMapRoute, SerializableGeoMap } from "./schema.js";

type LeafletRuntime = typeof import("leaflet");

type ClusterPointProperties = {
  markerId: string;
  marker: GeoMapMarker;
};

const LIGHT_TILE_URL = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const DARK_TILE_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getDocumentTheme(): "light" | "dark" | null {
  if (typeof document === "undefined") {
    return null;
  }

  const root = document.documentElement;
  const dataTheme = root.getAttribute("data-theme")?.toLowerCase();
  if (dataTheme === "dark") {
    return "dark";
  }

  if (dataTheme === "light") {
    return "light";
  }

  if (root.classList.contains("dark")) {
    return "dark";
  }

  if (root.classList.contains("light")) {
    return "light";
  }

  return null;
}

function mapAriaLabel(title?: string, description?: string): string {
  if (title && description) {
    return `${title}. ${description}`;
  }

  return title ?? description ?? "Geographic map";
}

function markerAriaLabel(marker: GeoMapMarker): string {
  if (marker.label && marker.description) {
    return `${marker.label}. ${marker.description}`;
  }

  return marker.label ?? marker.description ?? `Marker at ${marker.lat.toFixed(4)}, ${marker.lng.toFixed(4)}`;
}

function markerPopupHtml(marker: GeoMapMarker): string {
  const label = marker.label ? `<p class="popup-title">${escapeHtml(marker.label)}</p>` : "";
  const description = marker.description ? `<p class="popup-description">${escapeHtml(marker.description)}</p>` : "";

  if (!label && !description) {
    return "";
  }

  return `<div class="popup-body">${label}${description}</div>`;
}

function routePopupHtml(route: GeoMapRoute): string {
  const label = route.label ? `<p class="popup-title">${escapeHtml(route.label)}</p>` : "";
  const description = route.description ? `<p class="popup-description">${escapeHtml(route.description)}</p>` : "";

  if (!label && !description) {
    return "";
  }

  return `<div class="popup-body">${label}${description}</div>`;
}

@customElement("mini-tool-geo-map")
export class MiniToolGeoMap extends LitElement {
  @property({ attribute: false })
  payload!: SerializableGeoMap;

  @state()
  private selectedTitle: string | null = null;

  @state()
  private selectedDescription: string | null = null;

  @state()
  private initialized = false;

  @state()
  private currentZoom = 2;

  @state()
  private inheritedTheme: "light" | "dark" = getDocumentTheme() ?? getSystemTheme();

  static styles = [unsafeCSS(leafletStylesText), unsafeCSS(localStylesText)];

  private leaflet: LeafletRuntime | null = null;

  private map: LeafletMap | null = null;

  private tileLayer: ReturnType<LeafletRuntime["tileLayer"]> | null = null;

  private markerLayerGroup: ReturnType<LeafletRuntime["layerGroup"]> | null = null;

  private routeLayers: Array<Polyline> = [];

  private zoomControl: ReturnType<LeafletRuntime["control"]["zoom"]> | null = null;

  private clusterIndex: Supercluster<ClusterPointProperties> | null = null;

  private markerById = new Map<string, GeoMapMarker>();

  private markerInstanceById = new Map<string, LeafletMarker>();

  private clusterActionById = new Map<number, () => void>();

  private themeObserver: MutationObserver | null = null;

  private themeMediaQuery: MediaQueryList | null = null;

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener("keydown", this.onWindowKeyDown);
  }

  disconnectedCallback(): void {
    window.removeEventListener("keydown", this.onWindowKeyDown);
    this.renderRoot.removeEventListener("click", this.onSurfaceClick);
    this.renderRoot.removeEventListener("keydown", this.onSurfaceKeyDown);
    this.stopThemeObservers();
    this.destroyMap();
    super.disconnectedCallback();
  }

  firstUpdated(): void {
    this.renderRoot.addEventListener("click", this.onSurfaceClick);
    this.renderRoot.addEventListener("keydown", this.onSurfaceKeyDown);
    this.startThemeObservers();
    void this.initializeMap();
  }

  protected updated(changedProperties: Map<string, unknown>): void {
    if (!this.initialized || !this.map || !this.leaflet) {
      return;
    }

    if (!changedProperties.has("payload")) {
      return;
    }

    this.renderRoutes();
    this.rebuildClusterIndex();
    this.renderMarkers();
    this.applyViewport();
    this.syncZoomControl();
    this.updateTileTheme();
    this.updateMapAriaLabel();
  }

  private readonly onWindowKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== "Escape") {
      return;
    }

    this.map?.closePopup();
    this.selectedTitle = null;
    this.selectedDescription = null;
  };

  private get resolvedTheme(): "light" | "dark" {
    return this.payload?.theme ?? this.inheritedTheme;
  }

  private startThemeObservers(): void {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    this.themeMediaQuery = window.matchMedia?.("(prefers-color-scheme: dark)") ?? null;
    this.themeMediaQuery?.addEventListener("change", this.updateThemeFromEnvironment);

    this.themeObserver = new MutationObserver(this.updateThemeFromEnvironment);
    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });

    this.updateThemeFromEnvironment();
  }

  private stopThemeObservers(): void {
    this.themeMediaQuery?.removeEventListener("change", this.updateThemeFromEnvironment);
    this.themeObserver?.disconnect();
    this.themeObserver = null;
    this.themeMediaQuery = null;
  }

  private readonly updateThemeFromEnvironment = (): void => {
    this.inheritedTheme = getDocumentTheme() ?? getSystemTheme();
    this.updateTileTheme();
  };

  private get tileUrl(): string {
    return this.resolvedTheme === "dark" ? DARK_TILE_URL : LIGHT_TILE_URL;
  }

  private async initializeMap(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const host = this.renderRoot.querySelector<HTMLElement>(".map-host");
    if (!host) {
      return;
    }

    this.leaflet = await import("leaflet");
    const L = this.leaflet;

    this.map = L.map(host, {
      zoomControl: false,
      scrollWheelZoom: true,
      attributionControl: true,
      center: [20, 0],
      zoom: 2,
    });

    if ((this.payload.showZoomControl ?? true) === true) {
      this.zoomControl = L.control.zoom({ position: "topright" }).addTo(this.map);
    }

    this.tileLayer = L.tileLayer(this.tileUrl, {
      attribution: TILE_ATTRIBUTION,
      maxZoom: 20,
    }).addTo(this.map);

    this.markerLayerGroup = L.layerGroup().addTo(this.map);

    this.map.on("zoomend moveend", () => {
      this.currentZoom = Math.round(this.map?.getZoom() ?? this.currentZoom);
      this.renderMarkers();
    });

    this.renderRoutes();
    this.rebuildClusterIndex();
    this.renderMarkers();
    this.applyViewport();
    this.currentZoom = Math.round(this.map.getZoom());
    this.updateMapAriaLabel();

    this.initialized = true;
  }

  private destroyMap(): void {
    if (!this.map) {
      return;
    }

    this.zoomControl?.remove();
    this.zoomControl = null;

    this.map.remove();
    this.map = null;
    this.tileLayer = null;
    this.markerLayerGroup = null;
    this.routeLayers = [];
  }

  private readonly onSurfaceKeyDown = (event: Event): void => {
    const keyboardEvent = event as KeyboardEvent;
    const target = keyboardEvent.target as HTMLElement | null;
    if (!target?.closest(".marker")) {
      return;
    }

    if (keyboardEvent.key !== "Enter" && keyboardEvent.key !== " ") {
      return;
    }

    keyboardEvent.preventDefault();
    target.click();
  };

  private readonly onSurfaceClick = (event: Event): void => {
    const target = event.target as HTMLElement | null;
    if (!target) {
      return;
    }

    const markerButton = target.closest<HTMLElement>(".marker[data-marker-id]");
    if (markerButton) {
      const markerId = markerButton.dataset.markerId;
      if (markerId) {
        this.markerInstanceById.get(markerId)?.fire("click");
      }
      return;
    }

    const clusterButton = target.closest<HTMLElement>(".marker.cluster[data-cluster-id]");
    if (clusterButton) {
      const clusterIdRaw = clusterButton.dataset.clusterId;
      const clusterId = clusterIdRaw ? Number(clusterIdRaw) : Number.NaN;
      if (Number.isFinite(clusterId)) {
        this.clusterActionById.get(clusterId)?.();
      }
    }
  };

  private syncZoomControl(): void {
    if (!this.map || !this.leaflet) {
      return;
    }

    const shouldShow = this.payload.showZoomControl ?? true;
    if (shouldShow && !this.zoomControl) {
      this.zoomControl = this.leaflet.control.zoom({ position: "topright" }).addTo(this.map);
      return;
    }

    if (!shouldShow && this.zoomControl) {
      this.zoomControl.remove();
      this.zoomControl = null;
    }
  }

  private updateMapAriaLabel(): void {
    const host = this.renderRoot.querySelector<HTMLElement>(".map-host");
    if (!host) {
      return;
    }

    host.setAttribute("role", "region");
    host.setAttribute("aria-label", mapAriaLabel(this.payload?.title, this.payload?.description));
  }

  private updateTileTheme(): void {
    if (!this.tileLayer) {
      return;
    }

    this.tileLayer.setUrl(this.tileUrl);
  }

  private applyViewport(): void {
    if (!this.map || !this.leaflet) {
      return;
    }

    const viewport = this.payload.viewport;
    const markers = this.payload.markers;
    const routes = this.payload.routes ?? [];

    if (viewport?.mode === "center") {
      this.map.setView([viewport.center.lat, viewport.center.lng], viewport.zoom);
      return;
    }

    const target = viewport?.target ?? "all";
    const markerPoints =
      target === "markers" || target === "all" ? markers.map((m) => [m.lat, m.lng] as [number, number]) : [];
    const routePoints =
      target === "routes" || target === "all"
        ? routes.flatMap((route) => route.points.map((point) => [point.lat, point.lng] as [number, number]))
        : [];
    const fitPoints = [...markerPoints, ...routePoints];

    if (fitPoints.length === 0) {
      return;
    }

    if (fitPoints.length === 1) {
      const [lat, lng] = fitPoints[0];
      const zoom = viewport?.maxZoom ? Math.min(13, viewport.maxZoom) : 13;
      this.map.setView([lat, lng], zoom);
      return;
    }

    const bounds = this.leaflet.latLngBounds(fitPoints);
    this.map.fitBounds(bounds, {
      padding: [viewport?.padding ?? 32, viewport?.padding ?? 32],
      maxZoom: viewport?.maxZoom,
    });
  }

  private rebuildClusterIndex(): void {
    const clusteringEnabled = this.payload.clustering?.enabled === true;
    const L = this.leaflet;

    this.markerById.clear();
    this.payload.markers.forEach((marker, index) => {
      this.markerById.set(marker.id ?? `marker-${index}`, marker);
    });

    if (!clusteringEnabled || !L) {
      this.clusterIndex = null;
      return;
    }

    const cluster = new Supercluster<ClusterPointProperties>({
      radius: this.payload.clustering?.radius ?? 60,
      maxZoom: this.payload.clustering?.maxZoom ?? 16,
      minPoints: this.payload.clustering?.minPoints ?? 2,
    });

    cluster.load(
      this.payload.markers.map((marker, index) => {
        const markerId = marker.id ?? `marker-${index}`;
        return {
          type: "Feature" as const,
          id: markerId,
          geometry: {
            type: "Point" as const,
            coordinates: [marker.lng, marker.lat] as [number, number],
          },
          properties: {
            markerId,
            marker,
          },
        };
      }),
    );

    this.clusterIndex = cluster;
  }

  private createMarkerIcon(marker: GeoMapMarker, markerId: string): DivIcon {
    const L = this.leaflet!;

    if (marker.icon?.type === "emoji") {
      const size = marker.icon.size ?? 24;
      return L.divIcon({
        className: "",
        html: `<button type="button" class="marker marker-emoji" data-marker-id="${escapeHtml(markerId)}" aria-label="${escapeHtml(markerAriaLabel(marker))}" style="width:${size}px;height:${size}px">${escapeHtml(marker.icon.value)}</button>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });
    }

    if (marker.icon?.type === "image") {
      const width = marker.icon.width ?? 28;
      const height = marker.icon.height ?? 28;
      const radius = marker.icon.borderRadius ?? Math.min(width, height) / 2;
      return L.divIcon({
        className: "",
        html: `<button type="button" class="marker marker-image" data-marker-id="${escapeHtml(markerId)}" aria-label="${escapeHtml(markerAriaLabel(marker))}" style="width:${width}px;height:${height}px;border-radius:${radius}px"><img src="${escapeHtml(marker.icon.url)}" alt="" /></button>`,
        iconSize: [width, height],
        iconAnchor: [width / 2, height / 2],
      });
    }

    const size = (marker.icon?.type === "dot" ? (marker.icon.radius ?? 7) : 7) * 2 + 10;
    return L.divIcon({
      className: "",
      html: `<button type="button" class="marker marker-dot" data-marker-id="${escapeHtml(markerId)}" aria-label="${escapeHtml(markerAriaLabel(marker))}"><span class="dot-core"></span></button>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  }

  private createClusterIcon(count: number, clusterId: number): DivIcon {
    const size = count >= 100 ? 42 : count >= 10 ? 38 : 34;
    return this.leaflet!.divIcon({
      className: "",
      html: `<button type="button" class="marker cluster" data-cluster-id="${clusterId}" aria-label="Cluster containing ${count} locations">${count}</button>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  }

  private renderMarkers(): void {
    if (!this.map || !this.leaflet || !this.markerLayerGroup) {
      return;
    }

    this.markerLayerGroup.clearLayers();
    this.markerInstanceById.clear();
    this.clusterActionById.clear();

    const clusteringEnabled = this.payload.clustering?.enabled === true;
    if (!clusteringEnabled || !this.clusterIndex) {
      this.payload.markers.forEach((marker, index) => {
        this.mountMarker(marker, marker.id ?? `marker-${index}`, [marker.lat, marker.lng]);
      });
      return;
    }

    const bounds = this.map.getBounds();
    const zoom = Math.round(this.map.getZoom());
    const clusters = this.clusterIndex.getClusters(
      [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()],
      zoom,
    );

    clusters.forEach((feature, index) => {
      const [lng, lat] = feature.geometry.coordinates;
      const properties = feature.properties as {
        cluster?: boolean;
        cluster_id?: number;
        point_count?: number;
        markerId?: string;
        marker?: GeoMapMarker;
      };

      if (properties.cluster && typeof properties.cluster_id === "number") {
        const marker = this.leaflet!.marker([lat, lng], {
          icon: this.createClusterIcon(properties.point_count ?? 0, properties.cluster_id),
        });

        marker.on("click", () => {
          const expansionZoom = this.clusterIndex?.getClusterExpansionZoom(properties.cluster_id ?? 0) ?? zoom + 2;
          this.map?.flyTo([lat, lng], expansionZoom);
        });

        this.clusterActionById.set(properties.cluster_id, () => {
          const expansionZoom = this.clusterIndex?.getClusterExpansionZoom(properties.cluster_id ?? 0) ?? zoom + 2;
          this.map?.flyTo([lat, lng], expansionZoom);
        });

        this.markerLayerGroup?.addLayer(marker);
        return;
      }

      const marker = properties.marker ?? this.markerById.get(properties.markerId ?? `marker-${index}`);
      if (!marker) {
        return;
      }

      const markerId = marker.id ?? properties.markerId ?? `marker-${index}`;
      this.mountMarker(marker, markerId, [lat, lng]);
    });
  }

  private mountMarker(marker: GeoMapMarker, markerId: string, position: [number, number]): void {
    const leafletMarker: LeafletMarker = this.leaflet!.marker(position, {
      icon: this.createMarkerIcon(marker, markerId),
      title: markerAriaLabel(marker),
    });

    const popupHtml = markerPopupHtml(marker);

    const tooltipMode = marker.tooltip ?? "hover";
    const tooltipText = marker.label ?? marker.description;
    const shouldBindTooltip = Boolean(tooltipText && tooltipMode !== "none");
    if (shouldBindTooltip) {
      leafletMarker.bindTooltip(escapeHtml(tooltipText ?? ""), {
        direction: "top",
        permanent: tooltipMode === "always",
        opacity: 0.95,
        className: "geo-map-tooltip",
      });
    }

    if (popupHtml.length > 0) {
      leafletMarker.bindPopup(popupHtml, {
        closeButton: true,
        autoClose: true,
        closeOnEscapeKey: true,
        className: "geo-map-popup",
      });

      if (shouldBindTooltip) {
        leafletMarker.on("popupopen", () => {
          leafletMarker.closeTooltip();
        });

        leafletMarker.on("popupclose", () => {
          if (tooltipMode === "always") {
            leafletMarker.openTooltip();
          }
        });
      }
    }

    leafletMarker.on("click", () => {
      this.selectedTitle = marker.label ?? "Selected marker";
      this.selectedDescription = marker.description ?? null;
      this.dispatchEvent(
        new CustomEvent("mini-tool:geo-map-marker-click", {
          detail: { marker, payload: this.payload },
          bubbles: true,
          composed: true,
        }),
      );
    });

    this.markerLayerGroup?.addLayer(leafletMarker);
    this.markerInstanceById.set(markerId, leafletMarker);
  }

  private renderRoutes(): void {
    if (!this.map || !this.leaflet) {
      return;
    }

    this.routeLayers.forEach((layer) => {
      layer.remove();
    });
    this.routeLayers = [];

    (this.payload.routes ?? []).forEach((route) => {
      const polyline = this.leaflet!.polyline(
        route.points.map((point) => [point.lat, point.lng]) as [number, number][],
        {
          color: route.color ?? "var(--primary)",
          weight: route.weight ?? 3,
          opacity: route.opacity ?? 0.85,
          dashArray: route.dashArray,
          className: "route-line",
        },
      ).addTo(this.map!);

      const tooltipMode = route.tooltip ?? "hover";
      const tooltipText = route.label ?? route.description;
      const shouldBindTooltip = Boolean(tooltipText && tooltipMode !== "none");
      if (shouldBindTooltip) {
        polyline.bindTooltip(escapeHtml(tooltipText ?? ""), {
          direction: "top",
          permanent: tooltipMode === "always",
          opacity: 0.95,
          className: "geo-map-tooltip",
        });
      }

      const popupHtml = routePopupHtml(route);
      if (popupHtml.length > 0) {
        polyline.bindPopup(popupHtml, {
          closeButton: true,
          autoClose: true,
          closeOnEscapeKey: true,
          className: "geo-map-popup",
        });

        if (shouldBindTooltip) {
          polyline.on("popupopen", () => {
            polyline.closeTooltip();
          });

          polyline.on("popupclose", () => {
            if (tooltipMode === "always") {
              polyline.openTooltip();
            }
          });
        }
      }

      polyline.on("click", () => {
        this.selectedTitle = route.label ?? "Selected route";
        this.selectedDescription = route.description ?? null;
        this.dispatchEvent(
          new CustomEvent("mini-tool:geo-map-route-click", {
            detail: { route, payload: this.payload },
            bubbles: true,
            composed: true,
          }),
        );
      });

      this.routeLayers.push(polyline);
    });
  }

  private renderSelectionPanel() {
    if (!this.selectedTitle && !this.selectedDescription) {
      return nothing;
    }

    return html`
      <div class="selection-panel" role="status" aria-live="polite">
        ${this.selectedTitle ? html`<p class="selection-title">${this.selectedTitle}</p>` : nothing}
        ${this.selectedDescription ? html`<p class="selection-description">${this.selectedDescription}</p>` : nothing}
      </div>
    `;
  }

  render() {
    if (!this.payload) {
      return nothing;
    }

    return html`
      <article class="root" data-slot="geo-map" data-mini-tool-id=${this.payload.id}>
        <div class="canvas" data-zoom=${String(this.currentZoom)}>
          <div class="map-host"></div>

          ${
            this.payload.title || this.payload.description
              ? html`
                <div class="header-overlay">
                  ${this.payload.title ? html`<p class="title">${this.payload.title}</p>` : nothing}
                  ${this.payload.description ? html`<p class="description">${this.payload.description}</p>` : nothing}
                </div>
              `
              : nothing
          }

          ${this.renderSelectionPanel()}
        </div>
      </article>
    `;
  }
}
