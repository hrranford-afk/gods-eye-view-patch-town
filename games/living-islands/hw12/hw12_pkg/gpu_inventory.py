#!/usr/bin/env python3
"""HW-12 step 1: read-only facts about the Mac, the graphics card, the Thunderbolt link, OpenCL and Blender.
  python3 gpu_inventory.py --out DIR [--blender PATH]
Runs only: system_profiler SPDisplaysDataType, system_profiler SPThunderboltDataType, ioreg (read-only, GPU/PCI nodes), sysctl, sw_vers,
uname, and `blender --version` if Blender is found. Installs, downloads, deletes and changes nothing. Writes DIR/inventory.json.
User names, home folders, serial numbers and UUIDs are removed. Every command has a 60 second cap and any failure is recorded as text."""
import argparse
import ctypes
import json
import os
import re
import shutil
import subprocess
import sys

sys.dont_write_bytecode = True
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import hw12_common as H  # noqa: E402

OPENCL_FRAMEWORK = '/System/Library/Frameworks/OpenCL.framework/OpenCL'
BLENDER_GUESSES = ['/Applications/Blender.app/Contents/MacOS/Blender', '/Applications/Blender/Blender.app/Contents/MacOS/Blender']

# fixed list of commands; nothing here writes anything
COMMANDS = {
    'displays': ['system_profiler', 'SPDisplaysDataType'],
    'thunderbolt': ['system_profiler', 'SPThunderboltDataType'],
    'ioreg_pci': ['ioreg', '-r', '-c', 'IOPCIDevice', '-l', '-w0'],
    'sw_vers': ['sw_vers'],
    'sysctl': ['sysctl', 'hw.model', 'hw.memsize', 'hw.ncpu', 'hw.physicalcpu', 'machdep.cpu.brand_string', 'kern.osversion', 'kern.osrelease'],
    'uname': ['uname', '-m'],
}


def run_cmd(argv, timeout=60):
    """Run a read-only command; return (rc, text). Never raises."""
    try:
        p = subprocess.run(argv, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=timeout)
        return p.returncode, p.stdout.decode('utf-8', 'replace')
    except FileNotFoundError:
        return 127, 'command not found: %s' % argv[0]
    except subprocess.TimeoutExpired:
        return 124, 'timed out after %ds: %s' % (timeout, ' '.join(argv))
    except Exception as e:
        return 1, '%s: %s' % (type(e).__name__, e)


# ---------------------------------------------------------------- parsers (pure functions, unit-tested with fake text)
def parse_displays(text):
    """GPU cards from `system_profiler SPDisplaysDataType`: list of {name, bus, vram, vendor, cores, link, metal, other}."""
    cards, cur = [], None
    for raw in text.splitlines():
        line = raw.rstrip()
        m = re.match(r'^    (\S.*):\s*$', line)       # 4-space indent = a card heading
        if m and not line.startswith('     '):
            cur = {'name': m.group(1).strip(), 'lines': []}
            cards.append(cur)
            continue
        if cur is not None and line.startswith('      ') and ':' in line:
            k, _, v = line.strip().partition(':')
            cur['lines'].append((k.strip(), v.strip()))
    out = []
    for c in cards:
        d = {'name': c['name']}
        for k, v in c['lines']:
            kl = k.lower()
            if kl in ('chipset model',):
                d['chipset'] = v
            elif kl in ('type',):
                d['type'] = v
            elif kl.startswith('bus'):
                d['bus'] = v
            elif kl.startswith('vram') or 'memory' in kl and 'vram' not in d:
                d['vram'] = v
            elif kl == 'vendor':
                d['vendor'] = v
            elif 'cores' in kl:
                d['cores'] = v
            elif kl.startswith('pcie lane') or 'link width' in kl or 'lane' in kl:
                d['link'] = '%s: %s' % (k, v)
            elif kl.startswith('metal'):
                d['metal'] = v
            elif 'egpu' in kl or 'external' in kl or 'removable' in kl:
                d['external'] = v
        out.append(d)
    return out


def parse_thunderbolt(text):
    """Lines that describe link speed, width, status or the connected device."""
    keep = []
    for raw in text.splitlines():
        s = raw.strip()
        if re.search(r'(?i)\b(speed|link|width|status|lanes?|receptacle|device name|vendor name|port)\b', s) and ':' in s:
            keep.append(s)
    return keep


def parse_ioreg_gpu_nodes(text):
    """Find PCI nodes belonging to AMD (vendor-id 0x1002) with a display class; return their link-related properties.
    ioreg prints each node as '+-o name  <class IOPCIDevice ...>' followed by '| "key" = value' lines."""
    blocks = re.split(r'\n(?=\s*[+|\-\s]*o\s)', text)
    nodes = []
    for b in blocks:
        head = b.strip().split('\n', 1)[0]
        if not b.strip():
            continue
        is_amd = re.search(r'"vendor-id"\s*=\s*<0*210', b) or re.search(r'"vendor-id"\s*=\s*<02100000>', b) or 'AMD' in head or 'Radeon' in b[:3000]
        is_display = re.search(r'"class-code"\s*=\s*<0*0*03', b) or 'display' in b.lower()[:2000] or 'Radeon' in b[:3000]
        if not (is_amd and is_display):
            continue
        props = {}
        for m in re.finditer(r'"([^"]*(?:[Ll]ink|[Ss]peed|[Ww]idth|[Ll]ane|device-id|vendor-id|model|built-in|IOName|IOPCIExpress)[^"]*)"\s*=\s*([^\n]+)', b):
            k = m.group(1)
            if k not in props and len(props) < 40:
                props[k] = m.group(2).strip()[:200]
        nodes.append({'node': head[:120], 'props': props})
    return nodes


def decode_link_from_props(props):
    """Pick IOPCIExpressLinkStatus out of ioreg properties and decode it (speed in GT/s, width in lanes)."""
    for k, v in props.items():
        if 'LinkStatus' in k:
            m = re.search(r'(0x[0-9a-fA-F]+|\d+)', v)
            if m:
                return H.decode_pcie_link_status(int(m.group(1), 0))
    return None


def parse_kv_lines(text):
    out = {}
    for line in text.splitlines():
        if ':' in line:
            k, _, v = line.partition(':')
            out[k.strip()] = v.strip()
        elif '=' in line:
            k, _, v = line.partition('=')
            out[k.strip()] = v.strip()
    return out


def parse_blender_version(text):
    first = text.strip().split('\n')[0] if text.strip() else ''
    m = re.search(r'Blender\s+(\d+\.\d+(?:\.\d+)?)', text)
    return {'version_line': first, 'version': m.group(1) if m else None}


def find_blender(explicit=None, which=shutil.which, exists=os.path.exists):
    if explicit:
        return explicit
    w = which('blender')
    if w:
        return w
    for g in BLENDER_GUESSES:
        if exists(g):
            return g
    return None


def opencl_status(exists=os.path.exists, loader=ctypes.CDLL, path=OPENCL_FRAMEWORK):
    """On macOS 11 and later the framework file is inside the system cache and may not exist on disk even though it loads, so loading is
    always tried, whatever `exists` says."""
    d = {'path': path, 'exists': bool(exists(path)), 'loadable': False}
    tries = [path, 'OpenCL.framework/OpenCL']
    errors = []
    for p in tries:
        try:
            loader(p)
            d['loadable'] = True
            d['loaded_as'] = p
            break
        except OSError as e:
            errors.append('%s: %s' % (p, e))
    if not d['loadable']:
        d['error'] = ' | '.join(errors)
    elif not d['exists']:
        d['note'] = 'file not visible on disk but it loads (normal on macOS 11 and later: the system cache holds it)'
    return d


def collect(runner=run_cmd, blender=None, opencl=None, which=shutil.which, exists=os.path.exists):
    """Gather everything. `runner`, `which`, `exists` and `opencl` can be replaced by fakes in tests."""
    raw = {}
    for k, argv in COMMANDS.items():
        rc, txt = runner(argv)
        raw[k] = (rc, txt)
    inv = {'schema': 1, 'commands': {k: {'rc': rc} for k, (rc, _) in raw.items()}}
    sysv = parse_kv_lines(raw['sw_vers'][1]) if raw['sw_vers'][0] == 0 else {}
    sc = parse_kv_lines(raw['sysctl'][1]) if raw['sysctl'][0] == 0 else {}
    try:
        mem = int(sc.get('hw.memsize', '0'))
    except ValueError:
        mem = 0
    inv['host'] = {'macos': ' '.join(x for x in (sysv.get('ProductName'), sysv.get('ProductVersion'), sysv.get('BuildVersion')) if x) or None,
                   'model': sc.get('hw.model'), 'cpu': sc.get('machdep.cpu.brand_string'), 'cores': sc.get('hw.ncpu'),
                   'memsize': mem, 'arch': raw['uname'][1].strip() if raw['uname'][0] == 0 else None,
                   'kernel': sc.get('kern.osrelease')}
    cards = parse_displays(raw['displays'][1]) if raw['displays'][0] == 0 else []
    nodes = parse_ioreg_gpu_nodes(raw['ioreg_pci'][1]) if raw['ioreg_pci'][0] == 0 else []
    link = None
    for n in nodes:
        link = decode_link_from_props(n['props'])
        if link:
            break
    inv['gpu'] = {'cards': cards, 'names': [c.get('chipset') or c['name'] for c in cards], 'ioreg_nodes': nodes[:4],
                  'pcie_link': link,
                  'pcie_link_decoded': ('PCIe %s GT/s x%s (about %s GB/s each way before protocol overhead)' % (link['gts'], link['width'], link['gbs_raw'])) if link and link.get('gts') else 'not exposed by ioreg'}
    inv['thunderbolt'] = {'link_lines': parse_thunderbolt(raw['thunderbolt'][1]) if raw['thunderbolt'][0] == 0 else [],
                          'note': '' if raw['thunderbolt'][0] == 0 else raw['thunderbolt'][1][:200]}
    inv['opencl'] = opencl if opencl is not None else opencl_status()
    b = find_blender(blender, which, exists)
    if b:
        rc, txt = runner([b, '--version'])
        inv['blender'] = dict(parse_blender_version(txt), path=os.path.basename(b), rc=rc)
    else:
        inv['blender'] = {'version_line': None, 'version': None, 'note': 'Blender not found on PATH or in /Applications'}
    # failures as text, for the report
    inv['errors'] = {k: txt[:300] for k, (rc, txt) in raw.items() if rc != 0}
    return H.scrub_obj(inv)


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', required=True)
    ap.add_argument('--blender', default=None)
    a = ap.parse_args(argv)
    os.makedirs(a.out, exist_ok=True)
    inv = collect(blender=a.blender)
    H.write_json(os.path.join(a.out, 'inventory.json'), inv)
    g = inv['gpu']
    print('GPU:', '; '.join(g['names']) or 'none seen')
    print('Link:', g['pcie_link_decoded'])
    print('macOS:', inv['host']['macos'], '| RAM GB:', round((inv['host']['memsize'] or 0) / 2 ** 30, 1))
    print('OpenCL framework: exists=%s loadable=%s' % (inv['opencl']['exists'], inv['opencl']['loadable']))
    print('Blender:', inv['blender'].get('version_line'))
    return 0


if __name__ == '__main__':
    sys.exit(main())
