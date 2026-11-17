"""Crea lo zip dei sorgenti di Tribuna TV pronto per GitHub, escludendo
tutto ciò che non serve (node_modules, build, scaffolding della sandbox).

Uso: python3 scripts/make_source_zip.py
Output: /home/z/my-project/download/tribuna-tv-sorgente.zip
"""
import os
import zipfile

ROOT = "/home/z/my-project"
OUT = "/home/z/my-project/download/tribuna-tv-sorgente.zip"

# Cartelle/file da NON includere mai
EXCLUDE_TOP = {
    ".next", ".open-next", ".wrangler", "node_modules", ".git",
    ".zscripts", ".z-ai-config", ".claude", "agent-ctx",
    "mini-services", "examples", "tests", "skills", "upload", "download",
    "db",
    "Caddyfile", "bun.lock", ".env", "next-env.d.ts",
    "dev.log", "server.log", "dev.out.log", "test", "prompt",
}
SKIP_SUFFIX = (".log", ".DS_Store")


def skip(name: str) -> bool:
    return (
        name in EXCLUDE_TOP
        or name.endswith(SKIP_SUFFIX)
        or name in {".DS_Store", "Thumbs.db"}
    )


def main() -> None:
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    if os.path.exists(OUT):
        os.remove(OUT)
    count = 0
    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as z:
        for dirpath, dirnames, filenames in os.walk(ROOT):
            dirnames[:] = [d for d in dirnames if not skip(d)]
            for f in filenames:
                if skip(f):
                    continue
                full = os.path.join(dirpath, f)
                rel = os.path.relpath(full, ROOT)
                z.write(full, os.path.join("tribuna-tv", rel))
                count += 1
    size_mb = os.path.getsize(OUT) / 1e6
    print(f"OK: {count} file → {OUT} ({size_mb:.2f} MB)")


if __name__ == "__main__":
    main()
