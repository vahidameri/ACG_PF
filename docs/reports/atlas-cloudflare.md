# Atlas Cloudflare connector

On 2026-11-17, the standalone Cloudflare tunnel `atlas` was enrolled on ASUS. The Windows scheduled task `Atlas Cloudflare Tunnel` starts at boot under SYSTEM and runs the installed cloudflared binary. Its token is stored only in the restricted Atlas secrets directory and is supplied through a token file. The separate Madar Windows service continued to run.

Verified the task state Running, Cloudflare tunnel status Healthy, and the Atlas loopback health endpoint returning true. The existing offline deploy graph was queried; this report is outside its deploy/ source scope. No application or deployment source changed.

The company DNS remains at ParsPack. Cloudflare for SaaS is unavailable until activation is approved and any payment-method requirement is handled by the account owner. No Cloudflare for SaaS fallback, public route, DNS record, or certificate was created. Do not provide the raw tunnel UUID as an external DNS target. After the approved external hostname route is provisioned, record its exact CNAME and validation records and verify public HTTPS.
