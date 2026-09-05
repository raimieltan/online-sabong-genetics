/**
 * Rooster Arena — procedural gamefowl rooster (Black-Breasted Red).
 * Y up, +Z forward, feet at y = 0, ~3.9 units tall.
 * Merged into 6 meshes by material.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import fs from 'fs';

if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = class {
    readAsArrayBuffer(blob) { blob.arrayBuffer().then(b => { this.result = b; this.onloadend?.(); }); }
    readAsDataURL(blob) {
      blob.arrayBuffer().then(b => {
        this.result = 'data:application/octet-stream;base64,' + Buffer.from(b).toString('base64');
        this.onloadend?.();
      });
    }
  };
}

const V3 = THREE.Vector3, Q = THREE.Quaternion;
const YAX = new V3(0, 1, 0);
const C = (hex) => new THREE.Color().setHex(hex, THREE.SRGBColorSpace);
const lerp = THREE.MathUtils.lerp, smooth = THREE.MathUtils.smoothstep;

/* ------------------------------------------------------------------ palette */
const PAL = {
  hackleBase: C(0x8e1d06), hackleMid: C(0xd4500f), hackleTip: C(0xffc953),
  saddleBase: C(0xa32a08), saddleTip: C(0xff9f2c),
  back: C(0x9c3310), backHi: C(0xd85a17),
  breast: C(0x0f1015), belly: C(0x171922), thigh: C(0x1e202a),
  wingCov: C(0x8f2a0d), wingBar: C(0x1d2f57), wingBarHi: C(0x4a72c4),
  wingSecA: C(0x5e1b09), wingSecB: C(0xc85a1c),
  wingPriA: C(0x0d0f14), wingPriB: C(0x1b2130),
  tailA: C(0x081a17), tailB: C(0x0f5b45), tailSheen: C(0x0d4a7a),
  fluff: C(0x141620),
  face: C(0xd41c2a),
};

/* ------------------------------------------------------------------ helpers */
function paint(geom, fn) {
  const p = geom.attributes.position;
  const col = new Float32Array(p.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    c.copy(fn(p.getX(i), p.getY(i), p.getZ(i), i));
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geom.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geom;
}
const solid = (g, c) => paint(g, () => c);

function gradY(g, stops, len, sheen = null) {
  const tmp = new THREE.Color();
  return paint(g, (x, y) => {
    const t = THREE.MathUtils.clamp(y / len, 0, 1);
    const n = stops.length - 1;
    const f = t * n, i = Math.min(Math.floor(f), n - 1);
    tmp.copy(stops[i]).lerp(stops[i + 1], f - i);
    if (sheen) tmp.lerp(sheen, 0.32 * Math.pow(t, 1.5) * (0.35 + 0.65 * Math.abs(Math.sin(x * 26))));
    return tmp;
  });
}

function xf(geom, { pos = [0, 0, 0], rot = [0, 0, 0], scale = 1 }) {
  const s = Array.isArray(scale) ? scale : [scale, scale, scale];
  geom.applyMatrix4(new THREE.Matrix4().compose(
    new V3(...pos),
    new Q().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2], 'YXZ')),
    new V3(...s)));
  return geom;
}

/** place a feather: grows along `dir`, blade surface facing `face` */
function place(g, at, dir, face, scale = 1) {
  const d = new V3(...dir).normalize();
  const q = new Q().setFromUnitVectors(YAX, d);
  if (face) {
    const f = new V3(...face);
    f.addScaledVector(d, -f.dot(d));
    if (f.lengthSq() > 1e-8) {
      f.normalize();
      const zc = new V3(0, 0, 1).applyQuaternion(q);
      const phi = Math.atan2(new V3().crossVectors(zc, f).dot(d), zc.dot(f));
      q.premultiply(new Q().setFromAxisAngle(d, phi));
    }
  }
  g.applyMatrix4(new THREE.Matrix4().compose(new V3(...at), q, new V3(scale, scale, scale)));
  return g;
}

/** lofted tube through stations */
function loft(stations, radial = 18, capA = true, capB = true) {
  const pts = stations.map(s => new V3(...s.p));
  const pos = [], idx = [];
  const up = new V3(0, 1, 0), alt = new V3(0, 0, 1);
  const tan = new V3(), nx = new V3(), ny = new V3();
  for (let i = 0; i < stations.length; i++) {
    const s = stations[i];
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    tan.subVectors(b, a).normalize();
    const ref = Math.abs(tan.dot(up)) > 0.94 ? alt : up;
    nx.crossVectors(ref, tan).normalize();
    ny.crossVectors(tan, nx).normalize();
    const rx = s.rx ?? s.r, ry = s.ry ?? s.r, e = s.exp ?? 1;
    for (let j = 0; j < radial; j++) {
      const th = (j / radial) * Math.PI * 2, cs = Math.cos(th), sn = Math.sin(th);
      const u = Math.sign(cs) * Math.pow(Math.abs(cs), e) * rx;
      const v = Math.sign(sn) * Math.pow(Math.abs(sn), e) * ry;
      pos.push(pts[i].x + nx.x * u + ny.x * v, pts[i].y + nx.y * u + ny.y * v, pts[i].z + nx.z * u + ny.z * v);
    }
  }
  for (let i = 0; i < stations.length - 1; i++)
    for (let j = 0; j < radial; j++) {
      const a = i * radial + j, b = i * radial + (j + 1) % radial;
      idx.push(a, a + radial, b, b, a + radial, b + radial);
    }
  const cap = (ringStart, center, flip) => {
    const ci = pos.length / 3;
    pos.push(center.x, center.y, center.z);
    for (let j = 0; j < radial; j++) {
      const a = ringStart + j, b = ringStart + (j + 1) % radial;
      flip ? idx.push(ci, b, a) : idx.push(ci, a, b);
    }
  };
  if (capA) cap(0, pts[0], true);
  if (capB) cap((stations.length - 1) * radial, pts[pts.length - 1], false);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/**
 * Feather blade. Grows +Y, width along X, surface normal ~ +Z.
 * bend  = curvature WITHIN the blade plane (toward +X) — sickles, saddle drape
 * curve = curvature OUT of plane (toward +Z) — droop / cup direction
 */
function feather({ len = 1, w = 0.16, bend = 0, curve = 0.2, cup = 0.35, twist = 0,
                   segs = 14, cross = 4, fat = 0.42, tip = 0.55 } = {}) {
  const pos = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const sy = len * t * (1 - 0.18 * bend * t);
    const sx = bend * len * t * t;
    const sz = curve * len * t * t;
    const p = t < fat ? t / fat : 1 - (t - fat) / (1 - fat);
    const halfW = w * Math.pow(Math.max(p, 0), tip) * (1 - Math.pow(t, 12));
    const roll = twist * t;
    for (let j = 0; j <= cross; j++) {
      const u = (j / cross) * 2 - 1;
      const x0 = halfW * u;
      const z0 = cup * halfW * u * u + 0.004;
      pos.push(
        sx + x0 * Math.cos(roll) - z0 * Math.sin(roll),
        sy,
        sz + x0 * Math.sin(roll) + z0 * Math.cos(roll));
    }
  }
  for (let i = 0; i < segs; i++)
    for (let j = 0; j < cross; j++) {
      const a = i * (cross + 1) + j, c = a + cross + 1;
      idx.push(a, c, a + 1, a + 1, c, c + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return (x - Math.floor(x)) * 2 - 1; };

const B = { feathers: [], skin: [], beak: [], leg: [], claw: [], eye: [] };
const F = g => B.feathers.push(g);

/* ---------------------------------------------------------------- 1. BODY */
{
  const body = loft([
    { p: [0, 2.12, 0.78], rx: 0.09, ry: 0.10 },
    { p: [0, 2.04, 0.62], rx: 0.27, ry: 0.31, exp: 0.95 },
    { p: [0, 1.94, 0.38], rx: 0.39, ry: 0.44, exp: 0.9 },
    { p: [0, 1.87, 0.06], rx: 0.45, ry: 0.50, exp: 0.88 },
    { p: [0, 1.87, -0.30], rx: 0.44, ry: 0.49, exp: 0.88 },
    { p: [0, 1.92, -0.64], rx: 0.37, ry: 0.41, exp: 0.9 },
    { p: [0, 2.00, -0.94], rx: 0.26, ry: 0.29, exp: 0.95 },
    { p: [0, 2.06, -1.12], rx: 0.14, ry: 0.16 },
    { p: [0, 2.10, -1.21], rx: 0.04, ry: 0.05 },
  ], 26);
  const tmp = new THREE.Color();
  paint(body, (x, y, z) => {
    tmp.copy(PAL.breast).lerp(PAL.belly, smooth(y, 1.40, 1.82));
    tmp.lerp(PAL.back, smooth(y, 1.86, 2.16));
    tmp.lerp(PAL.backHi, smooth(y, 2.12, 2.34) * 0.9);
    if (z < -0.4) tmp.lerp(PAL.saddleBase, smooth(-z, 0.4, 1.0) * 0.45);
    return tmp;
  });
  F(body);

  const fluff = new THREE.SphereGeometry(0.26, 16, 12);
  fluff.scale(1.0, 0.9, 1.1);
  F(solid(xf(fluff, { pos: [0, 1.74, -0.92] }), PAL.fluff));

  for (let row = 0; row < 4; row++) {
    const n = 8 + row;
    for (let i = 0; i < n; i++) {
      const a = (-0.5 + i / (n - 1)) * (1.7 + row * 0.30);
      const y = 2.00 - row * 0.19, r = (0.26 + row * 0.05) * 0.95;
      const len = 0.26 - row * 0.015;
      const g = feather({ len, w: 0.19, curve: 0.10, cup: 0.16, segs: 5, cross: 4, fat: 0.58, tip: 0.85 });
      gradY(g, [PAL.breast, PAL.belly], len);
      place(g,
        [Math.sin(a) * r, y, 0.58 - row * 0.14 - (1 - Math.cos(a)) * 0.45 * r],
        [Math.sin(a) * 0.35, -1, Math.cos(a) * 0.30],
        [Math.sin(a), 0.35, Math.cos(a)]);
      F(g);
    }
  }
}

/* ---------------------------------------------------------------- 2. NECK */
{
  const neck = loft([
    { p: [0, 2.16, 0.54], r: 0.30 },
    { p: [0, 2.46, 0.62], r: 0.21 },
    { p: [0, 2.78, 0.63], r: 0.170 },
    { p: [0, 3.06, 0.58], r: 0.148 },
    { p: [0, 3.28, 0.51], r: 0.140 },
  ], 18, false, false);
  const tmp = new THREE.Color();
  F(paint(neck, (x, y) => tmp.copy(PAL.hackleBase).lerp(PAL.hackleMid, smooth(y, 2.2, 3.2))));

  const rings = [
    { y: 2.30, z: 0.54, r: 0.31, n: 20, len: 0.68, w: 0.082, out: 0.40 },
    { y: 2.48, z: 0.60, r: 0.26, n: 18, len: 0.62, w: 0.078, out: 0.34 },
    { y: 2.68, z: 0.62, r: 0.22, n: 17, len: 0.54, w: 0.070, out: 0.29 },
    { y: 2.88, z: 0.61, r: 0.185, n: 16, len: 0.45, w: 0.063, out: 0.25 },
    { y: 3.06, z: 0.57, r: 0.163, n: 14, len: 0.36, w: 0.056, out: 0.22 },
    { y: 3.21, z: 0.53, r: 0.150, n: 12, len: 0.26, w: 0.048, out: 0.20 },
  ];
  for (const R of rings) {
    for (let i = 0; i < R.n; i++) {
      const a = ((i + 0.5) / R.n) * Math.PI * 2;
      const sn = Math.sin(a), cs = Math.cos(a);
      if (R.y > 3.0 && cs > 0.80) continue;
      const g = feather({ len: R.len, w: R.w, bend: 0.10, curve: 0.26, cup: 0.55, segs: 9, cross: 3, fat: 0.36, tip: 0.5 });
      gradY(g, [PAL.hackleBase, PAL.hackleMid, PAL.hackleTip], R.len);
      place(g,
        [sn * R.r, R.y, R.z + cs * R.r * 0.9],
        [sn * R.out, -1, cs * R.out * 0.9],
        [sn, 0.3, cs]);
      F(g);
    }
  }
}

/* ---------------------------------------------------------------- 3. HEAD */
{
  const head = loft([
    { p: [0, 3.34, 0.42], rx: 0.145, ry: 0.155 },
    { p: [0, 3.44, 0.54], rx: 0.175, ry: 0.185 },
    { p: [0, 3.46, 0.66], rx: 0.165, ry: 0.170 },
    { p: [0, 3.43, 0.76], rx: 0.120, ry: 0.120 },
    { p: [0, 3.39, 0.82], rx: 0.065, ry: 0.065 },
  ], 18);
  const tmp = new THREE.Color();
  F(paint(head, (x, y, z) => tmp.copy(PAL.hackleTip).lerp(PAL.face, smooth(z, 0.58, 0.78))));

  const shape = new THREE.Shape();
  const z0 = -0.20, z1 = 0.44, H = 0.30, N = 64;
  shape.moveTo(z0, -0.05);
  for (let i = 0; i <= N; i++) {
    const u = i / N, z = lerp(z0, z1, u);
    const env = Math.pow(Math.sin(Math.PI * Math.pow(u, 0.85)), 0.6);
    const ser = 0.60 + 0.40 * Math.pow(Math.abs(Math.sin(Math.PI * (u * 4.5 - 0.15))), 0.55);
    shape.lineTo(z, env * ser * H);
  }
  shape.lineTo(z1, -0.05);
  shape.closePath();
  const comb = new THREE.ExtrudeGeometry(shape, {
    depth: 0.05, bevelEnabled: true, bevelSize: 0.028, bevelThickness: 0.020, bevelSegments: 4, curveSegments: 2,
  });
  comb.rotateY(Math.PI / 2);
  B.skin.push(xf(comb, { pos: [0.025, 3.54, 0.44] }));

  for (const sx of [-1, 1]) {
    const w = loft([
      { p: [0, 0, 0], r: 0.040 },
      { p: [0, -0.09, 0.015], r: 0.082 },
      { p: [0, -0.19, 0.020], r: 0.076 },
      { p: [0, -0.27, 0.010], r: 0.030 },
    ], 12);
    w.scale(0.5, 1, 1);
    B.skin.push(xf(w, { pos: [sx * 0.05, 3.32, 0.76], rot: [0, 0, sx * -0.10] }));
    const f = new THREE.SphereGeometry(0.082, 12, 10); f.scale(0.35, 1.0, 1.15);
    B.skin.push(xf(f, { pos: [sx * 0.150, 3.41, 0.67] }));
    const e = new THREE.SphereGeometry(0.048, 10, 8); e.scale(0.3, 1.25, 0.8);
    B.skin.push(xf(e, { pos: [sx * 0.150, 3.32, 0.56] }));
    B.eye.push(solid(xf(new THREE.SphereGeometry(0.050, 14, 12), { pos: [sx * 0.148, 3.46, 0.68] }), C(0xf7ad1c)));
    B.eye.push(solid(xf(new THREE.SphereGeometry(0.025, 10, 8), { pos: [sx * 0.180, 3.46, 0.695] }), C(0x0a0805)));
  }

  B.beak.push(loft([
    { p: [0, 3.40, 0.76], rx: 0.082, ry: 0.072 },
    { p: [0, 3.39, 0.86], rx: 0.062, ry: 0.058 },
    { p: [0, 3.35, 0.95], rx: 0.038, ry: 0.040 },
    { p: [0, 3.29, 1.00], rx: 0.010, ry: 0.014 },
  ], 12));
  B.beak.push(loft([
    { p: [0, 3.33, 0.77], rx: 0.068, ry: 0.042 },
    { p: [0, 3.32, 0.86], rx: 0.050, ry: 0.031 },
    { p: [0, 3.30, 0.93], rx: 0.026, ry: 0.018 },
  ], 12));
}

/* ---------------------------------------------------------------- 4. WINGS */
function wing(sx) {
  F(solid(loft([
    { p: [sx * 0.34, 2.04, 0.38], rx: 0.075, ry: 0.14 },
    { p: [sx * 0.42, 1.98, 0.06], rx: 0.095, ry: 0.22 },
    { p: [sx * 0.42, 1.92, -0.28], rx: 0.080, ry: 0.20 },
    { p: [sx * 0.38, 1.87, -0.54], rx: 0.045, ry: 0.11 },
  ], 14), PAL.wingCov));

  const rows = [
    { n: 11, len: 0.30, w: 0.130, y0: 2.20, y1: 2.06, z0: 0.36, z1: -0.26, x: 0.395, drop: -0.75, cols: [PAL.wingCov, PAL.saddleTip] },
    { n: 11, len: 0.32, w: 0.130, y0: 2.12, y1: 1.99, z0: 0.34, z1: -0.30, x: 0.425, drop: -0.85, cols: [PAL.wingCov, PAL.saddleTip] },
    { n: 11, len: 0.28, w: 0.135, y0: 2.02, y1: 1.90, z0: 0.32, z1: -0.34, x: 0.462, drop: -1.05, cols: [PAL.wingBar, PAL.wingBarHi] },
    { n: 11, len: 0.56, w: 0.175, y0: 1.94, y1: 1.84, z0: 0.24, z1: -0.40, x: 0.470, drop: -1.55, cols: [PAL.wingSecA, PAL.wingSecB] },
  ];
  for (const R of rows)
    for (let i = 0; i < R.n; i++) {
      const t = i / (R.n - 1);
      const g = feather({ len: R.len, w: R.w, bend: 0.12, curve: 0.22, cup: 0.45, segs: 8, cross: 3, fat: 0.42 });
      gradY(g, R.cols, R.len);
      place(g,
        [sx * (R.x + t * 0.015), lerp(R.y0, R.y1, t), lerp(R.z0, R.z1, t)],
        [sx * 0.12, R.drop, -1 + R.drop * 0.35],
        [sx, 0.2, 0]);
      F(g);
    }

  for (let i = 0; i < 8; i++) {
    const t = i / 7, len = 0.88 - t * 0.14;
    const g = feather({ len, w: 0.115, bend: 0.10, curve: 0.16, cup: 0.3, segs: 11, cross: 3, fat: 0.48 });
    gradY(g, [PAL.wingPriA, PAL.wingPriB], len, PAL.wingBar);
    place(g,
      [sx * (0.42 - t * 0.03), 1.90 - t * 0.04, -0.24 - t * 0.07],
      [sx * 0.05, -0.60 - t * 0.06, -1],
      [sx, 0.15, 0]);
    F(g);
  }
}
wing(1); wing(-1);

/* ------------------------------------------------------- 5. SADDLE FEATHERS */
for (const sx of [-1, 1])
  for (let row = 0; row < 3; row++)
    for (let i = 0; i < 8; i++) {
      const t = i / 7;
      const len = (1.15 - row * 0.18) * (0.65 + 0.35 * Math.sin(Math.PI * (0.25 + t * 0.7)));
      const g = feather({ len, w: 0.042 + row * 0.005, bend: 0.30, curve: 0.30, cup: 0.6, twist: sx * 0.35, segs: 11, cross: 3, fat: 0.28, tip: 0.42 });
      gradY(g, [PAL.saddleBase, PAL.saddleTip], len);
      place(g,
        [sx * (0.28 - row * 0.07), 2.22 - row * 0.10, -0.30 - t * 0.62],
        [sx * (0.55 - row * 0.12), -0.50 - row * 0.10, -1],
        [sx, 0.3, 0]);
      F(g);
    }

/* ---------------------------------------------------------------- 6. TAIL */
{
  const base = [0, 2.06, -1.14];
  for (let i = 0; i < 13; i++) {
    const t = i / 12, s = (t - 0.5) * 2, j = rnd(i);
    const len = 1.10 - Math.abs(s) * 0.18 + j * 0.05;
    const g = feather({ len, w: 0.235, bend: -0.40, curve: 0.06, cup: 0.20, segs: 12, cross: 3, fat: 0.50, tip: 0.7 });
    gradY(g, [PAL.tailA, PAL.tailB], len, PAL.tailSheen);
    place(g,
      [s * 0.10, base[1] - 0.02, base[2] + 0.05],
      [s * 0.34 + j * 0.04, 0.78 + j * 0.05, -0.92 - Math.abs(s) * 0.12],
      [1, s * 0.55, 0]);
    F(g);
  }
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 7; i++) {
      const t = i / 6, j = rnd(i * 3 + sx * 7);
      const len = 1.20 + t * 0.32 + j * 0.04;
      const g = feather({ len, w: 0.20, bend: -0.95, curve: 0.08, cup: 0.26, twist: sx * 0.14, segs: 20, cross: 3, fat: 0.60, tip: 0.6 });
      gradY(g, [PAL.tailA, PAL.tailB], len, PAL.tailSheen);
      place(g,
        [sx * (0.05 + t * 0.08), base[1] + 0.03 + t * 0.025, base[2] + 0.05],
        [sx * (0.20 + t * 0.12), 0.84 - t * 0.06 + j * 0.04, -0.72],
        [sx, 0.3, 0]);
      F(g);
    }
    for (let k = 0; k < 2; k++) {
      const len = 2.05 - k * 0.28;
      const g = feather({ len, w: 0.175 - k * 0.018, bend: -1.45, curve: 0.06, cup: 0.32, twist: sx * 0.16, segs: 30, cross: 3, fat: 0.66, tip: 0.55 });
      gradY(g, [PAL.tailA, PAL.tailB], len, PAL.tailSheen);
      place(g, [sx * (0.05 + k * 0.07), base[1] + 0.06, base[2] + 0.06],
        [sx * (0.15 + k * 0.08), 0.90 - k * 0.05, -0.52], [sx, 0.25, 0]);
      F(g);
    }

    for (let i = 0; i < 8; i++) {
      const t = i / 7, l2 = 0.62 - t * 0.14;
      const gc = feather({ len: l2, w: 0.085, bend: 0.35, curve: 0.3, cup: 0.5, segs: 8, cross: 3, fat: 0.34 });
      gradY(gc, [PAL.saddleBase, PAL.saddleTip], l2);
      place(gc, [sx * (0.06 + t * 0.10), 2.10 - t * 0.06, -1.00 + t * 0.04],
        [sx * (0.4 + t * 0.2), 0.35, -1], [sx, 0.3, 0]);
      F(gc);
    }
  }
}

/* ---------------------------------------------------------------- 7. LEGS */
function leg(sx) {
  const X = sx * 0.175;
  F(solid(loft([
    { p: [X, 1.80, 0.04], rx: 0.25, ry: 0.28 },
    { p: [X + sx * 0.01, 1.54, 0.00], rx: 0.22, ry: 0.24 },
    { p: [X + sx * 0.02, 1.28, -0.04], rx: 0.155, ry: 0.16 },
    { p: [X + sx * 0.02, 1.10, -0.05], rx: 0.100, ry: 0.100 },
  ], 14), PAL.thigh));

  B.leg.push(loft([
    { p: [X + sx * 0.02, 1.12, -0.05], rx: 0.092, ry: 0.092 },
    { p: [X + sx * 0.01, 0.78, -0.01], rx: 0.080, ry: 0.086 },
    { p: [X, 0.42, 0.03], rx: 0.070, ry: 0.078 },
    { p: [X, 0.13, 0.055], rx: 0.062, ry: 0.068 },
    { p: [X, 0.05, 0.065], rx: 0.056, ry: 0.060 },
  ], 12));

  for (let i = 0; i < 8; i++) {
    const t = i / 7, y = lerp(0.16, 1.00, t), r = lerp(0.066, 0.089, t);
    const ring = new THREE.TorusGeometry(r * 0.94, 0.011, 5, 12);
    ring.rotateX(Math.PI / 2);
    B.leg.push(xf(ring, { pos: [X + sx * 0.012 * t, y, 0.058 - t * 0.085], scale: [1, 1, 0.9] }));
  }

  B.claw.push(xf(loft([
    { p: [0, 0, 0], r: 0.042 },
    { p: [-sx * 0.02, -0.05, -0.11], r: 0.028 },
    { p: [-sx * 0.03, -0.10, -0.21], r: 0.006 },
  ], 8), { pos: [X - sx * 0.058, 0.40, 0.02] }));

  for (const T of [{ a: -0.44, l: 0.40 }, { a: 0.0, l: 0.47 }, { a: 0.44, l: 0.38 }]) {
    const ang = T.a * sx, dx = Math.sin(ang), dz = Math.cos(ang);
    const p0 = [X, 0.055, 0.07], p1 = [X + dx * T.l * 0.55, 0.045, 0.07 + dz * T.l * 0.55];
    const p2 = [X + dx * T.l, 0.034, 0.07 + dz * T.l];
    B.leg.push(loft([{ p: p0, r: 0.046 }, { p: p1, r: 0.034 }, { p: p2, r: 0.025 }], 8));
    B.claw.push(loft([
      { p: p2, r: 0.025 },
      { p: [p2[0] + dx * 0.07, 0.022, p2[2] + dz * 0.07], r: 0.015 },
      { p: [p2[0] + dx * 0.12, 0.003, p2[2] + dz * 0.12], r: 0.003 },
    ], 8));
  }
  B.leg.push(loft([
    { p: [X, 0.055, 0.05], r: 0.042 },
    { p: [X - sx * 0.03, 0.038, -0.13], r: 0.029 },
    { p: [X - sx * 0.05, 0.030, -0.23], r: 0.019 },
  ], 8));
  B.claw.push(loft([
    { p: [X - sx * 0.05, 0.030, -0.23], r: 0.019 },
    { p: [X - sx * 0.07, 0.011, -0.30], r: 0.004 },
  ], 8));
}
leg(1); leg(-1);

/* -------------------------------------------------------------- 8. ASSEMBLE */
const MATS = {
  feathers: new THREE.MeshStandardMaterial({ name: 'Feathers', vertexColors: true, roughness: 0.6, metalness: 0.25, side: THREE.DoubleSide }),
  skin: new THREE.MeshStandardMaterial({ name: 'CombWattle', color: PAL.face, roughness: 0.42 }),
  beak: new THREE.MeshStandardMaterial({ name: 'Beak', color: C(0xe9c06a), roughness: 0.32, metalness: 0.05 }),
  leg: new THREE.MeshStandardMaterial({ name: 'Shank', color: C(0xefc773), roughness: 0.5, metalness: 0.05 }),
  claw: new THREE.MeshStandardMaterial({ name: 'Claw', color: C(0x4a3f2c), roughness: 0.35, metalness: 0.1 }),
  eye: new THREE.MeshStandardMaterial({ name: 'Eye', vertexColors: true, roughness: 0.1 }),
};

// shorten the legs by LEGCUT without touching the body's own proportions
const LEGCUT = 0.17, HOCK = 1.20;
function shortenLegs(g) {
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    pos.setY(i, y < HOCK ? y * (HOCK - LEGCUT) / HOCK : y - LEGCUT);
  }
  pos.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}

const root = new THREE.Group();
root.name = 'Rooster';
let tris = 0;
for (const key of Object.keys(B)) {
  if (!B[key].length) continue;
  const parts = B[key].map(g => {
    let c = g.clone();
    if (!c.attributes.normal) c.computeVertexNormals();
    if (!c.attributes.color && MATS[key].vertexColors) solid(c, new THREE.Color(1, 1, 1));
    if (c.attributes.color && !MATS[key].vertexColors) c.deleteAttribute('color');
    if (c.index) c = c.toNonIndexed();
    for (const a of Object.keys(c.attributes))
      if (!['position', 'normal', 'color'].includes(a)) c.deleteAttribute(a);
    c.morphAttributes = {}; c.clearGroups();
    return c;
  });
  const merged = shortenLegs(mergeGeometries(parts, false));
  tris += merged.attributes.position.count / 3;
  const mesh = new THREE.Mesh(merged, MATS[key]);
  mesh.name = key[0].toUpperCase() + key.slice(1);
  root.add(mesh);
}
console.log('meshes:', root.children.length, 'triangles:', Math.round(tris));

const scene = new THREE.Scene();
scene.add(root);
new GLTFExporter().parse(scene, (glb) => {
  fs.writeFileSync('/home/claude/rooster/rooster_v2.glb', Buffer.from(glb));
  console.log('wrote rooster_v2.glb', (glb.byteLength / 1024).toFixed(1), 'KB');
}, e => console.error('EXPORT FAIL', e), { binary: true });
