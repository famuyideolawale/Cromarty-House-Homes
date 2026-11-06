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
