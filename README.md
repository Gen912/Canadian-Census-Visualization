# Canadian Census Visualization

This project uses a local static server and custom web components to render a D3 chart and a Leaflet map from the Canada census GeoJSON data.

GitHub: https://github.com/Gen912/Canadian-Census-Visualization.git

## How to run

1. Open a terminal in this folder:
   `..\Canadian Census Visualization Suite`
2. Start a static file server. One easy option is Python:
   `python -m http.server 8000`
3. Open the project in your browser:
   `http://localhost:8000/index.html`

## Notes

- The project must be served over HTTP because it loads modules and data files with `fetch`.
- Keep the files in this folder together so the relative imports continue to work.