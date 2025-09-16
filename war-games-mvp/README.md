# War Games — WWI Sandbox (MVP)

Edit a historical headline and watch consequences propagate along a causal DAG.

## Quickstart
```bash
npm i
npm run dev
# open http://localhost:3000
```

## Notes
- Data: `data/wwi.json` (~45 events, heuristic edges)
- API: `app/api/intervene/route.ts`
- Propagation core: `src/server/propagate.ts` (deterministic, no external APIs)
- UI: `app/page.tsx` (timeline strip + editor)

Built 2025-09-16.