# Google Ads UI Fix & Manager Account Fallback

## UI Fixes
- **CampaignCreationForm**: Fixed an issue where the input field lost focus and the page scrolled to the top when typing. This was caused by the `ExpansionPanel` component being defined inside the main component, causing unnecessary re-renders. The component has been moved outside and optimized.

## Backend Improvements
- **Audience Search**: Implemented a fallback mechanism to use the Manager Account's refresh token if a specific company account does not have its own credentials.
- **Environment Variables**: Added support for `GOOGLE_ADS_REFRESH_TOKEN` as a fallback for the manager token, ensuring smoother operation even if `GOOGLE_ADS_MANAGER_REFRESH_TOKEN` is missing.

## Technical Details
- Refactored `CampaignCreationForm.tsx` to move `ExpansionPanel` to module scope.
- Updated `src/app/api/multi-platform-advertising/google-ads/audiences/search/route.ts` to handle token fallbacks.
