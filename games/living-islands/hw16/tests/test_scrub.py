import os, sys, tempfile, subprocess, json
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "hw16_pkg"))
import train_check as t
ok = 0
def chk(c, m):
    global ok
    assert c, m; ok += 1
chk("<private>" in t.scrub(os.path.expanduser("~") + "/x"), "home scrubbed")
chk("<ip>" in t.scrub("at 192.168.1.5 now"), "ip scrubbed")
chk("<mac>" in t.scrub("aa:bb:cc:dd:ee:ff"), "mac scrubbed")
chk("ABC123" not in t.scrub("Serial Number: ABC123"), "serial scrubbed")
d = tempfile.mkdtemp(); o = os.path.join(d, "o")
r = subprocess.run([sys.executable, os.path.join(os.path.dirname(__file__), "..", "hw16_pkg", "train_check.py"), "--out", o], capture_output=True, text=True)
chk(r.returncode == 0, "run ok")
chk(os.path.exists(os.path.join(o, "HW16_send_back.zip")), "zip written")
r2 = subprocess.run([sys.executable, os.path.join(os.path.dirname(__file__), "..", "hw16_pkg", "train_check.py"), "--out", o], capture_output=True, text=True)
chk(r2.returncode == 2, "refuses existing folder")
txt = open(os.path.join(o, "results.json")).read()
chk(os.path.expanduser("~") not in txt, "no home path in results")
print("PASS %d/%d" % (ok, ok))
