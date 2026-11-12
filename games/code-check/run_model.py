#!/usr/bin/env python3
"""Run ONE model through the practice set and save its raw replies to JSONL.  Python 3, standard library only.

Talks to any server with an OpenAI-style /v1/chat/completions endpoint (Ollama, llama.cpp server, LM Studio, ...).

  python3 run_model.py --url http://localhost:11434/v1/chat/completions --model qwen2.5-coder:14b --out replies_14b.jsonl
  python3 score.py replies_14b.jsonl

It sends ONLY the context and snippet of each exercise (see PROMPT.md), never the answer key.
Re-running with the same --out skips ids already saved, so a stopped run can be resumed.
"""
import argparse, json, os, re, sys, time, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))


def template():
    txt = open(os.path.join(HERE, "PROMPT.md"), encoding="utf-8").read()
    m = re.search(r"---PROMPT---\n(.*?)\n---END---", txt, re.S)
    if not m: sys.exit("PROMPT.md is missing its ---PROMPT--- / ---END--- markers")
    return m.group(1)


def ask(url, model, prompt, timeout, max_tokens, key):
    body = json.dumps({"model": model, "messages": [{"role": "user", "content": prompt}], "temperature": 0, "max_tokens": max_tokens, "stream": False}).encode()
    req = urllib.request.Request(url, body, {"Content-Type": "application/json", "Authorization": "Bearer " + (key or "none")})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        d = json.load(r)
    return d["choices"][0]["message"].get("content") or ""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default="http://localhost:11434/v1/chat/completions")
    ap.add_argument("--model", required=True)
    ap.add_argument("--out", required=True, help="replies JSONL to append to")
    ap.add_argument("--exercises", default=os.path.join(HERE, "exercises.json"))
    ap.add_argument("--timeout", type=int, default=180, help="seconds per exercise; a timed-out exercise is saved with an empty reply (counts as broken)")
    ap.add_argument("--max-tokens", type=int, default=1500)
    ap.add_argument("--api-key", default=os.environ.get("OPENAI_API_KEY", ""))
    ap.add_argument("--limit", type=int, default=0, help="only the first N exercises (for a quick try)")
    a = ap.parse_args()
    tpl, ex = template(), json.load(open(a.exercises, encoding="utf-8"))
    done = set()
    if os.path.exists(a.out):
        for line in open(a.out, encoding="utf-8"):
            try: done.add(json.loads(line)["id"])
            except Exception: pass
    todo = [e for e in ex if e["id"] not in done][: a.limit or None]
    with open(a.out, "a", encoding="utf-8") as f:
        for i, e in enumerate(todo, 1):
            prompt = tpl.replace("{context}", e["context"]).replace("{snippet}", e["snippet"])   # nothing else leaves this script
            t0, err, reply = time.time(), "", ""
            try: reply = ask(a.url, a.model, prompt, a.timeout, a.max_tokens, a.api_key)
            except Exception as x: err = type(x).__name__ + ": " + str(x)[:120]
            f.write(json.dumps({"id": e["id"], "model": a.model, "reply": reply, "seconds": round(time.time() - t0, 1), "error": err}) + "\n"); f.flush()
            print("%d/%d %s %.0fs %s" % (i, len(todo), e["id"], time.time() - t0, err or ("%d chars" % len(reply))))


if __name__ == "__main__":
    main()
