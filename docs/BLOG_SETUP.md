# Kushi Digitals Blog Setup

## Database and storage

Run `supabase/migrations/202607230001_blog_management_system.sql` manually in the Supabase SQL editor after the existing referral migration.

The migration creates `blog_posts`, `blog_categories`, the `blog-images` storage bucket, row-level security policies, the safe view-count RPC, triggers, indexes, grants, and starter categories. It does not create fake posts or delete existing data.

## Render SPA rewrite

The repository does not currently contain a Render Blueprint. In the existing Render Static Site dashboard, add this rewrite under **Redirects/Rewrites**:

- Source: `/*`
- Destination: `/index.html`
- Action: `Rewrite`

This is required for direct visits to routes such as `/blog/example-slug` and `/admin/blog/new`. It should be configured in the existing Render service rather than creating a second service or replacing the current deployment setup.

## Sitemap

`public/sitemap.xml` includes the `/blog` listing page. Individual article URLs are database-driven and cannot be included in a static file automatically without a trusted build-time Supabase environment.

For full article sitemap coverage, generate the sitemap during the Render build using a server-side or restricted build credential that can read published slugs, or expose a Supabase Edge Function that returns only posts where `status = 'published'` and `published_at <= now()`. Never place a Supabase service-role key in frontend code or a public build artifact.

Suggested first article ideas:

1. Passport Photo Size Rules in India
2. How Old Photo Restoration Works
3. How to Choose the Best Photo Frame Size
