# Add Search and Filters to Round History

This plan outlines the addition of search and filtering capabilities to the "Recent Round History" table on the admin monitoring dashboard.

## Proposed Changes

### Backend Service (`game.service.ts`)
- Update `getHistory` to accept optional filters: `search` (for `roundNumber`), `status` (for specific round status), `startDate`, and `endDate`.
- Modify the Prisma `findMany` query to conditionally build the `where` clause based on the provided filters. 
- Ensure `count` uses the same `where` clause for accurate pagination totals.

### Backend Controller (`game.controller.ts`)
- Update the `@Get('history')` endpoint to accept query parameters for `search`, `status`, `startDate`, and `endDate`.
- Pass these query parameters to `this.gameService.getHistory`.

### Frontend API Client (`api-service.ts`)
- Update `getRoundHistory` method signature to accept an optional `filters` object.
- Append these filters to the query string of the HTTP request to the backend.

### Frontend Dashboard (`monitoring/page.tsx`)
- Add React state variables for the new filters (`search`, `statusFilter`, `dateRange`).
- Build a new "Filter Bar" UI directly above the `TabulatorTable`, styled to match the premium dark mode aesthetic (glassmorphism inputs, sleek dropdowns).
- Wire up the new filter state to the `fetchData` function, ensuring it triggers a re-fetch when filters change (with debounce for text search).
