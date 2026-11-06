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
