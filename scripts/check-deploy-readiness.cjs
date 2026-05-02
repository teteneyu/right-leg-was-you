const { accessSync, constants, statSync } = require('node:fs');
const { join } = require('node:path');

const root = process.cwd();

const requiredFiles = [
  'apps/server/dist/index.js',
  'apps/client/dist/index.html',
  'apps/client/dist/assets/audio/bgm/enemy-battle.ogg',
  'apps/client/dist/assets/audio/se/Victory.mp3',
  'apps/client/dist/assets/audio/se/Hit-Punch02.mp3',
  'apps/client/dist/assets/audio/se/heal.mp3',
  'apps/client/dist/assets/audio/se/star.mp3',
  'apps/client/dist/assets/audio/se/Motion-Slam06(Light).mp3',
  'apps/client/dist/assets/image/body.png',
  'apps/client/dist/assets/image/vacuum.png',
  'render.yaml',
  'render.always-on.yaml'
];

let failed = false;

for (const file of requiredFiles) {
  const fullPath = join(root, file);
  try {
    accessSync(fullPath, constants.R_OK);
    const size = statSync(fullPath).size;
    if (size <= 0) throw new Error('empty file');
    console.log(`OK ${file}`);
  } catch (error) {
    failed = true;
    console.error(`NG ${file}: ${error.message}`);
  }
}

if (failed) {
  process.exitCode = 1;
} else {
  console.log('Deploy readiness check passed.');
}
