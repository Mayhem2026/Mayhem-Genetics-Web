# Franklyn research libraries and optional YouTube ranking service

## Ready in the beta, no backend needed
The Franklyn Research page now offers a **Research Sources** tab and a **YouTube Videos** tab for its recognized peptide topics. Links open the source sites directly:

- PubMed (peer-reviewed biomedical literature)
- ClinicalTrials.gov (registered trials, not a guarantee of outcome)
- Europe PMC (research literature)
- Google Scholar (broad literature search, including unreviewed/low-quality sources)
- FDA (US regulatory reference search)
- YouTube (video discovery, with no claim that search results are ranked or scientifically vetted)

The "Show Most Viewed Videos" button honestly indicates when the live statistics service is unconfigured. It does not invent video IDs, titles, rankings, or view counts.

## Optional true YouTube ranking integration
`server/franklyn-youtube.cjs` is a Node 24 HTTP service at:

`GET /api/franklyn/videos?peptide=CJC-1295`

The server obtains video candidates from the official YouTube Data API's `search.list` with `order=viewCount`, then retrieves public metadata and view counts using `videos.list`. It sorts **within the returned matches**, not all videos that exist on YouTube. The server filters private or non-embeddable results and caches output for six hours to reduce quota use.

**Setup** (requires deployment and approval):

1. In an authorized Google Cloud project enable **YouTube Data API v3** and create a restricted API key. No API credentials should be entered in ChatGPT chat, a GitHub issue, an APK, or public HTML.
2. Store the key as a hosting-platform secret named `YOUTUBE_API_KEY`.
3. Run `node server/franklyn-youtube.cjs` behind HTTPS with reasonable rate limiting. Never expose the service's key in outgoing client responses or access logs.
4. Set `window.MAYHEM_YOUTUBE_API_ENDPOINT='https://<your-trusted-host>/api/franklyn/videos'` as a protected deployment configuration, **not** as a value containing credentials, before the Franklyn UI script executes.
5. Test Android external opening and view-count display on a physical phone before claiming this feature is live.

Only supported Franklyn topic names are accepted to avoid arbitrary API quota consumption. The backend is **not deployed** by this PR. The existing working Android beta and protected branches remain unchanged.

## Important research and YouTube limitations
- YouTube view count reflects popularity, **not** research quality, safety, efficacy, or FDA status.
- Videos are creator-provided and subject to removal, geoblocking, advertising, content claims, inaccurate captions, and changing metadata. Use the original YouTube player or open videos in YouTube, never rehost video content.
- There is no guarantee YouTube search returns every relevant video, even with `order=viewCount`.
- The "reviewed source" status of Franklyn's curated evidence does not transfer to linked YouTube videos or search results.
- A future editorial tier can flag individual videos as independently reviewed, with date, claim-checking notes and conflicts of interest. Never use view counts as the scientific quality score.
- The YouTube API has quotas, policies on caching and attribution, and app identification requirements. Verify before production launch.

## Testing
`node --test tests/*.cjs`

GitHub Actions also verifies Android asset / root JavaScript parity and compiles the beta APK.
