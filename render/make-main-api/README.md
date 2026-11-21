# 25withcoding make-main API (Render)

This is a separate Node.js API service for the existing `/make_main/` editor.
It does not replace or modify the existing Cloudflare Worker.

## Render settings

- Runtime: Node
- Root Directory: `render/make-main-api`
- Build Command: `npm install`
- Start Command: `npm start`
- Instance: Free is sufficient for initial testing

## Environment

Add the existing GitHub fine-grained token as a Render Secret:

- `GITHUB_TOKEN`: GitHub token with the minimum required Contents read/write permission for `Trandonweb/25withcoding`

Do not commit secrets to this repository.

## Health check

After deployment, open `/health`. It should return:

```json
{"ok":true,"service":"25withcoding-make-main-api"}
```

The browser editor still points to the Cloudflare Worker until its API endpoint is deliberately switched after Render is tested. Do not disable the Worker before that verification.
