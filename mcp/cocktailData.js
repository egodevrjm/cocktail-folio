import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const CSV_PATH = resolveCSVPath();

export const FILTERS = ['All', 'Bourbon', 'Rye', 'Gin', 'Vodka', 'Tequila', 'Rum', 'Wine', 'Mocktail'];
export const SORTS = ['folio', 'name', 'base', 'glass', 'flavor'];

const BASE_ORDER = ['bourbon', 'rye', 'gin', 'vodka', 'tequila', 'rum', 'wine', 'mocktail', 'generic'];

export function loadCocktails() {
  const csv = fs.readFileSync(CSV_PATH, 'utf8');
  return parseCSV(csv);
}

export function parseCSV(csv) {
  const lines = [];
  let currentLine = [];
  let currentCell = '';
  let inQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      currentLine.push(currentCell.trim());
      currentCell = '';
    } else if (char === '\n' && !inQuotes) {
      currentLine.push(currentCell.trim());
      lines.push(currentLine);
      currentLine = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }

  if (currentCell || currentLine.length) {
    currentLine.push(currentCell.trim());
    lines.push(currentLine);
  }

  const [headers = [], ...rows] = lines;
  const normalizedHeaders = headers.map((header) => header.trim().toLowerCase());
  const getCell = (row, name, fallbackIndex) => {
    const index = normalizedHeaders.indexOf(name.toLowerCase());
    return row[index >= 0 ? index : fallbackIndex] || '';
  };

  return rows
    .map((row, index) =>
      enrichCocktail({
        id: `base-${index}-${slugify(getCell(row, 'Name', 0) || 'cocktail')}`,
        name: getCell(row, 'Name', 0),
        ingredients: getCell(row, 'Ingredients', 1),
        method: getCell(row, 'Method', 2),
        glass: getCell(row, 'Glass', 3),
        flavorProfile: getCell(row, 'FlavorProfile', 4) || getCell(row, 'Flavor Profile', 4),
        source: 'folio',
        sortIndex: index,
      }),
    )
    .filter((cocktail) => cocktail.name);
}

export function enrichCocktail(cocktail) {
  return {
    ...cocktail,
    glass: cocktail.glass || inferGlassType(cocktail),
    flavorProfile: cocktail.flavorProfile || inferFlavorProfile(cocktail),
    baseType: inferBaseType(cocktail),
  };
}

export function searchCocktails(cocktails, options = {}) {
  const query = (options.query || '').trim().toLowerCase();
  const filter = options.filter || 'All';
  const sortBy = SORTS.includes(options.sortBy) ? options.sortBy : 'folio';
  const limit = normalizeLimit(options.limit, 20);

  const results = cocktails.filter((cocktail) => {
    const text = searchableText(cocktail);
    const matchesQuery = !query || text.includes(query);
    const matchesFilter = matchesFilterName(filter, cocktail);
    return matchesQuery && matchesFilter;
  });

  return sortCocktails(results, sortBy).slice(0, limit);
}

export function findCocktail(cocktails, idOrName) {
  const needle = String(idOrName || '').trim().toLowerCase();
  if (!needle) return null;

  return (
    cocktails.find((cocktail) => cocktail.id.toLowerCase() === needle) ||
    cocktails.find((cocktail) => cocktail.name.toLowerCase() === needle) ||
    cocktails.find((cocktail) => slugify(cocktail.name) === slugify(needle)) ||
    cocktails.find((cocktail) => cocktail.name.toLowerCase().includes(needle))
  );
}

export function summarizeLibrary(cocktails) {
  const countsByBase = countBy(cocktails, (cocktail) => cocktail.baseType);
  const countsByGlass = countBy(cocktails, (cocktail) => cocktail.glass);
  const countsByFlavor = countBy(cocktails, (cocktail) => cocktail.flavorProfile);

  return {
    total: cocktails.length,
    filters: FILTERS,
    sorts: SORTS,
    countsByBase,
    countsByGlass,
    countsByFlavor,
  };
}

export function buildCocktailImagePrompt(cocktail) {
  return [
    'Create a premium editorial cocktail photograph for a digital recipe book.',
    `Cocktail name: ${cocktail.name}.`,
    `Ingredients: ${cocktail.ingredients}.`,
    `Method context: ${cocktail.method}.`,
    `Glass type: ${cocktail.glass || 'appropriate cocktail glass'}.`,
    `Flavor profile: ${cocktail.flavorProfile || 'balanced'}.`,
    'Show one finished drink in an appropriate glass with accurate garnish and liquid color inferred from the ingredients.',
    'Use warm bar lighting, a clean dark stone or walnut surface, shallow depth of field, realistic ice, condensation, and no text, labels, logos, people, hands, or brand marks.',
    'Make the image square, centered, appetizing, and photorealistic.',
  ].join(' ');
}

export function createLocalRecipe(input = {}) {
  const base = input.base || 'Bourbon';
  const flavorProfile = input.flavorProfile || 'Citrus sour';
  const selectedIngredients = Array.isArray(input.ingredients) ? input.ingredients : [];
  const direction = input.direction || '';
  const prompt = `${base} ${flavorProfile} ${selectedIngredients.join(' ')} ${direction}`.toLowerCase();
  const zeroProof = ['no alcohol', 'non alcoholic', 'non-alcoholic', 'mocktail', 'zero-proof', 'zero proof'].some((term) =>
    prompt.includes(term),
  );

  const citrus = pickByPrompt(prompt, {
    lemon: 'Lemon Juice',
    lime: 'Lime Juice',
    grapefruit: 'Grapefruit Juice',
    orange: 'Blood Orange',
  }, ['Lemon Juice', 'Lime Juice', 'Grapefruit Juice', 'Blood Orange']);
  const sweetener = pickByPrompt(prompt, {
    honey: 'Honey Syrup',
    agave: 'Agave Nectar',
    maple: 'Maple Syrup',
    sweet: 'Simple Syrup',
  }, ['Honey Syrup', 'Simple Syrup', 'Agave Nectar', 'Maple Syrup']);
  const finish = pickByPrompt(prompt, {
    ginger: 'Ginger Beer',
    spicy: 'Ginger Beer',
    bubbly: 'Sparkling Water',
    fizzy: 'Club Soda',
    tonic: 'Tonic Water',
  }, ['Ginger Beer', 'Club Soda', 'Tonic Water', 'Sparkling Water']);
  const garnish = prompt.includes('smoky') ? 'Smoked salt rim' : prompt.includes('fresh') ? 'Mint sprig' : 'Citrus peel';

  if (zeroProof) {
    return enrichCocktail({
      id: `generated-${Date.now()}`,
      name: prompt.includes('coffee') ? 'Nocturne Cooler' : 'Stillhouse Spritz',
      ingredients: `3/4 oz ${citrus}; 1/2 oz ${sweetener}; 4 oz ${finish}; ${garnish}`,
      method: `Build ${citrus.toLowerCase()} and ${sweetener.toLowerCase()} over ice. Top with ${finish.toLowerCase()} and garnish with ${garnish.toLowerCase()}.`,
      glass: 'Highball',
      flavorProfile,
      source: 'mcp-generated',
    });
  }

  const spirit = normalizeBase(base, prompt);
  const mood = prompt.includes('smoky') ? 'Ember' : prompt.includes('summer') ? 'Porchlight' : prompt.includes('bitter') ? 'Late Hour' : 'Folio';

  return enrichCocktail({
    id: `generated-${Date.now()}`,
    name: `${mood} ${spirit.replace(' Whiskey', '')}`,
    ingredients: `2 oz ${spirit}; 3/4 oz ${citrus}; 1/2 oz ${sweetener}; 2 oz ${finish}; ${garnish}`,
    method: `Shake ${spirit.toLowerCase()}, ${citrus.toLowerCase()}, and ${sweetener.toLowerCase()} with ice. Strain over fresh ice, top with ${finish.toLowerCase()}, and garnish with ${garnish.toLowerCase()}.`,
    glass: finish.includes('Soda') || finish.includes('Beer') || finish.includes('Tonic') ? 'Highball' : 'Rocks glass',
    flavorProfile,
    source: 'mcp-generated',
  });
}

function normalizeBase(base, prompt) {
  const value = String(base || '').toLowerCase();
  if (value.includes('bourbon')) return 'Bourbon';
  if (value.includes('rye') || value.includes('whiskey')) return 'Rye Whiskey';
  if (value.includes('gin')) return 'Gin';
  if (value.includes('vodka')) return 'Vodka';
  if (value.includes('rum')) return 'Dark Rum';
  if (value.includes('tequila')) return 'Blanco Tequila';
  if (value.includes('mezcal') || prompt.includes('mezcal')) return 'Mezcal';
  if (value.includes('wine') || value.includes('rose') || value.includes('rosé')) return 'Estate Rosé';
  return 'Bourbon';
}

function matchesFilterName(filter, cocktail) {
  if (!filter || filter === 'All') return true;
  return inferBaseType(cocktail) === filter.toLowerCase();
}

function sortCocktails(cocktails, sortBy) {
  const items = [...cocktails];
  const byName = (a, b, mapper) => mapper(a).localeCompare(mapper(b), undefined, { sensitivity: 'base' }) || a.sortIndex - b.sortIndex;

  if (sortBy === 'name') return items.sort((a, b) => byName(a, b, (cocktail) => cocktail.name));
  if (sortBy === 'base') {
    return items.sort((a, b) => {
      const baseDelta = BASE_ORDER.indexOf(a.baseType) - BASE_ORDER.indexOf(b.baseType);
      return baseDelta || byName(a, b, (cocktail) => cocktail.name);
    });
  }
  if (sortBy === 'glass') return items.sort((a, b) => byName(a, b, (cocktail) => cocktail.glass));
  if (sortBy === 'flavor') return items.sort((a, b) => byName(a, b, (cocktail) => cocktail.flavorProfile));
  return items.sort((a, b) => a.sortIndex - b.sortIndex);
}

function inferBaseType(cocktail) {
  const text = `${cocktail.ingredients || ''} ${cocktail.name || ''}`.toLowerCase();
  if (text.includes('bourbon')) return 'bourbon';
  if (text.includes('rye')) return 'rye';
  if (text.includes('gin')) return 'gin';
  if (text.includes('vodka')) return 'vodka';
  if (text.includes('tequila') || text.includes('mezcal')) return 'tequila';
  if (text.includes('rum')) return 'rum';
  if (['rosé', 'chardonnay', 'chianti', 'blend', 'sparkling', 'wine', 'prosecco', 'champagne'].some((term) => text.includes(term))) {
    return 'wine';
  }
  if (['campari', 'aperol', 'vermouth', 'liqueur', 'absinthe', 'scotch'].some((term) => text.includes(term))) {
    return 'generic';
  }
  return 'mocktail';
}

function inferGlassType(cocktail) {
  const text = searchableText(cocktail);

  if (matchesAny(text, ['hot water', 'toddy', 'mug'])) return 'Mug';
  if (matchesAny(text, ['julep'])) return 'Julep cup';
  if (matchesAny(text, ['flute', 'champagne', 'sparkling wine', 'french 75', 'royale'])) return 'Flute';
  if (matchesAny(text, ['wine glass', 'sangria', 'spritz', 'rosé', 'chardonnay', 'chianti', 'red blend', 'prosecco'])) return 'Wine glass';
  if (matchesAny(text, ['coupe', 'martini', 'gimlet', 'manhattan', 'paper plane', 'corpse reviver', "bee's knees"])) return 'Coupe';
  if (matchesAny(text, ['collins'])) return 'Collins glass';
  if (matchesAny(text, ['mule', 'highball', 'ginger beer', 'ginger ale', 'tonic', 'club soda', 'cola', 'root beer', 'cream soda', 'lemon soda'])) {
    return 'Highball';
  }
  if (matchesAny(text, ['margarita', 'paloma', 'smash', 'old fashioned', 'sazerac', 'negroni', 'boulevardier', 'large cube', 'rocks glass'])) {
    return 'Rocks glass';
  }

  return 'Rocks glass';
}

function inferFlavorProfile(cocktail) {
  const text = searchableText(cocktail);

  if (matchesAny(text, ['espresso', 'coffee', 'cold brew'])) return 'Coffee rich';
  if (matchesAny(text, ['cream soda', 'ice cream', 'gelato', 'float'])) return 'Creamy dessert';
  if (matchesAny(text, ['campari', 'aperol', 'amaro', 'vermouth', 'bitter'])) return 'Bittersweet';
  if (matchesAny(text, ['mezcal', 'smoked', 'scotch', 'smoky'])) return 'Smoky';
  if (matchesAny(text, ['ginger beer', 'ginger ale', 'ginger', 'cinnamon', 'black pepper'])) return 'Spiced ginger';
  if (matchesAny(text, ['tonic', 'elderflower', 'cucumber', 'mint', 'basil', 'rosemary', 'botanical'])) return 'Botanical fresh';
  if (matchesAny(text, ['grapefruit', 'blood orange', 'cherry', 'blackberry', 'plum', 'pear', 'seasonal fruit'])) return 'Fruity bright';
  if (matchesAny(text, ['lemon', 'lime', 'sour', 'citrus'])) return 'Citrus sour';
  if (matchesAny(text, ['honey', 'maple', 'agave', 'simple syrup'])) return 'Sweet tart';
  if (matchesAny(text, ['cola', 'root beer'])) return 'Soda sweet';
  if (matchesAny(text, ['sparkling', 'prosecco', 'champagne', 'rosé', 'chardonnay', 'wine'])) return 'Sparkling fruit';

  return 'Balanced';
}

function searchableText(cocktail) {
  return `${cocktail.name || ''} ${cocktail.ingredients || ''} ${cocktail.method || ''} ${cocktail.glass || ''} ${cocktail.flavorProfile || ''}`.toLowerCase();
}

function matchesAny(text, terms) {
  return terms.some((term) => text.includes(term));
}

function countBy(items, mapper) {
  return items.reduce((counts, item) => {
    const key = mapper(item) || 'unknown';
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function normalizeLimit(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.floor(parsed), 100);
}

function pickByPrompt(prompt, matches, fallback) {
  const entry = Object.entries(matches).find(([keyword]) => prompt.includes(keyword));
  if (entry) return entry[1];

  let hash = 0;
  for (let index = 0; index < prompt.length; index += 1) {
    hash = (hash + prompt.charCodeAt(index) * (index + 1)) % 10000;
  }
  return fallback[hash % fallback.length];
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function resolveCSVPath() {
  const candidates = [
    path.resolve(MODULE_DIR, '../src/data/cocktails.csv'),
    path.resolve(MODULE_DIR, '../../src/data/cocktails.csv'),
    path.resolve(process.cwd(), 'src/data/cocktails.csv'),
    process.env.LAMBDA_TASK_ROOT ? path.resolve(process.env.LAMBDA_TASK_ROOT, 'src/data/cocktails.csv') : '',
  ].filter(Boolean);

  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) {
    throw new Error(`Could not find cocktails.csv. Checked: ${candidates.join(', ')}`);
  }

  return found;
}
