# Mayhem Genetics — Friends & Family Beta v15-beta.2

Current iteration: see DEVELOPMENT_LOG.md and RELEASE_CHECKLIST.md for implementation, preserved versions and release blockers. New changes are on `dev/research-and-release-readiness`; the tested v15-beta.1 branch is unchanged.

Development branch: `dev/friends-family-beta`. Android's `stable-premium-v14` remains at `e4d470a9950ec5c8e7097ad9b7bc07dde91b1ca4`. The calculator math and interface are retained from that snapshot; calculator is the second tab. Premium is a proposed-plan preview with no payment processing.

## Checks and publication

Node 24: `node --test tests/*.cjs tests/*.mjs`.

The workflow tests the app, packages only index.html, beta-core.js, franklyn.js, franklyn-ui.js and mayhem_logo.jpg, and allows Pages deployment only through an explicit reviewed-beta manual action after owner approval. Pages must use GitHub Actions and its github-pages environment must permit this branch. A passing test job does not prove deployment succeeded. Server source, tests and databases are never included in the Pages artifact.

## Local beta

Manual diary, weights, steps, calculator, JSON backup, barcode lookup and photo preview work without accounts. Live scanning needs HTTPS, BarcodeDetector support and permission. Open Food Facts may lack product labels. Missing nutrition is never silently converted to zero. Photo analysis sends an image only when requested, to the configured HTTPS endpoint or same-origin account service. The supplied server does not persist images.

Signing in does not upload or merge local records. Export regular backups. Clearing browser/app data may delete records. Clear local records separately from signing out. Android now uses the system file saver for export; Samsung device testing is still required.

## Account-service development foundation

`server/app.mjs` requires Node 24. It provides SQLite accounts, asynchronous scrypt password hashing, hashed session tokens, HttpOnly/Secure/SameSite cookies, expiration and logout, origin checking, request limits, and server-issued beta AI invitations. No payment collection or purchase activation route exists. Client-side flags cannot grant access.

Deploy behind an HTTPS reverse proxy on the same origin as the app. Set `APP_ORIGIN` to that exact HTTPS origin and `MAYHEM_DATABASE` to a private durable SQLite path, then run `node server/app.mjs`. Its listener binds to loopback; never expose it directly. Back up the database securely. GitHub Pages cannot run this server. No credentials are included.

Nutrition analysis accepts an injected server-only `analyze(image, {signal})` adapter. The default CLI has no provider and returns 503 for invited users. Configure a provider in a private server entrypoint; honor cancellation. Invitations must be provisioned on the server; no public administration endpoint exists. This is a development foundation, not a production account launch.

## Remaining release blockers

1. Confirm Pages deployment and test on Samsung and iPhone browsers: camera, gallery, backup restore, navigation and calculator.
2. Android: test system-file export. Native WebView live camera permission/capture support remains incomplete; gallery/manual barcode are fallbacks. The APK is debug-signed for beta testing, not store submission.
3. Deploy accounts with durable storage and HTTPS. Add verified email, password recovery, multi-instance operational limits, and privacy/retention policy before a customer account launch.
4. Configure a server-only Nutrition AI adapter, server invitations, usage controls and accuracy/privacy tests. Android accounts require a hosted HTTPS integration; file:// clients are deliberately refused by the account service.
5. Add Google Play/Apple sandbox billing, verified receipts, expiration/cancellation and purchase restore. Real payments remain disabled until separately authorized.
