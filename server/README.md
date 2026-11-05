# AI Gateway

Cloudflare Workers implementation for OpenAI-compatible Chat Completions.

```bash
cd server
cp wrangler.toml.example wrangler.toml
npx wrangler secret put AI_API_KEY
npx wrangler secret put GATEWAY_ACCESS_TOKEN
npx wrangler deploy
```

Set `ALLOWED_ORIGIN` to the **origin** of the static website, not its full URL path. For GitHub Pages that is `https://cha290196-hue.github.io`. Use the deployed Worker `/chat` endpoint in the website settings.

The Worker checks CORS origin, bearer token, input sizes, model allowlist, and can use an optional `AI_LIMITER` binding if configured. It does not provide per-user campus identity verification. Public multi-user operation needs a real authentication provider and per-user quotas.

Required secrets: `AI_API_KEY`, `GATEWAY_ACCESS_TOKEN`. Keep them out of source control. Required vars: `ALLOWED_ORIGIN`, `UPSTREAM_URL`, `MODEL_ALLOWLIST`.
