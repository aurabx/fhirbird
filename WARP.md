# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Tooling and Common Commands

### Runtime and prerequisites
- Node.js 18+ and npm (see `README.md`).

### Install dependencies
- `npm install`

### Local development
- `npm run dev`
  - Starts the Next.js dev server at `http://localhost:3000` using the App Router.

### Production build and run
- `npm run build`
  - Builds the Next.js app for production.
- `npm start`
  - Runs the production server using the previously built output.

### Linting and formatting (Biome)
Biome is configured in `biome.json` and used for both linting and formatting.

- `npm run lint`
  - Runs `biome check` with Next.js/React recommended rules.
- `npm run format`
  - Runs `biome format --write` to apply formatting.

### Tests
- There are currently no test scripts defined in `package.json`.
- If you add a test runner (e.g., Jest, Playwright), also add npm scripts and update this file with how to run the full suite and a single test.

## Environment and configuration

### Next.js environment files
- Use `.env.local` for local configuration (see `README.md`).
- Key variables:
  - `NODE_ENV`
    - Controls production vs development behavior throughout the app.
  - `ALLOWED_FHIR_DOMAINS`
    - Comma-separated allowlist of FHIR server domains for the proxy (e.g. `hapi.fhir.org,*.hl7.org`).
    - Parsed in `app/api/fhir-proxy/route.ts` to restrict which target hostnames the proxy will forward to.

### Proxy security behavior
Defined in `app/api/fhir-proxy/route.ts`:
- In production (`NODE_ENV=production`):
  - Blocks requests to localhost and private IP ranges (127.x, 10.x, 192.168.x, 169.254.x, 172.16–31.x) to avoid SSRF.
- Optional allowlist:
  - If `ALLOWED_FHIR_DOMAINS` is set, only those domains (and wildcard subdomains like `*.example.com`) are allowed.
- Rate limiting:
  - Simple in-memory limit of 60 requests per minute per IP.
- Request limits:
  - 30s timeout via `AbortController`.
  - ~10MB response size limit based on `Content-Length`.

### Production FHIR server list
Defined in `components/ServerConfig.tsx`:
- `PRODUCTION_FHIR_SERVERS` is the canonical list of selectable servers when `NODE_ENV === 'production'`.
- To change the production server list, edit this array; it drives the dropdown shown in the configuration UI.

## High-level architecture

### Overall stack
- Framework: Next.js 16 App Router (`app/` directory).
- Language: TypeScript.
- Styling: Tailwind CSS 4 via `@import "tailwindcss";` in `app/globals.css` plus inline utility classes.
- Lint/format: Biome (`biome.json`).

### App shell and layout
- `app/layout.tsx`
  - Defines the root HTML structure and global fonts using `Geist` and `Geist_Mono` via `next/font`.
  - Exposes `metadata` (title, description, favicon) for the whole app.
  - Wraps all pages in a minimal `<html>/<body>` shell.
- `app/globals.css`
  - Imports Tailwind and defines theme variables for background/foreground and fonts.
  - Applies base body styling and connects CSS variables to the Geist font CSS variables.

### Main client page and state orchestration
- `app/page.tsx`
  - Marked `'use client'`; this is the main interactive UI.
  - Owns all top-level UI state:
    - `serverUrl`, `useProxy`: current FHIR base URL and whether to route via the proxy.
    - `results`, `error`, `loading`: current query state.
    - `requestInfo`: last executed request (URL, method, headers) for display.
  - Composes three major components:
    - `ServerConfig` — configuration of server URL and proxy usage.
    - `QueryInterface` — building and executing FHIR queries.
    - `ResultsDisplay` — interactive JSON tree viewer for responses.
  - Handles callbacks from children to keep a single source of truth for query results and request metadata, and renders a "Request Details" panel based on `requestInfo`.

### Server configuration UI
- `components/ServerConfig.tsx`
  - Responsible for:
    - Choosing the FHIR server.
    - Toggling whether to use the proxy for CORS avoidance.
    - Persisting these choices in `localStorage`.
  - Behavior differences by environment:
    - In production (`process.env.NODE_ENV === 'production'`):
      - Server selection is restricted to the `PRODUCTION_FHIR_SERVERS` dropdown.
    - In development:
      - Free-form URL input with validation hints.
  - Emits configuration upwards via props:
    - `onServerChange(url: string)` updates the parent-held `serverUrl`.
    - `onProxyChange(useProxy: boolean)` updates the parent-held `useProxy` flag.

### Query builder and request dispatch
- `components/QueryInterface.tsx`
  - Owns user inputs for building a FHIR request:
    - `queryMode`: `'search' | 'read' | 'metadata'`.
    - `resourceType`, `searchParams`, `resourceId`.
    - `customHeaders` (JSON text area parsed into HTTP headers).
  - On submit:
    - Validates that a server URL is configured and has an `http://` or `https://` scheme.
    - Normalizes the base URL (trims, removes trailing slash).
    - Builds the target FHIR URL based on mode:
      - `metadata` → `/<base>/metadata`.
      - `read` → `/<base>/<ResourceType>/<id>`.
      - `search` → `/<base>/<ResourceType>?<searchParams>`.
    - Constructs headers with at least `Accept: application/fhir+json`, merging any JSON-parsed custom headers.
    - Decides between direct fetch vs proxy:
      - If `useProxy` is true, calls `/api/fhir-proxy?url=...&headers=...` with empty client-side headers (proxy re-applies them server-side).
      - Otherwise, sends a direct `fetch` to the FHIR server with the assembled headers.
    - Propagates both success and error states back to the parent via `onQuery`, always trying to include a reconstructed URL and headers for error cases so the UI can show what was attempted.
  - `onLoading` is called to toggle the parent’s `loading` state around the async operation.

### Results rendering and JSON inspection
- `components/ResultsDisplay.tsx`
  - Presents three high-level states:
    - Loading spinner while a request is in flight.
    - Error alert if `error` is set.
    - Empty placeholder before any queries have run.
  - For successful responses:
    - Computes a simple summary string, with special handling for FHIR Bundles (e.g., "Bundle containing N resources").
    - Renders the response JSON as an interactive tree:
      - Maintains a `Set<string>` of expanded paths (starting with `root`).
      - Arrays and objects can be expanded/collapsed with ▶/▼ toggles.
      - Values are syntax-colored by type (string/number/boolean/null).
    - Provides a `details`/`summary` block that shows a raw `JSON.stringify` dump for copy/paste and debugging.

### FHIR proxy API route
- `app/api/fhir-proxy/route.ts`
  - Single `GET` handler that acts as a controlled proxy for FHIR servers.
  - Responsibilities:
    - Rate-limit incoming requests per IP using an in-memory `Map` keyed by IP address.
    - Parse `url` and `headers` from query params; validate and JSON-parse the headers param.
    - Enforce security constraints:
      - Reject missing or invalid URLs.
      - Allow only `http:` and `https:` schemes.
      - In production, block localhost and private IP ranges.
      - Optionally restrict hostnames based on `ALLOWED_FHIR_DOMAINS` (exact or wildcard matches).
    - Execute the upstream request:
      - Always uses `GET` and propagates merged headers.
      - Applies a 30s timeout.
      - Rejects responses with `Content-Length` above ~10MB.
      - Logs basic request/response info (hostname, status, duration).
    - Returns a `NextResponse` with the upstream body and a best-effort `Content-Type`, or structured JSON errors for validation/timeout/other failures.

### Configuration and tooling files
- `next.config.ts`
  - Enables `reactCompiler: true` and is otherwise close to default Next.js config.
- `biome.json`
  - Enables Biome with Git-aware VCS integration and ignores typical output directories (`node_modules`, `.next`, `dist`, `build`).
  - Uses recommended rule sets for `next` and `react` domains, with `noUnknownAtRules` disabled to play nicely with Tailwind and modern CSS at-rules.

## How to extend or modify behavior

When adding new features or adjusting behavior, prefer to:
- Keep query construction logic in `QueryInterface` and use the existing `onQuery`/`onLoading` contract rather than duplicating fetch logic in other components.
- Keep proxy-related constraints centralized in `app/api/fhir-proxy/route.ts` (e.g., new security rules, auth, or logging) so client code remains simple.
- Update `PRODUCTION_FHIR_SERVERS` and `ALLOWED_FHIR_DOMAINS` together when changing which servers users are allowed to target in production.
