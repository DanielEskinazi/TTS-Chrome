const WebSocket = require('ws');
const chokidar = require('chokidar');
const path = require('path');

const WS_PORT = 9090;
const wss = new WebSocket.Server({ port: WS_PORT });

console.log(`Extension reload server running on ws://localhost:${WS_PORT}`);

// Watch for file changes
const watcher = chokidar.watch(path.join(__dirname, '../dist'), {
  persistent: true,
  ignoreInitial: true,
});

watcher.on('change', (filepath) => {
  console.log(`File changed: ${filepath}`);
  
  // Notify all connected clients
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ 
        type: 'reload',
        timestamp: Date.now(),
        file: path.basename(filepath)
      }));
    }
  });
});

// Create reload client for injection
const reloadClient = `
(function() {
  const ws = new WebSocket('ws://localhost:${WS_PORT}');
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'reload') {
      console.log('Reloading extension...');
      chrome.runtime.reload();
    }
  };
  
  ws.onerror = () => {
    console.log('Extension reload server not available');
  };
})();
`;

// Save reload client for injection
const fs = require('fs');
fs.writeFileSync(
  path.join(__dirname, '../dist/reload-client.js'),
  reloadClient
);