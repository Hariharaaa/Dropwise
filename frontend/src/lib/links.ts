// Where the landing page's GitHub and demo-video buttons point. Override them where the app is built (a git-ignored
// .env.local, or the build environment); NEXT_PUBLIC_* values are read at build time:
//   NEXT_PUBLIC_REPO_URL=https://github.com/<owner>/<repo>
//   NEXT_PUBLIC_VIDEO_URL=https://<where the demo video is hosted>
// Empty values (as docker-compose passes when they are unset) fall back to the defaults below.

const DEFAULT_REPO_URL = "https://github.com/GuruyuganKarthik8377/DropWise";
const DEFAULT_VIDEO_URL = "https://youtu.be/qcdsdRbtRNA";

export const REPO_URL = process.env.NEXT_PUBLIC_REPO_URL || DEFAULT_REPO_URL;
export const VIDEO_URL = process.env.NEXT_PUBLIC_VIDEO_URL || DEFAULT_VIDEO_URL;
