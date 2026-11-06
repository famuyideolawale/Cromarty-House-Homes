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
