const FALLBACK_SPIRITS = ['Bourbon', 'Gin', 'Rye Whiskey', 'Vodka', 'Dark Rum', 'Blanco Tequila'];
const FALLBACK_CITRUS = ['Lemon Juice', 'Lime Juice', 'Grapefruit Juice', 'Blood Orange'];
const FALLBACK_SWEETENERS = ['Honey Syrup', 'Simple Syrup', 'Agave Nectar', 'Maple Syrup'];
const FALLBACK_FINISHES = ['Ginger Beer', 'Club Soda', 'Tonic Water', 'Sparkling Water'];
const SYSTEM_PROMPT =
  'You are a master mixologist. Return only JSON with exactly these keys: name, ingredients, method, glass, flavorProfile. Ingredients must be a semicolon-separated string.';

const PROVIDER_LABELS = {
  anthropic: 'Claude',
  claude: 'Claude',
  gemini: 'Gemini',
  local: 'Local mixer',
  openai: 'OpenAI',
  chatgpt: 'OpenAI',
};

export async function generateCocktail(prompt) {
  const provider = getAIProvider();

  if (provider === 'local') {
    return createLocalRecipe(prompt);
  }

  if (provider === 'gemini') return generateWithGemini(prompt);
  if (provider === 'openai') return generateWithOpenAI(prompt);
  if (provider === 'anthropic') return generateWithAnthropic(prompt);

  return createLocalRecipe(prompt);
}

export async function generateCocktailImage(cocktail, options = {}) {
  return generateGeminiImage(buildCocktailImagePrompt(cocktail), options);
}

function buildCocktailImagePrompt(cocktail) {
  return [
    'Create a premium editorial cocktail photograph for a digital recipe book.',
    `Cocktail name: ${cocktail.Name}.`,
    `Ingredients: ${cocktail.Ingredients}.`,
    `Method context: ${cocktail.Method}.`,
    `Glass type: ${cocktail.Glass || 'appropriate cocktail glass'}.`,
    `Flavor profile: ${cocktail.FlavorProfile || 'balanced'}.`,
    'Show one finished drink in an appropriate glass with accurate garnish and liquid color inferred from the ingredients.',
    'Use warm bar lighting, a clean dark stone or walnut surface, shallow depth of field, realistic ice, condensation, and no text, labels, logos, people, hands, or brand marks.',
    'Make the image square, centered, appetizing, and photorealistic.',
  ].join(' ');
}

async function generateGeminiImage(prompt, options = {}) {
  const { signal, timeoutMs = 45000 } = options;
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Add VITE_GEMINI_API_KEY to generate cocktail images.');
  }

  const controller = new AbortController();
  const abortFromParent = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', abortFromParent, { once: true });

  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${import.meta.env.VITE_GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image'}:generateContent`,
      {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            imageConfig: {
              aspectRatio: '1:1',
            },
          },
        }),
      },
    );
  } finally {
    window.clearTimeout(timeoutId);
    signal?.removeEventListener('abort', abortFromParent);
  }

  if (!response.ok) {
    const error = new Error(`Image request failed with status ${response.status}`);
    error.status = response.status;
    throw error;
  }

  const data = await response.json();
  const imagePart = data.candidates?.[0]?.content?.parts?.find((part) => part.inlineData || part.inline_data);
  const inlineData = imagePart?.inlineData || imagePart?.inline_data;

  if (!inlineData?.data) {
    throw new Error('Gemini did not return an image.');
  }

  return {
    blob: base64ToBlob(inlineData.data, inlineData.mimeType || inlineData.mime_type || 'image/png'),
    mimeType: inlineData.mimeType || inlineData.mime_type || 'image/png',
    model: import.meta.env.VITE_GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image',
  };
}

function base64ToBlob(base64, mimeType) {
  const byteCharacters = window.atob(base64);
  const byteArrays = [];
  const chunkSize = 1024;

  for (let offset = 0; offset < byteCharacters.length; offset += chunkSize) {
    const slice = byteCharacters.slice(offset, offset + chunkSize);
    const byteNumbers = new Array(slice.length);

    for (let index = 0; index < slice.length; index += 1) {
      byteNumbers[index] = slice.charCodeAt(index);
    }

    byteArrays.push(new Uint8Array(byteNumbers));
  }

  return new Blob(byteArrays, { type: mimeType });
}

export function getAIProviderLabel() {
  return PROVIDER_LABELS[getAIProvider()] || PROVIDER_LABELS.local;
}

function getAIProvider() {
  const requested = (import.meta.env.VITE_AI_PROVIDER || '').toLowerCase().trim();
  const normalized = requested === 'chatgpt' ? 'openai' : requested === 'claude' ? 'anthropic' : requested;

  if (normalized === 'gemini' && import.meta.env.VITE_GEMINI_API_KEY) return 'gemini';
  if (normalized === 'openai' && import.meta.env.VITE_OPENAI_API_KEY) return 'openai';
  if (normalized === 'anthropic' && import.meta.env.VITE_ANTHROPIC_API_KEY) return 'anthropic';

  if (import.meta.env.VITE_GEMINI_API_KEY) return 'gemini';
  if (import.meta.env.VITE_OPENAI_API_KEY) return 'openai';
  if (import.meta.env.VITE_ANTHROPIC_API_KEY) return 'anthropic';

  return 'local';
}

async function generateWithGemini(prompt) {
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    systemInstruction: {
      parts: [{ text: SYSTEM_PROMPT }],
    },
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          ingredients: { type: 'STRING' },
          method: { type: 'STRING' },
          glass: { type: 'STRING' },
          flavorProfile: { type: 'STRING' },
        },
        required: ['name', 'ingredients', 'method', 'glass', 'flavorProfile'],
      },
    },
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash'}:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    throw new Error(`AI request failed with status ${response.status}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('AI returned an empty recipe.');

  return normalizeRecipe(JSON.parse(text));
}

async function generateWithOpenAI(prompt) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.8,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed with status ${response.status}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('OpenAI returned an empty recipe.');

  return normalizeRecipe(JSON.parse(text));
}

async function generateWithAnthropic(prompt) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: import.meta.env.VITE_ANTHROPIC_MODEL || 'claude-3-5-haiku-latest',
      max_tokens: 700,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude request failed with status ${response.status}`);
  }

  const data = await response.json();
  const text = data.content?.find((part) => part.type === 'text')?.text;
  if (!text) throw new Error('Claude returned an empty recipe.');

  return normalizeRecipe(JSON.parse(extractJSON(text)));
}

function normalizeRecipe(recipe) {
  return {
    name: recipe.name || 'House Experiment',
    ingredients: recipe.ingredients || '',
    method: recipe.method || '',
    glass: recipe.glass || '',
    flavorProfile: recipe.flavorProfile || recipe.flavor_profile || '',
  };
}

function extractJSON(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith('{')) return trimmed;

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  throw new Error('AI response did not include JSON.');
}

function createLocalRecipe(prompt) {
  const normalized = prompt.toLowerCase();
  const zeroProof = ['no alcohol', 'non alcoholic', 'non-alcoholic', 'mocktail', 'zero-proof', 'zero proof'].some((term) =>
    normalized.includes(term),
  );
  if (zeroProof) {
    const citrus = pickByPrompt(normalized, {
      lemon: 'Lemon Juice',
      lime: 'Lime Juice',
      grapefruit: 'Grapefruit Juice',
      orange: 'Blood Orange',
    }, FALLBACK_CITRUS);
    const sweetener = pickByPrompt(normalized, {
      honey: 'Honey Syrup',
      agave: 'Agave Nectar',
      maple: 'Maple Syrup',
      sweet: 'Simple Syrup',
    }, FALLBACK_SWEETENERS);
    const finish = pickByPrompt(normalized, {
      ginger: 'Ginger Beer',
      spicy: 'Ginger Beer',
      bubbly: 'Sparkling Water',
      fizzy: 'Club Soda',
      tonic: 'Tonic Water',
    }, ['Ginger Beer', 'Elderflower Tonic', 'Sparkling Water', 'Blood Orange']);
    const garnish = normalized.includes('smoky') ? 'Smoked salt rim' : normalized.includes('fresh') ? 'Mint sprig' : 'Citrus peel';

    return {
      name: normalized.includes('coffee') ? 'Nocturne Cooler' : 'Stillhouse Spritz',
      ingredients: `¾ oz ${citrus}; ½ oz ${sweetener}; 4 oz ${finish}; ${garnish}`,
      method: `Build ${citrus.toLowerCase()} and ${sweetener.toLowerCase()} over ice. Top with ${finish.toLowerCase()} and garnish with ${garnish.toLowerCase()}.`,
      glass: 'Highball',
      flavorProfile: normalized.includes('ginger') ? 'Spiced ginger' : 'Citrus sour',
    };
  }
  const spirit = pickByPrompt(normalized, {
    bourbon: 'Bourbon',
    whiskey: 'Rye Whiskey',
    rye: 'Rye Whiskey',
    gin: 'Gin',
    vodka: 'Vodka',
    rum: 'Dark Rum',
    tequila: 'Blanco Tequila',
    mezcal: 'Mezcal',
    wine: 'Estate Rosé',
    rosé: 'Estate Rosé',
  }, FALLBACK_SPIRITS);
  const citrus = pickByPrompt(normalized, {
    lemon: 'Lemon Juice',
    lime: 'Lime Juice',
    grapefruit: 'Grapefruit Juice',
    orange: 'Blood Orange',
  }, FALLBACK_CITRUS);
  const sweetener = pickByPrompt(normalized, {
    honey: 'Honey Syrup',
    agave: 'Agave Nectar',
    maple: 'Maple Syrup',
    sweet: 'Simple Syrup',
  }, FALLBACK_SWEETENERS);
  const finish = pickByPrompt(normalized, {
    spicy: 'Ginger Beer',
    bubbly: 'Sparkling Water',
    fizzy: 'Club Soda',
    tonic: 'Tonic Water',
  }, FALLBACK_FINISHES);
  const garnish = normalized.includes('smoky') ? 'Smoked salt rim' : normalized.includes('fresh') ? 'Mint sprig' : 'Citrus peel';
  const mood = normalized.includes('smoky') ? 'Ember' : normalized.includes('summer') ? 'Porchlight' : normalized.includes('bitter') ? 'Late Hour' : 'Folio';

  return {
    name: `${mood} ${spirit.replace(' Whiskey', '')}`,
    ingredients: `2 oz ${spirit}; ¾ oz ${citrus}; ½ oz ${sweetener}; 2 oz ${finish}; ${garnish}`,
    method: `Shake ${spirit.toLowerCase()}, ${citrus.toLowerCase()}, and ${sweetener.toLowerCase()} with ice. Strain over fresh ice, top with ${finish.toLowerCase()}, and garnish with ${garnish.toLowerCase()}.`,
    glass: finish.includes('Soda') || finish.includes('Beer') || finish.includes('Tonic') ? 'Highball' : 'Rocks glass',
    flavorProfile: normalized.includes('smoky') ? 'Smoky' : normalized.includes('bitter') ? 'Bittersweet' : 'Citrus sour',
  };
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
