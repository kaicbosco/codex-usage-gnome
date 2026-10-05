#!/usr/bin/env python3

import json
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path


def send(proc, payload):
    proc.stdin.write(json.dumps(payload) + "\n")
    proc.stdin.flush()


def read_response(proc, request_id):
    while True:
        line = proc.stdout.readline()
        if not line:
            err = proc.stderr.read().strip() if proc.stderr else ""
            raise RuntimeError(err or "codex app-server encerrou inesperadamente")
        try:
            message = json.loads(line)
        except json.JSONDecodeError:
            continue
        if message.get("id") != request_id:
            continue
        if "error" in message:
            raise RuntimeError(str(message["error"]))
        return message.get("result", {})


def parse_window(window):
    if not window:
        return None
    used = window.get("usedPercent")
    duration = window.get("windowDurationMins")
    resets_at = window.get("resetsAt")
    if used is None:
        return None
    return {
        "remaining": max(0.0, min(100.0, 100.0 - float(used))),
        "duration": duration,
        "resets_at": int(resets_at) if resets_at is not None else None,
    }


def find_windows(result):
    candidates = []
    buckets = result.get("rateLimitsByLimitId") or {}
    ordered = []
    if "codex" in buckets:
        ordered.append(buckets["codex"])
    ordered.extend(value for key, value in buckets.items() if key != "codex")

    for bucket in ordered:
        for key in ("primary", "secondary"):
            parsed = parse_window(bucket.get(key))
            if parsed:
                candidates.append(parsed)

    legacy = result.get("rateLimits") or {}
    for key in ("primary", "secondary"):
        parsed = parse_window(legacy.get(key))
        if parsed:
            candidates.append(parsed)

    five = next((x for x in candidates if x["duration"] == 300), None)
    week = next((x for x in candidates if x["duration"] == 10080), None)
    return five, week


def compact_duration(resets_at):
    if not resets_at:
        return "—"
    seconds = max(0, resets_at - int(time.time()))
    days, seconds = divmod(seconds, 86400)
    hours, seconds = divmod(seconds, 3600)
    minutes, _ = divmod(seconds, 60)
    parts = []
    if days:
        parts.append(f"{days}d")
    if hours:
        parts.append(f"{hours}h")
    if minutes or not parts:
        parts.append(f"{minutes}m")
    return "".join(parts[:2])


def main():
    codex = Path.home() / ".local" / "bin" / "codex"
    if not codex.is_file():
        raise RuntimeError(f"binário do Codex não encontrado em {codex}")

    proc = subprocess.Popen(
        [str(codex), "app-server", "--listen", "stdio://"],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        bufsize=1,
    )

    try:
        send(proc, {
            "id": 1,
            "method": "initialize",
            "params": {
                "clientInfo": {
                    "name": "codex-usage-gnome",
                    "title": "Codex Usage GNOME",
                    "version": "1.0.0",
                },
                "capabilities": {"experimentalApi": True},
            },
        })
        read_response(proc, 1)
        send(proc, {"method": "initialized", "params": {}})

        send(proc, {
            "id": 2,
            "method": "account/rateLimits/read",
            "params": {},
        })
        result = read_response(proc, 2)
        five, week = find_windows(result)

        if not five or not week:
            raise RuntimeError("não foi possível localizar as janelas de 5h e semanal")

        output = {
            "five": {
                "percent": round(five["remaining"]),
                "reset": compact_duration(five["resets_at"]),
            },
            "week": {
                "percent": round(week["remaining"]),
                "reset": compact_duration(week["resets_at"]),
            },
        }
        print(json.dumps(output, ensure_ascii=False))
    finally:
        try:
            proc.terminate()
            proc.wait(timeout=2)
        except Exception:
            try:
                proc.kill()
            except Exception:
                pass


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(str(exc), file=sys.stderr)
        sys.exit(1)
