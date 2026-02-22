# Stage 6 Regression and Acceptance Report

## Scope

- Smoke/perf checks for web app.
- UI regression checklist for landing, gallery, modals, forms, and responsiveness.
- Before/after metric snapshot based on current tool output.

## Executed commands

- `npm run lint:web`
- `npm run build:web`
- `npm --workspace apps/web run perf-check`
- `npm --workspace apps/web run media-check`

## UI regression checklist

- [ ] Landing loads, sections are present and ordered correctly.
- [ ] Gallery filters and card list behavior are stable.
- [ ] Gallery modal open/close/prev-next/ESC behavior is stable.
- [ ] Form states (validation/loading/success/error) are intact.
- [ ] Calculator basic flow (inputs and estimate response) is intact.
- [ ] Responsive behavior checked for mobile/tablet/desktop breakpoints.

## Metric snapshot (before -> current)

- Main JS (gzip): `~67 KB -> ~91 KB` (still within `100 KB` budget; legal routes split into chunks).
- Hero media total: `~3.6 MB -> ~0.85 MB`.
- Hero video MP4: `~3.2 MB -> ~0.35 MB`.
- Initial media pressure reduced by moving gallery UI to optimized variants and stricter loading strategy.

## Notes

- No new production dependencies were added in Stage 6.
- Stage 6 is focused on verification and documenting measurable outcomes.
- Automated smoke and budget checks are completed; full UI checklist should be confirmed in the target
  runtime environment (staging/prod-like) with browser session recording.
