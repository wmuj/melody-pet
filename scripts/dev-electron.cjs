const { spawn } = require('node:child_process');
const path = require('node:path');
const env = { ...process.env, VITE_DEV_SERVER_URL: 'http://127.0.0.1:5173' };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(require('electron'), ['.', '--settings'], {
  cwd: path.resolve(__dirname, '..'), stdio: 'inherit', windowsHide: true, env,
});
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => process.exit(code || 0));
process.on('SIGINT', () => child.kill());
process.on('SIGTERM', () => child.kill());
