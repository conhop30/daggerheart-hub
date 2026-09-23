// Waits for the Vite dev server, then launches Electron. Replaces an inline
// `wait-on tcp:5183 && electron .` so the port can come from
// DAGGERHEART_DEV_PORT (npm scripts can't expand env vars portably on Windows).
const { spawn } = require('node:child_process');
const waitOn = require('wait-on');

const port = process.env.DAGGERHEART_DEV_PORT || '5183';

waitOn({ resources: [`tcp:${port}`] })
  .then(() => {
    const child = spawn(require('electron'), ['.'], { stdio: 'inherit', env: process.env });
    child.on('exit', (code) => process.exit(code ?? 0));
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
