# Mayhem Genetics development log

## 2026-11-03 — reviewed-library and release readiness

### Preserved versions

- Android `stable-premium-v14`: `e4d470a9950ec5c8e7097ad9b7bc07dde91b1ca4`.
- Last CI-tested Android beta: `e45b3527c42ee8b4a6ed9b2869faf1ec16b8b5dc`, successful workflow 41652054968.
- Created `backup/tested-beta-v15-2026-11-03` at that tested beta commit. Existing `dev/friends-family-beta` remains unchanged.
- New work: `dev/research-and-release-readiness` in both repositories. No merges, store releases or real payment activation.

### Implemented

- Franklyn Home entry and research screen, identical in Web and Android assets. Reviewed-library mode is explicitly labelled; no live LLM or paid retrieval service is configured.
- Three starter topics: Retatrutide, BPC-157 and Elamipretide/SS-31. Source links, review dates, evidence types, limitations, US regulatory scope, unknown-topic handling, and seven-day regulatory freshness warnings. These selected sources do not constitute an exhaustive literature review.
- Future generated-response contract rejects citation IDs outside the supplied verified set. It is only a structural validation boundary, not proof that a generated statement is scientifically supported. Human/source-level review remains necessary.
- Password change revokes sessions. Cloud account deletion requires the current password and cascades to sessions and test subscription records. Local records remain on the user's device.
- Approved prices stored as USD minor-unit integers (999 monthly, 7999 annually).
- Disabled-by-default server-side sandbox store-verification adapter boundary, account binding, product matching, expiry/revocation handling, cross-account replay protection and stale signed-state rejection. No actual Apple/Google receipt-verification adapter is configured. Sandbox records never enable production Premium or AI.
- Development CI covers dev branches and PRs. Web publishing requires an explicit manual reviewed-beta input; ordinary pushes and PRs cannot deploy this branch.

### Validation

- 19 local Web/server tests passed: calculator/diary regressions, backup/AI data validation, Franklyn citations and freshness, authentication, password change/deletion, approved prices, sandbox verification and replay protection.
- Android browser regressions and source parity checks are included in CI, followed by Android lint, unit-test task and debug APK build.
- No browser/device runtime verification performed in this environment. Debug APK build success does not prove camera, permissions or file-export behavior on Samsung.

### Blockers and next work

1. Web beta workflow 41652029155: tests and static artifact upload succeeded; deploy job failed before any step ran. Connector cannot read check annotations or change Pages/environment administration. Exact deployment rejection reason remains unavailable. Owner must review the Actions error and Pages/environment branch configuration. Do not bypass environment protections.
2. Publish only the exact reviewed beta commit after device QA and owner approval. No new release has been published in this iteration.
3. Account service still needs durable HTTPS hosting, verified email/password recovery and an approved email delivery arrangement. No hosting or email charges incurred or configured.
4. Nutrition AI still needs a server-only provider adapter, credentials and an approved usage budget. Existing manual entry/barcode fallback remains available.
5. Franklyn needs a broader reviewed corpus, automated retrieval with dated source snapshots, claim-to-source evaluation and an approved research-provider budget before live AI. Recheck regulatory sources before release; never claim the cache is live.
6. Apple/Google store verification needs actual sandbox adapters and application/product identity configuration. Planned product IDs are placeholders until configured in each store. Live billing remains disabled.
7. Android: Samsung QA, live WebView camera/capture integration, release signing and Play Console setup. iPhone: Xcode/macOS build environment, iOS shell project, signing, privacy declarations, TestFlight account and device QA. Browser compatibility alone is not an App Store build.

### Decisions requiring owner approval

- Publish the reviewed Friends & Family Beta after QA and resolution of Pages settings.
- Any paid hosting, email or AI provider plan, paid Apple enrollment, or other new charge.
- Store submissions and real payment activation, after sandbox verification and release review.

## 2026-11-03 — owner-approved beta advancement

- Owner instructed “proceed” after the draft PR/test report. Approval applies to advancing the reviewed beta and attempting publication; real payments and new paid services remain on hold.
- Confirmed Web and Android PR checks passed. Android PR #2 merged to main as `0b05258987bdc9946137f6449cb25b76f83ddb78`. Existing v14 and tested-beta backup refs are retained.
- Web publication plumbing now allows a main-branch push only when its commit message starts with `Publish approved Friends & Family Beta`, or the existing explicit reviewed-beta manual action. Ordinary dev pushes/PRs do not deploy.
- This entry records authorization and the publication attempt, not deployment success or completed physical-device QA. Backend hosting, email verification/recovery, live AI/store adapters, iOS builds and Samsung camera/export QA remain outstanding.
