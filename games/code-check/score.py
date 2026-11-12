#!/usr/bin/env python3
"""Score a model's replies against the code-check answer key.  Python 3, standard library only.

  python3 score.py replies.jsonl            score one model
  python3 score.py replies.jsonl --items    also list what happened on every exercise
  python3 score.py --self-test              check the scorer itself (no model needed)

replies.jsonl: one line per exercise, {"id": "e07", "reply": "<the model's raw text>"}.
Extra fields (model name, seconds) are ignored.  If an id appears twice the LAST line counts.

Verdicts, per exercise:
  correct_clean   clean code, model said no bug
  found           real bug, model named the right function AND described it in matching words
  false_alarm     clean code, model said there is a bug
  wrong_find      real bug in the code, model said bug but pointed at the wrong function or a
                  different problem (counts against precision AND as a miss for recall)
  missed          real bug, model said no bug
  broken          no usable JSON with a "bug" field, or no reply at all for that id

"Matching words" is APPROXIMATE: keyword overlap between the model's explanation and the answer
key (see matches_what).  It is generous with paraphrases and cannot judge reasoning, so spot-check
a sample of 'found' and 'wrong_find' by eye before trusting a small difference between two models.
"""
import argparse, ast, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
STOP = set("""a an the and or of to in on at is are was be been it its this that these those with without as by for from
when if then than so not no can could would should may might will shall does do did has have had into out over under
one two any each every all some there their they them which what where who how why also only just very more most less
but because while after before again still same such being used use using code line function value values returns
return called call calls""".split())


# ---------- reading the model's reply, leniently ----------
def _strip_noise(text):
    text = re.sub(r"<think>.*?</think>", " ", text, flags=re.S | re.I)   # reasoning blocks
    text = re.sub(r"^.*?</think>", " ", text, flags=re.S | re.I)           # a closing tag with no opening one
    return text


def _objects(text):
    """Every top-level {...} span in text, respecting quoted strings."""
    out, depth, start, in_str, quote, esc = [], 0, None, False, "", False
    for i, ch in enumerate(text):
        if in_str:
            if esc: esc = False
            elif ch == "\\": esc = True
            elif ch == quote: in_str = False
            continue
        if ch in "\"'" and depth > 0:
            in_str, quote = True, ch
        elif ch == "{":
            if depth == 0: start = i
            depth += 1
        elif ch == "}" and depth > 0:
            depth -= 1
            if depth == 0 and start is not None:
                out.append(text[start:i + 1]); start = None
    return out


def _load_obj(s):
    for attempt in (s, re.sub(r",\s*([}\]])", r"\1", s)):           # also drop trailing commas
        try:
            v = json.loads(attempt)
            if isinstance(v, dict): return v
        except Exception:
            pass
    try:                                                            # python-style dicts: single quotes, True/False
        v = ast.literal_eval(re.sub(r"\btrue\b", "True", re.sub(r"\bfalse\b", "False", re.sub(r"\bnull\b", "None", s))))
        if isinstance(v, dict): return v
    except Exception:
        pass
    return None


def _to_bool(v):
    if isinstance(v, bool): return v
    if isinstance(v, (int, float)) and v in (0, 1): return bool(v)
    if isinstance(v, str):
        s = v.strip().lower()
        if s in ("true", "yes", "y", "1"): return True
        if s in ("false", "no", "n", "0", "none", "no bug"): return False
    return None


def parse_reply(raw):
    """-> dict with at least 'bug' (bool), or None if the reply is broken. If several JSON objects, the last one with a 'bug' field wins."""
    if not isinstance(raw, str) or not raw.strip(): return None
    text = _strip_noise(raw).replace("```json", "```")
    cands = []
    for chunk in [text] + [c for c in text.split("```")]:
        for o in _objects(chunk):
            d = _load_obj(o)
            if d is not None:
                d = {str(k).strip().lower(): v for k, v in d.items()}
                if "bug" in d and _to_bool(d["bug"]) is not None:
                    d["bug"] = _to_bool(d["bug"]); cands.append(d)
    return cands[-1] if cands else None


# ---------- matching the model's claim to the answer key (approximate) ----------
def _stem(w):
    for suf in ("ing", "ed", "es", "s"):
        if w.endswith(suf) and len(w) - len(suf) >= 4: return w[: -len(suf)]
    return w


def words(text):
    text = re.sub(r"([a-z])([A-Z])", r"\1 \2", str(text or ""))        # camelCase -> camel Case
    return {_stem(w) for w in re.findall(r"[a-z][a-z0-9]{2,}", text.lower()) if w not in STOP}


def _fn_norm(s):
    s = re.sub(r"\(.*", "", str(s or "")).strip().lower()
    return re.split(r"[.\s:]", s)[-1] if s else ""


def matches_function(reply, ans):
    names = [ans["function"]] + list(ans.get("function_also", []))
    given = _fn_norm(reply.get("function"))
    if given: return any(given == n.lower() or n.lower() in str(reply.get("function")).lower() for n in names)
    blob = (str(reply.get("what", "")) + " " + str(reply.get("trigger", ""))).lower()   # empty function field: look in the text
    return any(re.search(r"\b" + re.escape(n.lower()) + r"\b", blob) for n in names)


def matches_what(reply, ans):
    """True if the model's explanation shares enough content words with the key's `what` (plus code words from `line_hint`).
    Rule: at least 3 shared words, or a quarter of the key's words.  This is a keyword test, not understanding."""
    key = words(ans.get("what")) | words(ans.get("line_hint"))
    if not key: return False
    said = words(reply.get("what")) | words(reply.get("trigger")) | words(reply.get("fix"))
    shared = len(key & said)
    return shared >= 3 or shared / len(key) >= 0.25


def judge(ex, reply):
    a = ex["answer"]
    if reply is None: return "broken"
    if not a["bug"]: return "false_alarm" if reply["bug"] else "correct_clean"
    if not reply["bug"]: return "missed"
    return "found" if matches_function(reply, a) and matches_what(reply, a) else "wrong_find"


# ---------- scoring ----------
def load_exercises(path):
    with open(path, encoding="utf-8") as f: return json.load(f)


def load_replies(path):
    out = {}
    with open(path, encoding="utf-8") as f:
        for n, line in enumerate(f, 1):
            line = line.strip()
            if not line: continue
            try:
                d = json.loads(line); out[str(d["id"])] = d.get("reply")
            except Exception:
                print("note: replies line %d is not valid {id, reply} JSON; ignored" % n, file=sys.stderr)
    return out


def score(exercises, replies):
    rows = []
    for ex in exercises:
        raw = replies.get(ex["id"])
        rows.append({"id": ex["id"], "level": ex["level"], "source": ex["source"], "has_reply": ex["id"] in replies,
                     "verdict": judge(ex, parse_reply(raw))})
    return rows


def _rate(n, d): return None if not d else n / d


def summarise(rows):
    c = lambda v: sum(1 for r in rows if r["verdict"] == v)
    n = len(rows); nb = sum(1 for r in rows if r["source"] != "clean"); nc = n - nb
    found, wf, missed = c("found"), c("wrong_find"), c("missed")
    fa, cc, broken = c("false_alarm"), c("correct_clean"), c("broken")
    clean_valid = sum(1 for r in rows if r["source"] == "clean" and r["verdict"] != "broken")
    claims = found + wf + fa
    s = {"n": n, "bug_exercises": nb, "clean_exercises": nc, "found": found, "wrong_find": wf, "missed": missed,
         "false_alarm": fa, "correct_clean": cc, "broken": broken,
         "no_reply": sum(1 for r in rows if not r["has_reply"]),
         "precision": _rate(found, claims),                       # of all "bug" claims, how many were right
         "recall": _rate(found, nb),                              # of the real bugs, how many were found (broken counts as not found)
         "false_alarm_rate": _rate(fa, clean_valid),              # of clean snippets that got a usable reply, how many were called buggy
         "broken_rate": _rate(broken, n),
         "accuracy": _rate(found + cc, n)}
    s["balanced"] = None if not (nb and nc) else (found / nb + (cc / nc)) / 2   # half recall, half "did not cry wolf"; broken counts against both
    return s


def pct(x): return "  n/a" if x is None else "%4.0f%%" % (100 * x)


def print_table(rows, title="", out=sys.stdout):
    P = lambda *a: print(*a, file=out)
    s = summarise(rows)
    if title: P(title)
    P("exercises %d  (bugs %d, clean %d)   replies missing: %d" % (s["n"], s["bug_exercises"], s["clean_exercises"], s["no_reply"]))
    P("")
    P("  precision          %s   of the bugs it claimed, how many were real and described right" % pct(s["precision"]))
    P("  recall             %s   of the real bugs, how many it found (broken replies count as not found)" % pct(s["recall"]))
    P("  false alarm rate   %s   of the clean snippets, how many it called buggy   <- aim under 20%% first" % pct(s["false_alarm_rate"]))
    P("  broken rate        %s   no usable JSON: %d of %d replies" % (pct(s["broken_rate"]), s["broken"], s["n"]))
    P("  balanced score     %s   half recall, half 'did not cry wolf'" % pct(s["balanced"]))
    P("")
    P("  found %d | wrong find %d | missed %d | false alarm %d | correct no-bug %d | broken %d" % (s["found"], s["wrong_find"], s["missed"], s["false_alarm"], s["correct_clean"], s["broken"]))
    P("")
    P("  %-14s %4s %6s %9s %7s %7s" % ("", "n", "right", "recall", "false", "broken"))
    groups = [("level " + str(l), [r for r in rows if r["level"] == l]) for l in sorted({r["level"] for r in rows})]
    groups += [("real bugs", [r for r in rows if r["source"] == "real"]), ("planted bugs", [r for r in rows if r["source"] == "planted"]), ("clean", [r for r in rows if r["source"] == "clean"])]
    for name, g in groups:
        if not g: continue
        t = summarise(g)
        P("  %-14s %4d %6d %9s %7s %7s" % (name, t["n"], t["found"] + t["correct_clean"], pct(t["recall"]) if t["bug_exercises"] else "    -",
                                          pct(t["false_alarm_rate"]) if t["clean_exercises"] else "    -", pct(t["broken_rate"])))
    P("")
    P("  ('right' = bugs found + clean snippets correctly passed. The word matching is approximate: spot-check some 'found' and 'wrong find'.)")


# ---------- self test ----------
def _fake_key(ex):
    a = ex["answer"]
    if not a["bug"]: return json.dumps({"bug": False})
    return "```json\n" + json.dumps({"bug": True, "function": a["function"], "what": a["what"], "trigger": a["trigger"], "severity": a["severity"], "fix": a["fix"]}) + "\n```"


def _always_bug(ex):
    return json.dumps({"bug": True, "function": "someFunction", "what": "x might be undefined", "trigger": "called with bad input", "severity": "crash", "fix": "add a check"})


def _always_none(ex): return '{"bug": false}'


def _vague_right_function(ex):   # points at the right function but gives a generic guess: should NOT count as found
    if not ex["answer"]["bug"]: return '{"bug": false}'
    return json.dumps({"bug": True, "function": ex["answer"]["function"], "what": "value might be undefined or null", "trigger": "bad input", "severity": "crash", "fix": "add a null check"})


def self_test():
    ex = load_exercises(os.path.join(HERE, "exercises.json"))
    ok = True
    def check(label, cond, detail=""):
        nonlocal ok
        ok = ok and cond
        print("  [%s] %s %s" % ("ok" if cond else "FAIL", label, detail))
    print("Self-test: %d exercises" % len(ex))
    for fn, label in ((_fake_key, "answer key against itself"), (_always_bug, 'fake "always says bug"'), (_always_none, 'fake "always says no bug" (like the 14B pass 1)'), (_vague_right_function, "fake: right function, vague guess")):
        rows = score(ex, {e["id"]: fn(e) for e in ex})
        print_table(rows, "\n=== " + label + " ===")
        globals().setdefault("_res", {})[label] = summarise(rows)
    R = globals()["_res"]
    k, ab, an, vg = R["answer key against itself"], R['fake "always says bug"'], R['fake "always says no bug" (like the 14B pass 1)'], R["fake: right function, vague guess"]
    print("\nChecks:")
    check("answer key scores 100% (found all bugs, passed all clean, 0 false alarms, 0 broken)", k["found"] == k["bug_exercises"] and k["correct_clean"] == k["clean_exercises"] and k["broken"] == 0 and k["balanced"] == 1.0)
    check('"always says bug" scores badly (false alarm rate 100%, precision under 50%)', ab["false_alarm_rate"] == 1.0 and ab["precision"] < 0.5 and ab["balanced"] <= 0.5)
    check('"always says no bug" scores badly (recall 0, balanced 50%)', an["recall"] == 0 and an["balanced"] == 0.5)
    check("right function but vague guess is not credited as found (at most 10% found)", vg["found"] <= 0.1 * vg["bug_exercises"], "(found %d of %d)" % (vg["found"], vg["bug_exercises"]))
    # lenient parsing
    samples = [('Here you go: {"bug": false}', False), ("```json\n{'bug': True, 'function': 'f', 'what': 'w',}\n```", True),
               ('<think>maybe {"bug": true}</think>{"bug": "no"}', False), ('{"bug": "yes", "what": "x {y} z"}', True), ('thinking...\n{"bug":false}\nactually {"bug": true, "function":"g"}', True)]
    check("lenient parser reads fenced, single-quoted, think-tagged and chatty replies", all((parse_reply(t) or {}).get("bug") is want for t, want in samples))
    check("garbage and empty replies are broken", parse_reply("I think there are no bugs.") is None and parse_reply("") is None and parse_reply('{"found": 1}') is None)
    byfn = {e["answer"].get("function"): e for e in ex if e["answer"]["bug"]}
    e = byfn.get("resolveRequest")
    if e:
        good = {"bug": True, "function": "resolveRequest()", "what": "indexOf gives -1 when the request is already gone, so splice(-1,1) removes the last request", "trigger": "tap a stale button"}
        bad = {"bug": True, "function": "resolveRequest", "what": "r might be undefined", "trigger": "call with undefined"}
        check("paraphrase of a real bug is found; a vague guess at the same function is not", judge(e, good) == "found" and judge(e, bad) == "wrong_find")
    print("\nSELF-TEST " + ("PASSED" if ok else "FAILED"))
    return 0 if ok else 1


def main():
    ap = argparse.ArgumentParser(description="Score model replies against the code-check answer key.")
    ap.add_argument("replies", nargs="?", help="JSONL file of {id, reply}")
    ap.add_argument("--exercises", default=os.path.join(HERE, "exercises.json"))
    ap.add_argument("--items", action="store_true", help="list the verdict for every exercise")
    ap.add_argument("--json", metavar="FILE", help="also save the summary and per-exercise verdicts as JSON")
    ap.add_argument("--self-test", action="store_true")
    a = ap.parse_args()
    if a.self_test: sys.exit(self_test())
    if not a.replies: ap.error("give a replies.jsonl file, or --self-test")
    ex = load_exercises(a.exercises)
    rows = score(ex, load_replies(a.replies))
    print_table(rows, "Scores for " + a.replies)
    if a.items:
        print("")
        for r in rows: print("  %s  L%d  %-8s %s" % (r["id"], r["level"], r["source"], r["verdict"]))
    if a.json:
        with open(a.json, "w") as f: json.dump({"summary": summarise(rows), "items": rows}, f, indent=1)


if __name__ == "__main__":
    main()
