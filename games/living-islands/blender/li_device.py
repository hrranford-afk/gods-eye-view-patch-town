"""Choose the Cycles render device explicitly, so a render never silently lands on the wrong GPU (for example an internal
graphics chip instead of the Radeon). Needs bpy. Controlled by environment variables:
  LI_DEVICE=CPU|GPU        default CPU
  LI_GPU_NAME=<text>       only use GPU devices whose name contains this text (case-insensitive), e.g. Radeon
  LI_REQUIRE_GPU=1         if the wanted GPU is not found, raise an error instead of falling back to the CPU
Prints parseable lines: LI_DEVICE_LIST, LI_DEVICE_USED, LI_DEVICE_NOT_FOUND, LI_DEVICE_FALLBACK_CPU, LI_DEVICE_CPU."""
import os
import bpy

KINDS = ('METAL', 'OPTIX', 'CUDA', 'HIP', 'ONEAPI')


def list_devices():
    """Every compute backend and its devices: [(kind, name, type)] (read-only apart from switching the backend for a look)."""
    out = []
    try:
        prefs = bpy.context.preferences.addons['cycles'].preferences
    except Exception:
        return out
    for kind in KINDS:
        try:
            prefs.compute_device_type = kind
            prefs.get_devices()
        except Exception:
            continue
        for d in prefs.devices:
            out.append((kind, d.name, d.type))
    return out


def configure(sc):
    want = os.environ.get('LI_DEVICE', 'CPU').upper()
    name = os.environ.get('LI_GPU_NAME', '').strip().lower()
    require = os.environ.get('LI_REQUIRE_GPU', '') == '1'
    sc.cycles.device = 'CPU'
    if want != 'GPU':
        print('LI_DEVICE_CPU')
        return 'CPU'
    try:
        prefs = bpy.context.preferences.addons['cycles'].preferences
    except Exception as e:
        prefs = None
        print('LI_DEVICE_NOT_FOUND no cycles preferences', e)
    if prefs is not None:
        for kind in KINDS:
            try:
                prefs.compute_device_type = kind
                prefs.get_devices()
            except Exception:
                continue
            gpus = [d for d in prefs.devices if d.type != 'CPU']
            for d in prefs.devices:
                print('LI_DEVICE_LIST', kind, '|', d.name, '|', d.type)
            chosen = [d for d in gpus if (not name or name in d.name.lower())]
            if chosen:
                for d in prefs.devices:
                    d.use = d in chosen      # only the chosen GPU(s): the CPU and any other GPU stay off
                sc.cycles.device = 'GPU'
                print('LI_DEVICE_USED', kind, [d.name for d in chosen])
                return 'GPU'
        print('LI_DEVICE_NOT_FOUND wanted GPU name contains: %r' % name)
    if require:
        raise RuntimeError('LI_REQUIRE_GPU=1 and no matching GPU found (LI_GPU_NAME=%r); refusing to render on the CPU' % name)
    print('LI_DEVICE_FALLBACK_CPU')
    return 'CPU'
