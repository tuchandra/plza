import { watch } from 'fs';
import { spawn } from 'bun';

// Build the TypeScript on startup
console.log('Building TypeScript...');
await Bun.build({
  entrypoints: ['./src/main.ts'],
  outdir: './public',
  minify: false,
  target: 'browser',
  naming: '[name].js',
});
console.log('Build complete!');

// Watch for changes in src/ and rebuild
watch('./src', { recursive: true }, async (event, filename) => {
  console.log(`\n${filename} changed, rebuilding...`);
  try {
    await Bun.build({
      entrypoints: ['./src/main.ts'],
      outdir: './public',
      minify: false,
      target: 'browser',
      naming: '[name].js',
    });
    console.log('Rebuild complete!');
  } catch (error) {
    console.error('Build error:', error);
  }
});

// Serve static files from public/
Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);
    let filePath = url.pathname === '/' ? '/index.html' : url.pathname;

    try {
      const file = Bun.file('./public' + filePath);
      if (await file.exists()) {
        return new Response(file);
      }
      return new Response('Not Found', { status: 404 });
    } catch (error) {
      return new Response('Server Error', { status: 500 });
    }
  },
});

console.log('Dev server running at http://localhost:3000');
console.log('Watching for changes in src/...\n');
