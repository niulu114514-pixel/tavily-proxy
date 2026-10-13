# Tavily Proxy

A Cloudflare Workers proxy and MCP server for pooling Tavily API keys. It selects usable keys, tracks usage in D1, handles cooldown and monthly exhaustion, and exposes Tavily search, extract, crawl, and map tools.

## Features

- `tavily-search`, `tavily-extract`, `tavily-crawl`, and `tavily-map` MCP tools.
- Least-recently-used key selection with per-key usage records.
- Automatic fallback to the next untried key, cooldown after rate limits, and invalidation after authentication failures.
- Bounded upstream timeouts and batched usage synchronization to keep Worker requests responsive.
- Monthly quota handling until the next UTC month.
- 中文响应式管理页，可查看每个 Key 的真实剩余额度、同步状态，支持单个/全部刷新、添加和删除。
- Streamable HTTP MCP endpoint and direct Tavily-compatible proxy endpoint.

## Stack

- Cloudflare Workers + Hono
- Cloudflare D1 (`DB` binding)
- Model Context Protocol
- TypeScript

## Local development

```bash
cd tavily-proxy
npm install
npx wrangler d1 migrations apply tavily-proxy --local
npm run dev
```

Create `.dev.vars` for local secrets:

```dotenv
AUTH_KEY=replace-with-a-long-random-key
```

## Deployment

For a new Cloudflare account, create the database and update `database_id` in `wrangler.toml` first:

```bash
npx wrangler d1 create tavily-proxy
npx wrangler d1 migrations apply tavily-proxy --remote
npx wrangler secret put AUTH_KEY
npm run deploy
```

The repository already configures a `*/30 * * * *` scheduled usage sync. Whether scheduled triggers run depends on the active Cloudflare plan; lazy synchronization and the admin action remain available as fallbacks.

## Authentication

All protected endpoints require:

```http
x-api-key: <AUTH_KEY>
```

`GET /` and the admin page shell are public, but admin API actions remain protected by the API key.

## Endpoints

| Method and path | Purpose |
| --- | --- |
| `GET /` | Health and service information |
| `GET /admin` | Key management interface |
| `POST /mcp` | MCP Streamable HTTP endpoint |
| `POST /v1/*` | Tavily-compatible API proxy |
| `/api/keys*` | Protected key management APIs, including per-key usage sync |

MCP client example:

```json
{
  "mcpServers": {
    "tavily": {
      "type": "streamable-http",
      "url": "https://<your-domain>/mcp",
      "headers": { "x-api-key": "<AUTH_KEY>" }
    }
  }
}
```

## Key lifecycle

- A successful request updates usage and recency.
- HTTP 429 places a key in temporary cooldown.
- HTTP 401/403 marks the key invalid until it is corrected.
- Exhausted monthly quotas are skipped until the next UTC month.
- Usage older than the configured interval is refreshed before selection when possible.

管理页中的额度来自 Tavily `/usage`，属于最近一次成功同步的缓存值。点击“刷新余额”只刷新一个 Key；“刷新全部余额”会分批查询整个 Key 池，单个 Key 失败不会中断其他 Key。

Never commit `AUTH_KEY` or Tavily API keys. Use Wrangler secrets and restrict the Worker with a custom domain or Cloudflare Access when appropriate.
