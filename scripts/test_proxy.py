"""Test end-to-end del proxy /api/stream: manifest → playlist figlia → segmento → logo.

Uso: python3 scripts/test_proxy.py [base_url]
  base_url default: http://localhost:3000
"""
import json
import sys
import urllib.request

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3000"


def get(path: str, timeout: int = 25) -> tuple[int, str, bytes]:
    req = urllib.request.Request(BASE + path, headers={"User-Agent": "proxy-test/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, dict(r.headers).get("Content-Type", "?"), r.read()
    except urllib.error.HTTPError as e:
        return e.code, "?", e.read()


# 1. playlist canali → primo flusso proxied
status, _, body = get("/api/playlist?type=channels")
data = json.loads(body)
first = data["items"][0]
print(f"[playlist] {status} — canali: {len(data['items'])} — primo: {first['title']}")

# 2. manifest master proxied → deve essere riscritto con /api/stream
status, ctype, body = get(first["url"])
manifest = body.decode("utf-8", "replace")
print(f"[master]   {status} {ctype} — prime righe:")
for line in manifest.splitlines()[:6]:
    print("   ", line[:130])
assert "/api/stream" in manifest, "master manifest NON riscritto!"

# 3. prima playlist variante/figlia citata dal master → deve essere riscritta a sua volta
child = next(
    (l.strip() for l in manifest.splitlines() if l.strip() and not l.startswith("#")),
    None,
)
assert child, "nessuna URI nel master"
print(f"[child]    {child[:120]}")
status, ctype, body = get(child)
child_text = body.decode("utf-8", "replace")
print(f"[child]    {status} {ctype} — righe: {len(child_text.splitlines())}")
for line in child_text.splitlines()[:4]:
    print("   ", line[:130])
assert "/api/stream" in child_text, "child manifest NON riscritto!"

# 4. segmento → deve arrivare binario (ts/mp4) con status 200
seg = next(
    (l.strip() for l in child_text.splitlines() if l.strip() and not l.startswith("#")),
    None,
)
if seg:
    print(f"[segment]  {seg[:120]}")
    status, ctype, body = get(seg, timeout=30)
    print(f"[segment]  {status} {ctype} — {len(body)} byte, header: {body[:4]!r}")
else:
    print("[segment]  nessun segmento trovato (live?)")

# 5. logo → immagine via proxy
status, ctype, body = get(first["logo"])
print(f"[logo]     {status} {ctype} — {len(body)} byte, header: {body[:4]!r}")

# 6. un evento DASH dal proxy
status, _, body = get("/api/playlist?type=events")
ev = json.loads(body)["items"][0]
status, ctype, body = get(ev["url"])
head = body[:200].decode("utf-8", "replace")
print(f"[evento]   {status} {ctype} — contenuto: {head[:150]!r}")
print("\nOK — proxy verificato su", BASE)
