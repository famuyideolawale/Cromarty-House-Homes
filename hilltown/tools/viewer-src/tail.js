
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
    sc.background = new THREE.Color(opts.bg || '#e2e8e0');
    this.cam = new THREE.PerspectiveCamera(this.mode === 'tour' ? 76 : 40, W0 / H0, .05, 600);
    this.mats = makeMats();
    sc.add(this.hemi = new THREE.HemisphereLight(0xf6f2ea, 0x6d655a, this.mode === 'tour' ? .72 : .85));
    const sun = this.sun = new THREE.DirectionalLight(0xfff4e2, .62); sun.position.set(-30, 60, -40); sc.add(sun); sc.add(sun.target);
    const fill = this.fill = new THREE.DirectionalLight(0xdfe8f0, .25); fill.position.set(30, 25, 40); sc.add(fill);
    this.bg0 = opts.bg || '#e2e8e0';
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
