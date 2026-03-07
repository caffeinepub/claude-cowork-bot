# Claude Cowork Bot

## Current State
A personal Claude-powered chatbot running on ICP. The backend uses a "first caller becomes admin" pattern via `access-control.mo`. The frontend hardcodes admin principals in `useQueries.ts`. Currently three principals are in the admin list. The backend `isAdmin` check only looks at the dynamic role map, not the hardcoded list, so new principals added to the frontend list are not recognised by the backend.

## Requested Changes (Diff)

### Add
- Principal `f7ttf-mk7fq-uljq2-feawb-uaaps-6ddxo-hvyby-jttw2-5oi6f-pftnc-iqe` to the admin list in both frontend and backend.

### Modify
- `useQueries.ts` ADMIN_PRINCIPALS set: add the new principal (already done).
- Backend `isAdmin` logic: must recognise all four hardcoded principals without relying solely on the dynamic role map. The backend should check a hardcoded list of admin principals before falling back to the role map.

### Remove
- Nothing removed.

## Implementation Plan
1. Regenerate backend Motoko with updated admin principal list (four principals total), where `isAdmin` checks a hardcoded array of principals first.
2. Frontend `useQueries.ts` already updated with the new principal.
3. Validate and deploy.
