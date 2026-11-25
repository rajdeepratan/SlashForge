#!/usr/bin/env node
'use strict';

// SlashForge observability hook — emits a usage event when the agent finishes a
// turn (Stop) or a session (SessionEnd). Runs in the host's hook lifecycle, reads
// the event payload as JSON on stdin, and ships a small record to one sink.
//
// Design guarantees:
//   - Zero dependencies: Node built-ins only (fs, path, http, https).
//   - Fail-open: ANY error (bad config, no endpoint, network failure, timeout)
//     exits 0 and emits nothing. A telemetry problem must never block the agent.
//   - No secrets on disk: auth comes from environment variables, never the config.
//
// Config: config/observability.config.json beside the pack (override with
//   $SLASHFORGE_OBS_CONFIG). Shape:
//   { transport: "webhook"|"otlp"|"jsonl", endpoint, service_name, events[], emit_tool_use }
// Auth env vars:
//   SLASHFORGE_TELEMETRY_TOKEN   -> "Authorization: Bearer <token>" for webhook/otlp
//   OTEL_EXPORTER_OTLP_HEADERS   -> extra OTLP headers, "k1=v1,k2=v2"

const fs = require('fs');
const path = require('path');

const TIMEOUT_MS = 2000;

function readConfig() {
  const file = process.env.SLASHFORGE_OBS_CONFIG
    || path.join(__dirname, '..', 'config', 'observability.config.json');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function readStdin() {
  try { return fs.readFileSync(0, 'utf8'); } catch { return ''; }
}

// Host payloads differ; take the event name from whichever field is present.
function eventName(payload) {
  return payload.hook_event_name || payload.event || payload.eventName
    || process.env.SLASHFORGE_HOOK_EVENT || 'unknown';
}

function post(urlStr, body, headers) {
  return new Promise((resolve) => {
    let url;
    try { url = new URL(urlStr); } catch { return resolve(); }
    const client = url.protocol === 'http:' ? require('http') : require('https');
    const req = client.request(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body), ...headers },
      timeout: TIMEOUT_MS,
    }, (res) => { res.resume(); res.on('end', resolve); });
    req.on('error', () => resolve());   // fail-open
    req.on('timeout', () => { req.destroy(); resolve(); });
    req.write(body);
    req.end();
  });
}

function authHeaders() {
  const h = {};
  if (process.env.SLASHFORGE_TELEMETRY_TOKEN) {
    h.authorization = `Bearer ${process.env.SLASHFORGE_TELEMETRY_TOKEN}`;
  }
  for (const pair of (process.env.OTEL_EXPORTER_OTLP_HEADERS || '').split(',')) {
    const i = pair.indexOf('=');
    if (i > 0) h[pair.slice(0, i).trim().toLowerCase()] = pair.slice(i + 1).trim();
  }
  return h;
}

// An OTLP/HTTP log record (JSON) — one LogRecord carrying the usage attributes.
function otlpBody(record) {
  const attr = (k, v) => ({ key: k, value: typeof v === 'number'
    ? { intValue: String(v) } : { stringValue: String(v) } });
  return JSON.stringify({
    resourceLogs: [{
      resource: { attributes: [attr('service.name', record.service_name)] },
      scopeLogs: [{ logRecords: [{
        timeUnixNano: String(Date.now() * 1e6),
        body: { stringValue: record.event },
        attributes: Object.entries(record.attributes).map(([k, v]) => attr(k, v)),
      }] }],
    }],
  });
}

async function main() {
  const cfg = readConfig();
  const payload = JSON.parse(readStdin() || '{}');
  const event = eventName(payload);

  const events = cfg.events || ['SessionEnd', 'Stop'];
  if (!events.includes(event)) return;                       // not an event we emit
  if (event === 'PostToolUse' && !cfg.emit_tool_use) return; // chatty, opt-in only

  const record = {
    service_name: cfg.service_name || 'slashforge',
    event,
    attributes: {
      session_id: payload.session_id || payload.sessionId || '',
      cwd: payload.cwd || process.cwd(),
      tool: payload.tool_name || '',
    },
  };

  const transport = cfg.transport || 'webhook';
  if (transport === 'jsonl') {
    const file = cfg.endpoint || path.join(require('os').tmpdir(), 'slashforge-telemetry.jsonl');
    fs.appendFileSync(file, JSON.stringify({ ts: new Date().toISOString(), ...record }) + '\n');
    return;
  }
  if (!cfg.endpoint) return;                                 // nowhere to send: no-op
  if (transport === 'otlp') {
    await post(cfg.endpoint.replace(/\/$/, '') + '/v1/logs', otlpBody(record), authHeaders());
  } else {
    await post(cfg.endpoint, JSON.stringify({ ts: new Date().toISOString(), ...record }), authHeaders());
  }
}

// Fail-open: swallow everything, always exit 0.
main().then(() => process.exit(0)).catch(() => process.exit(0));
