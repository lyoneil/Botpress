import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  splitting: false,
  format: ['esm', 'cjs'],
  sourcemap: true,
  keepNames: true,
  dts: true,
  platform: 'node',
  clean: true,
  shims: true,
  noExternal: ['zod'],
  bundle: true,
})
