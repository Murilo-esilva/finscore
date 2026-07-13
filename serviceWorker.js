              cache.put(request, response.clone());
            });
          }
          return response;
        })
        .catch(() => {
          return createOfflineResponse();
        });
    })
  );
});
function createOfflineResponse() {
  return new Response(
    `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>FinScore — Offline</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f5f5f5; }
          .container { text-align: center; padding: 20px; }
          h1 { color: #333; }
          p { color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🌐 Sem conexão</h1>
          <p>Parece que você está offline. Verifique sua conexão e tente novamente.</p>
        </div>
      </body>
    </html>
    `,
    { status: 503, statusText: 'Service Unavailable', headers: { 'Content-Type': 'text/html' } }
  );
}
// Background sync for offline changes
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-expenses') {
    event.waitUntil(
      // Sincronizar despesas quando voltar online
      // Implementar lógica de sync aqui
      Promise.resolve()
    );
  }
});
