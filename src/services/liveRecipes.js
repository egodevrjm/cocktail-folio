const RECIPES_API = '/api/recipes';

export class LiveRecipeError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'LiveRecipeError';
    this.status = status;
  }
}

export async function fetchLiveRecipes() {
  const response = await fetch(RECIPES_API, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new LiveRecipeError(`Recipe library request failed with status ${response.status}`, response.status);
  }

  const data = await response.json();
  return {
    recipes: Array.isArray(data.recipes) ? data.recipes : [],
    requiresAdminPin: Boolean(data.requiresAdminPin),
  };
}

export async function saveLiveRecipe(recipe, adminPin = '') {
  const response = await fetch(RECIPES_API, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(adminPin ? { 'x-cocktail-admin-pin': adminPin } : {}),
    },
    body: JSON.stringify(recipe),
  });

  if (!response.ok) {
    throw new LiveRecipeError(`Recipe save failed with status ${response.status}`, response.status);
  }

  const data = await response.json();
  return data.recipe;
}

export async function deleteLiveRecipe(id, adminPin = '') {
  const response = await fetch(`${RECIPES_API}?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
      ...(adminPin ? { 'x-cocktail-admin-pin': adminPin } : {}),
    },
  });

  if (!response.ok) {
    throw new LiveRecipeError(`Recipe delete failed with status ${response.status}`, response.status);
  }

  return response.json();
}
