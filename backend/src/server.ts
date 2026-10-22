import { app } from './app';
import { config } from './config';
import os from 'os';

function getLocalIpAddresses(): string[] {
  const interfaces = os.networkInterfaces();
  const addresses: string[] = [];
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push(net.address);
      }
    }
  }
  return addresses;
}

const server = app.listen(config.port, '0.0.0.0', () => {
  const localIps = getLocalIpAddresses();
  console.log('='.repeat(55));
  console.log(`🚀 MiniLedger Backend Server is running!`);
  console.log(`📡 Local Machine:     http://localhost:${config.port}`);
  console.log(`🤖 Android Emulator:  http://10.0.2.2:${config.port}`);
  if (localIps.length > 0) {
    console.log(`📱 Physical Device:   http://${localIps[0]}:${config.port}`);
  }
  console.log(`🩺 Health Check:      http://localhost:${config.port}/health`);
  console.log('='.repeat(55));
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
