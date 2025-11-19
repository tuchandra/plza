import { watch } from 'fs';
import { spawn } from 'bun';

// Track SSE clients for live reload
const clients = new Set<ReadableStreamDefaultController>();

function notifyClients() {
  clients.forEach((controller) => {
    try {
      controller.enqueue('data: reload\n\n');
    } catch (error) {
      clients.delete(controller);
    }
  });
}

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
    notifyClients();
  } catch (error) {
    console.error('Build error:', error);
  }
});

// Watch for changes in public/css/
watch('./public/css', { recursive: true }, (event, filename) => {
  console.log(`\n${filename} changed, reloading...`);
  notifyClients();
});

// Watch for changes in public/*.html
watch('./public', { recursive: false }, (event, filename) => {
  if (filename && filename.endsWith('.html')) {
    console.log(`\n${filename} changed, reloading...`);
    notifyClients();
  }
});

// Live reload script to inject into HTML
const RELOAD_SCRIPT = `
<script>
  const evtSource = new EventSource('/livereload');
  evtSource.onmessage = (event) => {
    if (event.data === 'reload') {
      console.log('Reloading page...');
      location.reload();
    }
  };
  evtSource.onerror = () => {
    console.log('Live reload disconnected');
  };
</script>
`;

// Serve static files from public/
Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);

    // SSE endpoint for live reload
    if (url.pathname === '/livereload') {
      const stream = new ReadableStream({
        start(controller) {
          clients.add(controller);
          controller.enqueue('data: connected\n\n');
        },
        cancel(controller) {
          clients.delete(controller);
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    let filePath = url.pathname === '/' ? '/index.html' : url.pathname;

    try {
      const file = Bun.file('./public' + filePath);
      if (await file.exists()) {
        // Inject live reload script into HTML files
        if (filePath.endsWith('.html')) {
          const content = await file.text();
          const injected = content.replace('</body>', `${RELOAD_SCRIPT}</body>`);
          return new Response(injected, {
            headers: { 'Content-Type': 'text/html' },
          });
        }
        return new Response(file);
      }
      return new Response('Not Found', { status: 404 });
    } catch (error) {
      return new Response('Server Error', { status: 500 });
    }
  },
});

console.log('Dev server running at http://localhost:3000');
console.log('Watching for changes in src/, public/css/, and public/*.html...\n');
