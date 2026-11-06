# Nutrition scanner improvements

Based on web commit 15e090e5d4dd90180d4b61a7488e19d714de3f3a. Android changes are separately based on portrait-scanner Beta 18.3 (4f7be1de309e761c25ce662a1274f8904314aa94), preserving its native scanner and camera capture.

## Implemented

- Prefer a complete per-serving nutrition record; otherwise use a complete per-100g record. Do not mix units or invent missing values.
- Clear the previous product before a new lookup and ignore older responses after another lookup starts.
- Distinguish barcode recognition from database lookup failures.
- Explain missing authentication, AI access, deployment, provider configuration and rate limits when photo analysis fails.
- Connect server startup to a server-only OpenAI Responses adapter with image input, structured output, cancellation and `store:false`. Reject incomplete outputs and unclear/non-food photos.

## Activation requirements

The code is prepared, not a running AI deployment. No live provider call, new APK build or physical-device camera test was performed.

Deploy `server/app.mjs` with Node 24 behind HTTPS, on the same origin as the web app. GitHub Pages cannot run it. Configure private server environment variables: APP_ORIGIN, MAYHEM_DATABASE, OPENAI_API_KEY and MAYHEM_NUTRITION_MODEL. Choose an available model supporting image input and structured outputs. Do not put keys in GitHub files, app Settings, HTML, or an APK. No key is included in this change.

Register/sign in through the hosted app and provision a beta invitation on the private server using the existing entitlements table. Existing limits and purchase restrictions remain enforced. The Android file-origin build cannot use the cookie-authenticated hosted service directly; it still requires its separately configured HTTPS analysis endpoint or a future authenticated hosted integration. Do not loosen Origin checks to work around this.

Before release, verify a real meal photo with the actual provider, test its nutrition estimates against known portions, and test Samsung camera capture, barcode recognition, database lookup, and meal logging separately. Test a missing barcode, an incomplete label, denied camera permission, and loss of internet. An improved lookup does not expand database coverage; no second database has been licensed or integrated.

## Validation

Web: 45 Node tests passed, including provider request/response contract tests with mocked requests.
Android: 31 Node tests passed. Native Java/Gradle compilation and physical-device behavior are unverified in this iteration.

API implementation reference: https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses
