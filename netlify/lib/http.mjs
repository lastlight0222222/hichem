export function jsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...headers
    }
  });
}

export function originAllowed(request) {
  return request.headers.get('Origin') === new URL(request.url).origin;
}

export async function readJson(request, maxBytes = 8192) {
  const contentLengthHeader = request.headers.get('Content-Length');
  const contentLength = Number(contentLengthHeader || 0);
  if (contentLengthHeader && (!Number.isSafeInteger(contentLength) || contentLength < 0)) return null;
  if (contentLength > maxBytes) return null;
  if (!request.body) return null;

  const reader = request.body.getReader();
  const chunks = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  chunks.forEach(chunk => {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  });

  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(body));
  } catch {
    return null;
  }
}

export function methodNotAllowed(methods) {
  return jsonResponse(
    { error: 'Method not allowed.' },
    405,
    { Allow: methods.join(', ') }
  );
}
