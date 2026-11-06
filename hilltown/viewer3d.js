/* Hilltown 3D viewer — 112–114 Hilltown, Dundee.
   Geometry comes from window.HT_MODEL, traced from LAS Architecture's proposed plans, sections and elevations
   (LAS26044_03–07, Aug 2026). Units: metres. Plan x to the right, plan z down the drawing; Hilltown (the street) is at +z. */
(function () {
  const M = window.HT_MODEL;
  if (!M) return;
  const LV = M.levels, CX = 10.8, CZ = 10.0;
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
    const m = {
      render: std('#ebe7df'), brick: std('#9a5440', { roughness: .95 }), core: std('#efebe4'), part: std('#f6f3ee'), slab: std('#d6d1c8'),
      fascia: std('#4a4f55', { roughness: .6 }), doorGrey: std('#3f454b', { roughness: .5 }), sill: std('#d9d3c8'), lead: std('#5d6268', { roughness: .5 }),
      terracotta: std('#b8643f', { roughness: .8 }), joint: std('#8d4a2e'), steelDark: std('#8e969c', { roughness: .45, metalness: .55 }), deck: std('#7b6a58', { roughness: .8 }),
      slate: std('#4f565e', { roughness: .75 }), membrane: std('#5b6066', { roughness: .7 }), chimney: std('#d8d2c7'), pot: std('#a8603f', { roughness: .8 }),
      wood: std('#b98f63', { roughness: .7 }), woodMuted: std('#d8d3cb'), tile: std('#d3dadd', { roughness: .5 }), stone: std('#d4cec4'),
      glass: std('#a9cbe0', { transparent: true, opacity: .26, roughness: .05, metalness: .1, depthWrite: false }),
      frame: std('#3b4148', { roughness: .5 }), unit: std('#e8e4dd', { roughness: .6 }), top: std('#353a40', { roughness: .4 }), black: std('#16191c', { roughness: .3 }),
      steel: std('#b9c0c5', { roughness: .3, metalness: .6 }), white: std('#f8f7f4', { roughness: .35 }),
      sofa: std('#4a6072'), linen: std('#eeeae3'), throw: std('#c2601a'), furnWood: std('#8b6446', { roughness: .7 }),
      chair: std('#2e3338', { roughness: .6 }), rug: std('#cbc3b6'), stair: std('#bfb7ab'), rail: std('#2a2f34', { roughness: .4, metalness: .4 }),
      paving: std('#a29f98'), kerb: std('#8d8a84'), road: std('#4c5156'), yard: std('#8f8b84'), grass: std('#8a9a7b'),
      shrub: std('#5f7a52'), shrub2: std('#6d8a5c'), stoneL: std('#b9a48c'), stoneR: std('#a8968a'), shop: std('#2d3d4a'), nbWin: std('#4a5560', { roughness: .3 })
    };
    m.renderDS = std('#ebe7df', { side: THREE.DoubleSide });
    m.render.side = THREE.DoubleSide; m.slate.side = THREE.DoubleSide;
    return m;
  }

  /* ---------------- canvas textures ---------------- */
  function canvasTex(w, h, draw) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return t;
  }
  function signTex(text) {
    return canvasTex(1024, 76, (g, w, h) => {
      g.clearRect(0, 0, w, h); g.fillStyle = '#e9dcc0'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = '600 56px Georgia, "Times New Roman", serif'; g.fillText(text.split('').join(String.fromCharCode(8202)), w / 2, h / 2 + 2);
    });
  }
  function panoramaTex() {
    // Dundee from the Hilltown: tenements and spires down the slope, the Tay and Fife hills to the south
    return canvasTex(4096, 512, (g, w, h) => {
      const sky = g.createLinearGradient(0, 0, 0, 300); sky.addColorStop(0, '#93aec2'); sky.addColorStop(1, '#e4e9ec');
      g.fillStyle = sky; g.fillRect(0, 0, w, h);
      g.fillStyle = '#8a97a3'; g.beginPath(); g.moveTo(0, 300); for (let x = 0; x <= w; x += 40) g.lineTo(x, 286 - 16 * Math.sin(x / 260) - 8 * Math.sin(x / 90)); g.lineTo(w, 340); g.lineTo(0, 340); g.fill();
      g.fillStyle = '#6f8ea4'; g.fillRect(0, 300, w, 22);
      for (let i = 0; i < 90; i++) {
        const x = (i * 47) % w, bw = 40 + (i * 37) % 60, bh = 30 + (i * 53) % 80;
        g.fillStyle = ['#a6907c', '#9b8a7b', '#8c8279'][i % 3]; g.fillRect(x, 340 - bh, bw, bh + 200);
        g.fillStyle = '#5d676f'; for (let r = 0; r < 3; r++) for (let k = 0; k < 3; k++) g.fillRect(x + 6 + k * (bw / 3.4), 350 - bh + r * 24, 8, 13);
        if (i % 17 === 3) { g.fillStyle = '#7f7a74'; g.beginPath(); g.moveTo(x + bw / 2 - 6, 340 - bh); g.lineTo(x + bw / 2, 270 - bh); g.lineTo(x + bw / 2 + 6, 340 - bh); g.fill(); }
      }
      g.fillStyle = '#7d858b'; g.fillRect(0, 470, w, 42);
    });
  }
  /* ---------------- polygon prisms (walls traced from the drawings are not axis-aligned) ---------------- */
  function Prisms() { this.p = []; this.n = []; }
  Prisms.prototype.tri = function (a, b, c, n) {
    // a,b,c: [x,y,z] in plan metres; n: outward normal; winding fixed to match n
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
    if (!n) { const l = Math.hypot(cx, cy, cz) || 1; n = [cx / l, cy / l, cz / l]; }
    if (cx * n[0] + cy * n[1] + cz * n[2] < 0) { const t = b; b = c; c = t; }
    for (const q of [a, b, c]) { this.p.push(q[0] - CX, q[1], q[2] - CZ); this.n.push(n[0], n[1], n[2]); }
  };
  Prisms.prototype.poly = function (ring, holes, y0, y1) {
    if (!ring || ring.length < 3 || y1 - y0 < 1e-4) return;
    const V2 = p => new THREE.Vector2(p[0], p[1]);
    let C = ring.map(V2); if (THREE.ShapeUtils.isClockWise(C)) C.reverse();
    const Hs = (holes || []).filter(h => h.length > 2).map(h => { const a = h.map(V2); if (!THREE.ShapeUtils.isClockWise(a)) a.reverse(); return a; });
    const all = C.concat(...Hs), tris = THREE.ShapeUtils.triangulateShape(C, Hs);
    for (const t of tris) {
      const [a, b, c] = t.map(i => all[i]);
      this.tri([a.x, y1, a.y], [b.x, y1, b.y], [c.x, y1, c.y], [0, 1, 0]);
      this.tri([a.x, y0, a.y], [b.x, y0, b.y], [c.x, y0, c.y], [0, -1, 0]);
    }
    const loops = [C].concat(Hs), test = [ring].concat(holes || []);
    for (const lp of loops) for (let i = 0; i < lp.length; i++) {
      const p = lp[i], q = lp[(i + 1) % lp.length], dx = q.x - p.x, dz = q.y - p.y, l = Math.hypot(dx, dz); if (l < 1e-5) continue;
      let n = [dz / l, 0, -dx / l];
      const mx = (p.x + q.x) / 2 + n[0] * .004, mz = (p.y + q.y) / 2 + n[2] * .004;
      if (inPoly(mx, mz, ring, holes)) n = [-n[0], 0, -n[2]];
      this.tri([p.x, y0, p.y], [q.x, y0, q.y], [q.x, y1, q.y], n); this.tri([p.x, y0, p.y], [q.x, y1, q.y], [p.x, y1, p.y], n);
    }
  };
  Prisms.prototype.face = function (pts, flipUp) {   // planar convex 3D polygon [[x,y,z]…], normal points up (or out)
    for (let i = 1; i < pts.length - 1; i++) {
      const a = pts[0], b = pts[i], c = pts[i + 1];
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      let n = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx]; const l = Math.hypot(...n) || 1; n = n.map(v => v / l);
      if ((flipUp !== false) && n[1] < 0) n = n.map(v => -v);
      this.tri(a, b, c, n);
    }
  };
  Prisms.prototype.quadBox = function (p0, p1, th, y0, y1, off) {   // box along segment p0→p1 with thickness th, offset sideways by off
    const dx = p1[0] - p0[0], dz = p1[1] - p0[1], l = Math.hypot(dx, dz); if (l < 1e-4) return;
    const nx = -dz / l, nz = dx / l, o = off || 0, h = th / 2;
    const q = [[p0[0] + nx * (o - h), p0[1] + nz * (o - h)], [p1[0] + nx * (o - h), p1[1] + nz * (o - h)], [p1[0] + nx * (o + h), p1[1] + nz * (o + h)], [p0[0] + nx * (o + h), p0[1] + nz * (o + h)]];
    this.poly(q, [], y0, y1);
  };
  Prisms.prototype.mesh = function (mat) {
    if (!this.p.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    return new THREE.Mesh(g, mat);
  };
  function inPoly(x, z, ring, holes) {
    const inside = r => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, zi] = r[i], [xj, zj] = r[j]; if (((zi > z) !== (zj > z)) && (x < (xj - xi) * (z - zi) / (zj - zi) + xi)) c = !c; } return c; };
    if (!inside(ring)) return false; for (const h of holes || []) if (inside(h)) return false; return true;
  }
  const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const centroid = r => r.reduce((s, p) => [s[0] + p[0] / r.length, s[1] + p[1] / r.length], [0, 0]);
  function distToFoot(x, z) {
    const F = M.foot; let d = 1e9;
    for (let i = 0; i < F.length; i++) { const a = F[i], b = F[(i + 1) % F.length], dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz))); d = Math.min(d, Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz)); }
    return d;
  }

  /* ---------------- levels ---------------- */
  const E = M.eaves, RG = M.ridge;
  const pavY = x => -.05 + .09 * (x - 6.9);          // Hilltown climbs about 1 in 11 towards the barber's
  function buildLevel(L, mats, opt) {
    opt = opt || {};
    const lv = LV[L], y = lv.y, top = lv.top, grp = new THREE.Group(); grp.userData.level = L;
    const P = {}, p = k => (P[k] = P[k] || new Prisms());
    const B = {}, b = k => (B[k] = B[k] || new Boxes());
    lv.slab.forEach(s => p('slab').poly(s.o, s.h, y - .32, y));
    // masonry: the street front of the ground floor is red brick, the rest is render; inner walls are painted
    lv.ext.forEach(w => {
      const c = centroid(w.o), outer = distToFoot(c[0], c[1]) < .7 || c[1] > 15.3;
      p(L === 0 && c[1] > 15.2 ? 'brick' : outer ? 'render' : 'core').poly(w.o, w.h, y, outer ? top : y + lv.ceil);
    });
    lv.part.forEach(w => p('part').poly(w.o, w.h, y, y + lv.ceil));
    // openings: sills, heads, glass, frames
    lv.open.forEach(o => {
      const wm = L === 0 && o.f === 'f' ? 'brick' : 'render', q = o.q, a = lerp2(q[0], q[3], .5), c = lerp2(q[1], q[2], .5);
      if (o.k === 'bay') { p(wm).poly(q, [], y + o.h, top); return; }
      if (o.s > .01) p(wm).poly(q, [], y, y + o.s);
      p(wm).poly(q, [], y + o.h, top);
      const gl = (y0, y1) => p('glass').quadBox(a, c, .03, y0, y1, 0);
      const fr = (y0, y1) => p('frame').quadBox(a, c, .09, y0, y1, 0);
      const jamb = (t, y0, y1) => { const m = lerp2(a, c, t), m2 = lerp2(a, c, t + .035 / Math.hypot(c[0] - a[0], c[1] - a[1])); p('frame').quadBox(m, m2, .09, y0, y1, 0); };
      if (o.k === 'win') {
        gl(y + o.s, y + o.h); fr(y + o.s, y + o.s + .07); fr(y + o.h - .07, y + o.h);
        const mid = y + o.s + (o.h - o.s) * .52; fr(mid - .03, mid + .03);            // sash meeting rail
        jamb(0, y + o.s, y + o.h); jamb(.965, y + o.s, y + o.h);
        p('sill').quadBox(lerp2(a, c, -.04), lerp2(a, c, 1.04), .1, y + o.s - .06, y + o.s, o.f === 'f' ? .3 : -.27);
      } else if (o.k === 'door' || o.k === 'screen') {
        if (o.f === 'f') {   // street door with a fanlight
          p('doorGrey').quadBox(a, c, .06, y - .17, y + 2.3, 0); gl(y + 2.38, y + o.h); fr(y + 2.3, y + 2.38);
        } else { gl(y + .02, y + o.h); fr(y, y + .06); fr(y + o.h - .07, y + o.h); jamb(0, y, y + o.h); jamb(.5, y, y + o.h); jamb(.965, y, y + o.h); }
      } else if (o.k === 'gate') {   // pend gates: vertical slats
        const n = 26; for (let i = 0; i <= n; i++) { const m = lerp2(a, c, i / n), m2 = lerp2(a, c, i / n + .012); p('doorGrey').quadBox(m, m2, .05, pavY(m[0]) - .02, y + 2.75, .1); }
        p('doorGrey').quadBox(a, c, .06, y + 2.65, y + 2.75, .1); p('doorGrey').quadBox(a, c, .06, y + .3, y + .38, .1);
      }
    });
    // bays: three glazed faces on the first and second floors
    if (L > 0) M.bays.forEach(bay => {
      const H = L === 1 ? 2.95 : 2.65, s = L === 1 ? .55 : .6;
      for (let i = 0; i < 3; i++) {
        const a = bay[i], c = bay[i + 1], l = Math.hypot(c[0] - a[0], c[1] - a[1]), k0 = .16 / l, a2 = lerp2(a, c, k0), c2 = lerp2(a, c, 1 - k0);
        p('render').quadBox(a, c, .22, y, y + s, -.11); p('render').quadBox(a, c, .22, y + H, top, -.11);
        p('glass').quadBox(a2, c2, .03, y + s, y + H, -.1); p('frame').quadBox(a2, c2, .09, y + s + (H - s) * .52 - .03, y + s + (H - s) * .52 + .03, -.1);
        p('frame').quadBox(a2, c2, .09, y + s, y + s + .07, -.1); p('frame').quadBox(a2, c2, .09, y + H - .07, y + H, -.1);
        p('render').quadBox(a, lerp2(a, c, k0), .22, y + s, y + H, -.11); p('render').quadBox(lerp2(a, c, 1 - k0), c, .22, y + s, y + H, -.11);
        p('sill').quadBox(lerp2(a, c, -.02), lerp2(a, c, 1.02), .12, y + s - .06, y + s, -.24);
      }
      p('slab').poly(bay, [], y - .32, y + .001);
      if (L === 2) { p('lead').poly(bay.map(q => [q[0], q[1] + .02]), [], top - .02, top + .14); }
      if (L === 1) { p('fascia').poly(bay, [], y - .12, y + .02); [bay[1], bay[2]].forEach(q => { p('fascia').quadBox([q[0] - .1, q[1] - .3], [q[0] + .1, q[1] - .3], .5, y - .62, y - .12, 0); p('fascia').quadBox([q[0] - .1, q[1] - .15], [q[0] + .1, q[1] - .15], .2, y - .85, y - .62, 0); }); }
    });
    // street front: fascia band over the ground floor, cornice and gutter at the eaves
    if (L === 0) {
      p('fascia').quadBox([2.25, 16.0], [19.05, 16.0], .2, 2.98, 3.95, 0);
      p('fascia').quadBox([2.25, 16.08], [19.05, 16.08], .1, 3.88, 3.98, 0);
      // brick skin over the ground-floor street front, between the openings
      const gaps = lv.open.filter(o => o.f === 'f').map(o => [o.x0, o.x1]).sort((a, c) => a[0] - c[0]);
      let x = 2.3; gaps.concat([[19.0, 19.0]]).forEach(([a, c]) => { if (a - x > .02) p('brick').quadBox([x, 15.95], [a, 15.95], .06, pavY(x) - .3, 2.98, 0); x = Math.max(x, c); });
      gaps.forEach(([a, c], i) => { const o = lv.open.filter(o => o.f === 'f').sort((u, v) => u.x0 - v.x0)[i]; p('brick').quadBox([a, 15.95], [c, 15.95], .06, y + o.h, 2.98, 0); if (o.s > .01) p('brick').quadBox([a, 15.95], [c, 15.95], .06, pavY(a) - .3, y + o.s, 0); });
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(5.4, .4), new THREE.MeshBasicMaterial({ map: grp.userData.sign = signTex('HILLSIDE  WORKS'), transparent: true }));
      sign.position.set(11.4 - CX, 3.42, 16.105 - CZ); grp.add(sign);
      const g2 = sign.clone(); g2.scale.set(.6, .6, 1); g2.position.set(4.2 - CX, 1.6, 16.1 - CZ); grp.add(g2);
      p('fascia').quadBox([2.75, 16.04], [5.65, 16.04], .03, 1.35, 1.85, 0);
      p('brick').quadBox([2.3, 15.98], [19.0, 15.98], .14, -1.2, .17, 0);   // plinth down to the sloping pavement
    }
    if (L === 2) { p('fascia').quadBox([2.25, 16.15], [19.05, 16.15], .5, E - .32, E + .02, 0); }
    // floors
    const focus = opt.focusFlat || 0, fg = new THREE.Group(); fg.userData.floors = true;
    for (const n in lv.flatFloor) {
      const fp = new Prisms(); lv.flatFloor[n].forEach(s => fp.poly(s.o, s.h, y + .001, y + .016));
      const m = fp.mesh(focus && +n !== focus ? mats.woodMuted : mats.wood); if (m) { m.userData.flat = +n; m.userData.level = L; fg.add(m); }
    }
    grp.add(fg); grp.userData.floorGroup = fg;
    lv.common.forEach(s => p('stone').poly(s.o, s.h, y + .001, y + .012));
    if (opt.detail !== false) {
      lv.fix.forEach(f => {
        const [x0, z0, x1, z1] = f.b; const g = { x: (x0 + x1) / 2, z: (z0 + z1) / 2, w: x1 - x0, d: z1 - z0, r: f.r, t: f.t };
        if (f.t === 'bath') { b('white').rect([x0, z0, x1, z1], y, y + .55); b('tile').rect([x0 + .06, z0 + .06, x1 - .06, z1 - .06], y + .5, y + .56); b('glass').rect(sideRect(Object.assign({}, g, { r: { 0: 2, 2: 0, 1: 3, 3: 1 }[f.r] }), .015), y + .56, y + 2.0); }
        else if (f.t === 'sink') fixture(g, y, b);
        else fixture(g, y, b);
        if (f.t === 'shower' || f.t === 'bath') b('tile').rect(sideRect(g, .02), y, y + 2.1);
      });
      lv.kit.forEach(k => {
        const r = k.b; b('unit').rect(r, y, y + .86); b('top').rect([r[0] - .01, r[1] - .01, r[2] + .01, r[3] + .01], y + .86, y + .9);
        const back = .35, wu = k.side === 'n' ? [r[0], r[1], r[2], r[1] + back] : k.side === 's' ? [r[0], r[3] - back, r[2], r[3]] : k.side === 'e' ? [r[2] - back, r[1], r[2], r[3]] : k.side === 'w' ? [r[0], r[1], r[0] + back, r[3]] : null;
        if (wu) b('unit').rect(wu, y + 1.45, y + 2.15);
        if (k.side === 'i' || k.side === 'e') { const cx = (r[0] + r[2]) / 2, cz = (r[1] + r[3]) / 2; b('black').rect([cx - .3, cz - .25, cx + .3, cz + .25], y + .9, y + .912); }
      });
      lv.tall.forEach(r => b('unit').rect(r, y, y + 2.2));
      lv.furn.forEach(f => {
        if (f.t === 'ward') { const R = bbox(f); b('unit').rect(R, y, y + 2.2); return; }
        if (f.t === 'tv') { furniture(Object.assign({}, f, { t: 'unit' }), y, b); return; }
        if (f.t === 'stools') { for (let i = 0; i < 3; i++) { const x = f.x - f.w / 2 + .3 + i * (f.w - .6) / 2; b('chair').rect([x - .17, f.z - .17, x + .17, f.z + .17], y + .62, y + .67); b('steel').rect([x - .02, f.z - .02, x + .02, f.z + .02], y, y + .62); } return; }
        furniture(f, y, b);
      });
    }
    for (const k in P) { const m = P[k].mesh(mats[k]); if (m) { m.userData.kind = k; grp.add(m); } }
    for (const k in B) { const m = B[k].mesh(mats[k]); if (m) { m.userData.kind = k; grp.add(m); } }
    return grp;
  }

  /* rear stair enclosure (terracotta-clad), balconies, terrace */
  const TW = { x0: 7.05, x1: 13.45, z0: 1.6, top: 9.3 };
  function buildTower(mats, maxY) {
    const g = new THREE.Group(), p = {}, q = k => (p[k] = p[k] || new Prisms()), cap = Math.min(TW.top, maxY);
    const rz = x => 4.1 + .0773 * (x - 2.75);
    q('terracotta').poly([[TW.x0, TW.z0], [TW.x1, TW.z0], [TW.x1, TW.z0 + .28], [TW.x0, TW.z0 + .28]], [], 0, cap);
    q('render').poly([[TW.x0, TW.z0 + .28], [TW.x0 + .25, TW.z0 + .28], [TW.x0 + .25, rz(TW.x0 + .25)], [TW.x0, rz(TW.x0)]], [], 0, cap);
    q('render').poly([[TW.x1 - .25, TW.z0 + .28], [TW.x1, TW.z0 + .28], [TW.x1, rz(TW.x1)], [TW.x1 - .25, rz(TW.x1 - .25)]], [], 0, cap);
    if (maxY >= TW.top) { q('fascia').poly([[TW.x0 - .05, TW.z0 - .05], [TW.x1 + .05, TW.z0 - .05], [TW.x1 + .05, rz(TW.x1)], [TW.x0 - .05, rz(TW.x0)]], [], TW.top, TW.top + .3); q('glass').poly([[9.6, 2.6], [10.9, 2.6], [10.9, 3.6], [9.6, 3.6]], [], TW.top + .3, TW.top + .55); }
    // tall slot window in the cladding, and the panel joints
    const sx0 = 10.95, sx1 = 11.6; q('glass').poly([[sx0, TW.z0 - .01], [sx1, TW.z0 - .01], [sx1, TW.z0 + .03], [sx0, TW.z0 + .03]], [], 3.2, Math.min(8.6, cap));
    for (let x = TW.x0 + .8; x < TW.x1 - .2; x += .8) if (x < sx0 - .05 || x > sx1 + .05) q('joint').poly([[x, TW.z0 - .012], [x + .025, TW.z0 - .012], [x + .025, TW.z0], [x, TW.z0]], [], 0, cap);
    // stairs: two flights per storey with a half landing at the east end
    const st = new Boxes(), rl = new Boxes(), levels = [.63, 3.62, 7.437];
    for (let i = 0; i < 2; i++) {
      const y0 = levels[i], y1 = levels[i + 1]; if (y1 > maxY + .01) break;
      const half = (y0 + y1) / 2, n = 10, run = .27;
      for (let k = 0; k < n; k++) { const t = y0 + (k + 1) * (half - y0) / n; st.add(8.4 + k * run, Math.max(y0 - .2, t - .45), 1.95, 8.4 + (k + 1) * run, t, 2.95); }
      st.add(11.1, half - .22, 1.95, 13.15, half, 4.35);
      for (let k = 0; k < n; k++) { const t = half + (k + 1) * (y1 - half) / n; st.add(11.1 - (k + 1) * run, Math.max(half - .2, t - .45), 3.05, 11.1 - k * run, t, 4.05); }
      st.add(7.3, y1 - .25, 1.95, 8.4, y1, 4.6);
      rl.add(8.4, y0 + .9, 2.98, 11.1, y0 + .95, 3.02);
    }
    st.add(7.3, .45, 3.0, 8.4, .63, 4.6);
    g.add(st.mesh(mats.stair)); const rm = rl.mesh(mats.rail); if (rm) g.add(rm);
    for (const k in p) { const m = p[k].mesh(mats[k]); if (m) g.add(m); }
    return g;
  }
  function buildBalconies(mats, maxL) {
    const g = new THREE.Group(), p = {}, q = k => (p[k] = p[k] || new Prisms());
    const BAL = [{ poly: [[2.92, 4.15], [2.92, 2.35], [3.45, 1.8], [7.05, 1.62], [7.05, 4.45]], open: [0, 1, 2] }, { poly: [[13.45, 1.82], [19.05, 2.2], [19.2, 5.38], [13.45, 4.92]], open: [0, 1] }];
    const ys = [3.62, 7.437].filter((_, i) => i + 1 <= maxL);
    BAL.forEach(bl => {
      ys.forEach(y => {
        q('steelDark').poly(bl.poly, [], y - .22, y - .02); q('deck').poly(bl.poly, [], y - .02, y + .02);
        bl.open.forEach(i => { const a = bl.poly[i], c = bl.poly[(i + 1) % bl.poly.length];
          q('glass').quadBox(a, c, .02, y + .12, y + 1.0, .04); q('steelDark').quadBox(a, c, .06, y + 1.0, y + 1.08, .04); q('steelDark').quadBox(a, c, .06, y + .04, y + .12, .04);
          const l = Math.hypot(c[0] - a[0], c[1] - a[1]), n = Math.max(1, Math.round(l / 1.3));
          for (let k = 0; k <= n; k++) { const m = lerp2(a, c, k / n), m2 = lerp2(a, c, k / n + .04 / l); q('steelDark').quadBox(m, m2, .05, y + .02, y + 1.08, .04); }
        });
      });
      // galvanised posts down to the yard at the outer corners
      const top = ys.length ? ys[ys.length - 1] : 0;
      if (top) bl.open.concat([bl.open[bl.open.length - 1] + 1]).forEach(i => { const c = bl.poly[i % bl.poly.length]; q('steelDark').poly([[c[0] - .07, c[1] - .07], [c[0] + .07, c[1] - .07], [c[0] + .07, c[1] + .07], [c[0] - .07, c[1] + .07]], [], 0, top - .22); });
    });
    for (const k in p) { const m = p[k].mesh(mats[k]); if (m) g.add(m); }
    // a planter and a bistro table on each balcony
    const pot = new THREE.CylinderGeometry(.22, .17, .45, 14), bush = new THREE.SphereGeometry(.32, 12, 10);
    ys.forEach(y => [[4.0, 2.6], [6.4, 2.1], [14.2, 2.3], [18.3, 2.7]].forEach(([x, z], i) => {
      const a = new THREE.Mesh(pot, mats.fascia); a.position.set(x - CX, y + .24, z - CZ); g.add(a);
      const c = new THREE.Mesh(bush, mats.shrub); c.position.set(x - CX, y + .72, z - CZ); g.add(c);
    }));
    return g;
  }

  /* roof traced from the roof plan: front range with a central gable, hipped rear block, membrane flat roof */
  function buildRoof(mats) {
    const g = new THREE.Group(), s = new Prisms(), d = new Prisms(), mb = new Prisms(), rd = new Prisms(), ch = new Prisms();
    const fr = z => RG - .826 * (12.95 - z);
    s.face([[2.25, E, 16.25], [19.05, E, 16.25], [19.05, RG, 12.95], [2.25, RG, 12.95]]);
    s.face([[2.25, RG, 12.95], [19.05, RG, 12.95], [19.15, fr(9.6), 9.6], [2.4, fr(9.6), 9.6]]);
    s.face([[2.6, E, 4.0], [11.45, E, 5.62], [7.4, RG, 7.8]]);
    s.face([[2.6, E, 4.0], [7.4, RG, 7.8], [7.22, RG, 12.95], [2.45, E, 12.95]]);
    s.face([[7.4, RG, 7.8], [11.45, E, 5.62], [11.3, E, 9.6], [7.22, RG, 12.95]]);
    s.face([[15.73, 10.96, 5.95], [19.3, RG, 5.4], [19.15, RG, 12.95], [15.45, 10.96, 10.3]]);
    mb.poly([[11.45, 5.62], [15.73, 5.95], [15.5, 10.4], [11.3, 9.6]], [], E - .1, E + .06);
    // rear parapet: the render is carried up to +11.87 across the stair tower and the east wing
    const rz = x => 4.1 + .0773 * (x - 2.75), par = new Prisms();
    par.quadBox([7.05, rz(7.05)], [19.3, rz(19.3) + .02], .3, E - .3, 11.872, .15); par.quadBox([19.12, 5.38], [19.05, 9.6], .3, E - .3, 11.872, 0);
    par.quadBox([7.05, rz(7.05) + .15], [7.05, 9.6], .3, E, 11.872, 0);
    const pm = par.mesh(mats.render); if (pm) g.add(pm); const cp = new Prisms(); cp.quadBox([6.95, rz(6.95)], [19.4, rz(19.4) + .02], .42, 11.872, 11.95, .15); const cpm = cp.mesh(mats.fascia); if (cpm) g.add(cpm);
    // central front gable with its chimney
    const GA = 13.0, gx0 = 7.75, gx1 = 13.15, gm = (gx0 + gx1) / 2;
    s.face([[gx0 - .15, E, 16.35], [gm, GA, 16.35], [gm, GA, 13.6], [gx0 - .15, E, 13.6]]);
    s.face([[gm, GA, 16.35], [gx1 + .15, E, 16.35], [gx1 + .15, E, 13.6], [gm, GA, 13.6]]);
    d.face([[gx0, E - .3, 15.92], [gx1, E - .3, 15.92], [gm, GA - .12, 15.92]], false);
    d.face([[gx0, E - .3, 15.9], [gm, GA - .12, 15.9], [gx1, E - .3, 15.9]], false);
    ch.poly([[gm - .42, 14.25], [gm + .42, 14.25], [gm + .42, 14.95], [gm - .42, 14.95]], [], GA - 1.2, GA + 1.25);
    ch.poly([[gm - .5, 14.17], [gm + .5, 14.17], [gm + .5, 15.03], [gm - .5, 15.03]], [], GA + 1.0, GA + 1.12);
    [s.mesh(mats.slate), mb.mesh(mats.membrane), d.mesh(mats.render), ch.mesh(mats.brick)].forEach(m => m && g.add(m));
    // ridge and hip capping
    const cap = new Prisms();
    [[[2.25, 12.95], [19.05, 12.95], RG], [[gm, 16.35], [gm, 13.6], GA]].forEach(([a, c, y]) => cap.quadBox(a, c, .22, y - .04, y + .08, 0));
    const cm = cap.mesh(mats.fascia); if (cm) g.add(cm);
    for (let i = 0; i < 3; i++) { const pt = new THREE.Mesh(new THREE.CylinderGeometry(.11, .13, .5, 12), mats.pot); pt.position.set(gm - .26 + i * .26 - CX, GA + 1.37, 14.6 - CZ); g.add(pt); }
    // skews: party walls rising a little above the slates at each end
    const sk = new Prisms(); [2.15, 19.05].forEach(x => sk.face([[x, E - .2, 16.3], [x, RG + .15, 12.95], [x, fr(9.6) + .1, 9.6], [x, E - .2, 9.6]], false)); const sm = sk.mesh(mats.render); if (sm) { sm.material = mats.renderDS; g.add(sm); }
    return g;
  }

  /* street, rear yard and the neighbouring tenements */
  function buildSite(mats) {
    const g = new THREE.Group(), pv = new Prisms(), rd = new Prisms(), yd = new Prisms(), nb = new Prisms(), nb2 = new Prisms(), kerb = new Prisms(), lawn = new Prisms(), shop = new Prisms(), deck = new Prisms(), wall = new Prisms();
    const X0 = -18, X1 = 40;
    pv.face([[X0, pavY(X0), 15.9], [X1, pavY(X1), 15.9], [X1, pavY(X1), 18.7], [X0, pavY(X0), 18.7]]);
    kerb.face([[X0, pavY(X0) - .12, 18.7], [X1, pavY(X1) - .12, 18.7], [X1, pavY(X1), 18.7], [X0, pavY(X0), 18.7]], false);
    rd.face([[X0, pavY(X0) - .12, 18.7], [X1, pavY(X1) - .12, 18.7], [X1, pavY(X1) - .12, 27], [X0, pavY(X0) - .12, 27]]);
    pv.face([[X0, pavY(X0), 27], [X1, pavY(X1), 27], [X1, pavY(X1), 29.5], [X0, pavY(X0), 29.5]]);
    yd.poly([[-6, -12], [24, -12], [24, 5.5], [-6, 5.5]], [], -.4, -.02);
    lawn.poly([[-2, -6], [12.5, -6], [12.5, 1.2], [-2, 1.2]], [], -.02, .03);
    deck.poly([[13.45, 1.82], [19.05, 2.2], [19.2, 5.38], [13.45, 4.92]], [], -.02, .17);
    wall.poly([[13.2, 1.3], [19.2, 1.7], [19.2, 1.98], [13.2, 1.58]], [], -.02, .62);
    wall.poly([[-2, 1.25], [7.0, 1.25], [7.0, 1.5], [-2, 1.5]], [], -.02, .62);
    // tenements either side, with window grids
    const left = [[-11, 2.4], [2.3, 2.4], [2.3, 15.9], [-11, 15.9]], right = [[19.05, 5.4], [30, 5.4], [30, 15.9], [19.05, 15.9]];
    nb.poly(left, [], -2.5, 13.9); nb2.poly(right, [], -1.2, 12.9);
    shop.poly([[19.4, 15.9], [29.5, 15.9], [29.5, 16.0], [19.4, 16.0]], [], pavY(19.4), pavY(19.4) + 3.1);
    [[pv, mats.paving], [kerb, mats.kerb], [rd, mats.road], [yd, mats.yard], [lawn, mats.grass], [deck, mats.deck], [wall, mats.deck], [nb, mats.stoneL], [nb2, mats.stoneR], [shop, mats.shop]].forEach(([q, m]) => { const me = q.mesh(m); if (me) { g.add(me); if (q === nb || q === nb2 || q === shop) (g.userData.nb = g.userData.nb || []).push(me); } });
    // window grids on the neighbours' street fronts
    const wins = new Boxes();
    for (let r = 0; r < 4; r++) for (let x = -10.2; x < 1.4; x += 1.9) wins.add(x, .9 + r * 3.1, 15.9, x + .95, 2.6 + r * 3.1, 15.96);
    for (let r = 1; r < 4; r++) for (let x = 20.0; x < 29; x += 2.0) wins.add(x, 1.6 + r * 3.0, 15.9, x + 1.0, 3.2 + r * 3.0, 15.96);
    const wm = wins.mesh(mats.nbWin); g.add(wm); g.userData.nb.push(wm);
    // shrubs along the rear lawn and terrace wall, a street lamp
    const sg = new THREE.SphereGeometry(.42, 12, 10);
    for (let x = -1.4; x < 12; x += 1.1) { const m = new THREE.Mesh(sg, mats.shrub); m.position.set(x - CX, .28, 1.0 - CZ); m.scale.y = .8; g.add(m); }
    for (let x = 13.7; x < 19; x += 1.2) { const m = new THREE.Mesh(sg, mats.shrub2); m.position.set(x - CX, .5, 1.25 + (x - 13.2) * .067 - CZ); m.scale.set(.8, .7, .8); g.add(m); }
    const lamp = new Boxes(); lamp.add(14.3, pavY(14.3), 18.3, 14.42, pavY(14.3) + 7.5, 18.42); lamp.add(14.3, pavY(14.3) + 7.4, 17.6, 14.42, pavY(14.3) + 7.52, 18.42); g.add(lamp.mesh(mats.frame));
    return g;
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

  /* ---------------- viewer ---------------- */
  const flatBox = n => { let b = [1e9, 1e9, -1e9, -1e9]; for (const L in LV) (LV[L].flatFloor[n] || []).forEach(s => s.o.forEach(([x, z]) => { b = [Math.min(b[0], x), Math.min(b[1], z), Math.max(b[2], x), Math.max(b[3], z)]; })); return b; };
  const flatLevel = n => (M.flats.find(f => f.n === n) || {}).level;
  function Viewer(host, opts) {
    this.host = host; this.opts = opts = opts || {}; this.mode = opts.mode || 'building'; this.spin = opts.spin !== false;
    const W0 = host.clientWidth || 800, H0 = host.clientHeight || 500;
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: !!opts.capture });
    r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); r.setSize(W0, H0); r.outputEncoding = THREE.sRGBEncoding;
    host.appendChild(r.domElement); r.domElement.style.touchAction = 'none';
    r.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); this.lost = true; if (opts.onLost) setTimeout(() => opts.onLost(), 50); }, false);
    const sc = this.scene = new THREE.Scene();
    sc.background = new THREE.Color(opts.bg || '#dfe6ea');
    this.cam = new THREE.PerspectiveCamera(this.mode === 'tour' ? 76 : 40, W0 / H0, .05, 600);
    this.mats = makeMats();
    sc.add(this.hemi = new THREE.HemisphereLight(0xf6f2ea, 0x6d655a, this.mode === 'tour' ? .72 : .85));
    const sun = this.sun = new THREE.DirectionalLight(0xfff4e2, .62); sun.position.set(-30, 60, -40); sc.add(sun); sc.add(sun.target);
    const fill = this.fill = new THREE.DirectionalLight(0xdfe8f0, .25); fill.position.set(30, 25, 40); sc.add(fill);
    this.bg0 = opts.bg || '#dfe6ea';
    if (this.mode !== 'tour') {
      r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
      sun.castShadow = true; const sz = (window.innerWidth < 700 ? 1024 : 2048); sun.shadow.mapSize.set(sz, sz);
      const c = sun.shadow.camera, ext = 30; c.left = -ext; c.right = ext; c.top = ext; c.bottom = -ext; c.near = 1; c.far = 220; sun.shadow.bias = -.0004; sun.shadow.normalBias = .02;
    }
    this.labels = document.createElement('div'); this.labels.className = 'v3-labels'; host.appendChild(this.labels);
    this.anchors = []; this.levels = {};
    if (this.mode === 'building') this.initBuilding(); else this.initFloor();
    this.bindControls();
    this.scene.traverse(o => { if (o.isMesh) { o.castShadow = !(o.material && o.material.transparent); o.receiveShadow = true; } });
    this.setTime(opts.hour != null ? opts.hour : 13, opts.season || 'summer');
    if (opts.styleName) this.setStyle(opts.styleName);
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(host);
    this.loop = this.loop.bind(this); this.raf = requestAnimationFrame(this.loop);
  }
  Viewer.prototype.initBuilding = function () {
    const sc = this.scene, mats = this.mats;
    sc.add(this.site = buildSite(mats));
    for (let L = 0; L <= 2; L++) { const g = buildLevel(L, mats, {}); this.levels[L] = g; sc.add(g); }
    sc.add(this.roof = buildRoof(mats));
    this.target = new THREE.Vector3(0, 5.5, 2); this.theta = .5; this.phi = 1.2; this.rad = 36; this.minR = 10; this.maxR = 90;
    this.setFloor('all');
  };
  Viewer.prototype.setFloor = function (f) {
    this.floor = f;
    for (const L in this.levels) this.levels[L].visible = f === 'all' || +L <= f;
    this.roof.visible = f === 'all';
    (this.site.userData.nb || []).forEach(m => m.visible = f === 'all');
    const sc = this.scene;
    [this.tower, this.balc].forEach(o => o && (sc.remove(o), o.traverse(q => q.geometry && q.geometry.dispose())));
    const maxY = f === 'all' ? 99 : LV[f].top;
    sc.add(this.tower = buildTower(this.mats, maxY)); sc.add(this.balc = buildBalconies(this.mats, f === 'all' ? 2 : f));
    [this.tower, this.balc].forEach(g => g.traverse(o => { if (o.isMesh) { o.castShadow = !(o.material && o.material.transparent); o.receiveShadow = true; } }));
    const y = f === 'all' ? 6 : LV[f].y + 1;
    this.targetGoal = new THREE.Vector3(0, y, f === 'all' ? 2 : 0);
    this.radGoal = f === 'all' ? 36 : 30; this.phiGoal = f === 'all' ? 1.18 : .72;
    this.setAnchors(); this.occluders = null;
    this.idle = 0;
  };
  /* sun over Dundee (56.46 N). The drawings' -z points south-west (bearing 225), so azimuths are turned by 45 degrees */
  Viewer.prototype.setTime = function (hour, season) {
    this.hour = hour; this.season = season = season || this.season || 'summer';
    const N = season === 'winter' ? 355 : 172, lat = 56.46 * Math.PI / 180;
    const decl = 23.44 * Math.PI / 180 * Math.sin(2 * Math.PI * (284 + N) / 365);
    const solar = hour - (season === 'summer' ? 1 : 0) - .2, HA = (solar - 12) * 15 * Math.PI / 180;
    const sinAlt = Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(HA), alt = Math.asin(sinAlt);
    const az = Math.atan2(Math.sin(HA), Math.cos(HA) * Math.sin(lat) - Math.tan(decl) * Math.cos(lat)) + Math.PI;
    const a2 = az - (M.north - 180) * Math.PI / 180;
    const dir = new THREE.Vector3(-Math.cos(alt) * Math.sin(a2), Math.sin(alt), Math.cos(alt) * Math.cos(a2));
    this.sunAlt = alt * 180 / Math.PI; this.sunAz = az * 180 / Math.PI;
    const day = Math.max(0, Math.min(1, (this.sunAlt + 4) / 14)), lowSun = Math.max(0, 1 - Math.abs(this.sunAlt - 6) / 10) * day;
    const tgt = this.target ? this.target.clone() : new THREE.Vector3();
    this.sun.position.copy(tgt).addScaledVector(dir.y > 0 ? dir : new THREE.Vector3(dir.x, .05, dir.z).normalize(), 110);
    this.sun.target.position.copy(tgt); this.sun.target.updateMatrixWorld();
    this.sun.intensity = .78 * day * (this.mode === 'tour' ? .35 : 1); this.sun.color.setHSL(.09, .2 + .5 * lowSun, .9 - .15 * lowSun);
    this.sun.visible = day > .02;
    this.fill.intensity = .1 + .18 * day;
    this.hemi.intensity = this.mode === 'tour' ? .5 + .2 * day : .22 + .63 * day;
    if (this.mode === 'tour') this.hemi.color.set(day < .5 ? '#ffe2b8' : '#f6f2ea');
    const night = new THREE.Color('#162030'), dusk = new THREE.Color('#e7c7a6'), base = new THREE.Color(this.bg0);
    this.scene.background = night.clone().lerp(base, day).lerp(dusk, lowSun * .55);
    const g = this.mats.glass; g.emissive = g.emissive || new THREE.Color(); g.emissive.set('#ffbe6b').convertSRGBToLinear(); const outside = this.mode !== 'tour'; g.emissiveIntensity = outside ? 1.4 * (1 - day) : 0; g.opacity = outside ? .26 + .5 * (1 - day) : .26;
    if (this.pano) this.pano.material.color.setRGB(.08 + .92 * day, .1 + .9 * day, .16 + .84 * day).lerp(new THREE.Color(1, .82, .66), lowSun * .5);
    return { alt: this.sunAlt, az: this.sunAz };
  };
  const STYLES = {
    oak: { wood: '#b98f63', part: '#f6f3ee', core: '#efebe4', sofa: '#4a6072', unit: '#e8e4dd', top: '#353a40', furnWood: '#8b6446', throw: '#c2601a' },
    walnut: { wood: '#6e4a32', part: '#ede7dd', core: '#e6dfd4', sofa: '#2f3b45', unit: '#2f3438', top: '#d8d2c8', furnWood: '#4a3224', throw: '#b08a4a' },
    scandi: { wood: '#dccaa9', part: '#fbfaf7', core: '#f5f3ee', sofa: '#a7b0b3', unit: '#ffffff', top: '#c3c8cc', furnWood: '#c9ad85', throw: '#7d9a8a' }
  };
  Viewer.prototype.setStyle = function (name) {
    const st = STYLES[name]; if (!st) return; this.styleName = name;
    for (const k in st) if (this.mats[k]) this.mats[k].color.set(st[k]).convertSRGBToLinear();
  };
  Viewer.prototype.setSpin = function (on) { this.spin = !!on; this.idle = on ? 9999 : 0; };
  Viewer.prototype.showRear = function () {
    this.setFloor('all'); this.thetaGoal = Math.PI - .5; this.phiGoal = 1.15; this.radGoal = 40; this.targetGoal = new THREE.Vector3(0, 5, 0);
  };
  Viewer.prototype.setAnchors = function () {
    const f = this.floor, A = [];
    const add = (x, y, z, t, k) => A.push({ p: new THREE.Vector3(x - CX, y, z - CZ), t, k });
    if (f === 'all') {
      add(7.03, 3.3, 16.6, 'Main entrance', 'core'); add(4.2, 3.4, 16.6, 'Pend to rear', 'room');
      add(10.25, 9.9, 1.4, 'Stair tower', 'core');
      add(4.6, 5.0, 2.4, 'Balconies', 'flat'); add(16.4, 1.3, 3.4, 'Terrace, Flat 1', 'flat');
    } else {
      const lv = LV[f], y = lv.y;
      lv.rooms.forEach(r => {
        if (r.flat === 0) { if (r.name !== 'Terrace' && r.name !== 'Stair') add(r.x, y + 1.3, r.z, r.name, 'room'); return; }
        if (/^Lounge/.test(r.name)) add(r.x, y + 1.5, r.z, 'Flat ' + r.flat, 'flat');
        else if (r.name === 'Balcony') add(r.x, y + .9, r.z, 'Balcony', 'room');
      });
      add(10.25, y + 2.2, 2.9, 'Stair', 'core');
      if (f === 0) add(16.4, .9, 3.4, 'Terrace', 'room');
    }
    this.anchors = A; this.labels.innerHTML = ''; this.occluders = null;
    A.forEach(a => { const d = document.createElement('span'); d.className = 'v3-tag v3-' + a.k; d.textContent = a.t; this.labels.appendChild(d); a.el = d; });
  };
  Viewer.prototype.initFloor = function () {
    const sc = this.scene, mats = this.mats, o = this.opts, pos = o.pos || 1, L = o.level != null ? o.level : flatLevel(pos), host = this.host, lvd = LV[L];
    for (let k = 0; k <= L; k++) { const g = buildLevel(k, mats, { focusFlat: this.mode === 'floor' ? pos : 0, detail: k === L }); sc.add(g); this.levels[k] = g; }
    sc.add(buildTower(mats, lvd.top)); sc.add(buildBalconies(mats, L));
    const rooms = lvd.rooms.filter(r => r.flat === pos && r.name !== 'Balcony'), bb = flatBox(pos);
    const cx = (bb[0] + bb[2]) / 2 - CX, cz = (bb[1] + bb[3]) / 2 - CZ, y = lvd.y;
    const site = buildSite(mats); sc.add(site);
    if (this.mode === 'floor') {
      (site.userData.nb || []).forEach(m => m.visible = false);
      this.target = new THREE.Vector3(cx, y + .5, cz); this.theta = Math.atan2(cx, cz) + .4; this.phi = .62;
      this.rad = Math.max(bb[2] - bb[0], bb[3] - bb[1]) * .95 + 7; this.minR = 5; this.maxR = 60;
      this.anchors = lvd.rooms.filter(r => r.flat === pos).map(r => ({ p: new THREE.Vector3(r.x - CX, y + 1.3, r.z - CZ), t: r.name, k: 'room' }));
      this.labels.innerHTML = ''; this.anchors.forEach(a => { const d = document.createElement('span'); d.className = 'v3-tag v3-room'; d.textContent = a.t; this.labels.appendChild(d); a.el = d; });
    } else {
      const c = new Prisms(); (lvd.flatFloor[pos] || []).forEach(s => c.poly(s.o, s.h, y + lvd.ceil - .04, y + lvd.ceil));
      if (L > 0) M.bays.forEach(b => c.poly(b, [], y + lvd.ceil - .04, y + lvd.ceil));
      const cm = c.mesh(std('#f1eee8', { side: THREE.DoubleSide, emissive: '#d9d4cc', emissiveIntensity: .45 })); if (cm) sc.add(cm);
      rooms.forEach(r => { const p = new THREE.PointLight(0xfff0dc, .32, 6.5, 1.8); p.position.set(r.x - CX, y + lvd.ceil - .3, r.z - CZ); sc.add(p); });
      const pano = new THREE.Mesh(new THREE.CylinderGeometry(160, 160, 120, 64, 1, true), new THREE.MeshBasicMaterial({ map: panoramaTex(), side: THREE.BackSide, fog: false }));
      pano.material.map.wrapS = THREE.RepeatWrapping; pano.material.map.repeat.x = -1; pano.position.y = 22; sc.add(pano); this.pano = pano;
      sc.background = new THREE.Color('#e4e9ec');
      this.eyeY = y + 1.6; this.yaw = 0; this.pitch = -.05; this.L = L; this.rooms = rooms;
      this.wins = lvd.open.filter(q => q.k !== 'gate').map(q => centroid(q.q)).concat(L > 0 ? M.bays.map(b => centroid(b)) : []);
      this.buildGrid(L, pos);
      this.cam.position.set(0, this.eyeY, 0);
      this.floorPlane = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshBasicMaterial({ visible: false }));
      this.floorPlane.rotation.x = -Math.PI / 2; this.floorPlane.position.y = y; sc.add(this.floorPlane);
      const start = rooms.find(r => /^Lounge/.test(r.name)) || rooms[0], [sx, sz] = this.nearestFree(start.x, start.z);
      this.pos3 = new THREE.Vector3(sx - CX, this.eyeY, sz - CZ); this.goal = this.pos3.clone();
      this.yaw = this.bestYaw(sx, sz); this.cam.position.copy(this.pos3);
      this.fadeEl = document.createElement('div'); this.fadeEl.className = 'v3-fade'; host.appendChild(this.fadeEl);
    }
  };
  /* walk-through collision: walls, glazing and furniture rasterised to 5 cm cells */
  Viewer.prototype.buildGrid = function (L, pos) {
    const lv = LV[L], RES = .05, X0 = 1.5, Z0 = 0.8, W = Math.ceil(19.5 / RES), Hh = Math.ceil(17 / RES);
    const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = Hh; const g = c.getContext('2d'); g.setTransform(1 / RES, 0, 0, 1 / RES, -X0 / RES, -Z0 / RES); g.fillStyle = '#000'; return [c, g]; };
    const poly = (g, ring, holes) => { g.beginPath(); [ring].concat(holes || []).forEach(r => { r.forEach(([x, z], i) => i ? g.lineTo(x, z) : g.moveTo(x, z)); g.closePath(); }); g.fill('evenodd'); };
    const [cw, gw] = mk(), [cf, gf] = mk(), [ca, ga] = mk();
    lv.ext.concat(lv.part).forEach(w => poly(gw, w.o, w.h));
    lv.open.forEach(o => poly(gw, o.q));
    if (L > 0) M.bays.forEach(b => { for (let i = 0; i < 3; i++) { const a = b[i], c = b[i + 1]; gw.lineWidth = .2; gw.beginPath(); gw.moveTo(a[0], a[1]); gw.lineTo(c[0], c[1]); gw.stroke(); } });
    const R = r => gf.fillRect(r[0], r[1], r[2] - r[0], r[3] - r[1]);
    lv.furn.filter(f => f.flat === pos).forEach(f => { const k = f.t === 'dining' ? .5 : 1; R([f.x - f.w / 2 * k, f.z - f.d / 2 * k, f.x + f.w / 2 * k, f.z + f.d / 2 * k]); });
    lv.fix.filter(f => f.t !== 'sink').forEach(f => R(f.b)); lv.kit.filter(k => k.flat === pos).forEach(k => R(k.b));
    // walkable area: this flat's floor (plus its bays)
    (lv.flatFloor[pos] || []).forEach(s => poly(ga, s.o, s.h)); if (L > 0) M.bays.forEach(b => { if (inPoly(...centroid(b), [[0, 0], [99, 0], [99, 99], [0, 99]])) { const bb = flatBox(pos); if (centroid(b)[0] > bb[0] && centroid(b)[0] < bb[2]) poly(ga, b); } });
    const dw = gw.getImageData(0, 0, W, Hh).data, df = gf.getImageData(0, 0, W, Hh).data, da = ga.getImageData(0, 0, W, Hh).data;
    this.occ = { X0, Z0, RES, W, Hh, wall: i => dw[i * 4 + 3] > 60, furn: i => df[i * 4 + 3] > 60, area: i => da[i * 4 + 3] > 60 };
    const c = .15, g = this.grid = { x0: X0, z0: Z0, c, nx: Math.ceil(19.5 / c), nz: Math.ceil(17 / c) };
    g.free = new Uint8Array(g.nx * g.nz);
    for (let j = 0; j < g.nz; j++) for (let i = 0; i < g.nx; i++) g.free[j * g.nx + i] = this.blocked(g.x0 + (i + .5) * c, g.z0 + (j + .5) * c, .2) ? 0 : 1;
  };
  Viewer.prototype.blocked = function (x, z, rad, wallsOnly) {
    rad = rad == null ? .22 : rad; const O = this.occ; if (!O) return false;
    const cell = (px, pz) => { const i = Math.floor((px - O.X0) / O.RES), j = Math.floor((pz - O.Z0) / O.RES); return (i < 0 || j < 0 || i >= O.W || j >= O.Hh) ? -1 : j * O.W + i; };
    const c0 = cell(x, z); if (c0 < 0 || !O.area(c0)) return true;
    const n = rad > .06 ? 12 : 1;
    for (let k = 0; k < n; k++) {
      const a = k / n * Math.PI * 2, rr = n === 1 ? 0 : rad;
      for (const s of n === 1 ? [0] : [1, .5]) {
        const ci = cell(x + Math.cos(a) * rr * s, z + Math.sin(a) * rr * s); if (ci < 0) return true;
        if (O.wall(ci)) return true; if (!wallsOnly && s === 1 && O.furn(cell(x + Math.cos(a) * rr * .6, z + Math.sin(a) * rr * .6))) return true;
      }
    }
    return O.wall(c0) || (!wallsOnly && O.furn(c0));
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
    let best = null, bd = 0;
    for (const [wx, wz] of this.wins || []) {
      const d = Math.hypot(wx - x, wz - z); if (d > 8 || d < 1.2) continue;
      let ok = true;
      for (let t = .1; t < d - .5; t += .1) { const px = x + (wx - x) * t / d, pz = z + (wz - z) * t / d, O = this.occ, i = Math.floor((px - O.X0) / O.RES) + Math.floor((pz - O.Z0) / O.RES) * O.W; if (O.wall(i)) { ok = false; break; } }
      if (ok && d > bd) { bd = d; best = Math.atan2(-(wx - x), -(wz - z)); }
    }
    return best == null ? this.bestYaw(x, z) : best;
  };
  Viewer.prototype.bestYaw = function (x, z) {
    const ray = a => { const dx = -Math.sin(a), dz = -Math.cos(a); let d = 0; while (d < 12 && !this.blocked(x + dx * d, z + dz * d, 0, true)) d += .1; return d; };
    let best = 0, bl = -1;
    for (let k = 0; k < 36; k++) { const a = k / 36 * Math.PI * 2; let sum = 0; for (const o of [-.5, -.25, 0, .25, .5]) sum += Math.min(ray(a + o), 7); if (sum > bl) { bl = sum; best = a; } }
    return best;
  };
  Viewer.prototype.goRoom = function (i) {
    const r = this.rooms[i]; if (!r) return;
    let [px, pz] = this.nearestFree(r.x, r.z);
    const yaw = r.name === 'Hall' ? this.bestYaw(px, pz) : this.viewYaw(px, pz), f = this.fadeEl;
    const bx = Math.sin(yaw), bz = Math.cos(yaw);
    for (let d = 0; d < 1.6; d += .1) { if (this.blocked(px + bx * .1, pz + bz * .1, .3)) break; px += bx * .1; pz += bz * .1; }
    const jump = () => { this.pos3.set(px - CX, this.eyeY, pz - CZ); this.goal = this.pos3.clone(); this.path = null; this.yaw = yaw; this.yawGoal = null; this.pitch = -.05; this.idle = 0; };
    if (!f) return jump();
    f.style.opacity = 1; setTimeout(() => { jump(); f.style.opacity = 0; }, 220);
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
    if (this.mode !== 'building' || this.floor === 'all') return null;
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
      const fit = Math.max(1, Math.min(1.9, 1.3 / (cam.aspect || 1))), R = this.rad * fit;   // pull back on tall, narrow screens so the whole building fits
      cam.position.set(this.target.x + R * Math.sin(this.phi) * Math.sin(this.theta), this.target.y + R * Math.cos(this.phi), this.target.z + R * Math.sin(this.phi) * Math.cos(this.theta));
      cam.lookAt(this.target);
    }
    this.renderer.render(this.scene, cam);
    if (!this.readyFired) { this.readyFired = true; if (this.opts.onReady) setTimeout(() => this.opts.onReady(), 0); }
    // labels: pinned to their 3D point, hidden when something solid is in front, and never stacked on each other
    if (this.anchors.length) this.updateLabels();
  };
  Viewer.prototype.collectOccluders = function () {
    const list = [];
    this.scene.traverseVisible(o => {
      if (!o.isMesh || !o.geometry) return;
      const m = Array.isArray(o.material) ? o.material[0] : o.material;
      if (!m || m.transparent || m.visible === false || (m.side === THREE.BackSide)) return;
      list.push(o);
    });
    this.occluders = list; this.occK = 0;
    for (const a of this.anchors) a.hidden = false;
  };
  Viewer.prototype.updateLabels = function () {
    const cam = this.cam, w = this.host.clientWidth, h = this.host.clientHeight, v = new THREE.Vector3();
    if (!this.occluders) this.collectOccluders();
    // occlusion: test a few labels per frame against the solid geometry between the camera and the label
    const rc = this.rc || (this.rc = new THREE.Raycaster()), n = this.anchors.length, per = Math.min(n, 4);
    for (let i = 0; i < per; i++) {
      const a = this.anchors[this.occK++ % n];
      const dir = a.p.clone().sub(cam.position), dist = dir.length(); dir.normalize();
      rc.set(cam.position, dir); rc.near = .05; rc.far = Math.max(.1, dist - .45);
      a.hidden = rc.intersectObjects(this.occluders, false).length > 0;
    }
    // project, then place in priority order, nudging or dropping labels that would overlap
    const placed = [];
    const over = (r) => placed.some(q => r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1]);
    for (const a of this.anchors) {
      v.copy(a.p).project(cam);
      let show = !a.hidden && v.z < 1 && Math.abs(v.x) < 1.02 && Math.abs(v.y) < 1.02;
      let x = (v.x * .5 + .5) * w, y = (-v.y * .5 + .5) * h;
      if (show) {
        if (!a.w) { a.w = a.el.offsetWidth || 80; a.h = a.el.offsetHeight || 22; }
        let ok = false;
        for (const dy of [0, -(a.h + 3), a.h + 3]) {
          const r = [x - a.w / 2 - 2, y + dy - a.h / 2 - 1, x + a.w / 2 + 2, y + dy + a.h / 2 + 1];
          if (!over(r)) { placed.push(r); y += dy; ok = true; break; }
        }
        show = ok;
      }
      if (show) { a.el.style.visibility = 'visible'; a.el.style.opacity = 1; a.el.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%)`; }
      else { a.el.style.opacity = 0; a.el.style.visibility = 'hidden'; }
    }
  };
  Viewer.prototype.dispose = function () {
    if (this.dead) return; this.dead = true; cancelAnimationFrame(this.raf); this.ro.disconnect();
    this.scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m.map) m.map.dispose(); m.dispose(); }); } });
    this.renderer.dispose(); try { this.renderer.forceContextLoss(); } catch (e) { } this.renderer.domElement.remove(); this.labels.remove(); if (this.fadeEl) this.fadeEl.remove();
  };
  window.HT3D = { Viewer, M, CX, CZ };
})();
