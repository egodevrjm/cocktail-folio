import {
  FILTERS,
  SORTS,
  buildCocktailImagePrompt,
  createLocalRecipe,
  findCocktail,
  loadCocktails,
  searchCocktails,
  summarizeLibrary,
} from './cocktailData.js';

export const SERVER_INFO = {
  name: 'cocktail-folio-mcp',
  version: '1.0.0',
};

const cocktails = loadCocktails();

export const tools = [
  {
    name: 'search_cocktails',
    description: 'Search Cocktail Folio recipes by name, ingredient, glass type, or flavor profile.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Text to search for, such as "bourbon", "ginger", or "spritz".' },
        filter: { type: 'string', enum: FILTERS, description: 'Optional base drink filter.' },
        sortBy: { type: 'string', enum: SORTS, description: 'Sort order for results.' },
        limit: { type: 'number', description: 'Maximum number of recipes to return. Defaults to 20.' },
      },
    },
  },
  {
    name: 'get_cocktail',
    description: 'Get one complete cocktail recipe by id, exact name, slug, or partial name.',
    inputSchema: {
      type: 'object',
      required: ['idOrName'],
      properties: {
        idOrName: { type: 'string', description: 'Recipe id or cocktail name.' },
      },
    },
  },
  {
    name: 'library_summary',
    description: 'Return counts, available filters, sort options, and flavor/glass coverage for the recipe library.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'build_cocktail',
    description: 'Create a deterministic local cocktail draft from selected base, flavor profile, ingredients, and direction.',
    inputSchema: {
      type: 'object',
      properties: {
        base: { type: 'string', description: 'Base alcohol, such as Bourbon, Gin, Tequila, or No alcohol.' },
        flavorProfile: { type: 'string', description: 'Desired profile, such as Citrus sour, Smoky, or Botanical fresh.' },
        ingredients: {
          type: 'array',
          items: { type: 'string' },
          description: 'Selected supporting ingredients.',
        },
        direction: { type: 'string', description: 'Optional bartender-style direction or constraint.' },
      },
    },
  },
  {
    name: 'image_prompt',
    description: 'Create the photorealistic square cocktail image prompt used by the app for a recipe.',
    inputSchema: {
      type: 'object',
      required: ['idOrName'],
      properties: {
        idOrName: { type: 'string', description: 'Recipe id or cocktail name.' },
      },
    },
  },
];

export const resources = [
  {
    uri: 'cocktails://library',
    name: 'Cocktail Folio Library',
    description: 'All base Cocktail Folio recipes as JSON.',
    mimeType: 'application/json',
  },
  {
    uri: 'cocktails://summary',
    name: 'Cocktail Folio Summary',
    description: 'Counts and metadata for the Cocktail Folio library.',
    mimeType: 'application/json',
  },
  ...cocktails.map((cocktail) => ({
    uri: `cocktails://recipe/${cocktail.id}`,
    name: cocktail.name,
    description: `${cocktail.baseType}, ${cocktail.glass}, ${cocktail.flavorProfile}`,
    mimeType: 'application/json',
  })),
];

export const handlers = {
  initialize: (params = {}) => ({
    protocolVersion: params.protocolVersion || '2024-11-05',
    capabilities: {
      tools: {},
      resources: {},
    },
    serverInfo: SERVER_INFO,
  }),
  ping: () => ({}),
  'tools/list': () => ({ tools }),
  'tools/call': (params = {}) => callTool(params.name, params.arguments || {}),
  'resources/list': () => ({ resources }),
  'resources/read': (params = {}) => readResource(params.uri),
};

export async function handleRpcRequest(message) {
  if (!message || message.jsonrpc !== '2.0') {
    return rpcResponse(null, null, rpcError(-32600, 'Invalid JSON-RPC request.'));
  }

  if (!message.method) {
    return rpcResponse(message.id ?? null, null, rpcError(-32600, 'JSON-RPC method is required.'));
  }

  if (message.id === undefined) {
    return undefined;
  }

  const handler = handlers[message.method];
  if (!handler) {
    return rpcResponse(message.id, null, rpcError(-32601, `Method not found: ${message.method}`));
  }

  try {
    return rpcResponse(message.id, await handler(message.params || {}));
  } catch (error) {
    return rpcResponse(message.id, null, error);
  }
}

export async function handleRpcPayload(payload) {
  if (Array.isArray(payload)) {
    if (payload.length === 0) {
      return rpcResponse(null, null, rpcError(-32600, 'Batch requests cannot be empty.'));
    }

    const results = (await Promise.all(payload.map((message) => handleRpcRequest(message)))).filter(Boolean);
    return results.length ? results : undefined;
  }

  return handleRpcRequest(payload);
}

export function parseRpcJSON(text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw rpcError(-32700, `Parse error: ${error.message}`);
  }
}

export function getServerDocument(endpointUrl = '') {
  return {
    name: SERVER_INFO.name,
    version: SERVER_INFO.version,
    endpoint: endpointUrl,
    transport: 'http-json-rpc',
    tools: tools.map(({ name, description }) => ({ name, description })),
    resources: resources.slice(0, 25),
    resourceCount: resources.length,
  };
}

export function rpcResponse(id, result, error) {
  if (error) {
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code: error.code || -32603,
        message: error.message || 'Internal error',
      },
    };
  }

  return { jsonrpc: '2.0', id, result };
}

export function rpcError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function callTool(name, args) {
  if (name === 'search_cocktails') {
    const results = searchCocktails(cocktails, args);
    return toolResult({
      count: results.length,
      results,
    });
  }

  if (name === 'get_cocktail') {
    const cocktail = requireCocktail(args.idOrName);
    return toolResult(cocktail);
  }

  if (name === 'library_summary') {
    return toolResult(summarizeLibrary(cocktails));
  }

  if (name === 'build_cocktail') {
    return toolResult(createLocalRecipe(args));
  }

  if (name === 'image_prompt') {
    const cocktail = requireCocktail(args.idOrName);
    return toolResult({
      cocktail: cocktail.name,
      prompt: buildCocktailImagePrompt(cocktail),
    });
  }

  throw rpcError(-32602, `Unknown tool: ${name}`);
}

function readResource(uri) {
  if (uri === 'cocktails://library') {
    return resourceResult(uri, cocktails);
  }

  if (uri === 'cocktails://summary') {
    return resourceResult(uri, summarizeLibrary(cocktails));
  }

  const recipePrefix = 'cocktails://recipe/';
  if (uri?.startsWith(recipePrefix)) {
    const cocktail = requireCocktail(uri.slice(recipePrefix.length));
    return resourceResult(uri, cocktail);
  }

  throw rpcError(-32602, `Unknown resource: ${uri}`);
}

function requireCocktail(idOrName) {
  const cocktail = findCocktail(cocktails, idOrName);
  if (!cocktail) throw rpcError(-32602, `Could not find cocktail: ${idOrName || ''}`);
  return cocktail;
}

function toolResult(value) {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(value, null, 2),
      },
    ],
  };
}

function resourceResult(uri, value) {
  return {
    contents: [
      {
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(value, null, 2),
      },
    ],
  };
}
