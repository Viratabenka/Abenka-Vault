const { spawn } = require('child_process');
const path = require('path');
const root = path.resolve(__dirname, '..');

const backend = spawn('npm', ['run', 'start:dev'], {
  cwd: path.join(root, 'backend'),
  shell: true,
  stdio: 'inherit',
});
const frontend = spawn('npm', ['run', 'dev'], {
  cwd: path.join(root, 'frontend'),
  shell: true,
  stdio: 'inherit',
});

function killAll(signal = 'SIGTERM') {
  try { backend.kill(signal); } catch (_) {}
  try { frontend.kill(signal); } catch (_) {}
}

process.on('SIGINT', () => { killAll(); process.exit(0); });
process.on('SIGTERM', () => { killAll(); process.exit(0); });

backend.on('error', (err) => {
  console.error('[backend]', err.message);
});
frontend.on('error', (err) => {
  console.error('[frontend]', err.message);
});

let exitCode = 0;
backend.on('close', (code) => { if (code) exitCode = code; });
frontend.on('close', (code) => { if (code) exitCode = code; });
// Keep process alive; exit only on SIGINT/SIGTERM after killing children
