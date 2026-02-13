#!/usr/bin/env node
// TODO: Fix linting errors in this file and re-enable eslint
/* eslint-disable */

/**
 * Cross-platform script to kill a process on a specific port
 */
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const port = process.argv[2] || 3000;
const platform = process.platform;

async function killProcesses() {
  try {
    if (platform === "win32") {
      // Windows
      const command = `netstat -ano | findstr :${port}`;
      try {
        const { stdout } = await execAsync(command);
        if (!stdout.trim()) {
          console.log(`No process found on port ${port}`);
          return;
        }
        const lines = stdout.trim().split("\n");
        const pids = new Set();
        lines.forEach((line) => {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && !isNaN(pid)) {
            pids.add(pid);
          }
        });
        if (pids.size === 0) {
          console.log(`No process found on port ${port}`);
          return;
        }
        for (const pid of pids) {
          try {
            await execAsync(`taskkill /PID ${pid} /F`);
            console.log(`Killed process ${pid} on port ${port}`);
          } catch (err) {
            console.error(
              `Failed to kill process ${pid}:`,
              err?.message || String(err)
            );
          }
        }
      } catch {
        console.log(`No process found on port ${port}`);
      }
    } else {
      // Unix-like (Linux, macOS)
      const command = `lsof -ti:${port}`;
      try {
        const { stdout } = await execAsync(command);
        const pids = stdout.trim().split("\n").filter(Boolean);
        if (pids.length === 0) {
          console.log(`No process found on port ${port}`);
          return;
        }
        for (const pid of pids) {
          try {
            await execAsync(`kill -9 ${pid}`);
            console.log(`Killed process ${pid} on port ${port}`);
          } catch (err) {
            console.error(
              `Failed to kill process ${pid}:`,
              err?.message || String(err)
            );
          }
        }
      } catch {
        console.log(`No process found on port ${port}`);
      }
    }
  } catch {
    // Silently continue if anything fails
    console.log(`No process found on port ${port}`);
  }
}

killProcesses()
  .then(() => {
    process.exit(0);
  })
  .catch(() => {
    process.exit(0); // Always exit successfully
  });
