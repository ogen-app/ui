// Runtime configuration (CON-518). In an image, docker/entrypoint.sh
// overwrites this file at container start with the container's allow-listed
// keys. Empty here, so `pnpm dev` and `vite preview` fall back to the build's
// VITE_* values — see src/config/runtimeConfig.ts.
window.__OGEN_CONFIG__ = {}
