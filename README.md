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

## Optional Services

The app works locally without any keys. To enable optional services, copy `.env.example` to `.env` and fill in:

- `VITE_AI_PROVIDER` as `gemini`, `openai`, `anthropic`, or `local`.
- `VITE_GEMINI_API_KEY` and optionally `VITE_GEMINI_MODEL`.
- `VITE_GEMINI_IMAGE_MODEL` for Nano Banana image generation. The default is the faster `gemini-2.5-flash-image`.
- `VITE_OPENAI_API_KEY` and optionally `VITE_OPENAI_MODEL`.
- `VITE_ANTHROPIC_API_KEY` and optionally `VITE_ANTHROPIC_MODEL`.
- `VITE_FIREBASE_CONFIG` and `VITE_FIREBASE_APP_ID` for anonymous Firebase recipe sync.

Without those values, custom recipes and favorites use browser storage, and recipe generation uses the built-in local mixer.

Generated cocktail images are saved locally in the browser with IndexedDB. The app uses square static local photo placeholder images in `public/images/placeholders/`, selected by base type such as bourbon, rye, gin, wine, rum, tequila, vodka, or mocktail. Open a cocktail to see the matching placeholder, then click generate to create and persist that cocktail's Nano Banana image. Later opens reuse the saved image unless you click regenerate.

For local testing, `VITE_*` AI keys are convenient. For a public deployment, move AI calls behind a serverless function or backend route so visitors cannot inspect the API key in the browser bundle.
