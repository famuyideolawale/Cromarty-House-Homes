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
    const X0 = -9, X1 = 31;
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
