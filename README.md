# CSV Viewer

English | <a href="README.zh-CN.md">简体中文</a>

A modern CSV browser based on **Next.js 14 + React 18 + TypeScript**. It focuses on a "WYSIWYG" table preview experience, supporting server directory browsing, local file uploads, image/link recognition, visual column controls, and shareable deep links. It is ideal for scenarios requiring quick data verification or debugging static resources.

### Tech Stack
- **Next.js App Router**: All pages utilize `app/[[...virtual]]` dynamic segments.
- **Pure React/TypeScript**: No external third-party table dependencies used.
- **Tailored CSS**: `app/globals.css` covers drag-and-drop, preview styles, and responsive layouts.
- **Custom Lightweight CSV Parser**: `lib/csv.ts` handles quotes, newlines, and escaping mechanisms.

## Features
- **Multiple Data Sources**: Drag & drop/select local CSVs, load/download examples, or browse server files under `public/server-data`.
- **Deep Linking & Sharing**: Directly access `https://host/server-data/foo/bar.csv`. Middleware rewrites the request to the homepage carrying the virtual path, automatically loading the table and generating a copyable share link.
- **Rich Media Cells**: Automatically identifies images or URLs. Server CSVs can reference relative paths like `./image.png`. Rendered images support click-to-enlarge, dragging, zooming, rotating, and resetting.
- **Column Operations Toolbox**:
  - **Resizing**: Drag column widths (default `min(320px, containerWidth / visibleColumns)`) with immediate application to the table body.
  - **Reordering**: Grab column headers to sort. A floating preview bar shows the target position in real-time; releasing drops the column into place.
  - **Visibility**: Toggle column display via the panel (at least one column remains visible). Hidden columns are remembered across refreshes.
  - **Refresh**: Click "Refresh" to re-fetch the server-side CSV while retaining column width, order, and visibility settings.
- **Server Resource Resolution**: `resolveServerAssetPath` supports absolute URLs, `data:`, `/server-data/**`, and `./relative-paths`, with boundary protection implemented on both server and client sides.
- **Status & Fallback**: Top status messages provide real-time feedback on read/write results, allowing you to return to the server browser or re-select local files at any time.

## Quick Start

```bash
# 1. Install dependencies
yarn install   # Node.js 18+

# 2. Start development server
yarn dev   # http://localhost:3000

# 3. Linting and Building
yarn lint
yarn build
yarn start # Production mode (requires build first)
```

## Data Sources & Deep Linking

### Local Upload
Drag and drop or use the "Select CSV File" button to import. File content exists only in browser memory and is not uploaded to the server. The URL bar resets to `/` after import to prevent accidental sharing of local data.

### Server Directory
By default (Local Mode), it reads from `public/server-data/`, and static resources within it are accessible via `/server-data/**`.
To browse **S3** instead, set `S3_SERVER_DATA_ROOT=s3://bucket/prefix/`. Directory listing and CSV content will be read from the S3 prefix. Additionally, requests to `/server-data/**` will undergo a 302 redirect on the server side to the signed URL of the corresponding object (for assets like images).

### Deep Linking & Sharing
`middleware.ts` intercepts HTML requests accessing `/server-data/foo.csv` directly. It rewrites them to `/` while injecting a `virtual` query parameter. `app/[[...virtual]]/page.tsx` reads this parameter and passes it to `CsvViewerApp`, automatically loading the target CSV. The file link in the top right corner can be copied or opened in a new tab, enabling a "WYSIWYG" sharing experience.

## Environment Variables

### S3 Mode (Optional)
When `S3_SERVER_DATA_ROOT=s3://bucket/prefix/` is set, server browsing and CSV content reading switch to the S3 prefix. Simultaneously, `/server-data/**` will 302 redirect to the object's signed URL (facilitating image references within CSVs).

Common configurations:
- `S3_SERVER_DATA_ROOT`: `s3://bucket/prefix/`
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_REGION` (or `S3_REGION`)
- Optional: `S3_ENDPOINT` (for S3-compatible services like MinIO), `S3_FORCE_PATH_STYLE=true`
- Optional: `S3_PRESIGN_EXPIRES` (Signed URL expiration in seconds, default `300`)

## Usage Tips
- **Column Resizing**: Grab the gray divider to the right of a column header to adjust. The `body` gets an `is-resizing-column` class during dragging to change the cursor style.
- **Column Reordering**: Hold and drag the column header. The top floating preview bar shows the sorting result in real-time. Release to update the table layout.
- **Column Visibility**: Check/uncheck column names in the "Column Display" panel. At least one column is always kept visible to avoid empty tables.
- **Refresh**: The "Refresh" in the top panel reloads the current directory listing; the "Refresh" inside the table re-fetches the current CSV content.
- **Image Preview**: Click an image cell to open the preview overlay. Supports mouse wheel zoom, button zoom/rotate, drag-to-pan, and one-click reset.

## Directory Structure
```
app/
  [[...virtual]]/page.tsx        # Captures / and any deep-linked CSV paths
  api/server-data/route.ts       # Reads public/server-data locally; or lists S3 prefix in S3 mode
  api/server-data-file/route.ts  # Reads CSV text (Local or S3)
  api/s3-presign/route.ts        # Generates temp access & 302 redirects for s3://...
  server-data/[...path]/route.ts # Passthrough for /server-data/** locally; or 302 to signed URL in S3 mode
  globals.css                    # Global and interactive styles
components/
  CsvViewerApp.tsx               # Main UI, state management, and data source logic
  CsvTable.tsx                   # Table rendering, resizing/sorting, media cells
lib/
  csv.ts                         # Lightweight CSV parser
public/server-data/              # Publicly accessible CSVs and associated assets
middleware.ts                    # Deep link rewriting and HTML request identification
```

## API & Middleware
- `GET /api/server-data?path=server-data/foo/`: In local mode, uses `fs.readdir` to read `public/server-data`; if `S3_SERVER_DATA_ROOT` is set, lists the corresponding S3 prefix (blocks out-of-bounds paths).
- `GET /api/server-data-file?path=server-data/foo.csv`: Reads CSV text content (Local or S3).
- `GET /api/s3-presign?uri=s3://bucket/key`: Generates a temporary access URL and 302 redirects (used for S3 resources embedded in CSVs).
- `middleware.ts`: Only affects `GET` requests with `Accept: text/html` to avoid interfering with static resource access to `/server-data/**`. Other requests are passed through.
- `CsvViewerApp`: Reads directory and CSV data on the client side via `fetch(/api/server-data)` and `fetch(/api/server-data-file)`; assets like images are accessed via `/server-data/**` (local direct read or S3 signed redirect).

## Deployment
1. Run `yarn build` to generate `.next`.
2. Choose a hosting method:
   - **Vercel / Netlify / Railway**: Import the repository directly (Node.js 18 default).
   - **Self-hosted**: Upload the build artifacts and `package.json`, then run `yarn start`, or wrap it in Docker/PM2.
3. Select Data Source:
   - **Local Mode**: Ensure the `public/server-data` directory is synchronized to the server (including assets), otherwise the server browser panel will appear empty.
   - **S3 Mode**: Set `S3_SERVER_DATA_ROOT=s3://bucket/prefix/` and provide corresponding AWS/S3 credentials (and optional `S3_ENDPOINT`/`S3_FORCE_PATH_STYLE`).
4. To restrict static access to `/server-data/**`, add authentication or rewrites in your CDN / Nginx / Apache, and implement corresponding validation in `app/api/server-data`.

## FAQ
- **Browser triggers download when accessing CSV**: Ensure you are accessing via `/` or the deep link `/server-data/foo.csv` and that the path case is correct; otherwise, the static server might serve the file directly.
- **Pointer jitters when dragging columns**: Check if browser extensions are intercepting pointer events, or ensure the page is not restricted by an iframe.
- **Images not loading**: Relative paths must start with `./`, and the file must exist within `public/server-data`. For cross-origin URLs, confirm anonymous access is allowed.
- **Directory empty or error**: `/api/server-data` only allows reading `public/server-data`. Ensure the deployment target has read permissions and the path does not contain filtered characters like Chinese or spaces.