import packageJson from "../package.json";

/** Infos injectées par Vercel au build ; le SHA change à chaque commit poussé. */
export function getBuildInfo() {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA;
  const ref = process.env.VERCEL_GIT_COMMIT_REF;
  return {
    semver: packageJson.version as string,
    commitShort: sha ? sha.slice(0, 7) : "local",
    branch: ref ?? (sha ? undefined : "dev"),
    vercelEnv: process.env.VERCEL_ENV as "production" | "preview" | "development" | undefined,
  };
}
