# AGENTS.md

This file provides project-specific guidance for coding agents working in this repository.

## Project overview

- Stack: Vite + React 19 + TypeScript.
- Main entry point: `src/main.tsx`.
- Primary app UI and state logic: `src/App.tsx`.
- Gemini API integration: `src/services/gemini.ts`.
- Shared types and response schemas: `src/types.ts`.

## Setup and common commands

Run these from the repository root:

1. `npm install`
2. `npm run dev` (local dev server on port 3000)
3. `npm run lint` (TypeScript typecheck, no emit)
4. `npm run build` (production build)

## Environment and secrets

- `GEMINI_API_KEY` is required in `.env.local` for local development.
- The key is exposed to the client build through `vite.config.ts` via:
  - `process.env.GEMINI_API_KEY`
- Never hardcode secrets or commit `.env*` files.

## Coding guidelines for this repo

- Keep changes focused and minimal; avoid broad refactors unless requested.
- Preserve receipt-calculation behavior:
  - Respect `itemsIncludeTax` when computing per-person totals.
  - Keep subtotal/tax/tip/total math internally consistent.
- Preserve share-link compatibility:
  - `encodeShareData` and `decodeShareData` in `src/App.tsx` should remain backward compatible unless explicitly requested.
- If changing receipt parsing output:
  - Update both `ReceiptData` and `RECEIPT_SCHEMA` in `src/types.ts`.
  - Keep defaulting behavior in `parseReceiptImage` (`tip`, `tax`, `currency`) coherent.
- Follow existing style conventions:
  - Functional React components + hooks.
  - TypeScript-first; avoid introducing untyped data where practical.
  - Keep UI tone and visual style consistent with the current receipt-themed design.

## Validation checklist before finishing

- Run `npm run lint`.
- Run `npm run build`.
- If UI behavior changed, do a quick manual smoke check in `npm run dev`:
  - Upload receipt flow still works.
  - Assignment toggles still work.
  - Share view (`?share=...`) still renders.

