import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// ---------------------------------------------------------------------------
// Textured PBR materials shared by both chapters.
// Textures live in /public/assets/textures (generated seamless sets + CC0/MIT
// sets from the three.js examples repo). Every material tiles in *world units*:
// applyWorldUVs() re-projects each mesh's UVs so a 4 m wall and a 40 m road
// both show bricks/stones at the same real-world size – no stretching.
// ---------------------------------------------------------------------------

THREE.Cache.enabled = true;
const loader = new THREE.TextureLoader();
const cache = new Map();
let maxAniso = 4;

export function setTextureAnisotropy(renderer) {
  maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  cache.forEach(t => { t.anisotropy = maxAniso; t.needsUpdate = true; });
}

function tex(file, srgb = false) {
  const key = file + (srgb ? '|srgb' : '');
  if (cache.has(key)) return cache.get(key);
  const t = loader.load(import.meta.env.BASE_URL + 'assets/textures/' + file);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = maxAniso;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, t);
  return t;
}

// tile = metres covered by one texture repeat
const KINDS = {
  asphalt:   { map: 'asphalt_color.jpg',   normal: 'asphalt_normal.jpg',   rough: 'asphalt_rough.jpg',   tile: 4.0, ns: 1.0 },
  plaster:   { map: 'plaster_color.jpg',   normal: 'plaster_normal.jpg',   rough: 'plaster_rough.jpg',   tile: 3.0, ns: 0.7 },
  pavers:    { map: 'pavers_color.jpg',    normal: 'pavers_normal.jpg',    rough: 'pavers_rough.jpg',    tile: 2.4, ns: 1.0 },
  sandstone: { map: 'sandstone_color.jpg', normal: 'sandstone_normal.jpg', rough: 'sandstone_rough.jpg', tile: 2.2, ns: 1.0 },
  mud:       { map: 'mud_color.jpg',       normal: 'mud_normal.jpg',       rough: 'mud_rough.jpg',       tile: 2.5, ns: 1.2 },
  dirt:      { map: 'dirt_color.jpg',      normal: 'dirt_normal.jpg',      rough: 'dirt_rough.jpg',      tile: 3.5, ns: 1.0 },
  fabric:    { map: 'fabric_color.jpg',    normal: 'fabric_normal.jpg',    rough: 'fabric_rough.jpg',    tile: 0.6, ns: 0.6 },
  brick:     { map: 'brick_diffuse.jpg',   bump: 'brick_bump.jpg',         rough: 'brick_roughness.jpg', tile: 1.6, bs: 3.0 },
  hardwood:  { map: 'hardwood2_diffuse.jpg', bump: 'hardwood2_bump.jpg',   rough: 'hardwood2_roughness.jpg', tile: 2.4, bs: 1.5 }
};

/**
 * pbrMat('plaster', { color: 0xfca5a5, tile: 3, roughness: 1 })
 * Returns a MeshStandardMaterial with colour/normal(or bump)/roughness maps.
 * `color` tints the texture, so the game's existing palette is kept.
 */
export function pbrMat(kind, opts = {}) {
  const k = KINDS[kind];
  const m = new THREE.MeshStandardMaterial({
    color: opts.color !== undefined ? opts.color : 0xffffff,
    roughness: opts.roughness !== undefined ? opts.roughness : 1.0,
    metalness: opts.metalness || 0,
    map: tex(k.map, true),
    roughnessMap: tex(k.rough)
  });
  if (k.normal) {
    m.normalMap = tex(k.normal);
    const s = (opts.normalScale !== undefined ? opts.normalScale : k.ns);
    m.normalScale.set(s, s);
  }
  if (k.bump) {
    m.bumpMap = tex(k.bump);
    m.bumpScale = opts.bumpScale !== undefined ? opts.bumpScale : k.bs;
  }
  if (opts.transparent) { m.transparent = true; m.opacity = opts.opacity; }
  m.userData.worldUV = opts.tile || k.tile;
  m.name = 'pbr_' + kind;
  return m;
}

/**
 * Re-project UVs of every mesh that uses a pbrMat so textures tile in metres.
 * Box-style projection chosen per vertex from its normal (tri-planar lite).
 */
export function applyWorldUVs(root) {
  const scale = new THREE.Vector3();
  root.updateMatrixWorld(true);
  root.traverse(obj => {
    if (!obj.isMesh || obj.userData._worldUV) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    const tile = mats.reduce((t, m) => t || (m && m.userData && m.userData.worldUV), 0);
    if (!tile) return;
    const g = obj.geometry.clone();
    const pos = g.attributes.position, nor = g.attributes.normal;
    if (!pos || !nor) return;
    obj.getWorldScale(scale);
    const uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) * scale.x, y = pos.getY(i) * scale.y, z = pos.getZ(i) * scale.z;
      const ax = Math.abs(nor.getX(i)), ay = Math.abs(nor.getY(i)), az = Math.abs(nor.getZ(i));
      let u, v;
      if (ax >= ay && ax >= az) { u = z; v = y; }
      else if (ay >= ax && ay >= az) { u = x; v = z; }
      else { u = x; v = y; }
      uv[i * 2] = u / tile;
      uv[i * 2 + 1] = v / tile;
    }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    obj.geometry = g;
    obj.userData._worldUV = true;
  });
}

/**
 * Merge every static mesh under `group` into one mesh per material (huge draw-call saving).
 * Skips meshes with multi-material arrays, skinned/instanced meshes and anything flagged
 * userData.keepSeparate. Lights and non-mesh children are left untouched.
 */
export function mergeStaticGroup(group) {
  {
    group.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
    const buckets = new Map();
    const victims = [];
    group.traverse(o => {
      if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || Array.isArray(o.material)) return;
      // skip anything that is (or sits under) an animated / toggled sub-part
      for (let p = o; p && p !== group; p = p.parent) { if (p.userData.keepSeparate || !p.visible) return; }
      const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      ['position', 'normal', 'uv'].forEach(k => {
        if (!g.attributes[k]) {
          const size = k === 'uv' ? 2 : 3;
          g.setAttribute(k, new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * size), size));
        }
      });
      Object.keys(g.attributes).forEach(k => { if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); });
      g.morphAttributes = {};
      g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
      const key = o.material.uuid + (o.castShadow ? '|c' : '') + (o.receiveShadow ? '|r' : '');
      if (!buckets.has(key)) buckets.set(key, { material: o.material, cast: o.castShadow, receive: o.receiveShadow, geos: [] });
      buckets.get(key).geos.push(g);
      victims.push(o);
    });
    victims.forEach(o => o.parent && o.parent.remove(o));
    let n = 0;
    buckets.forEach(b => {
      const merged = mergeGeometries(b.geos, false);
      b.geos.forEach(g => g.dispose());
      if (!merged) return;
      const m = new THREE.Mesh(merged, b.material);
      m.castShadow = b.cast; m.receiveShadow = b.receive;
      m.userData._worldUV = true;
      group.add(m);
      n++;
    });
    return { before: victims.length, after: n };
  }
}
