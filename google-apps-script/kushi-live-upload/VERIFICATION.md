# Verification — 2 October 2026

## Activation follow-up

### Owner sign-in continuation

Created and named the Apps Script project, saved Code.gs, Index.html and appsscript.json from repository source, and saved DRIVE_FOLDER_ID, SPREADSHEET_ID, UPLOADS_ENABLED=false and YOUTUBE_LIVE_URL in Script Properties. The YouTube return link provisionally uses the existing website channel's /live URL pending the owner's exact show URL. Ran setupKushiLiveStudio: Google execution log confirmed setup complete, private folder/Sheet access verified, queue ready, and existing submissions preserved. Project ID/editor URL are saved only in ignored activation.local.json.

Prepared New deployment → Web app → Execute as Me → Anyone. Deployment has not been submitted; awaiting owner confirmation of public access. Uploads remain closed and production website environment is unchanged. The temporary localhost source-transfer page was removed after all three files were saved.

- Created the dedicated viewer-upload Drive folder and Photo Queue spreadsheet through the connected Google Drive account. Connector metadata readback shows only an owner permission on each. IDs are saved in ignored `activation.local.json`, not in React or committed configuration.
- Added owner-guarded `setupKushiLiveStudio()` with configuration validation, configurable `QUEUE_TAB_NAME` (default Queue), private destination/Sheet checks, automatic headers and status validation, Sheet write verification, preservation of submission rows, and safe recovery of NEXT_QUEUE from existing queue numbers. Owner folder ownership validates Drive write authority. Missing upload toggle defaults to closed.
- Fixed daily slot reservation so failed file writes cannot bypass the cap; malformed count values fail closed. Preserved uploaded files when a queue append succeeded but a later flush failed, allowing a retry to recover the existing queue entry.
- Upload tests now pass 8/8, including setup, owner-only protection and write-failure retry. Production build and targeted React lint pass.
- No clasp, Render or gcloud executable found on PATH; no standard clasp OAuth file, gcloud application-default credential or Render CLI config was found. No Google/clasp/Render credential environment variable names were present. No credential values were printed.
- Available browser is signed out of Apps Script; its home URL redirects to Google's Apps Script landing page with Sign in. Drive connector authorization does not provide Apps Script deployment authorization. Owner sign-in/authorization is the next required step. Apps Script project creation/configuration/deployment and production website deployment are still pending. Existing Vite environment values were left untouched.

## Changes in this task

Added `src/pages/public/Live.jsx`, `src/styles/live.css`, `.env.example`, `tests/live-upload.test.mjs` and this Apps Script folder (`Code.gs`, `Index.html`, `appsscript.json`, `README.md`, `VERIFICATION.md`). Modified only `src/App.jsx` to import Live and add its public route. Pre-existing uncommitted package, studio, admin and Supabase changes were preserved.

## Completed checks

- `npm run build`: PASS. Vite reports the existing large bundle warning.
- `npx eslint src/pages/public/Live.jsx src/App.jsx`: PASS.
- `node --test tests/live-upload.test.mjs`: 4/4 PASS. Executes the actual Apps Script source in a mocked Google environment: JPG/JPEG/PNG/WEBP signatures, unsupported/renamed files, over-15-MB rejection, required fields/consent, text/formula sanitization, private folder destination, queue row/status, unique filenames, duplicate retry, rate limit, daily cap, shared-folder rejection and failed-write cleanup. These are server simulations, not real Google integration tests or full image decoding tests.
- Script and embedded browser JavaScript parse successfully in the test runner.
- Browser: `/live` renders the intended title and Telugu text; at a 390 × 844 mobile viewport the page has no horizontal overflow. Configuration is absent, so the unavailable state is shown. `/studio` still renders its templates and style picker.
- New React/Apps Script source code search confirms no Supabase calls, bucket creation, image blobs/base64 database writes or storage upload calls. Existing Supabase features were not edited.

## Existing workspace failures

`npm test`: 53/58 pass. Five failures concern existing studio cutout caching, session-only background removal, invoke timeout contract, stale generation recovery, and TemplateEditor routing. These failing source files were not changed by this task.

`npm run lint`: 18 errors and 2 warnings in existing admin/template/studio code. None in the new Live page or route additions. No typecheck script exists in package.json.

## Still needs owner setup and deployment testing

Drive Folder ID, Spreadsheet ID and YouTube Live URL must be configured in Script Properties. Deploy the supplied Apps Script as owner, accessible to Anyone; configure its public `/exec` URL in `VITE_LIVE_APPS_SCRIPT_URL`; rebuild and publish using the existing website hosting process. Exact steps are in README.md.

Real Google authorization, Drive file creation/privacy, Sheet writes, deployed form rendering, success/failure/refresh behavior and picker operation on Android Chrome/iPhone Safari remain unverified until that deployment exists. Existing authenticated generation/payment flows were not exercised. The public production URL has not been published by this task.
