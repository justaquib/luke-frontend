import { execSync, spawn } from 'node:child_process';
import { platform } from 'node:os';

const PORT = process.env.PORT || '4200';

function run(cmd) {
  try {
    return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
  } catch (e) {
    if (e.status === 1) return '';
    throw e;
  }
}

function killOnPort(port) {
  const isWin = platform === 'win32';
  let pids = new Set();

  if (isWin) {
    const out = run(`netstat -ano | findstr :${port}`);
    for (const line of out.split('\n')) {
      const m = line.trim().match(/\s(\d+)$/);
      if (m && m[1] !== '0') pids.add(m[1]);
    }
  } else {
    const lsofOut = run(`lsof -ti tcp:${port}`);
    for (const pid of lsofOut.split('\n').map(s => s.trim()).filter(Boolean)) pids.add(pid);

    const fuserOut = run(`fuser ${port}/tcp 2>/dev/null`);
    for (const pid of fuserOut.split(/\s+/).filter(Boolean)) pids.add(pid);

    const ssOut = run(`ss -ltnp 'sport = :${port}'`);
    for (const m of ssOut.matchAll(/pid=(\d+)/g)) pids.add(m[1]);
  }

  if (pids.size === 0) {
    console.log(`Port ${port} is already free.`);
    return;
  }

  for (const pid of pids) {
    try {
      process.kill(Number(pid), 'SIGKILL');
      console.log(`Killed PID ${pid} on port ${port}.`);
    } catch (e) {
      if (isWin) try { execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' }); } catch {}
    }
  }

  for (let i = 0; i < 20; i++) {
    const still = run(`lsof -ti tcp:${port}`);
    if (!still.trim()) break;
    execSync('sleep 0.2');
  }
}

killOnPort(PORT);

const child = spawn('npx', ['ng', 'serve', '--port', PORT], { stdio: 'inherit', shell: true });

const shutdown = (signal) => { if (!child.killed) child.kill(signal); };
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

child.on('exit', (code) => process.exit(code ?? 0));