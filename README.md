# SoulFlame Downloader

Fast MVP for public YouTube, Instagram and Facebook media.

## Flow
Paste URL → choose MP3/MP4 → choose video quality → download.

## Runtime
- Vercel frontend + Node serverless API
- yt-dlp standalone binary downloaded during build
- ffmpeg-static 5.3.0
- request processing cap: 295 seconds in code; Vercel plan limits may be lower

## Safety / scope
Only public URLs from the supported platforms are accepted. No DRM, paywall, private-content or access-control bypassing.

## Previous BBQ project
The pre-migration state is preserved in:
`backup/bbq-before-soulflame-downloader-20260921`
