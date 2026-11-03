# Friends & Family Beta release checklist

The last tested Android snapshot and v14 backup are immutable reference points. Develop on dev branches; review PRs before publication. Do not merge or publish merely because CI is green.

## Beta acceptance

- [ ] Confirm calculator is second tab and agrees with the preserved v14 behavior for single/blended quantities and unit changes.
- [ ] On Samsung: manual diary, barcode lookup, gallery selection, camera fallback messaging, weights and steps.
- [ ] Export through Android system file saver; restore the resulting backup; verify no lost records.
- [ ] On iPhone Safari: navigation, barcode/manual fallback, photo chooser, record persistence, JSON export/import and responsive layout.
- [ ] Franklyn citations open correctly; every claim is supported; limitations are visible. Recheck regulatory notes against the linked authority before release.
- [ ] No UI implies a live AI service, enabled cloud sync or active purchase when these services are not configured.
- [ ] Confirm commit SHA and passing checks, then obtain owner review approval.
- [ ] Review failed Pages deploy job 41652029155. Configure Pages to use Actions and allow the reviewed dev branch in its environment, without bypassing protections.
- [ ] Run the reviewed-beta publication workflow only for the approved commit. Confirm its deployment result before sharing a testing URL.

## Customer and store release gates

- [ ] HTTPS account hosting and durable private storage, verified email, recovery and account deletion policies.
- [ ] Approved server-only Nutrition AI and Franklyn providers, credentials, budget limits and privacy/retention policy.
- [ ] Real Apple/Google sandbox verification adapters: app identity, products, account binding, signature/API verification, renewal, expiry, revocation, duplicate receipts, restore purchases and notifications.
- [ ] Register monthly $9.99 USD and annual $79.99 USD plans; obtain localized prices from the stores. Placeholder IDs must match the final console configuration.
- [ ] Android release keystore, signed AAB, Play Console internal testing and data-safety review.
- [ ] iOS native shell project, Xcode/macOS build, Apple signing and TestFlight testing. No iOS binary exists yet.
- [ ] Owner approval before new charges, public/store releases or real payments.
