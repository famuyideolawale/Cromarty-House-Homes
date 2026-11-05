/* Cromarty House 3D viewer.
   Geometry comes from window.CH_MODEL, extracted from the architect's drawings
   (warrant first-floor plan Dec 2024 for the flats; planning drawings 221402/DPP for ground and basement).
   Units: metres. Plan x to the right, plan z down the drawing (Regent Quay / harbour is at -z). */
(function () {
  const M = window.CH_MODEL;
  if (!M) return;
  const H = M.H, WH = M.wallH, CX = 16.6, CZ = 12.6;
  const FLATS_PER_FLOOR = 7;

  /* ---------------- geometry helpers ---------------- */
  function Boxes() { this.p = []; this.n = []; this.i = []; this.v = 0; }
  Boxes.prototype.add = function (x0, y0, z0, x1, y1, z1) {
    if (x1 < x0) [x0, x1] = [x1, x0]; if (y1 < y0) [y0, y1] = [y1, y0]; if (z1 < z0) [z0, z1] = [z1, z0];
    if (x1 - x0 < 1e-4 || y1 - y0 < 1e-4 || z1 - z0 < 1e-4) return;
    x0 -= CX; x1 -= CX; z0 -= CZ; z1 -= CZ;
    const F = [
      [[1, 0, 0], [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]]],
      [[-1, 0, 0], [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]]],
      [[0, 1, 0], [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]]],
      [[0, -1, 0], [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]]],
      [[0, 0, 1], [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]]],
      [[0, 0, -1], [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]]]
    ];
    for (const [nn, q] of F) {
      for (const c of q) { this.p.push(c[0], c[1], c[2]); this.n.push(nn[0], nn[1], nn[2]); }
      const v = this.v; this.i.push(v, v + 1, v + 2, v, v + 2, v + 3); this.v += 4;
    }
  };
  Boxes.prototype.rect = function (r, y0, y1) { this.add(r[0], y0, r[1], r[2], y1, r[3]); };
  Boxes.prototype.mesh = function (mat) {
    if (!this.v) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setIndex(this.v > 65535 ? new THREE.Uint32BufferAttribute(this.i, 1) : new THREE.Uint16BufferAttribute(this.i, 1));
    const m = new THREE.Mesh(g, mat); m.castShadow = false; m.receiveShadow = false; return m;
  };
  // subtract hole rects from a list of rects
  function subtract(rs, holes) {
    let out = rs.slice();
    for (const h of holes) {
      const nx = [];
      for (const r of out) {
        if (r[2] <= h[0] || r[0] >= h[2] || r[3] <= h[1] || r[1] >= h[3]) { nx.push(r); continue; }
        if (r[1] < h[1]) nx.push([r[0], r[1], r[2], h[1]]);
        if (r[3] > h[3]) nx.push([r[0], h[3], r[2], r[3]]);
        const z0 = Math.max(r[1], h[1]), z1 = Math.min(r[3], h[3]);
        if (r[0] < h[0]) nx.push([r[0], z0, h[0], z1]);
        if (r[2] > h[2]) nx.push([h[2], z0, r[2], z1]);
      }
      out = nx;
    }
    return out;
  }

  /* ---------------- materials ---------------- */
  const std = (c, o) => { const m = new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: .88, metalness: 0 }, o || {})); m.color.convertSRGBToLinear(); if (m.emissive) m.emissive.convertSRGBToLinear(); return m; };
  function makeMats() {
    return {
      ext: std('#b7b3ab'), core: std('#e9e5de'), sep: std('#efebe4'), part: std('#f6f3ee'), slab: std('#a29d95'),
      wood: std('#b98f63', { roughness: .7 }), woodMuted: std('#d8d3cb'), tile: std('#d3dadd', { roughness: .5 }),
      carpet: std('#5d6873'), stone: std('#d4cec4'), lintel: std('#f3f0ea'),
      glass: std('#a9cbe0', { transparent: true, opacity: .26, roughness: .05, metalness: .1, depthWrite: false }),
      frame: std('#3b4148', { roughness: .5 }), leaf: std('#cfae84', { roughness: .6 }), fireLeaf: std('#a77d52', { roughness: .6 }),
      unit: std('#e8e4dd', { roughness: .6 }), top: std('#353a40', { roughness: .4 }), black: std('#16191c', { roughness: .3 }),
      steel: std('#b9c0c5', { roughness: .3, metalness: .6 }), white: std('#f8f7f4', { roughness: .35 }),
      sofa: std('#4a6072'), linen: std('#eeeae3'), throw: std('#c2601a'), furnWood: std('#8b6446', { roughness: .7 }),
      chair: std('#2e3338', { roughness: .6 }), rug: std('#cbc3b6'), refuge: std('#2f6fb3', { roughness: .6 }),
      liftDoor: std('#aab2b8', { roughness: .3, metalness: .7 }), liftCar: std('#7d868d', { roughness: .4, metalness: .5 }),
      stair: std('#bfb7ab'), rail: std('#2a2f34', { roughness: .4, metalness: .4 }),
      flatsVest: std('#c2601a', { roughness: .7 }), officeVest: std('#5c7486', { roughness: .7 }),
      paving: std('#9d9a93'), road: std('#4c5156'), water: std('#2b4a60', { roughness: .2, metalness: .1 }), grass: std('#8a9a7b'),
      roof: std('#7b8086'), exitGreen: std('#1e9a52', { roughness: .5, emissive: '#0b5a2c', emissiveIntensity: .6 })
    };
  }

  /* ---------------- canvas textures ---------------- */
  function canvasTex(w, h, draw) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return t;
  }
  function signTex(lines, bg, fg) {
    return canvasTex(512, 160, (g, w, h) => {
      g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = '700 54px "Big Shoulders Display", Arial Narrow, sans-serif'; g.fillText(lines[0], w / 2, lines[1] ? 58 : h / 2);
      if (lines[1]) { g.font = '500 30px "Hanken Grotesk", Arial, sans-serif'; g.fillText(lines[1], w / 2, 116); }
    });
  }
  function exitTex() {
    return canvasTex(256, 128, (g, w, h) => {
      g.fillStyle = '#1e9a52'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff';
      g.font = '700 40px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('EXIT', 160, 66);
      g.lineWidth = 9; g.strokeStyle = '#fff'; g.lineCap = 'round';
      g.beginPath(); g.arc(62, 30, 9, 0, 7); g.fillStyle = '#fff'; g.fill();
      g.beginPath(); g.moveTo(60, 44); g.lineTo(52, 74); g.lineTo(70, 100); g.moveTo(52, 74); g.lineTo(34, 96); g.moveTo(58, 52); g.lineTo(82, 62); g.moveTo(58, 52); g.lineTo(36, 58); g.stroke();
    });
  }
  function wheelchairTex() {
    return canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = '#2f6fb3'; g.fillRect(0, 0, w, h); g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineWidth = 14; g.lineCap = 'round';
      g.beginPath(); g.arc(118, 52, 16, 0, 7); g.fill();
      g.beginPath(); g.moveTo(112, 80); g.lineTo(112, 140); g.lineTo(168, 140); g.lineTo(190, 196); g.stroke();
      g.beginPath(); g.arc(118, 168, 46, -0.4, 4.2); g.stroke();
    });
  }
  function panoramaTex() {
    return canvasTex(4096, 512, (g, w, h) => {
      const sky = g.createLinearGradient(0, 0, 0, 300); sky.addColorStop(0, '#93aec2'); sky.addColorStop(1, '#e4e9ec');
      g.fillStyle = sky; g.fillRect(0, 0, w, h);
      // u = 0.5 faces -z (Regent Quay and the harbour)
      for (let i = 0; i < 70; i++) {
        const x = (i * 61) % w, bw = 50 + (i * 37) % 70, bh = 60 + (i * 53) % 120, u = x / w;
        if (u > .3 && u < .7) continue;
        g.fillStyle = i % 3 ? '#99a1a8' : '#8b939a'; g.fillRect(x, 330 - bh, bw, bh + 200);
        g.beginPath(); g.moveTo(x, 330 - bh); g.lineTo(x + bw / 2, 300 - bh); g.lineTo(x + bw, 330 - bh); g.fill();
        g.fillStyle = '#5d676f'; for (let r = 0; r < 4; r++) for (let k = 0; k < 3; k++) g.fillRect(x + 8 + k * (bw / 3.4), 345 - bh + r * 28, 9, 15);
      }
      const x0 = w * .3, x1 = w * .7;
      g.fillStyle = '#7f8a96'; g.beginPath(); g.moveTo(x0, 300); for (let x = x0; x <= x1; x += 40) g.lineTo(x, 286 - 14 * Math.sin(x / 210)); g.lineTo(x1, 330); g.lineTo(x0, 330); g.fill();
      const wat = g.createLinearGradient(0, 330, 0, 512); wat.addColorStop(0, '#46677f'); wat.addColorStop(1, '#1d3447');
      g.fillStyle = wat; g.fillRect(x0, 330, x1 - x0, 182);
      g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = 2;
      for (let i = 0; i < 160; i++) { const y = 340 + (i * 53) % 160, x = x0 + (i * 137) % (x1 - x0); g.beginPath(); g.moveTo(x, y); g.lineTo(x + 30 + (i % 5) * 9, y); g.stroke(); }
      // supply vessels in the harbour
      [[x0 + 260, 1], [w * .5 - 120, 1.3], [x1 - 420, .9]].forEach(([sx, s]) => {
        g.fillStyle = '#d4572a'; g.beginPath(); g.moveTo(sx, 352); g.lineTo(sx + 300 * s, 352); g.lineTo(sx + 276 * s, 388); g.lineTo(sx + 18, 388); g.fill();
        g.fillStyle = '#f1efea'; g.fillRect(sx + 24, 352 - 52 * s, 100 * s, 52 * s); g.fillRect(sx + 40, 352 - 74 * s, 54 * s, 22 * s);
        g.fillStyle = '#2b3a46'; for (let k = 0; k < 5; k++) g.fillRect(sx + 32 + k * 18 * s, 352 - 42 * s, 10 * s, 8 * s);
      });
      g.fillStyle = '#7d858b'; g.fillRect(0, 470, w, 42);
    });
  }

  /* ---------------- level builder ---------------- */
  function levelKey(L) { return L === -1 ? 'basement' : L === 0 ? 'ground' : 'typ'; }
  const STAIR_HOLES_A = [[9.70, 8.05, 12.47, 11.2], [11.239, 7.29, 12.47, 8.05]];
  const STAIR_HOLE_B = [22.69, 21.36, 26.19, 24.16];

  function buildLevel(L, mats, opt) {
    opt = opt || {};
    const grp = new THREE.Group(); grp.userData.level = L;
    const y = L * H, key = levelKey(L);
    const top = L === 4 ? 4 * H + H : y + H;          // external walls run to the slab above
    const B = {}; const b = k => (B[k] = B[k] || new Boxes());
    const D = key === 'typ' ? M.typ : M[key];
    // slab with holes for stairs and lift
    let holes = [M.lift.shaft];
    if (L >= 1) holes = holes.concat(STAIR_HOLES_A);
    if (L >= 0) holes.push(STAIR_HOLE_B);
    subtract(M.slab[key === 'typ' ? 'typ' : key], holes).forEach(r => b('slab').rect(r, y - M.slabT, y));
    // walls
    (D.ext || []).forEach(r => b('ext').rect(r, y, key === 'typ' || L === 0 ? top : y + WH));
    (D.core || []).forEach(r => b('core').rect(r, y, y + WH));
    (D.sep || []).forEach(r => b('sep').rect(r, y, y + WH));
    (D.part || []).forEach(r => b('part').rect(r, y, y + WH));
    // windows: sill, head, glass, mullion
    (D.win || []).forEach(r => {
      const sill = L === -1 ? 1.9 : .85, head = L === -1 ? 2.6 : 2.45;
      b('ext').rect(r, y, y + sill); b('ext').rect(r, y + head, top);
      const along = (r[2] - r[0]) > (r[3] - r[1]);
      const g = along ? [r[0], (r[1] + r[3]) / 2 - .012, r[2], (r[1] + r[3]) / 2 + .012] : [(r[0] + r[2]) / 2 - .012, r[1], (r[0] + r[2]) / 2 + .012, r[3]];
      b('glass').rect(g, y + sill, y + head);
      b('frame').rect(along ? [r[0], g[1] - .02, r[2], g[3] + .02] : [g[0] - .02, r[1], g[2] + .02, r[3]], y + sill, y + sill + .05);
      const mid = along ? (r[0] + r[2]) / 2 : (r[1] + r[3]) / 2;
      b('frame').rect(along ? [mid - .03, g[1] - .02, mid + .03, g[3] + .02] : [g[0] - .02, mid - .03, g[2] + .02, mid + .03], y + sill, y + head);
    });
    // door heads
    (D.door || []).forEach(r => b('lintel').rect(r, y + 2.1, y + WH));
    // ground floor exits and entrances
    if (key === 'ground') {
      (D.exitdoors || []).forEach(r => { b('lintel').rect(r, y + 2.2, top); });
      D.entrances.forEach(e => {
        b(e.id === 'flats' ? 'flatsVest' : 'officeVest').rect(e.vest, y + .002, y + .03);
        b('lintel').rect(e.door, y + 2.3, y + 3.0);
        b(e.id === 'flats' ? 'flatsVest' : 'officeVest').rect([e.door[0], e.door[1] - .9, e.door[2], e.door[1] - .02], y + .002, y + .02);   // threshold mat outside
        b('frame').rect([e.door[0], e.door[1] - 1.1, e.door[2], e.door[1]], y + 2.85, y + 2.95);                                       // canopy
      });
    }
    if (opt.detail !== false) {
      if (key === 'typ') buildFlatsDetail(L, y, b, mats, grp, opt);
      if (key === 'ground') groundDetail(y, b);
    }
    for (const k in B) { const m = B[k].mesh(mats[k]); if (m) { m.userData.kind = k; grp.add(m); } }
    // signage
    if (key === 'ground') {
      D.entrances.forEach(e => {
        const t = e.id === 'flats' ? signTex(['RESIDENCES', 'Flats 1–28 · Lift · Stair A'], '#c2601a', '#fff') : signTex(['OFFICES', 'Reception · Ground floor'], '#2f4252', '#fff');
        const s = new THREE.Mesh(new THREE.PlaneGeometry(1.6, .5), new THREE.MeshBasicMaterial({ map: t }));
        s.position.set((e.door[0] + e.door[2]) / 2 - CX, y + 3.25, e.door[1] - 1.0 - CZ); s.rotation.y = Math.PI; grp.add(s);
        const s2 = s.clone(); s2.position.z = e.door[1] - .02 - CZ; s2.position.y = y + 2.6; s2.scale.set(.7, .7, 1); grp.add(s2);
      });
      (D.exitdoors || []).forEach(r => addExitSign(grp, (r[0] + r[2]) / 2, y + 2.35, (r[1] + r[3]) / 2, Math.PI / 2, mats));
    }
    if (key === 'typ') {
      M.refuges.forEach(rf => {
        const p = new THREE.Mesh(new THREE.PlaneGeometry(rf.b[2] - rf.b[0], rf.b[3] - rf.b[1]), new THREE.MeshStandardMaterial({ map: grp.userData.wheelTex || (grp.userData.wheelTex = wheelchairTex()) }));
        p.rotation.x = -Math.PI / 2; p.position.set((rf.b[0] + rf.b[2]) / 2 - CX, y + .025, (rf.b[1] + rf.b[3]) / 2 - CZ); grp.add(p);
      });
      M.exits.typ.forEach(e => addExitSign(grp, e.x, y + 2.3, e.z, 0, mats));
    }
    if (key === 'ground') M.exits.ground.slice(1).forEach(e => addExitSign(grp, e.x, y + 2.3, e.z, 0, mats));
    // lift landing doors on every served level
    if (L >= M.lift.from && L <= M.lift.to) {
      const d = M.lift.door, z = d[1];
      const lb = new Boxes(); lb.add(d[0], y, z - .06, (d[0] + d[2]) / 2 - .005, y + 2.1, z + .02); lb.add((d[0] + d[2]) / 2 + .005, y, z - .06, d[2], y + 2.1, z + .02);
      grp.add(lb.mesh(mats.liftDoor));
      const fr = new Boxes(); fr.add(d[0] - .08, y, z - .08, d[0], y + 2.2, z + .03); fr.add(d[2], y, z - .08, d[2] + .08, y + 2.2, z + .03); fr.add(d[0] - .08, y + 2.1, z - .08, d[2] + .08, y + 2.2, z + .03);
      grp.add(fr.mesh(mats.frame));
    }
    return grp;
  }
  function addExitSign(grp, x, y, z, rot, mats) {
    const tex = grp.userData.exitTex || (grp.userData.exitTex = exitTex());
    const m = new THREE.Mesh(new THREE.BoxGeometry(.42, .21, .03), [mats.exitGreen, mats.exitGreen, mats.exitGreen, mats.exitGreen, new THREE.MeshBasicMaterial({ map: tex }), new THREE.MeshBasicMaterial({ map: tex })]);
    m.position.set(x - CX, y, z - CZ); m.rotation.y = rot; grp.add(m);
  }

  function groundDetail(y, b) {
    // office floor finish over the whole ground floor, vestibules already coloured
    subtract(M.slab.ground, [M.lift.shaft, STAIR_HOLE_B, ...M.ground.entrances.map(e => e.vest)]).forEach(r => b('carpet').rect(r, y + .001, y + .012));
  }

  function buildFlatsDetail(L, y, b, mats, grp, opt) {
    const T = M.typ;
    const focus = opt.focusFlat || 0;
    // floors
    const floorGroup = new THREE.Group(); floorGroup.userData.floors = true;
    for (const n in T.flatFloor) {
      const fb = new Boxes();
      subtract(T.flatFloor[n], STAIR_HOLES_A.concat([M.lift.shaft])).forEach(r => fb.rect(r, y + .001, y + .014));
      const mat = focus && +n !== focus ? mats.woodMuted : mats.wood;
      const m = fb.mesh(mat); if (m) { m.userData.flat = (L - 1) * FLATS_PER_FLOOR + (+n); m.userData.pos = +n; m.userData.level = L; floorGroup.add(m); }
    }
    grp.add(floorGroup); grp.userData.floorGroup = floorGroup;
    T.fin.tile.forEach(r => b('tile').rect(r, y + .002, y + .02));
    subtract(T.fin.carpet, STAIR_HOLES_A.concat([STAIR_HOLE_B, M.lift.shaft])).forEach(r => b('carpet').rect(r, y + .001, y + .012));
    subtract(T.fin.stone, STAIR_HOLES_A.concat([STAIR_HOLE_B, M.lift.shaft])).forEach(r => b('stone').rect(r, y + .001, y + .012));
    // door leaves, shown open as on the drawing
    T.leaves.forEach(l => {
      const [hx, hz, ex, ez] = l, dx = ex - hx, dz = ez - hz, len = Math.hypot(dx, dz), t = .045;
      const m = new THREE.Mesh(new THREE.BoxGeometry(len, 2.04, t), len > .86 ? mats.fireLeaf : mats.leaf);
      m.position.set((hx + ex) / 2 - CX, y + 1.02, (hz + ez) / 2 - CZ); m.rotation.y = -Math.atan2(dz, dx); grp.add(m);
    });
    // kitchens
    T.tops.forEach(k => {
      const r = k.b; b('unit').rect(r, y, y + .86); b('top').rect([r[0] - .01, r[1] - .01, r[2] + .01, r[3] + .01], y + .86, y + .9);
      const back = .35; let wu;
      if (k.wall === 0) wu = [r[0], r[1], r[2], r[1] + back]; else if (k.wall === 2) wu = [r[0], r[3] - back, r[2], r[3]];
      else if (k.wall === 1) wu = [r[2] - back, r[1], r[2], r[3]]; else wu = [r[0], r[1], r[0] + back, r[3]];
      b('unit').rect(wu, y + 1.45, y + 2.15);
    });
    T.fix.forEach(f => fixture(f, y, b));
    T.furn.forEach(f => furniture(f, y, b));
    T.ward.forEach(r => b('unit').rect(r, y, y + 2.2));
  }
  // r: side of the nearest wall (0:-z, 1:+x, 2:+z, 3:-x)
  function sideRect(f, depth, from) { // strip of given depth along the wall side of f's bbox
    const x0 = f.x - f.w / 2, x1 = f.x + f.w / 2, z0 = f.z - f.d / 2, z1 = f.z + f.d / 2;
    from = from || 0;
    if (f.r === 0) return [x0, z0 + from, x1, z0 + from + depth];
    if (f.r === 2) return [x0, z1 - from - depth, x1, z1 - from];
    if (f.r === 1) return [x1 - from - depth, z0, x1 - from, z1];
    return [x0 + from, z0, x0 + from + depth, z1];
  }
  const bbox = f => [f.x - f.w / 2, f.z - f.d / 2, f.x + f.w / 2, f.z + f.d / 2];
  function fixture(f, y, b) {
    const R = bbox(f);
    if (f.t === 'shower') {
      b('white').rect(R, y, y + .06);
      const long = f.w > f.d;  // glass screen along the open long side, opposite the wall
      const opp = { 0: 2, 2: 0, 1: 3, 3: 1 }[f.r];
      const s = sideRect(Object.assign({}, f, { r: opp }), .015, .0);
      if ((long && (opp === 0 || opp === 2)) || (!long && (opp === 1 || opp === 3))) b('glass').rect(s, y + .06, y + 2.0);
      const p = sideRect(f, .04); b('steel').rect([(p[0] + p[2]) / 2 - .03, (p[1] + p[3]) / 2 - .03, (p[0] + p[2]) / 2 + .03, (p[1] + p[3]) / 2 + .03], y + 1.9, y + 2.1);
    } else if (f.t === 'wc') {
      b('white').rect(sideRect(f, .17), y, y + .82);
      const pan = sideRect(f, Math.max(f.w, f.d) - .17, .17);
      const sh = .06; b('white').rect([pan[0] + sh, pan[1] + sh, pan[2] - sh, pan[3] - sh], y, y + .41);
    } else if (f.t === 'basin') {
      b('furnWood').rect(R, y + .3, y + .78); b('white').rect(R, y + .78, y + .86);
      const m = sideRect(f, .04); b('steel').rect([(m[0] + m[2]) / 2 - .02, (m[1] + m[3]) / 2 - .02, (m[0] + m[2]) / 2 + .02, (m[1] + m[3]) / 2 + .02], y + .86, y + 1.0);
      b('steel').rect(sideRect(f, .02), y + 1.05, y + 1.75);   // mirror cabinet face
    } else if (f.t === 'hob') {
      b('black').rect([R[0] + .03, R[1] + .03, R[2] - .03, R[3] - .03], y + .9, y + .912);
    } else if (f.t === 'sink') {
      b('steel').rect([R[0] - .05, R[1] - .02, R[2] + .05, R[3] + .02], y + .9, y + .908);
    }
  }
  function furniture(f, y, b) {
    const R = bbox(f), t = f.t;
    if (t === 'bed2' || t === 'bed1') {
      b('furnWood').rect(R, y + .05, y + .3); b('linen').rect([R[0] + .02, R[1] + .02, R[2] - .02, R[3] - .02], y + .3, y + .52);
      b('furnWood').rect(sideRect(f, .07), y + .05, y + 1.05);
      const pl = sideRect(f, .38, .1), ins = .12;
      const across = f.r === 0 || f.r === 2;
      if (t === 'bed2') {
        if (across) { const m = (pl[0] + pl[2]) / 2; b('white').rect([pl[0] + ins, pl[1], m - .05, pl[3]], y + .52, y + .64); b('white').rect([m + .05, pl[1], pl[2] - ins, pl[3]], y + .52, y + .64); }
        else { const m = (pl[1] + pl[3]) / 2; b('white').rect([pl[0], pl[1] + ins, pl[2], m - .05], y + .52, y + .64); b('white').rect([pl[0], m + .05, pl[2], pl[3] - ins], y + .52, y + .64); }
      } else b('white').rect(across ? [pl[0] + .1, pl[1], pl[2] - .1, pl[3]] : [pl[0], pl[1] + .1, pl[2], pl[3] - .1], y + .52, y + .64);
      const opp = { 0: 2, 2: 0, 1: 3, 3: 1 }[f.r];
      b('throw').rect(sideRect(Object.assign({}, f, { r: opp }), .55, .05), y + .52, y + .56);
    } else if (t === 'bedside') {
      b('furnWood').rect([R[0] + .02, R[1] + .02, R[2] - .02, R[3] - .02], y, y + .52);
    } else if (t === 'sofa') {
      b('sofa').rect(R, y + .1, y + .44); b('sofa').rect(sideRect(f, .22), y + .44, y + .82);
      const across = f.r === 0 || f.r === 2;
      if (across) { b('sofa').rect([R[0], R[1], R[0] + .18, R[3]], y + .44, y + .62); b('sofa').rect([R[2] - .18, R[1], R[2], R[3]], y + .44, y + .62); }
      else { b('sofa').rect([R[0], R[1], R[2], R[1] + .18], y + .44, y + .62); b('sofa').rect([R[0], R[3] - .18, R[2], R[3]], y + .44, y + .62); }
    } else if (t === 'sofaL') {
      const dpt = .9, c = f.corner || 0;   // filled quadrant: 0 TL,1 TR,2 BR,3 BL
      const top = c === 0 || c === 1, left = c === 0 || c === 3;
      const a = top ? [R[0], R[1], R[2], R[1] + dpt] : [R[0], R[3] - dpt, R[2], R[3]];
      const s = left ? [R[0], R[1], R[0] + dpt, R[3]] : [R[2] - dpt, R[1], R[2], R[3]];
      [a, s].forEach(r => b('sofa').rect(r, y + .1, y + .44));
      b('sofa').rect(top ? [R[0], R[1], R[2], R[1] + .22] : [R[0], R[3] - .22, R[2], R[3]], y + .44, y + .82);
      b('sofa').rect(left ? [R[0], R[1], R[0] + .22, R[3]] : [R[2] - .22, R[1], R[2], R[3]], y + .44, y + .82);
    } else if (t === 'coffee') {
      b('furnWood').rect(R, y + .32, y + .4); b('furnWood').rect([R[0] + .05, R[1] + .05, R[2] - .05, R[3] - .05], y, y + .32);
      b('rug').rect([R[0] - .6, R[1] - .6, R[2] + .6, R[3] + .6], y + .014, y + .022);
    } else if (t === 'unit') {
      b('furnWood').rect(R, y, y + .5);
      const tv = sideRect(f, .05, .12); const along = f.r === 0 || f.r === 2;
      const c = along ? [(R[0] + R[2]) / 2 - .55, tv[1], (R[0] + R[2]) / 2 + .55, tv[3]] : [tv[0], (R[1] + R[3]) / 2 - .55, tv[2], (R[1] + R[3]) / 2 + .55];
      b('black').rect(c, y + .62, y + 1.25);
    } else if (t === 'desk') {
      b('furnWood').rect(R, y + .72, y + .76); b('furnWood').rect(sideRect(f, .06), y, y + .72);
      const opp = { 0: 2, 2: 0, 1: 3, 3: 1 }[f.r]; const c = sideRect(Object.assign({}, f, { r: opp }), .42, -.3);
      const cx = (c[0] + c[2]) / 2, cz = (c[1] + c[3]) / 2; b('chair').rect([cx - .21, cz - .21, cx + .21, cz + .21], y + .42, y + .47);
    } else if (t === 'table' || t === 'dining') {
      const cx = f.x, cz = f.z, w = Math.min(f.w, 1.3), d = Math.min(f.d, 1.3);
      if (t === 'dining') {
        const tw = Math.min(w, d) > 1.0 ? .8 : Math.min(w, d) - .45;
        b('furnWood').rect([cx - tw / 2 - .1, cz - tw / 2, cx + tw / 2 + .1, cz + tw / 2], y + .72, y + .76); b('furnWood').rect([cx - .05, cz - .05, cx + .05, cz + .05], y, y + .72);
        [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([i, j]) => { const px = cx + i * (tw / 2 + .32), pz = cz + j * (tw / 2 + .28); b('chair').rect([px - .2, pz - .2, px + .2, pz + .2], y + .43, y + .48); b('chair').rect([px - .03, pz - .03, px + .03, pz + .03], y, y + .43); });
      } else {
        b('furnWood').rect([cx - w / 2, cz - d / 2, cx + w / 2, cz + d / 2], y + .72, y + .76); b('furnWood').rect([cx - .05, cz - .05, cx + .05, cz + .05], y, y + .72);
      }
    } else if (t === 'chair') {
      b('chair').rect([R[0] + .03, R[1] + .03, R[2] - .03, R[3] - .03], y + .4, y + .46); b('chair').rect(sideRect(f, .06), y + .46, y + .85);
      b('chair').rect([f.x - .03, f.z - .03, f.x + .03, f.z + .03], y, y + .4);
    }
  }

  /* ---------------- stairs and lift ---------------- */
  function buildStairs(mats, maxLevel) {
    const g = new THREE.Group(), s = new Boxes(), rail = new Boxes(), sp = new Boxes();
    const A = M.stairs.A, rA = H / (A.risersR + A.risersL);
    for (let L = A.from; L < Math.min(A.to, maxLevel); L++) {
      const y0 = L * H;
      const runR = (A.zEnd - A.zLobbyR) / A.risersR;
      for (let i = 0; i < A.risersR; i++) { const top = y0 + (i + 1) * rA; s.add(A.right[0], Math.max(y0, top - .45), A.zLobbyR + i * runR, A.right[1], top, A.zLobbyR + (i + 1) * runR); }
      const yl = y0 + A.risersR * rA;
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(A.arc[2], A.arc[2], .22, 40, 1, false, -Math.PI / 2, Math.PI), mats.stair);
      disc.position.set(A.arc[0] - CX, yl - .11, A.arc[1] - CZ); g.add(disc);
      s.add(A.left[0], yl - .22, A.zEnd - .05, A.right[1], yl, A.zEnd + .02);
      const runL = (A.zEnd - A.zLobbyL) / A.risersL;
      for (let i = 0; i < A.risersL; i++) { const top = yl + (i + 1) * rA; s.add(A.left[0], Math.max(yl - .2, top - .45), A.zEnd - (i + 1) * runL, A.left[1], top, A.zEnd - i * runL); }
      rail.add(A.spine[0] - .04, y0 + .9, A.zLobbyR, A.spine[0], y0 + .95, A.zEnd);
    }
    sp.add(A.spine[0], A.from * H, 7.30, A.spine[1], Math.min(A.to, maxLevel) * H + WH, A.zEnd);
    const Bs = M.stairs.B, rB = H / (2 * Bs.risers), run = (Bs.flight[1] - Bs.flight[0]) / Bs.risers;
    for (let L = Bs.from; L < Math.min(Bs.to, maxLevel); L++) {
      const y0 = L * H;
      for (let i = 0; i < Bs.risers; i++) { const top = y0 + (i + 1) * rB; s.add(Bs.flight[1] - (i + 1) * run, Math.max(y0, top - .45), Bs.upper[0], Bs.flight[1] - i * run, top, Bs.upper[1]); }
      const yl = y0 + Bs.risers * rB;
      s.add(Bs.landing[0], yl - .22, Bs.upper[0], Bs.landing[1], yl, Bs.lower[1]);
      for (let i = 0; i < Bs.risers; i++) { const top = yl + (i + 1) * rB; s.add(Bs.flight[0] + i * run, Math.max(yl - .2, top - .45), Bs.lower[0], Bs.flight[0] + (i + 1) * run, top, Bs.lower[1]); }
    }
    sp.add(Bs.flight[0], Bs.from * H, Bs.spine[0], Bs.flight[1], Math.min(Bs.to, maxLevel) * H + WH, Bs.spine[1]);
    [s.mesh(mats.stair), rail.mesh(mats.rail), sp.mesh(mats.sep)].forEach(m => m && g.add(m));
    // lift car parked at the ground floor, shaft floor
    const L = M.lift.shaft, car = new Boxes();
    car.add(L[0] + .1, .02, L[1] + .12, L[2] - .1, .06, L[3] - .1); car.add(L[0] + .1, .06, L[3] - .16, L[2] - .1, 2.2, L[3] - .1);
    car.add(L[0] + .1, .06, L[1] + .12, L[0] + .16, 2.2, L[3] - .1); car.add(L[2] - .16, .06, L[1] + .12, L[2] - .1, 2.2, L[3] - .1); car.add(L[0] + .1, 2.2, L[1] + .12, L[2] - .1, 2.26, L[3] - .1);
    g.add(car.mesh(mats.liftCar));
    const pit = new Boxes(); pit.add(L[0], -1.2, L[1], L[2], -1.0, L[3]); g.add(pit.mesh(mats.slab));
    return g;
  }

  /* rear garden, parking and cycle yard from the landscaping plan CHRQ-2510-LS (astell associates, Oct 2025),
     scaled and rotated onto the building grid (north = +z, the rear of the building) */
  const SITE = {
    garden: [11.26, 25.31, 25.16, 38.58],
    beds: [[13.95, 37.03, 23.61, 38.58], [11.26, 27.38, 12.57, 37.03], [11.26, 37.03, 13.95, 38.58]],
    hedge: [[11.71, 25.31, 25.16, 25.95], [11.26, 25.31, 11.9, 27.38]],
    trees: [{ x: 16.54, z: 35.38, h: 2.4, k: 'cherry' }, { x: 20.61, z: 37.65, h: 2.3, k: 'rowan' }, { x: 13.5, z: 31.0, h: 2.3, k: 'rowan' },
      { x: 12.64, z: 37.65, h: 1.4, k: 'holly' }, { x: 18.68, z: 25.58, h: 1.4, k: 'holly' }],
    park: [25.16, 24.1, 32.4, 38.76], aisleX: 29.81,
    bays: [{ z0: 35.31, z1: 37.03, t: 'ev' }, { z0: 33.93, z1: 35.31, t: 'hatch' }, { z0: 31.51, z1: 33.93, t: 'dis' }, { z0: 30.31, z1: 31.51, t: 'hatch' }, { z0: 28.07, z1: 30.31, t: 'dis' }, { z0: 25.82, z1: 28.07, t: 'dis' }],
    cycle: [11.37, 19.62, 19.99, 24.1], bins: [18.3, 20.6, 19.8, 22.9],
    neighbour: [0.85, 39.3, 24.12, 42.5]
  };
  window.CH_SITE = SITE;
  function buildSite(mats) {
    const g = new THREE.Group(), G = -.15;
    const pv = new Boxes(), road = new Boxes(), water = new Boxes(), lawn = new Boxes(), bed = new Boxes(), hedge = new Boxes(), asph = new Boxes(), line = new Boxes();
    pv.add(-25, G - .05, -4, 60, G, 47);                  // pavements, rear yard and shared area
    road.add(-25, G - .07, -13, 60, G - .02, -4);         // Regent Quay
    pv.add(-25, G - .05, -17, 60, G, -13);                // quayside
    water.add(-25, -1.6, -60, 60, -1.55, -17);            // Aberdeen Harbour
    lawn.rect(SITE.garden, G, G + .04);
    SITE.beds.forEach(r => bed.rect(r, G, G + .07));
    SITE.hedge.forEach(r => hedge.rect(r, G, G + .85));
    asph.rect(SITE.park, G, G + .02);
    // bay markings: lines between bays across the bay depth
    const P = SITE.park;
    SITE.bays.forEach(b => { line.add(P[0], G + .02, b.z0 - .04, SITE.aisleX, G + .03, b.z0 + .04); line.add(P[0], G + .02, b.z1 - .04, SITE.aisleX, G + .03, b.z1 + .04);
      if (b.t === 'hatch') for (let k = 0; k < 6; k++) { const x0 = P[0] + k * (SITE.aisleX - P[0]) / 6; line.add(x0, G + .02, (b.z0 + b.z1) / 2 - .04, x0 + .5, G + .03, (b.z0 + b.z1) / 2 + .04); } });
    line.add(SITE.aisleX - .05, G + .02, P[1], SITE.aisleX + .05, G + .03, P[3]);
    const mk = new Boxes(); for (let x = -24; x < 60; x += 4) mk.add(x, G - .015, -8.6, x + 2, G - .01, -8.4);
    [[pv, mats.paving], [road, mats.road], [water, mats.water], [lawn, mats.grass], [bed, std('#a88a63')], [hedge, std('#4f7a3c')], [asph, mats.road], [line, std('#f2efe8')], [mk, std('#e9e6df')]].forEach(([b, m]) => { const me = b.mesh(m); if (me) g.add(me); });
    // accessible bay symbols, EV bay and charger
    const wt = wheelchairTex();
    SITE.bays.forEach(b => {
      if (b.t === 'dis') { const pl = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), new THREE.MeshBasicMaterial({ map: wt })); pl.rotation.x = -Math.PI / 2; pl.position.set((P[0] + SITE.aisleX) / 2 - CX, G + .035, (b.z0 + b.z1) / 2 - CZ); g.add(pl); }
      if (b.t === 'ev') {
        const ev = new Boxes(); ev.add(P[0] + .1, G + .02, b.z0 + .1, SITE.aisleX - .1, G + .028, b.z1 - .1); g.add(ev.mesh(std('#2f8a5a')));
        const post = new Boxes(); post.add(P[0] + .15, G, (b.z0 + b.z1) / 2 - .2, P[0] + .45, G + 1.5, (b.z0 + b.z1) / 2 + .2); g.add(post.mesh(std('#e8ecef', { roughness: .4 })));
        const sc = new Boxes(); sc.add(P[0] + .44, G + 1.0, (b.z0 + b.z1) / 2 - .12, P[0] + .46, G + 1.3, (b.z0 + b.z1) / 2 + .12); g.add(sc.mesh(std('#1e9a52', { emissive: '#0b5a2c', emissiveIntensity: .5 })));
      }
    });
    // shrubs in the planting beds
    const shrubGeo = new THREE.SphereGeometry(.38, 10, 8), shrubMats = ['#6f8f4a', '#86a35a', '#a24c5c', '#5d7d42'].map(c => std(c));
    let n = 0;
    SITE.beds.forEach(r => { for (let x = r[0] + .4; x < r[2] - .2; x += .85) for (let z = r[1] + .4; z < r[3] - .2; z += .85) { const m = new THREE.Mesh(shrubGeo, shrubMats[n++ % 4]); m.position.set(x - CX, G + .3, z - CZ); m.scale.y = .8; g.add(m); } });
    // trees
    SITE.trees.forEach(t => {
      const tr = new THREE.Mesh(new THREE.CylinderGeometry(.07, .1, t.h * .55, 8), std('#6b5240')); tr.position.set(t.x - CX, G + t.h * .27, t.z - CZ); g.add(tr);
      const col = t.k === 'holly' ? '#2f5a33' : t.k === 'cherry' ? '#7c9a52' : '#5f8a45';
      const cr = new THREE.Mesh(new THREE.SphereGeometry(t.k === 'holly' ? .55 : .95, 14, 10), std(col)); cr.position.set(t.x - CX, G + t.h * .75, t.z - CZ); if (t.k === 'holly') cr.scale.y = 1.4; g.add(cr);
      if (t.k === 'cherry') { const bl = new THREE.Mesh(new THREE.SphereGeometry(.6, 10, 8), std('#e9c9d2')); bl.position.set(t.x - CX + .35, G + t.h * .85, t.z - CZ - .2); g.add(bl); }
    });
    // cycle shelters (two rows of four) and the bin store
    const cs = new Boxes(), C = SITE.cycle;
    [[23.15, 23.95], [19.75, 20.55]].forEach(([z0, z1]) => { for (let i = 0; i < 4; i++) { const x0 = 11.6 + i * 1.6, x1 = x0 + 1.45;
      cs.add(x0, G, z0, x0 + .05, G + 2.0, z0 + .05); cs.add(x1 - .05, G, z0, x1, G + 2.0, z0 + .05); cs.add(x0, G, z1 - .05, x0 + .05, G + 1.8, z1); cs.add(x1 - .05, G, z1 - .05, x1, G + 1.8, z1); } });
    g.add(cs.mesh(mats.rail));
    const cr = new Boxes(); [[23.15, 23.95], [19.75, 20.55]].forEach(([z0, z1]) => cr.add(11.55, G + 1.8, z0 - .05, 11.6 + 3 * 1.6 + 1.5, G + 2.0, z1 + .05)); g.add(cr.mesh(std('#a9c3d4', { transparent: true, opacity: .55 })));
    const bk = new Boxes(); [[23.15, 23.95], [19.75, 20.55]].forEach(([z0, z1]) => { for (let i = 0; i < 10; i++) bk.add(11.75 + i * .6, G + .05, (z0 + z1) / 2 - .02, 11.79 + i * .6, G + .9, (z0 + z1) / 2 + .02); }); g.add(bk.mesh(std('#2a2f34')));
    const bins = new Boxes(); for (let i = 0; i < 3; i++) bins.add(SITE.bins[0] + .1, G, SITE.bins[1] + .1 + i * .75, SITE.bins[2] - .1, G + 1.25, SITE.bins[1] + .75 + i * .75); g.add(bins.mesh(std('#3d5a45')));
    // neighbouring building beyond the north boundary (context only)
    const nb = new Boxes(); nb.rect([SITE.neighbour[0], SITE.neighbour[1], SITE.neighbour[2], SITE.neighbour[1] + .25], G, G + 1.8); g.add(nb.mesh(std('#b7b2aa')));   // north boundary wall
    // bollards along the quay edge
    const bl = new Boxes(); for (let x = -22; x < 60; x += 3.2) bl.add(x, G, -16.6, x + .25, G + .5, -16.35);
    g.add(bl.mesh(mats.frame));
    return g;
  }
  function roof(mats) {
    const g = new THREE.Group(), b = new Boxes(), y = 5 * H;
    M.slab.typ.forEach(r => b.rect(r, y - M.slabT, y));
    M.typ.ext.concat(M.typ.win).forEach(r => b.rect(r, y, y + .9));
    const lm = new Boxes(); lm.add(M.lift.shaft[0] - .2, y, M.lift.shaft[1] - .2, M.lift.shaft[2] + .2, y + 1.6, M.lift.shaft[3] + .2);
    g.add(b.mesh(mats.roof)); g.add(lm.mesh(mats.ext)); return g;
  }

  /* ---------------- viewer ---------------- */
  function Viewer(host, opts) {
    this.host = host; this.opts = opts = opts || {}; this.mode = opts.mode || 'building'; this.spin = opts.spin !== false;
    const W0 = host.clientWidth || 800, H0 = host.clientHeight || 500;
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); r.setSize(W0, H0); r.outputEncoding = THREE.sRGBEncoding;
    host.appendChild(r.domElement); r.domElement.style.touchAction = 'none';
    r.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); this.lost = true; if (opts.onLost) setTimeout(() => opts.onLost(), 50); }, false);
    const sc = this.scene = new THREE.Scene();
    sc.background = new THREE.Color(opts.bg || '#dfe6ea');
    this.cam = new THREE.PerspectiveCamera(this.mode === 'tour' ? 76 : 40, W0 / H0, .05, 600);
    const mats = this.mats = makeMats();
    if (this.mode !== 'building') { mats.ext.color.set('#dcd7cf').convertSRGBToLinear(); }
    sc.add(this.hemi = new THREE.HemisphereLight(0xf6f2ea, 0x6d655a, this.mode === 'tour' ? .72 : .85));
    const sun = new THREE.DirectionalLight(0xffffff, .62); sun.position.set(-30, 60, -40); sc.add(sun);
    const fill = new THREE.DirectionalLight(0xdfe8f0, .25); fill.position.set(30, 25, 40); sc.add(fill);
    this.labels = document.createElement('div'); this.labels.className = 'v3-labels'; host.appendChild(this.labels);
    this.anchors = [];
    this.levels = {};
    if (this.mode === 'building') this.initBuilding();
    else this.initFloor();
    this.bindControls();
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(host);
    this.loop = this.loop.bind(this); this.raf = requestAnimationFrame(this.loop);
  }
  Viewer.prototype.initBuilding = function () {
    const sc = this.scene, mats = this.mats;
    sc.add(this.site = buildSite(mats));
    for (let L = -1; L <= 4; L++) { const g = buildLevel(L, mats, {}); this.levels[L] = g; sc.add(g); }
    sc.add(this.stairs = buildStairs(mats, 4));
    sc.add(this.roof = roof(mats));
    this.target = new THREE.Vector3(0, 6, 4); this.theta = -2.5; this.phi = 1.05; this.rad = 66; this.minR = 14; this.maxR = 120;
    this.setFloor('all');
  };
  Viewer.prototype.setFloor = function (f) {
    this.floor = f;
    for (const L in this.levels) this.levels[L].visible = f === 'all' || +L <= f;
    this.roof.visible = f === 'all';
    this.site.visible = f !== -1;
    // stairs: hide flights above the cut
    this.stairs.visible = true;
    if (this.stairsCut) { this.scene.remove(this.stairsCut); this.stairsCut = null; }
    if (f !== 'all') { this.scene.remove(this.stairs); this.stairsCut = buildStairs(this.mats, f); this.scene.add(this.stairsCut); }
    else if (!this.stairs.parent) this.scene.add(this.stairs);
    const y = f === 'all' ? 6 : f * H + 1;
    this.targetGoal = new THREE.Vector3(0, y, f === 'all' || f === 0 ? 5 : 0);
    this.radGoal = f === 'all' ? 66 : 46; this.phiGoal = f === 'all' ? 1.08 : .78;
    this.setAnchors();
    this.idle = 0;
  };
  Viewer.prototype.setSpin = function (on) { this.spin = !!on; this.idle = on ? 9999 : 0; };
  Viewer.prototype.showRear = function () {
    this.setFloor(0); this.thetaGoal = .35; this.phiGoal = .9; this.radGoal = 40; this.targetGoal = new THREE.Vector3(18 - CX, 0, 30 - CZ);
  };
  Viewer.prototype.setAnchors = function () {
    const f = this.floor, A = [];
    const add = (x, y, z, t, k) => A.push({ p: new THREE.Vector3(x - CX, y, z - CZ), t, k });
    if (f === 0) {
      const G = 1.2;
      add(18.2, G + .6, 32.0, 'Shared garden', 'room'); add(27.5, G, 36.2, 'EV charging', 'flats');
      add(27.5, G, 29.5, 'Accessible parking ×3', 'core'); add(15.4, 2.6, 21.9, 'Cycle shelter', 'room'); add(19.1, 1.8, 21.8, 'Bins', 'room');
    }
    if (f === 'all' || f === 0) {
      M.ground.entrances.forEach(e => add((e.door[0] + e.door[2]) / 2 + (e.id === 'flats' ? .6 : -.6), (f === 'all' ? 3.6 : 2.6) + (e.id === 'flats' ? .9 : 0), e.door[1] - .5, e.name, e.id));
    }
    if (f !== 'all') {
      const y = f * H + 2.4;
      add((M.lift.shaft[0] + M.lift.shaft[2]) / 2, y, (M.lift.shaft[1] + M.lift.shaft[3]) / 2, 'Lift', 'core');
      add(11.1, y, 9.2, 'Stair A', 'core'); add(25.1, y, 22.8, 'Stair B (escape)', 'exit');
      if (f >= 1) {
        M.refuges.forEach(r => add((r.b[0] + r.b[2]) / 2, f * H + .6, (r.b[1] + r.b[3]) / 2, 'Refuge', 'core'));
        M.exits.typ.slice(0, 2).forEach(e => add(e.x, f * H + 2.6, e.z, 'Exit', 'exit'));
        M.typ.rooms.filter(r => r.name === 'Lounge').forEach(r => add(r.x, f * H + 1.4, r.z, 'Flat ' + ((f - 1) * 7 + r.flat), 'flat'));
      }
      if (f === 0) {
        M.ground.rooms.forEach(r => add(r.x, 1.4, r.z, r.name, r.name.startsWith('Exit') ? 'exit' : 'room'));
        add(22.2, 2.6, 22.4, 'Final fire exit', 'exit');
      }
      if (f === -1) M.basement.rooms.forEach(r => add(r.x, -H + 1.4, r.z, r.name, 'room'));
    }
    this.anchors = A; this.labels.innerHTML = '';
    A.forEach(a => { const d = document.createElement('span'); d.className = 'v3-tag v3-' + a.k; d.textContent = a.t; this.labels.appendChild(d); a.el = d; });
  };
  Viewer.prototype.initFloor = function () {
    const sc = this.scene, mats = this.mats, o = this.opts, L = o.level || 1, host = this.host;
    const lv = buildLevel(L, mats, { focusFlat: this.mode === 'floor' ? o.pos : 0 });
    sc.add(lv); this.levels[L] = lv;
    // the storey below as a solid base so the slab reads from outside
    const st = buildStairs(mats, L); sc.add(st);
    const pos = o.pos, rooms = M.typ.rooms.filter(r => r.flat === pos);
    const fl = M.flats.find(f => f.n === pos), bb = fl.bbox;
    const cx = (bb[0] + bb[2]) / 2 - CX, cz = (bb[1] + bb[3]) / 2 - CZ;
    if (this.mode === 'floor') {
      sc.add(buildSite(mats));
      this.target = new THREE.Vector3(cx, L * H + .5, cz); this.theta = Math.atan2(cx, cz) + .3; this.phi = .58;
      this.rad = Math.max(bb[2] - bb[0], bb[3] - bb[1]) * .95 + 7; this.minR = 5; this.maxR = 70;
      this.anchors = rooms.filter(r => r.name !== 'Hall' || true).map(r => ({ p: new THREE.Vector3(r.x - CX, L * H + 1.3, r.z - CZ), t: r.name, k: 'room' }));
      this.labels.innerHTML = ''; this.anchors.forEach(a => { const d = document.createElement('span'); d.className = 'v3-tag v3-room'; d.textContent = a.t; this.labels.appendChild(d); a.el = d; });
    } else {
      // walk-through: ceilings over this flat, warm lights in each room, distant panorama
      const c = new Boxes(); M.typ.flatFloor[pos].forEach(r => c.rect(r, L * H + 2.7, L * H + 2.74));
      sc.add(c.mesh(std('#f1eee8', { side: THREE.DoubleSide, emissive: '#d9d4cc', emissiveIntensity: .45 })));
      rooms.forEach(r => { const p = new THREE.PointLight(0xfff0dc, .32, 6.5, 1.8); p.position.set(r.x - CX, L * H + 2.4, r.z - CZ); sc.add(p); });
      const pano = new THREE.Mesh(new THREE.CylinderGeometry(160, 160, 120, 64, 1, true), new THREE.MeshBasicMaterial({ map: panoramaTex(), side: THREE.BackSide, fog: false }));
      pano.material.map.wrapS = THREE.RepeatWrapping; pano.material.map.repeat.x = -1; pano.position.y = L * H + 20; sc.add(pano);
      sc.add(buildSite(mats));
      sc.background = new THREE.Color('#e4e9ec');
      this.eyeY = L * H + 1.6; this.yaw = 0; this.pitch = -.05; this.L = L;
      this.rooms = rooms; this.walls = [].concat(M.typ.ext, M.typ.core, M.typ.sep, M.typ.part, M.typ.tops.map(t => t.b), M.typ.ward);
      this.walls = this.walls.concat(M.typ.win.map(w => [w[0] + .12, w[1] + .12, w[2] - .12, w[3] - .12]).filter(w => w[2] > w[0] && w[3] > w[1]));
      this.furnBoxes = M.typ.furn.concat(M.typ.fix.filter(f => f.t !== 'hob' && f.t !== 'sink')).map(f => { const k = f.t === 'dining' ? .5 : 1; return [f.x - f.w / 2 * k, f.z - f.d / 2 * k, f.x + f.w / 2 * k, f.z + f.d / 2 * k]; });
      this.cam.position.set(0, this.eyeY, 0);
      this.floorPlane = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshBasicMaterial({ visible: false }));
      this.floorPlane.rotation.x = -Math.PI / 2; this.floorPlane.position.y = L * H; sc.add(this.floorPlane);
      this.buildGrid();
      const start = rooms.find(r => r.name === 'Hall') || rooms[0], [sx, sz] = this.nearestFree(start.x, start.z);
      this.pos3 = new THREE.Vector3(sx - CX, this.eyeY, sz - CZ); this.goal = this.pos3.clone();
      this.yaw = this.bestYaw(sx, sz); this.cam.position.copy(this.pos3);
      this.fadeEl = document.createElement('div'); this.fadeEl.className = 'v3-fade'; host.appendChild(this.fadeEl);
    }
  };
  Viewer.prototype.blocked = function (x, z, rad, wallsOnly) {
    rad = rad || .22;
    for (const r of this.walls) if (x > r[0] - rad && x < r[2] + rad && z > r[1] - rad && z < r[3] + rad) return true;
    if (!wallsOnly && this.furnBoxes) for (const r of this.furnBoxes) if (x > r[0] - rad * .6 && x < r[2] + rad * .6 && z > r[1] - rad * .6 && z < r[3] + rad * .6) return true;
    return false;
  };
  Viewer.prototype.nearestFree = function (x, z) {
    const g = this.grid; if (!g) return [x, z];
    let i0 = Math.floor((x - g.x0) / g.c), j0 = Math.floor((z - g.z0) / g.c);
    for (let r = 0; r < 25; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
      if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
      const i = i0 + di, j = j0 + dj;
      if (i >= 0 && j >= 0 && i < g.nx && j < g.nz && g.free[j * g.nx + i]) return [g.x0 + (i + .5) * g.c, g.z0 + (j + .5) * g.c];
    }
    return [x, z];
  };
  Viewer.prototype.viewYaw = function (x, z) {
    // look across the room towards the farthest window that can be seen from here, else the most open direction
    let best = null, bd = 0;
    for (const w of M.typ.win) {
      const wx = (w[0] + w[2]) / 2, wz = (w[1] + w[3]) / 2, d = Math.hypot(wx - x, wz - z);
      if (d > 8 || d < 1.2) continue;
      let ok = true;
      for (let t = .1; t < d - .5; t += .1) { if (this.blocked(x + (wx - x) * t / d, z + (wz - z) * t / d, .03, true)) { ok = false; break; } }
      if (ok && d > bd) { bd = d; best = Math.atan2(-(wx - x), -(wz - z)); }
    }
    return best == null ? this.bestYaw(x, z) : best;
  };
  Viewer.prototype.bestYaw = function (x, z) {
    const ray = a => { const dx = -Math.sin(a), dz = -Math.cos(a); let d = 0; while (d < 12 && !this.blocked(x + dx * d, z + dz * d, .05, true)) d += .1; return d; };
    let best = 0, bl = -1;
    for (let k = 0; k < 36; k++) {
      const a = k / 36 * Math.PI * 2; let sum = 0;
      for (const o of [-.5, -.25, 0, .25, .5]) sum += Math.min(ray(a + o), 7);
      if (sum > bl) { bl = sum; best = a; }
    }
    return best;
  };
  Viewer.prototype.goRoom = function (i) {
    const r = this.rooms[i]; if (!r) return;
    let [px, pz] = this.nearestFree(r.x, r.z);
    const yaw = r.name === 'Hall' ? this.bestYaw(px, pz) : this.viewYaw(px, pz), f = this.fadeEl;
    // step back from what we are looking at for a wider view
    const bx = Math.sin(yaw), bz = Math.cos(yaw);
    for (let d = 0; d < 1.6; d += .1) { if (this.blocked(px + bx * .1, pz + bz * .1, .3)) break; px += bx * .1; pz += bz * .1; }
    const jump = () => { this.pos3.set(px - CX, this.eyeY, pz - CZ); this.goal = this.pos3.clone(); this.path = null; this.yaw = yaw; this.yawGoal = null; this.pitch = -.05; this.idle = 0; };
    if (!f) return jump();
    f.style.opacity = 1; setTimeout(() => { jump(); f.style.opacity = 0; }, 220);
  };
  Viewer.prototype.buildGrid = function () {
    const fl = M.flats.find(f => f.n === this.opts.pos).bbox, c = .15;
    const g = this.grid = { x0: fl[0] - 2, z0: fl[1] - 2, c, nx: Math.ceil((fl[2] - fl[0] + 4) / c), nz: Math.ceil((fl[3] - fl[1] + 4) / c) };
    g.free = new Uint8Array(g.nx * g.nz);
    for (let j = 0; j < g.nz; j++) for (let i = 0; i < g.nx; i++) g.free[j * g.nx + i] = this.blocked(g.x0 + (i + .5) * c, g.z0 + (j + .5) * c, .2) ? 0 : 1;
  };
  Viewer.prototype.findPath = function (x0, z0, x1, z1) {
    const g = this.grid; if (!g) return null;
    const ci = (x, z) => [Math.floor((x - g.x0) / g.c), Math.floor((z - g.z0) / g.c)];
    [x0, z0] = this.nearestFree(x0, z0); [x1, z1] = this.nearestFree(x1, z1);
    const [si, sj] = ci(x0, z0), [ti, tj] = ci(x1, z1);
    const ok = (i, j) => i >= 0 && j >= 0 && i < g.nx && j < g.nz && g.free[j * g.nx + i];
    if (!ok(ti, tj)) return null;
    const prev = new Int32Array(g.nx * g.nz).fill(-1), q = [sj * g.nx + si]; prev[q[0]] = q[0];
    for (let h = 0; h < q.length; h++) {
      const k = q[h]; if (k === tj * g.nx + ti) break;
      const i = k % g.nx, j = (k / g.nx) | 0;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const a = i + di, b = j + dj, n = b * g.nx + a;
        if (ok(a, b) && prev[n] < 0 && (!di || !dj || (ok(i + di, j) && ok(i, j + dj)))) { prev[n] = k; q.push(n); }
      }
    }
    let k = tj * g.nx + ti; if (prev[k] < 0) return null;
    const pts = []; while (k !== prev[k]) { pts.push(k); k = prev[k]; }
    pts.reverse();
    const out = pts.filter((_, n) => n % 3 === 2 || n === pts.length - 1).map(k => new THREE.Vector3(g.x0 + ((k % g.nx) + .5) * g.c - CX, this.eyeY, g.z0 + (((k / g.nx) | 0) + .5) * g.c - CZ));
    return out;
  };
  Viewer.prototype.bindControls = function () {
    const el = this.renderer.domElement, pts = new Map(); let pinch = 0, moved = 0;
    this.idle = 0; this.keys = {};
    const stop = () => { if (this.spin && this.opts.onSpin) { this.spin = false; this.opts.onSpin(false); } else this.spin = false; };
    el.addEventListener('pointerdown', e => { stop(); el.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = 0; this.idle = 0; });
    el.addEventListener('pointermove', e => {
      if (this.mode !== 'tour' && !pts.size) this.hover(e);
      if (!pts.has(e.pointerId)) return;
      const p = pts.get(e.pointerId), dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; moved += Math.abs(dx) + Math.abs(dy); this.idle = 0;
      if (pts.size === 2) { const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch) this.zoom(pinch / d); pinch = d; return; }
      if (this.mode === 'tour') { this.yaw += dx * .005; this.pitch = Math.max(-1, Math.min(1, this.pitch + dy * .004)); this.yawGoal = null; }
      else if (e.buttons === 2 || e.shiftKey) { this.pan(dx, dy); }
      else { this.theta -= dx * .007; this.phi = Math.max(.12, Math.min(1.45, this.phi - dy * .005)); }
    });
    const up = e => {
      if (pts.has(e.pointerId) && moved < 6) this.click(e);
      pts.delete(e.pointerId); pinch = 0;
    };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', e => { pts.delete(e.pointerId); pinch = 0; });
    el.addEventListener('contextmenu', e => e.preventDefault());
    el.addEventListener('wheel', e => { stop(); e.preventDefault(); this.zoom(e.deltaY > 0 ? 1.08 : .93); this.idle = 0; }, { passive: false });
    el.tabIndex = 0;
    el.addEventListener('keydown', e => { this.keys[e.key.toLowerCase()] = true; if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) e.preventDefault(); });
    el.addEventListener('keyup', e => { this.keys[e.key.toLowerCase()] = false; });
  };
  Viewer.prototype.zoom = function (f) {
    if (this.mode === 'tour') { this.cam.fov = Math.max(40, Math.min(90, this.cam.fov * f)); this.cam.updateProjectionMatrix(); }
    else { this.rad = Math.max(this.minR, Math.min(this.maxR, this.rad * f)); this.radGoal = null; }
  };
  Viewer.prototype.pan = function (dx, dy) {
    const s = this.rad * .0016, right = new THREE.Vector3(Math.cos(this.theta), 0, -Math.sin(this.theta)), fwd = new THREE.Vector3(Math.sin(this.theta), 0, Math.cos(this.theta));
    this.target.addScaledVector(right, -dx * s).addScaledVector(fwd, -dy * s); this.targetGoal = null;
  };
  Viewer.prototype.pick = function (e) {
    const rc = new THREE.Raycaster(), r = this.renderer.domElement.getBoundingClientRect();
    rc.setFromCamera({ x: (e.clientX - r.left) / r.width * 2 - 1, y: -(e.clientY - r.top) / r.height * 2 + 1 }, this.cam);
    return rc;
  };
  Viewer.prototype.flatAt = function (e) {
    if (this.mode !== 'building' || this.floor === 'all' || this.floor < 1) return null;
    const lv = this.levels[this.floor]; if (!lv.userData.floorGroup) return null;
    const hit = this.pick(e).intersectObjects(lv.userData.floorGroup.children)[0];
    return hit ? hit.object : null;
  };
  Viewer.prototype.hover = function (e) {
    const o = this.flatAt(e);
    if (this.hovered && this.hovered !== o) { this.hovered.material = this.mats.wood; }
    if (o) { if (!this.hoverMat) this.hoverMat = std('#d9874a', { roughness: .7 }); o.material = this.hoverMat; }
    this.hovered = o; this.renderer.domElement.style.cursor = o ? 'pointer' : 'grab';
  };
  Viewer.prototype.click = function (e) {
    if (this.mode === 'tour') {
      const hit = this.pick(e).intersectObject(this.floorPlane)[0]; if (!hit) return;
      const x = hit.point.x + CX, z = hit.point.z + CZ;
      const path = this.findPath(this.pos3.x + CX, this.pos3.z + CZ, x, z);
      if (path && path.length) { this.path = path; this.goal = path.shift(); this.yawGoal = null; this.idle = 0; }
      return;
    }
    const o = this.flatAt(e);
    if (o && this.opts.onFlat) this.opts.onFlat(o.userData.flat);
  };
  Viewer.prototype.resize = function () {
    const w = this.host.clientWidth, h = this.host.clientHeight; if (!w || !h) return;
    this.renderer.setSize(w, h); this.cam.aspect = w / h; this.cam.updateProjectionMatrix();
  };
  Viewer.prototype.loop = function () {
    if (this.dead) return; this.raf = requestAnimationFrame(this.loop); if (this.paused || this.lost) return; this.idle++;
    const cam = this.cam;
    if (this.mode === 'tour') {
      const k = this.keys, sp = .055; let mx = 0, mz = 0;
      if (k['w'] || k['arrowup']) mz -= 1; if (k['s'] || k['arrowdown']) mz += 1; if (k['a']) mx -= 1; if (k['d']) mx += 1;
      if (k['arrowleft']) this.yaw += .03; if (k['arrowright']) this.yaw -= .03;
      if (mx || mz) {
        const s = Math.sin(this.yaw), c = Math.cos(this.yaw);
        const dx = (mx * c + mz * s) * sp, dz = (-mx * s + mz * c) * sp;
        const nx = this.pos3.x + dx, nz = this.pos3.z + dz;
        if (!this.blocked(nx + CX, this.pos3.z + CZ)) this.pos3.x = nx;
        if (!this.blocked(this.pos3.x + CX, nz + CZ)) this.pos3.z = nz;
        this.goal.copy(this.pos3); this.yawGoal = null; this.idle = 0;
      } else {
        const d = this.goal.clone().sub(this.pos3), L = d.length();
        if (L > .01) {
          const step = d.multiplyScalar(Math.min(1, .06 / L));
          this.pos3.add(step);
          if (this.path && this.path.length === 0) { }
        } else if (this.path && this.path.length) this.goal = this.path.shift();
      }
      if (this.yawGoal != null) { let dy = this.yawGoal - this.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); this.yaw += dy * .08; if (Math.abs(dy) < .002) this.yawGoal = null; }
      else if (this.idle > 300 && this.spin) this.yaw += .0012;
      cam.position.copy(this.pos3); cam.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
    } else {
      if (this.targetGoal) { this.target.lerp(this.targetGoal, .08); if (this.target.distanceTo(this.targetGoal) < .01) this.targetGoal = null; }
      if (this.radGoal) { this.rad += (this.radGoal - this.rad) * .08; if (Math.abs(this.radGoal - this.rad) < .05) this.radGoal = null; }
      if (this.thetaGoal != null) { let d = this.thetaGoal - this.theta; d = Math.atan2(Math.sin(d), Math.cos(d)); this.theta += d * .06; if (Math.abs(d) < .002) this.thetaGoal = null; }
      if (this.phiGoal) { this.phi += (this.phiGoal - this.phi) * .08; if (Math.abs(this.phiGoal - this.phi) < .002) this.phiGoal = null; }
      if (this.idle > 220 && !this.opts.still && this.spin) this.theta += .0016;
      cam.position.set(this.target.x + this.rad * Math.sin(this.phi) * Math.sin(this.theta), this.target.y + this.rad * Math.cos(this.phi), this.target.z + this.rad * Math.sin(this.phi) * Math.cos(this.theta));
      cam.lookAt(this.target);
    }
    this.renderer.render(this.scene, cam);
    // labels
    if (this.anchors.length) {
      const w = this.host.clientWidth, h = this.host.clientHeight, v = new THREE.Vector3();
      for (const a of this.anchors) {
        v.copy(a.p).project(cam);
        const vis = v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05;
        a.el.style.display = vis ? '' : 'none';
        if (vis) a.el.style.transform = `translate(${(v.x * .5 + .5) * w}px,${(-v.y * .5 + .5) * h}px) translate(-50%,-50%)`;
      }
    }
  };
  Viewer.prototype.dispose = function () {
    if (this.dead) return; this.dead = true; cancelAnimationFrame(this.raf); this.ro.disconnect();
    this.scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m.map) m.map.dispose(); m.dispose(); }); } });
    this.renderer.dispose(); try { this.renderer.forceContextLoss(); } catch (e) { } this.renderer.domElement.remove(); this.labels.remove(); if (this.fadeEl) this.fadeEl.remove();
  };
  window.CH3D = { Viewer, M, CX, CZ };
})();
