import type { Context } from '@netlify/functions';
import { getServerDocument, handleRpcPayload, parseRpcJSON, rpcResponse } from '../../mcp/protocol.js';

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
};

export default async (req: Request, _context: Context) => {
  if (req.method === 'GET') {
    return jsonResponse(200, getServerDocument(req.url));
  }

  if (req.method === 'HEAD') {
    return new Response(null, {
      status: 204,
      headers: JSON_HEADERS,
    });
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        ...JSON_HEADERS,
        allow: 'GET, HEAD, OPTIONS, POST',
      },
    });
  }

  if (req.method !== 'POST') {
    return jsonResponse(405, rpcResponse(null, null, new Error(`Method not allowed: ${req.method}`)), {
      allow: 'GET, HEAD, OPTIONS, POST',
    });
  }

  let payload;
  try {
    payload = parseRpcJSON(await req.text());
  } catch (error) {
    return jsonResponse(400, rpcResponse(null, null, error));
  }

  const response = await handleRpcPayload(payload);
  if (!response) {
    return new Response(null, {
      status: 202,
      headers: JSON_HEADERS,
    });
  }

  return jsonResponse(200, response);
};

function jsonResponse(status: number, value: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(value, null, 2), {
    status,
    headers: {
      ...JSON_HEADERS,
      ...headers,
    },
  });
}
