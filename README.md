# elt.Bot

`elt.Bot` watches a public Ganknow creator feed and publishes new posts to a Discord text or announcement channel. It also includes a localhost dashboard for fetching, publishing, backfilling, resetting, and monitoring the feed.

The bot uses Playwright to render the creator feed, because the post cards are loaded by the Ganknow web application. It extracts post IDs, titles, thumbnails, locked status, and post URLs from `.post-card` elements. It does not use the authenticated Ganknow Creator API.

## Requirements

- Node.js 20 or newer
- A Discord bot token
- A Discord channel ID where the bot can view the channel and send messages
- Chromium for Playwright
- .NET 8 SDK only when building the Windows launcher

The Discord bot needs permission to view the target channel, send messages, embed links, and attach links. Announcement-channel publishing is attempted automatically when the target is a news channel.

To receive new-member events, open the Discord Developer Portal, select the bot, open **Bot > Privileged Gateway Intents**, enable **Server Members Intent**, and save. The bot posts a generated welcome banner in `WELCOME_CHANNEL_ID` whenever someone joins a server where the bot is present. If that variable is empty, it uses `DISCORD_CHANNEL_ID`. This works even when feed auto-sharing is turned off.

Welcome banners are generated as 900x280 PNG files. Put a background image at `public/welcome-background.png`, or set `WELCOME_BACKGROUND_PATH` to another local image path. You can add a transparent PNG as a foreground layer with `WELCOME_FOREGROUND_PATH`; it is drawn after the avatar so artwork can sit in front of or frame the profile picture. Set `WELCOME_FONT_FAMILY` to a font installed on the machine running the bot, such as `Georgia`, `Impact`, or `Trebuchet MS`. The bot then overlays the member display name, server name, and member count. If either image is missing, it continues with the available layers.

## Setup

```powershell
npm install
npx playwright install chromium
Copy-Item .env.example .env
```

Set the values in `.env`:

| Variable | Required | Description |
| --- | --- | --- |
| `DISCORD_TOKEN` | Yes for Discord jobs | Bot token used to log in |
| `DISCORD_CHANNEL_ID` | Yes for Discord jobs | Destination text or announcement channel for Ganknow updates |
| `WELCOME_CHANNEL_ID` | No | Channel for new-member welcomes; falls back to `DISCORD_CHANNEL_ID` |
| `WELCOME_BACKGROUND_PATH` | No | Background image for generated welcome banners; defaults to `public/welcome-background.png` |
| `WELCOME_FOREGROUND_PATH` | No | Optional transparent foreground layer drawn over the avatar and background |
| `WELCOME_FONT_FAMILY` | No | Installed font family for banner text; defaults to `sans-serif` |
| `WELCOME_FONT_PATH` | No | Local `.otf` or `.ttf` file used for supporting banner text |
| `WELCOME_TITLE_FONT_PATH` | No | Local `.otf` or `.ttf` file used for the `Welcome, name!` line |
| `WELCOME_TITLE_FONT_FAMILY` | No | Alias used when registering the title font; defaults to `WelcomeTitle` |
| `GANKNOW_CREATOR_URL` | No | Creator feed URL; defaults to `https://ganknow.com/karamelt` |
| `POLL_INTERVAL_MS` | No | Continuous monitor interval in milliseconds; defaults to `3600000` (one hour) |
| `DISCORD_CLIENT_ID` | No | Reserved for Discord application configuration |
| `DISCORD_APP_ID` | No | Reserved for Discord application configuration |
| `DISCORD_PUBLIC_KEY` | No | Reserved for Discord interaction configuration |
| `GUI_PORT` | No | Dashboard port; defaults to `4173` |

## Running the bot

For continuous polling without the dashboard:

```powershell
npm run dev
```

The process checks immediately after Discord is ready and then repeats at `POLL_INTERVAL_MS`. To run the compiled version instead:

```powershell
npm run build
npm start
```

The first continuous run seeds the feed checkpoint and does not announce the existing feed history. For predictable initialization, use `npm run initial-fetch` before sending posts.

## Dashboard

Start the dashboard with:

```powershell
npm run gui
```

Open [http://127.0.0.1:4173](http://127.0.0.1:4173). The server listens on localhost only. The Discord bot logs in and appears online when the dashboard starts, but feed polling and automatic publishing remain off until enabled. It provides these actions:

- **Check for new posts** runs `update-fetch` and adds new feed items to local state.
- **Publish new posts** runs `send-new-posts` and publishes queued items in chronological order.
- **Catch up quietly** runs `backfill-updates` without cross-posting announcement messages.
- **Start over** runs `initial-fetch`, clears `data/state.json`, and re-scans the complete feed. This requires confirmation and is destructive to the local tracking state.
- **Auto-sharing** starts or stops the continuous `dev` monitor.
- **Close** stops a job started by the dashboard and shuts down the dashboard process.

The dashboard also shows recent logs, the feed archive, locked and pinned status, queue state, and the last Discord post checkpoint.

To request dashboard shutdown from another terminal:

```powershell
npm run stop
```

This calls the local shutdown endpoint. It does not terminate a separately started `npm run dev` process.

## Windows launcher

The repository includes a .NET launcher that locates the project, starts the dashboard, waits for it to become ready, and opens the browser:

```powershell
npm run build-exe
```

This publishes `elt.Bot Dashboard.exe` in the project root. Run it from the project folder after dependencies have been installed. The launcher uses the local `node_modules` installation and keeps its console visible so `Ctrl+C` can prompt before shutting down the dashboard and its active child job.

## One-shot commands

| Command | Purpose |
| --- | --- |
| `npm run initial-fetch` | Clear local state and import all currently visible feed posts |
| `npm run update-fetch` | Fetch up to 100 recent posts and add items newer than the checkpoint |
| `npm run send-new-posts` | Publish pending non-pinned posts to Discord |
| `npm run backfill-updates` | Publish pending posts without automatic announcement cross-posting |
| `npm run send-sample` | Send a test embed to Discord |
| `npm run send-welcome-sample` | Generate a welcome banner using an existing non-bot server member |
| `npm run build` | Type-check and compile TypeScript to `dist/` |
| `npm run start` | Run the compiled continuous monitor |

The fetch commands only update local state. Publishing is a separate step, which makes it possible to review the dashboard archive before sending anything.

## State and duplicate handling

State is stored in `data/state.json`, which is ignored by Git. Its important fields are:

- `seenPosts`: the locally known posts, including title, URL, locked status, thumbnail, and pinned status.
- `lastPostId`: the newest feed checkpoint used by fetch and monitor operations.
- `lastSentDisc`: the last post successfully sent to Discord, used by the publishing and backfill commands.

`initial-fetch` marks the first card returned by the feed as pinned and seeds `lastPostId` with the first non-pinned post when possible. The continuous monitor also skips known posts and sends newly found items oldest first. A failed Discord send is logged; the sender updates `lastSentDisc` only after each successful message.

To reset tracking, use the dashboard's **Start over** action or remove `data/state.json` and run `npm run initial-fetch`. Do not reset state while another fetch or send job is running.

## Project layout

```text
src/
	index.ts                 Continuous Discord monitor
	guiServer.ts             Local dashboard server and job runner
	config.ts                Environment loading and validation
	ganknow/client.ts        Playwright feed scraper and media sanitizing
	discord/notifier.ts      Discord embed and View Post button
	services/storage.ts      JSON state persistence and checkpoints
	initialFetch.ts          Full state initialization
	updateFetch.ts           Incremental feed update
	sendNewPosts.ts          Normal Discord publisher
	backfillUpdates.ts       Quiet publisher
	sendSample.ts            Test embed sender
	discordPresence.ts       Discord login without feed polling
public/                    Dashboard HTML, JavaScript, CSS, and icon
launcher/                  .NET 8 Windows launcher
data/state.json            Runtime state, ignored by Git
```

## Troubleshooting

- **Chromium executable missing:** run `npx playwright install chromium`.
- **Invalid configuration:** set `DISCORD_TOKEN` and `DISCORD_CHANNEL_ID` in `.env`.
- **No new posts:** run `npm run update-fetch`, then inspect the dashboard archive and run `npm run send-new-posts`.
- **Dashboard port in use:** set `GUI_PORT` to another local port. The Windows launcher currently expects port `4173`, so use `npm run gui` directly when changing it.
- **Feed requests fail or are rate-limited:** wait and retry. The scraper depends on the public Ganknow page and its rendered `.post-card` markup.
