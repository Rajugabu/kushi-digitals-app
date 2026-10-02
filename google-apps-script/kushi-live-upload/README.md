# KUSHI LIVE STUDIO setup

The website page is `/live`. The form runs inside a Google Apps Script iframe and calls `google.script.run`; no browser CORS workaround or Supabase image storage is involved. The Google Sheet is the owner queue. The website itself has no Google credentials.

## Set up Google (once)

1. Sign into the Google account that will own the images. In **My Drive**, create **KUSHI LIVE STUDIO - Viewer Uploads**. Keep General access **Restricted**. Do not share the folder or its parent folders with anyone; use a private My Drive folder, not a Shared Drive.
2. Open the folder. Copy the part after `/folders/` in the address bar. This is your **Drive Folder ID**.
3. Create a Google Sheet named **KUSHI LIVE STUDIO - Photo Queue**. Keep it Restricted too. Copy the part between `/d/` and `/edit` in its URL: your **Spreadsheet ID**.
4. Open [Apps Script](https://script.google.com/) and click **New project**. Name it **Kushi Live Upload**.
5. Replace `Code.gs` with this folder's `Code.gs`. Click **+ → HTML**, name it `Index`, and paste `Index.html`.
6. Under **Project Settings**, enable **Show appsscript.json manifest file**. Replace that file with the supplied `appsscript.json`.
7. Under **Project Settings → Script Properties**, add these values. These belong ONLY in Apps Script, never in the website's Vite variables:

   | Property | Value |
   | --- | --- |
   | `DRIVE_FOLDER_ID` | Folder ID from step 2 |
   | `SPREADSHEET_ID` | Spreadsheet ID from step 3 |
   | `YOUTUBE_LIVE_URL` | Your full `https://www.youtube.com/...` or `https://youtu.be/...` live URL |
   | `UPLOADS_ENABLED` | `true` to open uploads; `false` to close them |
   | `DAILY_UPLOAD_LIMIT` | `200` initially; lower if needed |
   | `QUEUE_TAB_NAME` | Optional; defaults to `Queue` |

8. Save. Select **setupKushiLiveStudio** in the editor's function menu and click **Run**. Authorize as the owner. Google requests Drive, Sheets and your account email so the script can create private images and queue rows and protect setup from viewer access. The execution log will say **KUSHI LIVE STUDIO setup complete**. Existing submissions are preserved. If an unverified-app warning appears, proceed only after confirming this is your own project. A Workspace administrator may prohibit public web apps.
9. Check the Sheet's new **Queue** tab (or your configured tab). It has the 13 required columns and a Status dropdown. Setup validates configuration and write access, fills missing headers, and safely advances `NEXT_QUEUE` past existing queue numbers. Do not edit the header or reset `NEXT_QUEUE`. Queue numbers remain unique across days; failed writes can leave gaps. Missing `UPLOADS_ENABLED` defaults to `false` for safety: set it to `true` when ready.
10. Click **Deploy → New deployment → gear icon → Web app**. Set **Execute as: Me (owner)** and **Who has access: Anyone** (including signed-out viewers). Click **Deploy** and complete owner authorization if asked.
11. Copy the URL ending in **/exec**. Do not use `/dev`.

## Connect the website

12. In the website hosting dashboard, add `VITE_LIVE_APPS_SCRIPT_URL` with that `/exec` URL. For local testing, add it to `.env.local`. The provided `.env.example` shows the format. This public URL is safe to expose; no private Google IDs or credentials go into Vite.
13. Run `npm run build` and publish the resulting `dist` with your existing deployment process. Vite reads the value at build time. The repository does not identify a production hosting provider or deployment credentials. Ensure your host serves `index.html` for `/live`, as it does for other React routes. If your host uses CSP, permit frames from `https://script.google.com` and `https://script.googleusercontent.com`.
14. Visit `https://kushidigitals.com/live` in Incognito while signed out. Without configuration the page deliberately displays an unavailable message.

## Verify before the live show

Use a test JPG, PNG and WEBP, each with the matching extension. Submit with both names and consent. Confirm a success card, queue number, private file in the exact owner folder, and a WAITING row with matching file ID and filename. Open the private file as the owner to download it for Photoshop. Confirm a signed-out browser cannot open the file or Sheet.

Test Android Chrome, iPhone Safari and desktop Chrome: picker, preview, Change/Remove, required names, unchecked consent, unsupported PDF/SVG, renamed non-image, file over 15 MB, rapid submit clicks, success, refresh, another submission after 60 seconds, and offline/retry. Retry uses the same Submission ID and should return the existing queue entry if the response was lost. Refresh restores a success receipt in session storage where the browser permits it; photos themselves are never persisted in browser storage. An unsubmitted selection must be picked again after refresh. A blocked iframe can be opened with the link below it.

Verify `/`, `/studio`, login and dashboard still behave normally. Existing generation/payment testing needs your usual authenticated test account and credits; no live generation or payment is triggered by the local checks.

## Updates and operating the queue

After editing Apps Script: **Deploy → Manage deployments → pencil → Version: New version → Deploy**. Keep the same deployment URL. Script Property changes such as the live YouTube URL or upload toggle take effect on the next request/page load without redeployment. Website changes or Vite URL changes require rebuilding and publishing.

In the Queue tab, change WAITING to EDITING, COMPLETED or REJECTED. Drive File ID is owner-only metadata; paste it into `https://drive.google.com/file/d/FILE_ID/view` while signed in to open/download the original. Never share the Sheet publicly. Set `UPLOADS_ENABLED=false` when the live show ends. Establish a retention period and manually delete images and associated rows after the show when no longer needed; preserve `NEXT_QUEUE`. Old daily count properties (`count:YYYY-MM-DD`) may be deleted after those days finish.

## Security and practical limits

- All uploads are untrusted. Server checks MIME, extension, image container signatures/end markers, 15 MB limit, field lengths, allowed editing type and consent. This rejects basic renamed malicious files; it is not a malware scanner or full image decoder. Open images with updated editing software.
- Randomized owner-generated filenames; plain text Sheet cells with formula injection neutralization; the UI uses textContent for untrusted output. No Drive IDs, stack traces, credentials or public file URLs are returned to viewers.
- Private folder checks reject shared folders. Do not share the destination later: inherited sharing can expose earlier files. Keep the Sheet and the Apps Script project private.
- Script locking, durable submission-ID lookup, a honeypot, a 60-second browser-ID throttle and an owner-configured daily cap are included. A daily slot is reserved before file creation, so failed writes can consume slots but cannot bypass the cap. Browser IDs and honeypots can be bypassed and Apps Script does not provide reliable visitor IP addresses here. There is no CAPTCHA in this MVP. The daily cap bounds attempted file writes, not incoming requests or execution quota. Close uploads if abuse occurs; stronger bot protection is a future addition.
- `ALLOWALL` is required for embedding and removes Google's frame restriction: any website can frame the public form. Apps Script does not offer a custom ancestor allowlist here. No privileged/admin actions or owner links exist in the viewer UI; explicit consent remains required. Do not embed owner tools in this app. See [Google's frame configuration documentation](https://developers.google.com/apps-script/reference/html/x-frame-options-mode).
- Upload uses [Google's supported form-to-Blob RPC](https://developers.google.com/apps-script/guides/html/communication). It has no reliable byte progress API; the UI shows an indeterminate uploading state. Google quotas, connection speed and 15 MB RPC performance must be verified on the actual deployment. There is no fabricated progress percentage or automatic retry. Leave the page open until completion.
- The first version stores files directly in the dedicated folder, without daily subfolders. Queue management requires no extra database or paid service. A future `/admin/live-uploads` can be considered separately.

The Drive/Sheet end-to-end checks and public production URL cannot be confirmed until the owner performs setup and publishes the website.
