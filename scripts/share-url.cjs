const os = require('node:os');

const port = Number(process.env.PORT || 4000);
const interfaces = os.networkInterfaces();
const urls = [];

for (const entries of Object.values(interfaces)) {
  for (const entry of entries || []) {
    if (entry.family !== 'IPv4' || entry.internal) continue;
    if (entry.address.startsWith('169.254.')) continue;
    urls.push(`http://${entry.address}:${port}/`);
  }
}

console.log('');
console.log('Playtest URLs');
console.log('--------------');
console.log(`This PC: http://localhost:${port}/`);

if (urls.length > 0) {
  console.log('Same Wi-Fi / LAN:');
  for (const url of urls) {
    console.log(`  ${url}`);
  }
} else {
  console.log('Same Wi-Fi / LAN: no IPv4 address found.');
}

console.log('');
console.log('How to use');
console.log(`1. Run: npm.cmd run start:share`);
console.log('2. Send one LAN URL above to friends on the same Wi-Fi.');
console.log('3. One player creates a room, then shares the 4-letter room code.');
console.log('');
console.log('For friends outside your network, deploy the app or use a tunnel.');
console.log('Quick remote tunnel: npm.cmd run start:remote');
console.log('Render is already configured by render.yaml.');
