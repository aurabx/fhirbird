# Security review: React2Shell compromise of the Render deployment

| | |
|---|---|
| **Date of investigation** | 2026-10-25 |
| **Service** | `fhirbird` on Render (web service, Node native runtime, 512MB, 0.5 CPU) |
| **Deployed commit** | `0d520f3` (`main`), Next.js 16.0.4, React 19.2.0 |
| **Vulnerability** | CVE-2025-55182 ("React2Shell"), unauthenticated RCE in React Server Components |
| **Impact** | Remote code execution; XMRig crypto miner dropped; repeated out-of-memory crashes |
| **Data exposure** | None identified. The service holds no secrets and stores no data |
| **Fix** | Upgrade to Next.js 16.4.3 / React 19.3.1 (this PR) |

## Summary

The service went down after being killed for running out of memory at its 512MB limit. The cause wasn't a memory leak in FHIRbird. Attackers used CVE-2025-55182 in Next.js 16.0.4 / React 19.2.0 to run commands on the server and drop an XMRig Monero miner into `/dev/shm`. XMRig's RandomX mode needs about 2GB of RAM, so each time the miner started the container ran out of memory and was killed. The crashes stopped the miner before it could mine anything useful.

## Evidence

### 1. Server Action errors in an app with no Server Actions

The Render logs showed repeated errors like:

```
failed to get redirect response TypeError: fetch failed
  ...
  [cause]: Error: read ECONNRESET
...
Killed
==> Running 'npm run start'
```

In Next.js 16.0.4 the message `failed to get redirect response` comes only from `server/app-render/action-handler.js`. That's the Server Actions handler, at the point where it follows a `redirect()` raised by an action. FHIRbird defines no Server Actions (`app/page.tsx` is a client component and the only server code is `app/api/fhir-proxy/route.ts`). So these were crafted external `POST` requests with a `Next-Action` header. Public React2Shell exploits use the `NEXT_REDIRECT` path to return command output, which produces exactly this log line.

### 2. Miner binary on the instance

Inspection via the Render Shell found:

```
/dev/shm/.k_m0m70v   8,350,992 bytes, mode 0755, owner render
Birth: 2026-10-25 17:25:57 UTC
ELF 64-bit LSB executable, x86-64, statically linked, stripped
sha256: b20f39fc00d242e706b6c30367ad811c676e0575050a4ec2f30104b696944b49
```

`strings` output confirmed it as **XMRig 6.26.0**: `cryptonight-monerov7/8`, `XMRIG_*` environment variables, `.xmrig.json`, `pool_wallet`, `mining.subscribe`, `mining.authorize`.

The file was created at 17:25:57, a few seconds before the container restarted at 17:26. The likely sequence: the exploit dropped and started the miner, the miner pushed the container past 512MB, the container was killed, and Render restarted it. `/dev/shm` survived the restart, so the binary was still there, but nothing restarted the miner.

### 3. Checks that came back clean

- **Processes:** only `next-server`, `npm run start`, Render's `graceful-shell-command.sh` and the inspection shell. No miner was running.
- **`/tmp`, `/var/tmp`:** nothing unexpected (only `node-compile-cache`).
- **`crontab`:** empty.
- **`~/.xmrig.json`, `~/.config/xmrig.json`:** absent.
- **Files changed in the last 48 hours** (excluding `node_modules`, `/proc`, `.next/cache`): only `/etc/hosts`, `/opt/render/.bash_profile`, `/opt/render/.ssh_env` and an npm debug log. The two shell files were reviewed and are Render's standard shell setup and environment.
- **Environment:** platform variables only. No API keys or tokens.

There was no sign of lateral movement, persistence beyond the dropped binary, or credential access.

## Response

1. Deleted `/dev/shm/.k_m0m70v` from the running instance.
2. Upgraded dependencies (this PR):
   - `next` 16.0.4 → 16.4.3
   - `react`, `react-dom` 19.2.0 → 19.3.1, pinned exactly
   - `npm audit fix` for a transitive `source-map-js` DoS advisory; `npm audit` reports 0 vulnerabilities
3. Verified locally: `npm run build` passes. Under `next start`, `GET /` → 200, `/api/fhir-proxy` without `url` → 400, forged `Next-Action` POST → 400.
4. No secret rotation needed: there are no secrets on the service.

Render's runtime filesystem is ephemeral, so deploying the patched commit replaces the container and removes anything left behind.

## Follow-up

- [ ] Merge this PR and confirm Render deploys it. In the Render Shell, `ps aux` should show `next-server (v16.4.3)`.
- [ ] Watch the Render CPU, memory and outbound bandwidth graphs for 24–48 hours. They should stay near idle. Sustained CPU or memory climbing to the limit means re-investigate.
- [ ] Consider automated dependency updates (Dependabot or Renovate) so security releases of `next` and `react` are proposed promptly. Socket Security already scans PRs but doesn't open them.

## How to check an instance in future

From the Render Shell:

```sh
ps aux --sort=-%mem | head                 # only node / next-server expected
ls -la /tmp /var/tmp /dev/shm              # no hidden executables
crontab -l 2>/dev/null
find / -xdev -type f -mmin -2880 2>/dev/null \
  | grep -v -e node_modules -e /proc -e /.next/cache | head -50
```

For any unexpected binary, run `stat`, `file`, `sha256sum`, and `strings -n 8 <file> | grep -iE 'xmr|monero|stratum|pool|mining'`. Don't execute it.

In the Render logs, look for `failed to get redirect response`, `Next-Action` and `NEXT_REDIRECT` (exploit attempts), and for `wget`, `curl`, `/tmp/`, `/dev/shm`, `base64` and `xmrig` (signs of successful execution).

## References

- CVE-2025-55182: React Server Components remote code execution ("React2Shell")
- CVE-2025-55183: React Server Components source code exposure
- CVE-2025-55184 / CVE-2025-67779: React Server Components denial of service
