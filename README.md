# The Cocktail Folio

A complete React web app for browsing, creating, favoriting, copying, and mixing cocktail recipes.

## Run It

```bash
npm install --cache ./.npm-cache
npm run dev -- --port 5184
```

Open `http://localhost:5184/`.

## Build

```bash
npm run build
```

## MCP Server

The project also includes a local MCP server that exposes the cocktail library to MCP clients.

```bash
npm run mcp
```

Example MCP client config:

```json
{
  "mcpServers": {
    "cocktail-folio": {
      "command": "node",
      "args": ["mcp/server.js"],
      "cwd": "/Users/ryanmorrison/Documents/Codex/2026-05-03/can-we-build-this-as-a"
    }
  }
}
```

Available tools:

- `search_cocktails`: search by name, ingredient, glass, flavor, or base filter.
- `get_cocktail`: fetch a complete recipe by id or name.
- `library_summary`: return counts, filters, sorts, and coverage.
- `build_cocktail`: create a local deterministic cocktail draft.
- `image_prompt`: generate the app's square photorealistic cocktail image prompt.

Available resources:

- `cocktails://library`
- `cocktails://summary`
- `cocktails://recipe/{id}`

When deployed to Netlify, the same MCP implementation is available as a remote HTTP JSON-RPC endpoint:

```text
https://cocktail-folio-room.netlify.app/.netlify/functions/mcp
```

## Live Recipes

The app no longer uses AI services or browser-exposed API keys. Recipe creation is manual, with a non-AI builder that fills in a draft from selected base, profile, ingredients, and notes.

On Netlify, custom recipes are stored with Netlify Blobs through the `/api/recipes` function. Uploaded recipe images are resized in the browser before being saved with the recipe record. When the function is unavailable, the app falls back to browser storage.

Set `COCKTAIL_ADMIN_PIN` in Netlify to require an in-app admin unlock before anyone can create, edit, or delete live recipes. Reading the folio remains public.

The app still uses square local photo placeholders in `public/images/placeholders/`, selected by base type such as bourbon, rye, gin, wine, rum, tequila, vodka, or mocktail.
