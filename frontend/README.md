# Dropwise dashboard

The landing page and dashboard for Dropwise (Next.js). It reads the gateway (`NEXT_PUBLIC_API_URL`, default
`http://localhost:8088`) and the intelligence API (`NEXT_PUBLIC_INTELLIGENCE_URL`, default `http://localhost:8787`),
and falls back to saved demo data when they can't be reached.

```bash
npm install
npm run dev        # http://localhost:3000
```

- `/dashboard?demo=1` shows the saved demo data without any backend.
- `NEXT_PUBLIC_REPO_URL` and `NEXT_PUBLIC_VIDEO_URL` add the GitHub and demo-video links to the landing page.

To run it with the whole stack, use `docker compose up --build` from the repository root (see the main README).
