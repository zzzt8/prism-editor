const fs = require('fs');
const os = require('os');
const path = require('path');

const workspaceRoot = process.cwd();
const configPath = path.join(workspaceRoot, '.cursor', 'ecc-agent-data.json');

function expandHome(input) {
  if (typeof input !== 'string' || input.length === 0) {
    return path.join(os.homedir(), '.cursor', 'ecc');
  }

  if (input === '~') {
    return os.homedir();
  }

  if (input.startsWith('~/') || input.startsWith('~\\')) {
    return path.join(os.homedir(), input.slice(2));
  }

  return input;
}

function resolveAgentDataHome() {
  if (process.env.ECC_AGENT_DATA_HOME) {
    return expandHome(process.env.ECC_AGENT_DATA_HOME);
  }

  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.ECC_AGENT_DATA_HOME === 'string') {
      return expandHome(parsed.ECC_AGENT_DATA_HOME);
    }
  } catch (_) {
  }

  return path.join(os.homedir(), '.cursor', 'ecc');
}

const payload = {
  env: {
    ECC_AGENT_DATA_HOME: resolveAgentDataHome(),
  },
};

process.stdout.write(JSON.stringify(payload));
