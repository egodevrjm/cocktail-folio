const RECIPES_API = '/api/recipes';

export async function fetchLiveRecipes() {
  const response = await fetch(RECIPES_API, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Recipe library request failed with status ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data.recipes) ? data.recipes : [];
}

export async function saveLiveRecipe(recipe) {
  const response = await fetch(RECIPES_API, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(recipe),
  });

  if (!response.ok) {
    throw new Error(`Recipe save failed with status ${response.status}`);
  }

  const data = await response.json();
  return data.recipe;
}
