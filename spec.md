# Claude Cowork Bot

## Current State
The app has a role-based access control system where the first caller becomes admin. This is fragile across deployments. The user's principal `qhzth-islcf-hba7y-q4gl3-n6vsh-cvp54-khis5-3qcsi-dv6hz-44mcd-xae` is not recognised as admin because a system call claimed the admin slot first.

## Requested Changes (Diff)

### Add
- Hardcoded permanent admin principal in the backend so the user is always admin regardless of deployment order

### Modify
- `main.mo`: Replace dynamic `AccessControl.isAdmin` checks with a direct principal comparison against the hardcoded admin principal
- `access-control.mo`: No changes needed; the hardcode will be done at the main.mo level

### Remove
- Dependency on "first caller" admin assignment for the hardcoded admin

## Implementation Plan
1. Add a constant `ADMIN_PRINCIPAL` in `main.mo` set to `qhzth-islcf-hba7y-q4gl3-n6vsh-cvp54-khis5-3qcsi-dv6hz-44mcd-xae`
2. Replace `AccessControl.isAdmin(accessControlState, caller)` checks in `setApiKey` and `getApiKeyStatus` with `caller == ADMIN_PRINCIPAL`
3. Add a `isAdmin` public query in `main.mo` that returns `caller == ADMIN_PRINCIPAL`
4. No frontend changes needed -- the `useIsAdmin` hook already calls the backend `isAdmin` query
