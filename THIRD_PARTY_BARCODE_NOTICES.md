# Barcode decoding in browsers — third-party notice

The Safari/Chrome beta loads **html5-qrcode v2.3.8** (Apache-2.0) **only when the user activates barcode scanning**. It performs decoding on-device and does not upload barcode images to the Mayhem backend. Script loaded from:

- https://cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.8/html5-qrcode.min.js
- Subresource integrity: sha512-r6rDA7W6ZeQhvl8S7yRVQUKVHdexq+GAlNkNNqVC7YyIV+NwqCTJe2hDWCiffTyRNOeGEzRRJ9ifvRm/HCzGYg==
- Source and license: https://github.com/mebjas/html5-qrcode

The code is fetched from a third-party CDN at scan time; its provider can receive normal network request metadata (such as IP address). The SRI hash prevents a modified script from executing. If the CDN is unreachable, the existing native browser BarcodeDetector is attempted, then manual UPC/EAN entry is available.

This is used only by the **browser** fallback. The Android native APK uses Google Code Scanner without requiring HTML barcode detection.

No dependency or service fee was incurred. Confirm Safari/device behavior before production release.
