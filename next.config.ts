import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @resvg/resvg-js ships a native .node addon that the bundler cannot place in
  // a JS chunk — keep it external so it is required at runtime from node_modules.
  serverExternalPackages: ["@resvg/resvg-js"],

  // The certificate renderer (resvg) reads the bundled Barlow .ttf files from
  // disk at runtime. They are not statically imported, so Next's file tracing
  // would not include them in the serverless function bundle — list them
  // explicitly so PDF/PNG generation works in production.
  outputFileTracingIncludes: {
    "/certification/**": ["./src/lib/certificate/fonts/*.ttf"],
    "/admin/**": ["./src/lib/certificate/fonts/*.ttf"],
  },
};

export default nextConfig;
