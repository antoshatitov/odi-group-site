# ODI VPS Deploy Notes For Codex

This file records the working deploy path used by Codex for the ODI site.
Keep secrets, private keys, IP addresses, and raw SSH config out of this file.

## Access

- Use the local SSH alias `odi-site-codex` for Codex-safe VPS access.
- This alias uses the Codex SSH key and logs in as the non-sudo `codex` user.
- The `codex` user can update the app workspace under `/srv/apps/odi-group`.
- Do not print key contents, `.env` contents, or SSH config details.

## Server Layout

- Server-side git clone: `/srv/apps/odi-group/repo`
- Deployed frontend dist: `/srv/apps/odi-group/app/web/dist`
- Deployed backend app: `/srv/apps/odi-group/app/server`
- Backend healthcheck: `http://127.0.0.1:8080/api/health`
- Public site: `https://odi-group.ru`
- Relevant services: `odi-group-leads.service`, `nginx.service`

## When This Flow Is Appropriate

Use this flow for frontend-only changes after the PR has been merged into `main`.
It updates static assets and does not restart the backend.

For backend changes, dependency changes, `.env` changes, nginx/systemd changes, or anything that
needs sudo, use the private deploy wrapper described in `docs/deploy-runbook.md` or ask the user
for the sudo-capable deploy command.

## Local Preflight

From the local repo root:

```bash
git status --short --branch
git rev-parse HEAD
git rev-parse origin/main
npm run lint:web
npm run build:web
npm run test:server
```

`npm run repo:safety` is preferred before deploy, but it may fail on pre-existing repository
hygiene issues unrelated to the site change. If it fails, record the reason before continuing.

## Frontend-Only Deploy

Replace `<ref>` with the exact merged commit SHA or branch ref to deploy.
Prefer an immutable commit SHA.

```bash
ssh -o BatchMode=yes odi-site-codex \
  'cd /srv/apps/odi-group/repo &&
   git status --short &&
   git fetch --prune origin &&
   git checkout --detach <ref> &&
   git status --short --branch'
```

Build on the VPS:

```bash
ssh -o BatchMode=yes odi-site-codex \
  'cd /srv/apps/odi-group/repo && npm run build:web'
```

Publish the generated static assets:

```bash
ssh -o BatchMode=yes odi-site-codex \
  'rsync -a --delete /srv/apps/odi-group/repo/apps/web/dist/ /srv/apps/odi-group/app/web/dist/'
```

This is enough for frontend-only changes because nginx serves the static files directly from the
deployed `dist` directory.

## Post-Deploy Checks

Check deployed assets and service health from the VPS:

```bash
ssh -o BatchMode=yes odi-site-codex \
  'cd /srv/apps/odi-group/app/web/dist &&
   ls -1 assets/index-*.js assets/index-*.css 2>/dev/null | sort | tail -5 &&
   stat -c "%n %s" index.html'
```

```bash
ssh -o BatchMode=yes odi-site-codex \
  'curl -fsS http://127.0.0.1:8080/api/health &&
   printf "\n" &&
   curl -fsSI https://odi-group.ru | sed -n "1,8p" &&
   systemctl is-active odi-group-leads.service nginx.service'
```

Also verify the public site in a browser. For the contact menu change, the production DOM check was:

```bash
node -e "import('playwright').then(async ({ chromium }) => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1314, height: 768 } });
  await page.goto('https://odi-group.ru/', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Написать' }).click();
  const info = await page.evaluate(() => ({
    expanded: document.querySelector('[aria-controls=\"hero-contact-menu\"]')
      ?.getAttribute('aria-expanded'),
    links: Array.from(document.querySelectorAll('.contact-menu-link'))
      .map((el) => el.textContent?.trim()),
    title: document.title,
  }));
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})"
```

Expected result for the current hero contact menu:

```json
{
  "expanded": "true",
  "links": ["Telegram", "WhatsApp", "Max", "VK"],
  "title": "ОДИ — строительство индивидуальных домов в Калининграде"
}
```

## Rollback For Frontend-Only Deploy

Deploy the previous known-good commit with the same frontend-only flow:

```bash
ssh -o BatchMode=yes odi-site-codex \
  'cd /srv/apps/odi-group/repo &&
   git fetch --prune origin &&
   git checkout --detach <previous-good-ref> &&
   npm run build:web &&
   rsync -a --delete /srv/apps/odi-group/repo/apps/web/dist/ /srv/apps/odi-group/app/web/dist/'
```

Then repeat the post-deploy checks.
