# Finspire Team OS — Claude Notes

## MCP Connections

- **Supabase MCP** is connected to the WRONG project (`jhlmalpemiiimtbrarkg`). The correct Team OS database is `aozyczhsstbnsonfgdkd`. Do not use the Supabase MCP to query or modify data for this project — use direct SQL via the correct project or the Supabase dashboard.

- **Vercel MCP** may not have write access to env vars in auto-mode (blocked as "Secret-Store Writes"). Do not assume the Vercel MCP can update env variables for this project. If env var changes are needed, direct the user to the Vercel dashboard manually.

## Project Info

- Vercel project ID: `prj_TFkcKe7wAHaU5R9HfGBh2ayEAfT8`
- GitHub repo: `Kamsi-J/Finspire-Team-Management--Platform`, branch `master`
- Correct Supabase project: `aozyczhsstbnsonfgdkd` (URL: `https://aozyczhsstbnsonfgdkd.supabase.co`)
