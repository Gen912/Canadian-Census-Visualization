import * as d3 from "https://esm.sh/d3@^7";

export default class extends HTMLElement {
  #chartContainer;
  #canadaData;

  obtainHeaderCallback = () => "My D3 Chart";

  constructor() {
    super();
    const root = this.attachShadow({ mode: "open" });

    this.#chartContainer = document.createElement("div");
    this.#chartContainer.style.fontFamily = "Segoe UI, Tahoma, Geneva, Verdana, sans-serif";
    this.#chartContainer.style.padding = "12px";
    this.#chartContainer.style.background = "#f3f3f3";
    this.#chartContainer.style.borderRadius = "6px";
    this.#chartContainer.style.boxShadow = "0 1px 3px rgba(0,0,0,0.3)";
    this.#chartContainer.style.minHeight = "300px";

    root.append(this.#chartContainer);
  }

  async hostFirstLoadedCallback() {
    try {
      this.#canadaData = await fetch("./CanadaCensus%20.geojson").then((res) => res.json());
      await this.#renderChart();
    } catch (error) {
      console.error("Could not load Canada GeoJSON for chart", error);
      this.#chartContainer.textContent = "Unable to load chart data.";
    }
  }

  async #renderChart() {
    if (!this.#canadaData) return;

    const provinceOrder = [
      { full: "British Columbia", abbr: "BC" },
      { full: "Newfoundland and Labrador", abbr: "NL" },
      { full: "Saskatchewan", abbr: "SK" },
      { full: "Quebec", abbr: "QC" },
      { full: "Alberta", abbr: "AB" },
      { full: "Manitoba", abbr: "MB" },
      { full: "Nova Scotia", abbr: "NS" },
      { full: "Ontario", abbr: "ON" },
      { full: "New Brunswick", abbr: "NB" },
      { full: "Prince Edward Island", abbr: "PEI" },
      { full: "Yukon", abbr: "YT" },
    ];

    const provinceMap = new Map();
    this.#canadaData.features
      .filter((f) => f.properties.census2021 && f.properties.census2016)
      .forEach((f) => {
        provinceMap.set(f.properties.name || "Unknown", {
          name: f.properties.name || "Unknown",
          census2021: f.properties.census2021,
          census2016: f.properties.census2016,
        });
      });

    const provinces = provinceOrder
      .map(({ full, abbr }) => {
        const data = provinceMap.get(full);
        return data ? { ...data, abbr } : null;
      })
      .filter((p) => p !== null);

    const width = 400;
    const height = 400;
    const margin = { top: 20, right: 20, bottom: 60, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    this.#chartContainer.innerHTML = "";
    const svg = d3
      .select(this.#chartContainer)
      .append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const xScale = d3
      .scaleBand()
      .domain(provinces.map((d) => d.abbr))
      .range([0, innerWidth])
      .padding(0.15);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(provinces, (d) => Math.max(d.census2021, d.census2016))])
      .range([innerHeight, 0]);

    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .attr("text-anchor", "end")
      .attr("font-size", "12px");

    g.append("g").call(d3.axisLeft(yScale));

    g.selectAll(".bar-2016")
      .data(provinces)
      .enter()
      .append("rect")
      .attr("class", "bar-2016")
      .attr("x", (d) => xScale(d.abbr))
      .attr("y", (d) => yScale(d.census2016))
      .attr("width", xScale.bandwidth() * 0.45)
      .attr("height", (d) => innerHeight - yScale(d.census2016))
      .attr("fill", "#d62728")
      .style("cursor", "pointer")
      .on("click", (_event, d) => {
        this.#emitBarClickMetadata(d, 2016, d.census2016);
      });

    g.selectAll(".bar-2021")
      .data(provinces)
      .enter()
      .append("rect")
      .attr("class", "bar-2021")
      .attr("x", (d) => xScale(d.abbr) + xScale.bandwidth() * 0.45)
      .attr("y", (d) => yScale(d.census2021))
      .attr("width", xScale.bandwidth() * 0.45)
      .attr("height", (d) => innerHeight - yScale(d.census2021))
      .attr("fill", "#1f77b4")
      .style("cursor", "pointer")
      .on("click", (_event, d) => {
        this.#emitBarClickMetadata(d, 2021, d.census2021);
      });

    const legend = svg
      .append("g")
      .attr("transform", `translate(${width - margin.right - 70},${margin.top + 10})`);

    legend
      .append("rect")
      .attr("width", 10)
      .attr("height", 10)
      .attr("fill", "#d62728");
    legend.append("text").attr("x", 15).attr("y", 9).text("2016").attr("font-size", "12px");

    legend
      .append("rect")
      .attr("y", 15)
      .attr("width", 10)
      .attr("height", 10)
      .attr("fill", "#1f77b4");
    legend.append("text").attr("x", 15).attr("y", 24).text("2021").attr("font-size", "12px");
  }

  #emitBarClickMetadata(d, year, value) {
    window.dispatchEvent(
      new CustomEvent("chart-bar-click", {
        detail: {
          source: "bar-chart",
          province: d.name,
          abbr: d.abbr,
          year,
          value,
        },
      })
    );
  }
}