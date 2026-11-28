# HW-16 "what can train here": a READ-ONLY inventory. Standard library only.
# It reads facts about this machine, runs two tiny speed tests (a few seconds each)
# and writes three files into ONE new folder. It downloads nothing, installs nothing,
# deletes nothing, uses no network, and changes nothing outside the new folder.
# Exit codes: 0 done; 2 STOP (folder exists, or disk floor).
import argparse, getpass, json, os, platform, re, shutil, socket, subprocess, sys, time, zipfile
from importlib import util as iu, metadata as im

DISK_FLOOR_GB = 30
TOOLS = ["python3", "pip3", "git", "brew", "conda", "ollama", "llama-cli", "llama-server", "rocminfo",
         "nvidia-smi", "clang", "cmake", "node", "blender"]
PKGS = ["numpy", "torch", "torchvision", "mlx", "tensorflow", "jax", "transformers", "peft", "accelerate",
        "safetensors", "sentencepiece", "tokenizers", "onnxruntime", "llama_cpp", "pyopencl", "tinygrad", "datasets"]

def scrub_words():
    w = set()
    for f in (getpass.getuser, socket.gethostname):
        try:
            v = f()
            if v and len(v) > 2: w.add(v); w.add(v.split(".")[0])
        except Exception: pass
    w.add(os.path.expanduser("~"))
    return sorted((x for x in w if x and len(x) > 2), key=len, reverse=True)

WORDS = scrub_words()

def scrub(s):
    if not isinstance(s, str): return s
    for w in WORDS: s = s.replace(w, "<private>")
    s = re.sub(r"\b([0-9a-fA-F]{2}[:-]){5}[0-9a-fA-F]{2}\b", "<mac>", s)
    s = re.sub(r"\b(\d{1,3}\.){3}\d{1,3}\b", "<ip>", s)
    s = re.sub(r"(?i)(serial|uuid|udid)[^\n,\"]*", r"\1 <removed>", s)
    return s

def run(cmd, timeout=20):
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        return scrub((r.stdout or "") + (r.stderr or "")).strip()
    except Exception as e:
        return "unavailable: " + type(e).__name__

def machine():
    d = {"system": platform.system(), "release": platform.release(), "arch": platform.machine(),
         "python": platform.python_version(), "cpu_count": os.cpu_count()}
    if d["system"] == "Darwin":
        d["cpu"] = run(["sysctl", "-n", "machdep.cpu.brand_string"])
        try: d["ram_gb"] = round(int(run(["sysctl", "-n", "hw.memsize"])) / 2**30, 1)
        except Exception: pass
        hw = run(["system_profiler", "SPHardwareDataType"], 30)
        d["model"] = " ".join(l.split(":", 1)[1].strip() for l in hw.splitlines() if "Model Name" in l or "Model Identifier" in l)
        g = run(["system_profiler", "SPDisplaysDataType"], 30)
        d["gpus"] = [scrub(l.strip()) for l in g.splitlines() if re.search(r"Chipset Model|VRAM|Metal|Cores|Vendor", l)]
    elif d["system"] == "Linux":
        d["cpu"] = next((l.split(":", 1)[1].strip() for l in open("/proc/cpuinfo") if l.startswith("model name")), "?") if os.path.exists("/proc/cpuinfo") else "?"
        try: d["ram_gb"] = round(int([l for l in open("/proc/meminfo") if l.startswith("MemTotal")][0].split()[1]) / 2**20, 1)
        except Exception: pass
        d["gpus"] = [l for l in run(["sh", "-c", "lspci 2>/dev/null | grep -i -E 'vga|3d|display'"]).splitlines()]
    return d

def tools():
    out = {}
    for t in TOOLS:
        p = shutil.which(t)
        if not p: out[t] = None; continue
        ver = run([p, "--version"], 10).splitlines()
        out[t] = (ver[0][:100] if ver else "found")
    return out

def pkgs():
    out = {}
    for p in PKGS:
        if iu.find_spec(p) is None: out[p] = None; continue
        try: out[p] = im.version(p.replace("_", "-"))
        except Exception:
            try: out[p] = im.version(p)
            except Exception: out[p] = "found"
    return out

GPU_TEST = r'''
import time, json
r = {}
try:
    import torch
    r["torch"] = torch.__version__
    devs = []
    if torch.cuda.is_available(): devs.append("cuda")
    if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available(): devs.append("mps")
    r["hip"] = getattr(torch.version, "hip", None)
    r["devices"] = devs
    for d in ["cpu"] + devs:
        n = 2048 if d != "cpu" else 1024
        a = torch.randn(n, n, device=d); b = torch.randn(n, n, device=d)
        for _ in range(2): (a @ b)
        if d == "cuda": torch.cuda.synchronize()
        if d == "mps": torch.mps.synchronize()
        t = time.time(); k = 0
        while time.time() - t < 3: (a @ b); k += 1
        if d == "cuda": torch.cuda.synchronize()
        if d == "mps": torch.mps.synchronize()
        dt = time.time() - t
        r["fp32_gflops_" + d] = round(2 * n**3 * k / dt / 1e9, 1)
except Exception as e:
    r["error"] = type(e).__name__
print(json.dumps(r))
'''
CPU_TEST = r'''
import time, json
try:
    import numpy as np
    n = 1024; a = np.random.rand(n, n).astype("float32"); b = np.random.rand(n, n).astype("float32"); a @ b
    t = time.time(); k = 0
    while time.time() - t < 3: a @ b; k += 1
    print(json.dumps({"numpy_fp32_gflops_cpu": round(2 * n**3 * k / (time.time() - t) / 1e9, 1)}))
except Exception as e:
    print(json.dumps({"error": type(e).__name__}))
'''

def speed(has):
    out = {}
    for name, code, need in (("cpu_numpy", CPU_TEST, "numpy"), ("torch", GPU_TEST, "torch")):
        if not has.get(need): out[name] = "not installed"; continue
        txt = run([sys.executable, "-I", "-c", code], 90)
        try: out[name] = json.loads(txt.splitlines()[-1])
        except Exception: out[name] = "no result: " + txt[-200:]
    return out

def models_on_disk():
    home = os.path.expanduser("~"); out = {}
    for label, rel in (("ollama", ".ollama/models/manifests"), ("huggingface", ".cache/huggingface/hub")):
        p = os.path.join(home, rel)
        if not os.path.isdir(p): out[label] = None; continue
        names = []
        for root, dirs, files in os.walk(p):
            if label == "huggingface":
                names = [d for d in os.listdir(p) if d.startswith("models--")]; break
            names += [os.path.relpath(os.path.join(root, f), p) for f in files]
            if len(names) > 60: break
        out[label] = sorted(scrub(n)[:90] for n in names)[:60]
    return out

def disk(path):
    u = shutil.disk_usage(path); return round(u.free / 2**30, 1)

def verdict(r):
    m, p, s = r["machine"], r["packages"], r["speed"]
    gpu = []
    t = s.get("torch") if isinstance(s.get("torch"), dict) else {}
    if t.get("devices"): gpu = t["devices"]
    rungs = []
    ram = m.get("ram_gb") or 0
    rungs.append(("Rung 1: tiny model from scratch (1 to 10 M)", "POSSIBLE on the CPU" + (" and on " + "/".join(gpu) if gpu else "") if (p.get("numpy") or p.get("torch")) else "NEEDS Harry: no numpy or torch is installed (an install would be a yes-or-no for Harry)"))
    need = []
    if not (p.get("torch") and gpu): need.append("torch with a working GPU")
    if not p.get("transformers"): need.append("transformers")
    if not p.get("peft"): need.append("peft")
    rungs.append(("Rung 2: small model with a LoRA add-on (about 0.5 B)", "POSSIBLE" if not need else "NOT YET, needs " + ", ".join(need) + " (installs and a model download: Harry's yes)"))
    rungs.append(("Rung 3: 1 to 3 B", "not considered until rung 2 shows a gain"))
    return rungs

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--out", required=True); a = ap.parse_args()
    out = os.path.abspath(a.out)
    if os.path.exists(out): print("STOP: output folder exists. Use a new name."); return 2
    parent = os.path.dirname(out)
    if disk(parent) < DISK_FLOOR_GB: print("STOP: disk below %d GB" % DISK_FLOOR_GB); return 2
    os.makedirs(out); t0 = time.time()
    r = {"order": "HW-16", "machine": machine(), "tools": tools(), "packages": pkgs()}
    r["speed"] = speed(r["packages"]); r["models_on_disk"] = models_on_disk(); r["disk_free_gb"] = disk(out)
    r["verdict"] = verdict(r); r["seconds"] = round(time.time() - t0, 1)
    json.dump(r, open(os.path.join(out, "results.json"), "w"), indent=1)
    L = ["# HW-16 what can train here", "", "Machine: " + json.dumps(r["machine"]), "", "## Tools found"]
    L += ["- %s: %s" % (k, v or "not found") for k, v in r["tools"].items()]
    L += ["", "## Python packages"] + ["- %s: %s" % (k, v or "not installed") for k, v in r["packages"].items()]
    L += ["", "## Speed (3 s test each)", json.dumps(r["speed"], indent=1), "", "## Models already on disk (names only)", json.dumps(r["models_on_disk"], indent=1)]
    L += ["", "## Rungs"] + ["- %s: %s" % x for x in r["verdict"]] + ["", "Disk free after: %s GB. Run took %s s." % (r["disk_free_gb"], r["seconds"])]
    open(os.path.join(out, "REPORT.md"), "w").write("\n".join(L) + "\n")
    with zipfile.ZipFile(os.path.join(out, "HW16_send_back.zip"), "w") as z:
        for f in ("results.json", "REPORT.md"): z.write(os.path.join(out, f), f)
    print("DONE. Send back", os.path.join(out, "HW16_send_back.zip")); return 0

if __name__ == "__main__":
    sys.exit(main())
