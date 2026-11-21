import path from 'node:path';
import type { NextConfig } from 'next';

/**
 * Site 100% estático para o GitHub Pages. O Pages serve em
 * https://<usuario>.github.io/<repo>/, então basePath/assetPrefix vêm de
 * NEXT_PUBLIC_BASE_PATH (o workflow define `/<nome-do-repo>`). Em dev fica vazio.
 */
const base = (process.env.NEXT_PUBLIC_BASE_PATH ?? '').replace(/\/$/, '');

const nextConfig: NextConfig = {
  output: 'export',
  basePath: base || undefined,
  assetPrefix: base || undefined,
  trailingSlash: true, // /funis/ → funis/index.html (o Pages não reescreve rotas)
  images: { unoptimized: true },
  poweredByHeader: false,
  turbopack: { root: path.resolve(__dirname) },
};

export default nextConfig;
