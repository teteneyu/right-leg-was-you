const { execFileSync } = require('node:child_process');
const { rmSync } = require('node:fs');
const path = require('node:path');

const target = path.resolve(process.cwd(), 'dist');

if (process.platform === 'win32') {
  const command = `if (Test-Path -LiteralPath '${target.replace(/'/g, "''")}') { Remove-Item -LiteralPath '${target.replace(/'/g, "''")}' -Recurse -Force }`;
  execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command], {
    stdio: 'inherit'
  });
} else {
  rmSync(target, { recursive: true, force: true });
}
