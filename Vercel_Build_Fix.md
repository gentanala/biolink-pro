
# Deployment Fix for Vercel Build Error

The build error `supabaseKey is required` occurred because Vercel builds the project in an environment where `SUPABASE_SERVICE_ROLE_KEY` is not present (which is normal for build time, as secrets are runtime dependencies).

## Fix Applied: Lazy Initialization
I modified `src/app/api/admin/users/delete/route.ts` to initialize the Supabase Admin client **only when the API is called**, not when the file is loaded. This prevents the build process from crashing.

## Action Required
This fix ensures the build succeeds. However, for the "Delete User" feature to work at runtime, you **MUST** add the following Environment Variable in Vercel:

-   **Name**: `SUPABASE_SERVICE_ROLE_KEY`
-   **Value**: (Copy from Supabase Dashboard > Project Settings > API > service_role key)

Once added, redeploy (or wait for the current deployment triggered by my commit to finish).
