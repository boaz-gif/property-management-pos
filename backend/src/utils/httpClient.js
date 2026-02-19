const https = require('https');

function requestJson(url, { method = 'GET', headers = {}, body = undefined, timeoutMs = 20000 } = {}) {
  return new Promise((resolve, reject) => {
    const targetUrl = new URL(url);

    const data = body !== undefined && body !== null ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;
    const finalHeaders = { ...headers };

    if (data !== null && !finalHeaders['Content-Type']) {
      finalHeaders['Content-Type'] = 'application/json';
    }
    if (data !== null && !finalHeaders['Content-Length']) {
      finalHeaders['Content-Length'] = Buffer.byteLength(data);
    }

    const req = https.request(
      {
        protocol: targetUrl.protocol,
        hostname: targetUrl.hostname,
        port: targetUrl.port || 443,
        path: `${targetUrl.pathname}${targetUrl.search}`,
        method,
        headers: finalHeaders,
        timeout: timeoutMs,
      },
      (res) => {
        let raw = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          const status = res.statusCode || 0;
          const contentType = String(res.headers['content-type'] || '');
          const isJson = contentType.includes('application/json') || raw.trim().startsWith('{') || raw.trim().startsWith('[');

          let parsed = raw;
          if (isJson && raw) {
            try {
              parsed = JSON.parse(raw);
            } catch (e) {
              parsed = raw;
            }
          }

          if (status < 200 || status >= 300) {
            const err = new Error(`HTTP ${status}`);
            err.status = status;
            err.response = parsed;
            reject(err);
            return;
          }

          resolve({ status, headers: res.headers, data: parsed });
        });
      }
    );

    req.on('timeout', () => {
      req.destroy(new Error('Request timeout'));
    });
    req.on('error', (err) => reject(err));

    if (data !== null) req.write(data);
    req.end();
  });
}

module.exports = {
  requestJson,
};

