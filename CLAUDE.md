@AGENTS.md

# CLAUDE.md

## Project Overview

ZPL Etiqueta is a Portuguese-language Next.js application for loading TXT/ZPL files, previewing thermal labels through the Labelary API, and exporting all labels as a single multipage PDF.

The application supports:

- Multiple input files without duplicating entries in the file list.
- Multiple printable `^XA ... ^XZ` labels inside one file.
- Sequential Labelary requests to respect API rate and payload limits.
- Automatic retry after HTTP 429 responses.
- Automatic label size and portrait/landscape detection.
- Mixed page sizes and orientations in the final merged PDF.
- Preview navigation with previous/next controls.
- Basic password access gate configured through an environment variable.

The UI is written in Brazilian Portuguese.

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript with strict mode
- Tailwind CSS 4
- shadcn-style components backed by Radix UI
- Lucide React icons
- `pdf-lib` for merging converted PDF pages
- Labelary API for ZPL rendering

Before changing Next.js APIs or conventions, read the relevant documentation under `node_modules/next/dist/docs/` as required by `AGENTS.md`.

## Commands

```bash
npm install
npm run dev
npm run lint
npm run build
npm run start
```

Always run both checks after code changes:

```bash
npm run lint
npm run build
```

Do not start the development server automatically. The project owner runs it manually unless explicitly requesting otherwise.

## Environment Variables

Create `.env` from `.env.example`:

```env
APP_ACCESS_PASSWORD=replace-with-a-strong-password
```

`APP_ACCESS_PASSWORD` is validated by `POST /api/auth`.

Important: the current password screen is only a minimal UI access gate. Authentication success is stored in `sessionStorage`, and the Labelary proxy routes are not protected by a server-side session. Do not describe this mechanism as strong authentication. If stronger security is required, add server-side sessions and protect `/api/render` and `/api/export`.

Never commit `.env`, passwords, Labelary API keys, or other secrets.

## Directory Structure

```text
src/
  app/
    api/
      auth/route.ts       Password validation endpoint
      export/route.ts     Thin PDF Labelary proxy route
      render/route.ts     Thin PNG Labelary proxy route
    globals.css
    layout.tsx
    page.tsx              App Router entry point only
  components/
    ui/                   Shared shadcn-style primitives
    zpl-labels/           Feature components
  hooks/
    use-label-workspace.ts
  lib/
    labelary/
      auth.ts             Client password validation
      client.ts           Preview, conversion, retry, merge, download
      server.ts           Shared server-side Labelary proxy
    zpl/
      constants.ts        Defaults, demo ZPL, request timing
      parser.ts           Parsing and format detection
    utils.ts              Shared class-name helper
  types/
    zpl.ts                Shared feature contracts
```

## Architecture

### Route Entry

`src/app/page.tsx` must remain a small App Router entry component. Do not move feature state or domain rules back into this file.

### Feature Composition

`src/components/zpl-labels/zpl-label-app.tsx` composes the application panels:

- `access-gate.tsx`
- `app-header.tsx`
- `files-panel.tsx`
- `preview-panel.tsx`
- `zpl-editor.tsx`
- `settings-panel.tsx`
- `export-panel.tsx`
- `summary-panel.tsx`

Keep components focused on presentation and user interaction. Put workflow state in the hook and reusable domain behavior in `lib`.

### Application State

`src/hooks/use-label-workspace.ts` owns the client workflow:

- Loaded files and active file.
- User settings.
- Preview URLs and navigation.
- Export queue and progress.
- Login state.
- Status and error messages.

Object URLs must remain valid while navigating previews. Revoke them only when replacing the preview collection, removing the relevant selection, resetting the workspace, or unmounting.

### ZPL Domain Logic

`src/lib/zpl/parser.ts` owns pure ZPL behavior:

- `parseZplFile`: creates one file entry per uploaded file.
- `splitPrintableZpl`: separates printable `^XA ... ^XZ` blocks.
- `getLabelDimensions`: detects physical size and orientation.
- `updateZplFile`: recalculates metadata after editing.

Do not equate one uploaded file with one label. One file may contain many printable labels, while still appearing only once in the loaded-files list.

Cleanup blocks such as `^XA ^ID... ^XZ` are not printable labels and must be skipped.

## Label Size Detection

Detection is performed independently for each printable label, in this order:

1. Use explicit `^PW` and `^LL` values, converted from dots using the selected density.
2. Recognize the validated two-column 80 x 25 mm landscape format.
3. Calculate dimensions from full-page `~DG`/`^XG` graphics.
4. Infer portrait or landscape from `^FO` and `^FT` coordinates.
5. Fall back to the user-configured width and height.

When only orientation is inferred, preserve the configured physical sides and swap them as needed. Do not invent arbitrary physical dimensions.

A batch may contain portrait and landscape pages. Each queue item must use its own detected dimensions when sent to Labelary.

## Labelary Workflow

Browser requests use local Next.js routes:

- `POST /api/render` returns PNG.
- `POST /api/export` returns PDF.

Both routes delegate to `src/lib/labelary/server.ts`. Keep route handlers thin and do not duplicate URL/header/proxy logic.

The export flow must remain sequential:

1. Parse every file into printable labels.
2. Send one label to Labelary.
3. Wait for its response.
4. Add the returned PDF to the local collection.
5. Pause before the next request.
6. Merge all returned PDFs with `pdf-lib`.
7. Download one final PDF.

Current timing constants are in `src/lib/zpl/constants.ts`:

- Request delay: 450 ms.
- Initial rate-limit retry delay: 1500 ms.
- Maximum retries: 4.

Do not parallelize Labelary requests. The public API has rate limits and rejects requests whose embedded fonts/images exceed its per-request limit. Splitting labels before sending is intentional.

## UI Conventions

- Reuse components from `src/components/ui`.
- Use Lucide icons for actions.
- Keep operational text in Brazilian Portuguese.
- Preserve the compact three-column desktop layout.
- File list actions use an eye icon for preview and a trash icon for removal.
- Preview navigation uses previous/next buttons and a visible label counter.
- Export progress must show completed labels, total labels, and the current item.
- Do not introduce nested cards or marketing-style sections.

## Import Conventions

Use the configured `@/*` alias for imports from `src`:

```ts
import { getLabelDimensions } from "@/lib/zpl/parser";
import type { LabelSettings } from "@/types/zpl";
```

Use `import type` for type-only imports. Avoid long relative paths such as `../../../lib/...`.

Client components and hooks that use browser APIs, state, effects, or event handlers must begin with:

```ts
"use client";
```

Do not add `"use client"` to server-only modules or route handlers.

## Change Guidelines

- Preserve existing behavior unless the task explicitly changes it.
- Keep ZPL parsing and dimension detection out of React components.
- Keep Labelary fetch/retry behavior out of visual components.
- Keep shared API proxy behavior in `src/lib/labelary/server.ts`.
- Add new feature contracts to `src/types/zpl.ts`.
- Revoke object URLs carefully to avoid blank historical previews or memory leaks.
- Maintain one uploaded file as one list item, regardless of internal label count.
- Keep API calls sequential and retain progress reporting.
- Do not commit generated `.next` files or local environment files.

## Verification Checklist

Before finishing a change, verify:

1. `npm run lint` succeeds.
2. `npm run build` succeeds.
3. A file containing multiple `^XA ... ^XZ` blocks reports and exports every printable label.
4. Preview navigation retains previously rendered images.
5. Portrait 4 x 6 graphic labels remain portrait.
6. The two-column 80 x 25 mm model remains landscape.
7. Mixed-format batches merge into one PDF without normalizing all pages to one size.
8. Removing a file updates selection, preview, totals, and export scope correctly.
9. No development server was left running unless explicitly requested.
