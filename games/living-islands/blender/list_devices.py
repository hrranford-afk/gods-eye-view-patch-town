"""Read-only: print every Cycles compute backend and device on this machine, plus the Blender version. Changes nothing.
  blender -b --python list_devices.py"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
import li_device
print('LI_BLENDER_VERSION', bpy.app.version_string)
try:
    bpy.ops.preferences.addon_enable(module='cycles')
except Exception:
    pass
devs = li_device.list_devices()
if not devs:
    print('LI_NO_DEVICES_FOUND')
for kind, name, typ in devs:
    print('LI_DEVICE_LIST', kind, '|', name, '|', typ)
