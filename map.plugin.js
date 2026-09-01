export default class extends HTMLElement {
  #panelContainer;
  #metadataCard;
  #canadaData;
  #handleChartBarClick;

  obtainHeaderCallback = () => "Metadata Menu";

  constructor() {
    super();
    const root = this.attachShadow({ mode: "open" });

    this.#panelContainer = document.createElement("div");
    this.#panelContainer.style.fontFamily = "Segoe UI, Tahoma, Geneva, Verdana, sans-serif";
    this.#panelContainer.style.padding = "10px";
    this.#panelContainer.style.background = "#d9d9d9";
    this.#panelContainer.style.height = "100%";
    this.#panelContainer.style.boxSizing = "border-box";
    this.#panelContainer.style.overflowY = "auto";

    this.#metadataCard = document.createElement("div");
    this.#metadataCard.style.background = "#f3f3f3";
    this.#metadataCard.style.borderRadius = "6px";
    this.#metadataCard.style.boxShadow = "0 1px 3px rgba(0,0,0,0.3)";
    this.#metadataCard.style.padding = "12px";
    this.#metadataCard.style.fontSize = "15px";
    this.#metadataCard.style.lineHeight = "1.3";
    this.#metadataCard.style.marginBottom = "12px";
    this.#metadataCard.innerHTML = '<div style="font-weight: 600; font-size: 17px; margin-bottom: 8px;">No Metadata</div>';

    this.#panelContainer.append(this.#metadataCard);
    root.append(this.#panelContainer);

    this.#handleChartBarClick = (event) => {
      const detail = event?.detail;
      if (!detail) return;

      this.#setMetadata({
        source: detail.source,
        province: detail.province,
        abbreviation: detail.abbr,
        year: detail.year,
        value: detail.value,
      });
    };
  }

  connectedCallback() {
    window.addEventListener("chart-bar-click", this.#handleChartBarClick);
  }

  disconnectedCallback() {
    window.removeEventListener("chart-bar-click", this.#handleChartBarClick);
  }

  async hostFirstLoadedCallback() {
    try {
      this.#canadaData = await fetch("./CanadaCensus%20.geojson").then((res) => res.json());
    } catch (error) {
      console.error("Could not load Canada GeoJSON", error);
      return;
    }

    this.#addBaseLayers();

    const choroLayer = this.#createChoroplethLayer();
    if (choroLayer) {
      this.addMapLayerDelegate?.(choroLayer, "Colorful", "overlay", true);
    }

    const borderLayer = this.#createBorderLayer();
    if (borderLayer) {
      this.addMapLayerDelegate?.(borderLayer, "BlackBorder", "overlay", true);
    }
  }

  #addBaseLayers() {
    const satellite = this.leaflet?.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: "Tiles &copy; Esri",
        maxZoom: 18,
      }
    );
    this.addMapLayerDelegate?.(satellite, "World_Imagery", "base-layer", true);

    const physical = this.leaflet?.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Physical_Map/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: "Tiles &copy; Esri",
        maxZoom: 8,
      }
    );
    this.addMapLayerDelegate?.(physical, "World_Physical Map", "base-layer", false);
  }

  #createChoroplethLayer() {
    if (!this.#canadaData) return null;

    const provinceColors = {
      "British Columbia": "#e41a1c",
      "Alberta": "#377eb8",
      "Saskatchewan": "#4daf4a",
      "Manitoba": "#984ea3",
      "Ontario": "#ff7f00",
      "Quebec": "#ff0000",
      "New Brunswick": "#f781bf",
      "Nova Scotia": "#999999",
      "Prince Edward Island": "#66c2a5",
      "Newfoundland and Labrador": "#fc8d62",
      "Yukon": "#8da0cb",
    };

    const getColor = (name) => {
      return provinceColors[name] || "#cccccc";
    };

    return this.leaflet?.geoJSON(this.#canadaData, {
      style: (feature) => ({
        color: "#333",
        weight: 0.5,
        fillColor: getColor(feature.properties.name),
        fillOpacity: 0.3,
      }),
      onEachFeature: (feature, layer) => {
        const props = feature.properties;
        const html = `<strong>${props.name || "Region"}</strong><br/>2021: ${props.census2021?.toLocaleString() || "N/A"}<br/>2016: ${props.census2016?.toLocaleString() || "N/A"}`;
        layer.bindPopup(html);
        layer.on("click", () => {
          this.#setMetadata(props);
        });
      },
    });
  }

  #createBorderLayer() {
    if (!this.#canadaData) return null;

    return this.leaflet?.geoJSON(this.#canadaData, {
      interactive: false,
      style: {
        color: "#000",
        weight: 2,
        fillOpacity: 0,
      },
    });
  }

  #setMetadata(props) {
    const entries = Object.entries(props || {});
    const rows = entries
      .map(([key, value]) => {
        let displayValue = value;

        if (value === null || value === undefined) {
          displayValue = "null";
        } else if (typeof value === "number") {
          displayValue = Number.isFinite(value) ? value.toLocaleString() : String(value);
        } else if (typeof value === "object") {
          displayValue = JSON.stringify(value);
        } else {
          displayValue = String(value);
        }

        return `
          <div style="display: grid; grid-template-columns: 1fr 1fr; column-gap: 12px; margin: 4px 0; font-size: 14px;">
            <div style="font-weight: 500;">${key}</div>
            <div>${displayValue}</div>
          </div>
        `;
      })
      .join("");

    const html = `
      <div style="font-weight: 600; font-size: 17px; margin-bottom: 8px;">${props?.name || "Metadata"}</div>
      ${rows || '<div style="font-size: 13px; color: #666;">No properties available.</div>'}
    `;
    this.#metadataCard.innerHTML = html;
  }
}