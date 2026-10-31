import type { NextConfig } from 'next'

// An explicit empty prefix serves the custom domain; the original Pages CLI keeps its subpath.
const REPO_NAME = 'TraumaCompass'
const onGitHubPages = process.env.GITHUB_PAGES === 'true'
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? (onGitHubPages ? `/${REPO_NAME}` : '')

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  reactStrictMode: true,
  images: { unoptimized: true },
  basePath,
  assetPrefix: basePath ? `${basePath}/` : undefined,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
}

export default nextConfig
