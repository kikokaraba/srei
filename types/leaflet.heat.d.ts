/**
 * Type declarations for leaflet.heat
 * @see https://github.com/Leaflet/Leaflet.heat
 */

import * as L from "leaflet";

declare module "leaflet" {
  interface HeatLayerOptions {
    /** Minimum opacity the heat will start at */
    minOpacity?: number;
    /** Maximum point intensity */
    max?: number;
    /** Radius of each "point" of the heatmap */
    radius?: number;
    /** Amount of blur */
    blur?: number;
    /** Gradient colors configuration */
    gradient?: Record<number, string>;
    /** Maximum zoom level for heat intensity scaling */
    maxZoom?: number;
  }

  interface HeatLayer extends L.Layer {
    /** Set latitude/longitude points */
    setLatLngs(latlngs: HeatLatLngTuple[]): this;
    /** Add a latitude/longitude point */
    addLatLng(latlng: HeatLatLngTuple): this;
    /** Set options */
    setOptions(options: HeatLayerOptions): this;
    /** Redraw the heatmap */
    redraw(): this;
  }

  /**
   * Heat map point tuple: [lat, lng, intensity?]
   */
  type HeatLatLngTuple = [number, number] | [number, number, number];

  /**
   * Create a heat layer
   * @param latlngs - Array of [lat, lng] or [lat, lng, intensity] tuples
   * @param options - Heat layer options
   */
  function heatLayer(
    latlngs: HeatLatLngTuple[],
    options?: HeatLayerOptions
  ): HeatLayer;
}

declare module "leaflet.heat" {
  export = L;
}
