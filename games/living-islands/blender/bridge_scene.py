"""Shared scene for the BAKE BRIDGE pilot (bake_bridge.py bakes it, bridge_ref.py renders the Cycles reference of it).
Same island, trees and boulders as bake_land.py (seed 1122, grid 129), same sky and sun as the hero render. The sea is NOT part of the
baked scene (the seabed is the continuous land mesh); the reference render can add it back (sea=True) so the two pictures are comparable.
Blender 3.6 compatible patterns only (S() helper lives in li_scene; no 4.x-only calls)."""
import os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy, numpy as np, mathutils
import island_common as IC
import li_scene as LS

SUN_AZ = 320.0
SUN_EL = 20.0
SUN_STRENGTH = 12.0          # W/m2, as in hero_render.py and bake_land.py
SUN_COLOR = (1.0, 0.76, 0.5)
SKY_STRENGTH = 0.22
HERO_CAM = dict(loc=(-9.0, -29.0, 10.0), target=(0.0, -2.0, 1.2), lens=36.0, sensor=36.0, exposure=-0.4)


def sun_dir(el_deg, az_deg):
    el = math.radians(el_deg); th = math.radians(az_deg)
    return np.array([math.sin(th) * math.cos(el), math.cos(th) * math.cos(el), math.sin(el)])


def build_scene(seed=1122, grid=129, sun_el=SUN_EL, sun_az=SUN_AZ, sea=False, sky_el=None):
    """Returns dict(sc, land, trees=(trunk, foliage), boulders=[...], sun, sky, fields). Land is the bake target."""
    sc = LS.reset()                      # calls li_device.configure (LI_DEVICE / LI_GPU_NAME)
    land, fields = LS.make_land(seed, grid)
    LS.land_material(land, seed)
    trees, pts = LS.make_conifers(fields, seed)
    boulders = []
    rock_mat = LS.rock_material('BoulderMat', seed + 9, 1.0)
    rng = np.random.default_rng(seed + 77)
    placed = 0; tries = 0
    while placed < 16 and tries < 4000:
        tries += 1
        x = rng.uniform(-20, 20); y = rng.uniform(-16, 16)
        F = IC.height_fields(np.array([[x]]), np.array([[y]]), seed); h = F['h'][0, 0]
        if not (-0.5 < h < 1.6) or F['rock'][0, 0] < 0.25 or math.hypot(x - IC.CAMP[0], (y - IC.CAMP[1]) * 1.3) < 6.5:
            continue
        b = LS.boulder(seed + placed * 13, rng.uniform(0.35, 1.0), (x, y, h - 0.05), rng.uniform(0, 6.28), 3)
        b.data.materials.append(rock_mat); boulders.append(b); placed += 1
    cx, cy = IC.CAMP
    for k, (fx, fy, fs) in enumerate(((cx + 10.5, cy - 4.0, 1.9), (cx - 10.0, cy - 2.5, 1.6), (cx + 13.0, cy + 3.5, 2.3), (cx - 12.5, cy + 4.5, 2.0))):
        fz = float(IC.height_at(fx, fy, seed)[0, 0])
        b = LS.boulder(seed + 300 + k, fs, (fx, fy, fz - 0.1), rng.uniform(0, 6.28), 4)
        b.data.materials.append(rock_mat); boulders.append(b)
    if sea:
        depth_img = LS.make_foam_depth_image(fields, seed=seed)
        LS.make_sea(seed, depth_img)
    sky = LS.make_sky(sun_elev_deg=sky_el if sky_el is not None else sun_el, sun_az_deg=sun_az, strength=SKY_STRENGTH)
    sd = sun_dir(sun_el, sun_az)
    bpy.ops.object.light_add(type='SUN'); sun = bpy.context.object
    sun.data.color = SUN_COLOR; sun.data.angle = math.radians(1.0); sun.data.energy = SUN_STRENGTH
    sun.rotation_euler = mathutils.Vector(tuple(-sd)).to_track_quat('-Z', 'Y').to_euler()
    return dict(sc=sc, land=land, trees=trees, boulders=boulders, sun=sun, sky=sky, fields=fields, seed=seed)


def aim_sun(sun, el_deg, az_deg):
    sd = sun_dir(el_deg, az_deg)
    sun.rotation_euler = mathutils.Vector(tuple(-sd)).to_track_quat('-Z', 'Y').to_euler()


def add_hero_camera(sc):
    c = HERO_CAM
    cam = bpy.data.cameras.new('Cam'); cam.lens = c['lens']; cam.sensor_width = c['sensor']
    cam.dof.use_dof = False        # the page has no depth of field; the reference must not blur either
    co = bpy.data.objects.new('Cam', cam); sc.collection.objects.link(co); sc.camera = co
    co.location = c['loc']
    dirv = mathutils.Vector(tuple(np.array(c['target']) - np.array(c['loc'])))
    co.rotation_euler = dirv.to_track_quat('-Z', 'Y').to_euler()
    return co


def world_background_node():
    nt = bpy.context.scene.world.node_tree
    for n in nt.nodes:
        if n.bl_idname == 'ShaderNodeBackground':
            return n
    return None
