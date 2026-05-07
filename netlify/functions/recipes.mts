import type { Config, Context } from '@netlify/functions';
import { getDeployStore, getStore } from '@netlify/blobs';

const STORE_NAME = 'cocktail-folio-recipes';
const RECIPE_PREFIX = 'recipes/';
const ADMIN_PIN_HEADER = 'x-cocktail-admin-pin';
const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
};

export default async (req: Request, context: Context) => {
  void context;
  const store = getRecipeStore();
  const adminPin = getAdminPin();

  if (req.method === 'GET') {
    const recipes = await listRecipes(store);
    return jsonResponse(200, { recipes, requiresAdminPin: Boolean(adminPin) });
  }

  if (req.method === 'POST') {
    const unauthorized = requireAdminPin(req, adminPin);
    if (unauthorized) return unauthorized;

    try {
      const recipe = normalizeRecipe(await req.json());
      await store.setJSON(recipeKey(recipe.id), recipe);
      return jsonResponse(200, { recipe });
    } catch (error) {
      return jsonResponse(400, { error: error instanceof Error ? error.message : 'Recipe could not be saved.' });
    }
  }

  if (req.method === 'DELETE') {
    const unauthorized = requireAdminPin(req, adminPin);
    if (unauthorized) return unauthorized;

    const id = new URL(req.url).searchParams.get('id');
    if (!id) return jsonResponse(400, { error: 'Recipe id is required.' });

    await store.delete(recipeKey(id));
    return jsonResponse(200, { ok: true });
  }

  return jsonResponse(405, { error: `Method not allowed: ${req.method}` }, { allow: 'GET, POST, DELETE' });
};

export const config: Config = {
  path: '/api/recipes',
};

function getRecipeStore() {
  type NetlifyRuntime = { context?: { deploy?: { context?: string } } };
  const runtime = (globalThis as typeof globalThis & { Netlify?: NetlifyRuntime }).Netlify;
  if (runtime?.context?.deploy?.context && runtime.context.deploy.context !== 'production') {
    return getDeployStore(STORE_NAME);
  }

  return getStore(STORE_NAME, { consistency: 'strong' });
}

function getAdminPin() {
  type NetlifyRuntime = { env?: { get?: (name: string) => string | undefined } };
  const runtime = (globalThis as typeof globalThis & { Netlify?: NetlifyRuntime }).Netlify;
  return runtime?.env?.get?.('COCKTAIL_ADMIN_PIN')?.trim() || process.env.COCKTAIL_ADMIN_PIN?.trim() || '';
}

function requireAdminPin(req: Request, adminPin: string) {
  if (!adminPin) return null;

  const providedPin = req.headers.get(ADMIN_PIN_HEADER)?.trim() || '';
  if (pinsMatch(providedPin, adminPin)) return null;

  return jsonResponse(401, { error: 'Admin PIN required.' });
}

function pinsMatch(left: string, right: string) {
  if (left.length !== right.length) return false;

  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return difference === 0;
}

async function listRecipes(store: ReturnType<typeof getStore>) {
  const { blobs } = await store.list({ prefix: RECIPE_PREFIX });
  const recipes = await Promise.all(
    blobs.map(async (blob) => {
      try {
        return await store.get(blob.key, { type: 'json' });
      } catch {
        return null;
      }
    }),
  );

  return recipes
    .filter(Boolean)
    .sort((left, right) => new Date(right.updatedAt || right.createdAt || 0).getTime() - new Date(left.updatedAt || left.createdAt || 0).getTime());
}

function normalizeRecipe(raw: Record<string, unknown>) {
  const now = new Date().toISOString();
  const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : `custom-${crypto.randomUUID()}`;

  return {
    id,
    Name: requireString(raw.Name, 'Name'),
    Ingredients: requireString(raw.Ingredients, 'Ingredients'),
    Method: requireString(raw.Method, 'Method'),
    Glass: optionalString(raw.Glass),
    FlavorProfile: optionalString(raw.FlavorProfile),
    ImageDataUrl: optionalImage(raw.ImageDataUrl),
    createdAt: optionalString(raw.createdAt) || now,
    updatedAt: now,
    source: 'live',
  };
}

function recipeKey(id: string) {
  return `${RECIPE_PREFIX}${id.replace(/[^a-zA-Z0-9._-]/g, '-')}.json`;
}

function requireString(value: unknown, field: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${field} is required.`);
  }

  return value.trim();
}

function optionalString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function optionalImage(value: unknown) {
  if (typeof value !== 'string') return '';
  if (!value.startsWith('data:image/')) return '';
  return value;
}

function jsonResponse(status: number, value: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(value, null, 2), {
    status,
    headers: {
      ...JSON_HEADERS,
      ...headers,
    },
  });
}
