// ===== Tiny Desktop - 3D PC: scene =====
// The room, machine, keyboard, mouse and desk as three.js meshes, lit by the
// desk lamp (spot light), the moon through the blinds (directional light
// masked by the window), and the tube itself (rect area light). Rendered to
// a half-float target, then haze, bloom and the film look in our own passes.
//
// js/pc3d.js loads three.js from the CDN and calls window.PC3DScene(...);
// it owns the camera, the DOM screen and the input. World units are metres:
// desk top y=0, PC front face z=0 (the same numbers as pc3d.js).
(function () {
  'use strict';

  window.PC3DScene = function (THREE, RectAreaLightUniformsLib, canvas, atlasCanvas) {
    RectAreaLightUniformsLib.init();

    // ----- layout (matches pc3d.js) -----
    var YS = 0.205, ZD = -0.006;
    var SH = [0.135, 0.10125], OPH = [0.149, 0.1145];
    var XW = -1.05, ZW = -0.66, BP = 0.034;
    var WY = [0.10, 1.65], WC = [0.195, 0.875], WH = [0.755, 0.775];
    var LB = [-0.47, 0.0, -0.22], LA = [-0.39, 0.40, -0.09];
    var LD = norm([-0.15 - LA[0], 0.0 - LA[1], 0.14 - LA[2]]);
    var LP = [LA[0] + LD[0] * 0.045, LA[1] + LD[1] * 0.045, LA[2] + LD[2] * 0.045];
    var MOON_L = norm([-0.78, 0.50, 0.35]);
    var KB_O = [-0.015, 0.0, 0.160], KB_YAW = 0.025, KB_TILT = 0.055;
    var U = 0.019, KZ0 = -0.1255, KEYB = 0.0165, KEYH = 0.0115;
    var MS_O = [0.262, 0.003, 0.100], MS_YAW = -0.20;
    var MUG_O = [-0.262, 0.0, 0.100], FL_O = [0.318, 0.0, -0.090], PO = [0.54, 0.50, -0.66];

    function norm(v) { var l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; }
    function v3(a) { return new THREE.Vector3(a[0], a[1], a[2]); }
    function lin(r, g, b) { return new THREE.Color().setRGB(r, g, b); }

    // ===== Geometry builder =====
    // Parts are added as points + triangles; each part's winding is checked
    // against the side its surface should face, so normals come out right.
    function Geo() { this.p = []; this.i = []; this.uv = []; this.c = []; this.hasC = false; }
    Geo.prototype.part = function (pts, tris, faces, uvs, col) {
      var base = this.p.length / 3, k, sum = 0;
      for (k = 0; k < tris.length; k++) {
        var a = pts[tris[k][0]], b = pts[tris[k][1]], c = pts[tris[k][2]];
        var ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
        var wx = c[0] - a[0], wy = c[1] - a[1], wz = c[2] - a[2];
        var n = [uy * wz - uz * wy, uz * wx - ux * wz, ux * wy - uy * wx];
        var m = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3];
        var d = faces(m);
        sum += n[0] * d[0] + n[1] * d[1] + n[2] * d[2];
      }
      var flip = sum < 0;
      for (k = 0; k < pts.length; k++) {
        this.p.push(pts[k][0], pts[k][1], pts[k][2]);
        if (uvs) this.uv.push(uvs[k][0], uvs[k][1]); else this.uv.push(0, 0);
        var cc = col ? (typeof col === 'function' ? col(pts[k]) : col) : [1, 1, 1];
        if (col) this.hasC = true;
        this.c.push(cc[0], cc[1], cc[2]);
      }
      for (k = 0; k < tris.length; k++) {
        var t = tris[k];
        if (flip) this.i.push(base + t[0], base + t[2], base + t[1]);
        else this.i.push(base + t[0], base + t[1], base + t[2]);
      }
      return this;
    };
    Geo.prototype.build = function () {
      var g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
      if (this.hasC) g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
      g.setIndex(this.i);
      g.computeVertexNormals();
      return g;
    };

    // rounded rectangle outline around (0,0), counter-clockwise, 4*(segs+1) points
    function rrPts(hx, hy, r, segs) {
      r = Math.max(0, Math.min(r, hx, hy));
      var out = [], cs = [[1, 1], [-1, 1], [-1, -1], [1, -1]];
      for (var q = 0; q < 4; q++) {
        var ox = cs[q][0] * (hx - r), oy = cs[q][1] * (hy - r);
        for (var s = 0; s <= segs; s++) {
          var a = (q + s / segs) * Math.PI / 2;
          out.push([ox + r * Math.cos(a), oy + r * Math.sin(a)]);
        }
      }
      return out;
    }
    // ring {u, v, hx, hy, r, w} on an axis: 'z' (u,v)=(x,y), 'y' (u,v)=(x,z), 'x' (u,v)=(z,y)
    function place(axis, u, v, w) {
      if (axis === 'z') return [u, v, w];
      if (axis === 'y') return [u, w, v];
      return [w, v, u];
    }
    function axisPoint(axis, ring, m) {
      if (axis === 'z') return [ring.u, ring.v, m[2]];
      if (axis === 'y') return [ring.u, m[1], ring.v];
      return [m[0], ring.v, ring.u];
    }
    // tube through rounded-rect rings; side 'out' or 'in' (faces the axis)
    function loft(g, axis, rings, segs, side, col) {
      var pts = [], tris = [], n = 4 * (segs + 1);
      for (var k = 0; k < rings.length; k++) {
        var R = rings[k], o = rrPts(R.hx, R.hy, R.r, segs);
        for (var j = 0; j < n; j++) pts.push(place(axis, R.u + o[j][0], R.v + o[j][1], R.w));
      }
      for (k = 0; k < rings.length - 1; k++) {
        for (j = 0; j < n; j++) {
          var a = k * n + j, b = k * n + (j + 1) % n, c = (k + 1) * n + (j + 1) % n, d = (k + 1) * n + j;
          tris.push([a, b, c], [a, c, d]);
        }
      }
      var R0 = rings[0], sgn = side === 'in' ? -1 : 1;
      g.part(pts, tris, function (m) {
        var ap = axisPoint(axis, R0, m);
        return [(m[0] - ap[0]) * sgn, (m[1] - ap[1]) * sgn, (m[2] - ap[2]) * sgn];
      }, null, col);
    }
    // flat fill of a rounded-rect ring, facing dir; uvFn(point) optional
    function cap(g, axis, R, segs, dir, uvFn, col) {
      var o = rrPts(R.hx, R.hy, R.r, segs), pts = [place(axis, R.u, R.v, R.w)], tris = [];
      for (var j = 0; j < o.length; j++) pts.push(place(axis, R.u + o[j][0], R.v + o[j][1], R.w));
      for (j = 0; j < o.length; j++) tris.push([0, 1 + j, 1 + (j + 1) % o.length]);
      g.part(pts, tris, function () { return dir; }, uvFn ? pts.map(uvFn) : null, col);
    }
    // flat face between an outline and holes (lists of [u,v]), facing dir
    function face(g, axis, w, outline, holes, dir, uvFn, col) {
      var c2 = outline.map(function (p) { return new THREE.Vector2(p[0], p[1]); });
      var h2 = holes.map(function (h) { return h.map(function (p) { return new THREE.Vector2(p[0], p[1]); }); });
      if (THREE.ShapeUtils.isClockWise(c2)) c2.reverse();
      h2.forEach(function (h) { if (!THREE.ShapeUtils.isClockWise(h)) h.reverse(); });
      var tris = THREE.ShapeUtils.triangulateShape(c2, h2);
      var all = c2.concat.apply(c2, h2);
      var pts = all.map(function (p) { return place(axis, p.x, p.y, w); });
      g.part(pts, tris, function () { return dir; }, uvFn ? pts.map(uvFn) : null, col);
    }
    function offsetPts(o, du, dv) { return o.map(function (p) { return [p[0] + du, p[1] + dv]; }); }
    // rounded box along y: corner radius rc (in xz), edge radius re
    function rbox(g, c, h, rc, re, segs, col, noTop) {
      var rings = [], es = 4;
      for (var k = 0; k <= es; k++) {
        var f = -Math.PI / 2 + k / es * Math.PI / 2;
        rings.push(ringAt(c[1] - (h[1] - re) + re * Math.sin(f), Math.cos(f)));
      }
      for (k = 0; k <= es; k++) {
        f = k / es * Math.PI / 2;
        rings.push(ringAt(c[1] + (h[1] - re) + re * Math.sin(f), Math.cos(f)));
      }
      function ringAt(y, cf) {
        return { u: c[0], v: c[2], w: y, hx: h[0] - re + re * cf, hy: h[2] - re + re * cf, r: Math.max(0, rc - re + re * cf) };
      }
      loft(g, 'y', rings, segs, 'out', col);
      cap(g, 'y', rings[0], segs, [0, -1, 0], null, col);
      if (!noTop) cap(g, 'y', rings[rings.length - 1], segs, [0, 1, 0], null, col);
      return rings;
    }

    // ===== Materials =====
    // Shared GLSL: the window mask for the moon, and the procedural surfaces
    // of the old ray-marched version (wall plaster, desk wood, case plastic).
    var GLSL_COMMON = [
      'varying vec3 vPcWorld;float pcG=0.0;',
      'const float PC_XW=' + XW.toFixed(4) + ';const float PC_BP=' + BP.toFixed(4) + ';',
      'const vec2 PC_WY=vec2(' + WY.join(',') + ');const vec2 PC_WC=vec2(' + WC.join(',') + ');const vec2 PC_WH=vec2(' + WH.join(',') + ');',
      'const vec3 PC_MOON=vec3(' + MOON_L.map(function (x) { return x.toFixed(6); }).join(',') + ');',
      'const vec3 PC_LP=vec3(' + LP.map(function (x) { return x.toFixed(6); }).join(',') + ');',
      'const vec3 PC_LAMP=vec3(1.0,0.62,0.30)*0.42;',
      'float pcHash(vec3 p){p=fract(p*0.3183099+0.1);p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}',
      'float pcNoise(vec3 x){vec3 i=floor(x);vec3 f=fract(x);f=f*f*(3.0-2.0*f);',
      ' return mix(mix(mix(pcHash(i),pcHash(i+vec3(1,0,0)),f.x),mix(pcHash(i+vec3(0,1,0)),pcHash(i+vec3(1,1,0)),f.x),f.y),',
      '  mix(mix(pcHash(i+vec3(0,0,1)),pcHash(i+vec3(1,0,1)),f.x),mix(pcHash(i+vec3(0,1,1)),pcHash(i+vec3(1,1,1)),f.x),f.y),f.z);}',
      'float pcFbm(vec3 p){float a=0.5,s=0.0;for(int i=0;i<4;i++){s+=a*pcNoise(p);p=p*2.03+vec3(1.7,9.2,3.1);a*=0.5;}return s;}',
      'float pcRect(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return length(max(q,0.0))+min(max(q.x,q.y),0.0)-r;}',
      // moonlight that makes it through the window: blinds, mullion, transom, soft edges
      'float pcMoonMask(vec3 p){',
      ' if(p.x<PC_XW)return 0.0;',
      ' float s=(PC_XW-0.022-p.x)/PC_MOON.x;vec3 w=p+PC_MOON*s;',
      ' float pen=0.002+s*0.006;',
      ' float m=1.0-smoothstep(-pen,pen,pcRect(vec2(w.z,w.y)-PC_WC,PC_WH-0.02,0.0));',
      ' float sb=clamp(pen/PC_BP,0.012,0.5);',
      ' m*=mix(0.18,1.0,smoothstep(0.21-sb,0.21+sb,abs(fract((w.y-PC_WY.x)/PC_BP)-0.5)));',
      ' float s2=(PC_XW-0.075-p.x)/PC_MOON.x;vec3 w2=p+PC_MOON*s2;float p2=0.002+s2*0.006;',
      ' m*=smoothstep(0.012-p2,0.012+p2,abs(w2.z-PC_WC.x));',
      ' m*=smoothstep(0.012-p2,0.012+p2,abs(w2.y-(PC_WC.y+0.12)));',
      ' return m;}',
      'vec3 pcBump(vec3 p,vec3 nv,float fr,float amt){',
      ' vec3 g=vec3(pcNoise(p*fr),pcNoise(p*fr+vec3(17.1)),pcNoise(p*fr+vec3(-9.3)))-0.5;',
      ' vec3 gv=(viewMatrix*vec4(g,0.0)).xyz;return normalize(nv+(gv-nv*dot(gv,nv))*amt);}'
    ].join('\n');

    // per-surface code: albedo / roughness / normal / emission, in world space
    var PROC = {
      wall: {
        color: 'float f=pcFbm(P*38.0);float st=0.96+0.04*smoothstep(0.30,0.5,abs(fract((P.x+P.z)*14.0)-0.5));' +
          'diffuseColor.rgb=vec3(0.060,0.068,0.070)*(0.82+0.36*f)*st;',
        rough: 'roughnessFactor=0.92;'
      },
      desk: {
        color: 'float g=pcFbm(vec3(P.x*7.0,P.z*70.0,P.y*70.0));pcG=g;float ring=fract(P.z*38.0+g*2.6+sin(P.x*3.0)*0.4);' +
          'float w=smoothstep(0.0,0.6,ring)*smoothstep(1.0,0.7,ring);' +
          'diffuseColor.rgb=mix(vec3(0.050,0.024,0.011),vec3(0.170,0.088,0.040),0.35+0.45*w+0.2*g);',
        rough: 'roughnessFactor=0.26+0.25*pcG;'
      },
      plastic: {
        color: 'float y=pcFbm(P*9.0);diffuseColor.rgb=mix(vec3(0.60,0.55,0.44),vec3(0.56,0.48,0.34),y*0.8);',
        normal: 'normal=pcBump(P,normal,700.0,0.10);'
      },
      kbcase: { normal: 'normal=pcBump(P,normal,700.0,0.08);' },
      key: { normal: 'normal=pcBump(P,normal,900.0,0.05);' },
      pad: { color: 'diffuseColor.rgb*=0.75+0.5*pcNoise(P*900.0);' },
      shadein: { emissive: 'totalEmissiveRadiance+=diffuseColor.rgb*PC_LAMP*3.5*exp(-length(P-PC_LP)/0.045);' }
    };

    function patch(mat, procName) {
      var pr = PROC[procName] || {};
      mat.onBeforeCompile = function (sh) {
        sh.vertexShader = sh.vertexShader
          .replace('#include <common>', '#include <common>\nvarying vec3 vPcWorld;')
          .replace('#include <project_vertex>', '#include <project_vertex>\n{vec4 pcW=vec4(transformed,1.0);\n#ifdef USE_INSTANCING\npcW=instanceMatrix*pcW;\n#endif\nvPcWorld=(modelMatrix*pcW).xyz;}');
        var lights = THREE.ShaderChunk.lights_fragment_begin.replace(
          'getDirectionalLightInfo( directionalLight, directLight );',
          'getDirectionalLightInfo( directionalLight, directLight );\n\t\tdirectLight.color *= pcMoonMask( vPcWorld );');
        var fs = sh.fragmentShader
          .replace('#include <common>', '#include <common>\n' + GLSL_COMMON)
          .replace('#include <lights_fragment_begin>', lights);
        if (pr.color) fs = fs.replace('#include <color_fragment>', '#include <color_fragment>\n{vec3 P=vPcWorld;' + pr.color + '}');
        if (pr.rough) fs = fs.replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n{vec3 P=vPcWorld;' + pr.rough + '}');
        if (pr.normal) fs = fs.replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n{vec3 P=vPcWorld;' + pr.normal + '}');
        if (pr.emissive) fs = fs.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n{vec3 P=vPcWorld;' + pr.emissive + '}');
        sh.fragmentShader = fs;
      };
      mat.customProgramCacheKey = function () { return 'pc3d-' + (procName || 'plain'); };
      return mat;
    }
    function std(o, procName) {
      var m = new THREE.MeshStandardMaterial({
        color: o.color ? lin(o.color[0], o.color[1], o.color[2]) : lin(1, 1, 1),
        roughness: o.rough != null ? o.rough : 0.6,
        metalness: o.metal || 0,
        map: o.map || null,
        vertexColors: !!o.vc
      });
      if (o.emissive) m.emissive = lin(o.emissive[0], o.emissive[1], o.emissive[2]);
      if (o.emissiveMap) m.emissiveMap = o.emissiveMap;
      return patch(m, procName);
    }

    // ----- textures -----
    var aniso = 8;
    var atlas = new THREE.CanvasTexture(atlasCanvas);
    atlas.flipY = false;
    atlas.colorSpace = THREE.SRGBColorSpace;
    atlas.anisotropy = aniso;
    function atlasUV(rx, ry, rw, rh, u, v) {
      u = Math.max(0, Math.min(1, u)); v = Math.max(0, Math.min(1, v));
      return [(rx + u * rw) / 1024, (ry + v * rh) / 1024];
    }

    var M = {
      wall: std({ color: [1, 1, 1], rough: 0.92 }, 'wall'),
      desk: std({ color: [1, 1, 1], rough: 0.4 }, 'desk'),
      floor: std({ color: [0.02, 0.018, 0.016], rough: 0.8 }),
      plastic: std({ color: [1, 1, 1], rough: 0.52 }, 'plastic'),
      slot: std({ color: [0.012, 0.012, 0.012], rough: 0.7 }),
      kbcase: std({ color: [0.56, 0.51, 0.41], rough: 0.55 }, 'kbcase'),
      pad: std({ color: [0.020, 0.028, 0.056], rough: 1.0 }, 'pad'),
      cable: std({ color: [0.46, 0.43, 0.36], rough: 0.4 }),
      mug: std({ color: [1, 1, 1], rough: 0.16, vc: true }),
      coffee: std({ color: [0.030, 0.014, 0.006], rough: 0.06 }),
      shadeOut: std({ color: [0.012, 0.070, 0.036], rough: 0.22 }),
      shadeIn: std({ color: [0.75, 0.68, 0.52], rough: 0.5 }, 'shadein'),
      brass: std({ color: [0.80, 0.58, 0.26], rough: 0.30, metal: 1 }),
      ledP: std({ color: [0.1, 0.1, 0.1], rough: 0.3, emissive: [0.30 * 2.4, 1.0 * 2.4, 0.35 * 2.4] }),
      ledD: std({ color: [0.10, 0.06, 0.02], rough: 0.3, emissive: [0, 0, 0] }),
      note: std({ color: [0.85, 0.85, 0.85], rough: 0.85, map: atlas }),
      badge: std({ color: [1, 1, 1], rough: 0.3, map: atlas }),
      shutter: std({ color: [0.60, 0.61, 0.63], rough: 0.3, metal: 1 }),
      label: std({ color: [0.9, 0.9, 0.9], rough: 0.8, map: atlas }),
      frame: std({ color: [0.07, 0.07, 0.075], rough: 0.6 }),
      blind: std({ color: [0.26, 0.27, 0.28], rough: 0.55 }),
      poster: std({ color: [0.9, 0.9, 0.9], rough: 0.45, map: atlas }),
      pframe: std({ color: [0.015, 0.013, 0.012], rough: 0.35 }),
      flop: [
        std({ color: [0.018, 0.018, 0.020], rough: 0.42 }),
        std({ color: [0.020, 0.045, 0.13], rough: 0.42 }),
        std({ color: [0.14, 0.018, 0.018], rough: 0.42 })
      ],
      bulb: new THREE.MeshBasicMaterial({ color: lin(7.0, 5.6, 3.85) })
    };

    var scene = new THREE.Scene();
    scene.background = lin(0.002, 0.0025, 0.004);
    function add(geo, mat, opt) {
      var mesh = new THREE.Mesh(geo, mat);
      opt = opt || {};
      mesh.castShadow = opt.cast !== false;
      mesh.receiveShadow = true;
      (opt.parent || scene).add(mesh);
      return mesh;
    }
    function group(pos, rot) {
      var gr = new THREE.Group();
      gr.position.set(pos[0], pos[1], pos[2]);
      if (rot) gr.rotation.set(rot[0], rot[1], rot[2], rot[3] || 'XYZ');
      scene.add(gr);
      return gr;
    }

    // ===== The machine =====
    (function buildPC() {
      var g = new Geo(), R = 0.014, cy = 0.1905, hx = 0.200, hy = 0.1785, segs = 6, k, f;
      var rings = [];
      function ring(w, ins, cf) {
        var e = R * cf;
        return { u: 0, v: cy, w: w, hx: hx - R + e - ins, hy: hy - R + e - ins, r: Math.max(0, e - ins) };
      }
      for (k = 0; k <= 4; k++) { f = (1 - k / 4) * Math.PI / 2; rings.push(ring(-R + R * Math.sin(f), 0, Math.cos(f))); }
      // seam groove round the case just behind the front
      rings.push(ring(-0.0204, 0, 1), ring(-0.0204, 0.0016, 1), ring(-0.0216, 0.0016, 1), ring(-0.0216, 0, 1));
      for (k = 0; k <= 4; k++) { f = k / 4 * Math.PI / 2; rings.push(ring(-0.22 + R - R * Math.sin(f), 0, Math.cos(f))); }
      loft(g, 'z', rings, segs, 'out');
      cap(g, 'z', rings[rings.length - 1], segs, [0, 0, -1]);

      // rear hood tapering towards the back like a real tube housing
      function hoodK(z) { return 1 - 0.27 * Math.max(0, Math.min(1, (-z - 0.19) / 0.21)); }
      var hood = [], zs = [-0.205, -0.29, -0.377];
      function hring(z, cf) {
        var kk = hoodK(z), e = 0.028 * cf;
        return { u: 0, v: 0.012 + 0.1785 * kk, w: z, hx: (0.196 - 0.028 + e) * kk, hy: (0.1785 - 0.028 + e) * kk, r: e * kk };
      }
      zs.forEach(function (z) { hood.push(hring(z, 1)); });
      for (k = 1; k <= 5; k++) { f = k / 5 * Math.PI / 2; hood.push(hring(-0.377 - 0.028 * Math.sin(f), Math.cos(f))); }
      loft(g, 'z', hood, segs, 'out');
      cap(g, 'z', hood[hood.length - 1], segs, [0, 0, -1]);

      // front face with the bezel opening, the floppy recess and the grille
      var outline = offsetPts(rrPts(hx - R, hy - R, 0, 1), 0, cy);
      var bez = offsetPts(rrPts(OPH[0] + 0.0084, OPH[1] + 0.0084, 0.0284, 8), 0, YS);
      var fdd = offsetPts(rrPts(0.068, 0.018, 0.005, 4), 0.098, 0.060);
      var holes = [bez, fdd], grille = [];
      for (k = -3; k <= 3; k++) {
        var gy = 0.062 + k * 0.0056;
        grille.push(gy);
        holes.push(offsetPts(rrPts(0.034, 0.0012, 0.0012, 2), -0.085, gy));
      }
      face(g, 'z', 0, outline, holes, [0, 0, 1]);
      // bezel: chamfer, then straight walls down past the glass
      loft(g, 'z', [
        { u: 0, v: YS, w: 0, hx: OPH[0] + 0.0084, hy: OPH[1] + 0.0084, r: 0.0284 },
        { u: 0, v: YS, w: -0.012, hx: OPH[0], hy: OPH[1], r: 0.02 },
        { u: 0, v: YS, w: -0.035, hx: OPH[0], hy: OPH[1], r: 0.02 }
      ], 8, 'in');
      // floppy drive recess with its slot
      loft(g, 'z', [
        { u: 0.098, v: 0.060, w: 0, hx: 0.068, hy: 0.018, r: 0.005 },
        { u: 0.098, v: 0.060, w: -0.003, hx: 0.068, hy: 0.018, r: 0.005 }
      ], 4, 'in');
      face(g, 'z', -0.003, fdd, [offsetPts(rrPts(0.049, 0.0026, 0.0016, 2), 0.090, 0.064)], [0, 0, 1]);
      rbox(g, [0.150, 0.052, -0.003], [0.0085, 0.0032, 0.0016], 0.001, 0.001, 2);
      add(g.build(), M.plastic);

      // dark holes: slot and grille interiors, plinth
      var d = new Geo();
      var slotR = { u: 0.090, v: 0.064, hx: 0.049, hy: 0.0026, r: 0.0016 };
      loft(d, 'z', [Object.assign({ w: -0.003 }, slotR), Object.assign({ w: -0.03 }, slotR)], 2, 'in');
      cap(d, 'z', Object.assign({ w: -0.03 }, slotR), 2, [0, 0, 1]);
      grille.forEach(function (gy) {
        var gr = { u: -0.085, v: gy, hx: 0.034, hy: 0.0012, r: 0.0012 };
        loft(d, 'z', [Object.assign({ w: 0 }, gr), Object.assign({ w: -0.004 }, gr)], 2, 'in');
        cap(d, 'z', Object.assign({ w: -0.004 }, gr), 2, [0, 0, 1]);
      });
      rbox(d, [0.0, 0.0065, -0.205], [0.186, 0.0065, 0.192], 0.003, 0.003, 2);
      // vents along both sides of the hood, handle recess on top
      for (var sx = -1; sx <= 1; sx += 2) {
        for (k = -6; k <= 4; k++) {
          var vy = 0.21 + k * 0.0115, q = [], z0 = -0.375, z1 = -0.275;
          [[z0, vy - 0.0016], [z1, vy - 0.0016], [z1, vy + 0.0016], [z0, vy + 0.0016]].forEach(function (p) {
            q.push([sx * (0.196 * hoodK(p[0]) + 0.0004), p[1], p[0]]);
          });
          d.part(q, [[0, 1, 2], [0, 2, 3]], function () { return [sx, 0, 0]; });
        }
      }
      var hdl = rrPts(0.07, 0.013, 0.012, 3), hp = [[0, 0, 0]], ht = [];
      hdl.forEach(function (p) { hp.push([p[0], 0, -0.315 + p[1]]); });
      hp[0] = [0, 0, -0.315];
      hp.forEach(function (p) { p[1] = 0.012 + 0.357 * hoodK(p[2]) + 0.0005; });
      for (k = 0; k < hdl.length; k++) ht.push([0, 1 + k, 1 + (k + 1) % hdl.length]);
      d.part(hp, ht, function () { return [0, 1, 0]; });
      add(d.build(), M.slot);

      // the tube: a slightly domed glass face; its edge glows with the picture
      var gl = new Geo(), sc = [1, 0.85, 0.68, 0.5, 0.32, 0.15], gp = [], gt = [], guv = [];
      var GHX = OPH[0] + 0.004, GHY = OPH[1] + 0.004, n = 4 * 9;
      sc.forEach(function (s) {
        rrPts(GHX * s, GHY * s, 0.02 * s, 8).forEach(function (p) { gp.push([p[0], YS + p[1], 0]); });
      });
      gp.push([0, YS, 0]);
      for (k = 0; k < sc.length - 1; k++) {
        for (var j = 0; j < n; j++) {
          var a = k * n + j, b = k * n + (j + 1) % n;
          gt.push([a, b, b + n], [a, b + n, a + n]);
        }
      }
      for (j = 0; j < n; j++) gt.push([(sc.length - 1) * n + j, (sc.length - 1) * n + (j + 1) % n, gp.length - 1]);
      gp.forEach(function (p) {
        var dy = p[1] - YS;
        p[2] = ZD - 1.6 + Math.sqrt(1.6 * 1.6 - p[0] * p[0] - dy * dy);
        guv.push([(p[0] + GHX) / (2 * GHX), (dy + GHY) / (2 * GHY)]);
      });
      gl.part(gp, gt, function () { return [0, 0, 1]; }, guv);
      M.glass = std({ color: [0.028, 0.034, 0.031], rough: 0.05, emissive: [0, 0, 0], emissiveMap: haloTexture(GHX, GHY) });
      add(gl.build(), M.glass, { cast: false });

      // badge, LEDs, sticky note
      var bd = new Geo();
      rbox(bd, [0, 0, 0], [0.0115, 0.0011, 0.0115], 0.0022, 0.0011, 3);
      var bgeo = bd.build();
      bgeo.rotateX(Math.PI / 2);
      add(bgeo, M.slot).position.set(-0.158, 0.066, 0.0);
      add(quad([-0.158, 0.066, 0.0012], [0.0115, 0.0115], function (u, v) { return atlasUV(768, 0, 128, 128, u, v); }), M.badge, { cast: false });
      var led = new THREE.SphereGeometry(0.0021, 12, 8);
      add(led, M.ledP, { cast: false }).position.set(-0.158, 0.038, -0.0005);
      var dl = new Geo();
      rbox(dl, [0.036, 0.052, -0.003], [0.0032, 0.0014, 0.0012], 0.0006, 0.0006, 2);
      add(dl.build(), M.ledD, { cast: false });
      var note = add(quad([0, 0, 0], [0.020, 0.020], function (u, v) { return atlasUV(512, 0, 256, 256, u, v); }), M.note, { cast: false });
      note.position.set(0.140, 0.349, 0.0012);
      note.rotation.z = -0.07;
    })();

    // flat quad facing +z, half size h, uv(u,v) with v going down the picture
    function quad(c, h, uvf) {
      var g = new Geo(), pts = [], uvs = [];
      [[-1, 1], [1, 1], [1, -1], [-1, -1]].forEach(function (s) {
        pts.push([c[0] + s[0] * h[0], c[1] + s[1] * h[1], c[2]]);
        uvs.push(uvf((s[0] + 1) / 2, (1 - s[1]) / 2));
      });
      g.part(pts, [[0, 1, 2], [0, 2, 3]], function () { return [0, 0, 1]; }, uvs);
      return g.build();
    }

    // glow just outside the picture, falling off over a few millimetres
    function haloTexture(GHX, GHY) {
      var w = 512, h = Math.round(512 * GHY / GHX), cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      var x = cv.getContext('2d'), img = x.createImageData(w, h);
      for (var j = 0; j < h; j++) {
        for (var i = 0; i < w; i++) {
          var px = ((i + 0.5) / w * 2 - 1) * GHX, py = ((j + 0.5) / h * 2 - 1) * GHY;
          var qx = Math.abs(px) - SH[0] + 0.008, qy = Math.abs(py) - SH[1] + 0.008;
          var dO = Math.max(0, Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - 0.008);
          var v = (0.55 * Math.exp(-dO / 0.0032) + 0.08 * Math.exp(-dO / 0.02)) / 0.63;
          var o = (j * w + i) * 4;
          img.data[o] = img.data[o + 1] = img.data[o + 2] = Math.round(255 * Math.min(1, v));
          img.data[o + 3] = 255;
        }
      }
      x.putImageData(img, 0, 0);
      var t = new THREE.CanvasTexture(cv);
      t.colorSpace = THREE.NoColorSpace;
      return t;
    }

    // ===== Keyboard =====
    (function buildKeyboard() {
      var kb = group(KB_O, [KB_TILT, KB_YAW, 0, 'YXZ']);
      var g = new Geo(), segs = 3;
      // case with the key well cut into its top
      var rings = rbox(g, [0, 0.0115, -0.074], [0.170, 0.0115, 0.074], 0.005, 0.005, segs, null, true);
      var top = rings[rings.length - 1], well = { u: 0, v: -0.078, hx: 0.1455, hy: 0.0492, r: 0.0015 };
      face(g, 'y', top.w, offsetPts(rrPts(top.hx, top.hy, top.r, segs), top.u, top.v),
        [offsetPts(rrPts(well.hx, well.hy, well.r, 2), well.u, well.v)], [0, 1, 0]);
      loft(g, 'y', [Object.assign({ w: top.w }, well), Object.assign({ w: KEYB }, well)], 2, 'in');
      cap(g, 'y', Object.assign({ w: KEYB }, well), 2, [0, 1, 0]);
      for (var sx = -1; sx <= 1; sx += 2) rbox(g, [sx * 0.14, -0.004, -0.135], [0.012, 0.0045, 0.006], 0.002, 0.002, 2);
      add(g.build(), M.kbcase, { parent: kb });

      // keys: tapered caps, legends from one texture laid out like the keyboard
      var keys = keyLayout(), kg = new Geo(), legend = legendCanvas(keys);
      var KA = [0.66, 0.62, 0.52], KM = [0.42, 0.40, 0.36];
      function kuv(p) { return [(p[0] + 7.5 * U) / (15 * U), (p[2] - KZ0) / (5 * U)]; }
      keys.forEach(function (k) {
        var cx = (k.x0 + k.x1) * 0.5 * U - 7.5 * U, cz = KZ0 + (k.r + 0.5) * U;
        var hw = (k.x1 - k.x0) * 0.5 * U - 0.0011, hd = 0.5 * U - 0.0011, rr = 0.0016, tp = 0.0024;
        var kr = [], f, j;
        kr.push({ u: cx, v: cz, w: KEYB - 0.001, hx: hw, hy: hd, r: rr });
        var hTop = KEYH - rr, sh = tp * hTop / KEYH;
        kr.push({ u: cx, v: cz, w: KEYB + hTop, hx: hw - sh, hy: hd - sh, r: rr });
        for (j = 1; j <= 3; j++) {
          f = j / 3 * Math.PI / 2;
          var hh = hTop + rr * Math.sin(f), s2 = tp * hh / KEYH, e = rr * Math.cos(f);
          kr.push({ u: cx, v: cz, w: KEYB + hh, hx: hw - s2 - rr + e, hy: hd - s2 - rr + e, r: e });
        }
        var col = k.mod ? KM : KA, start = kg.p.length / 3;
        loft(kg, 'y', kr, 3, 'out', col);
        cap(kg, 'y', kr[kr.length - 1], 3, [0, 1, 0], kuv, col);
        for (j = start; j < kg.p.length / 3; j++) {
          var uv = kuv([kg.p[j * 3], 0, kg.p[j * 3 + 2]]);
          kg.uv[j * 2] = uv[0]; kg.uv[j * 2 + 1] = uv[1];
        }
      });
      var lt = new THREE.CanvasTexture(legend);
      lt.flipY = false;
      lt.colorSpace = THREE.NoColorSpace;
      lt.anisotropy = aniso;
      M.key = std({ color: [1, 1, 1], rough: 0.48, vc: true, map: lt }, 'key');
      add(kg.build(), M.key, { parent: kb });
    })();

    function keyLayout() {
      var keys = [];
      for (var r = 0; r < 4; r++) {
        var L = [0, 1.5, 1.75, 2.25][r], R = [2, 1.5, 2.25, 2.75][r], x;
        if (L > 0) keys.push({ r: r, x0: 0, x1: L });
        for (x = L; x < 15 - R - 0.01; x++) keys.push({ r: r, x0: x, x1: x + 1 });
        keys.push({ r: r, x0: 15 - R, x1: 15 });
      }
      [[0, 1.5], [1.5, 2.75], [2.75, 12.25], [12.25, 13.5], [13.5, 15]].forEach(function (s) { keys.push({ r: 4, x0: s[0], x1: s[1] }); });
      keys.forEach(function (k) {
        var w = k.x1 - k.x0, space = k.r === 4 && w > 5;
        k.mod = !space && (w > 1.01 || k.r === 4);
        var idx = -1, x0 = k.x0, r = k.r;
        if (r === 4) idx = x0 < 0.5 ? 52 : (x0 < 2 ? 53 : (x0 < 3 ? -1 : (x0 < 13 ? 53 : 54)));
        else if (w < 1.01) {
          var L = [0, 1.5, 1.75, 2.25][r];
          idx = [0, 13, 25, 36][r] + Math.floor(x0 - L + 0.5);
        } else idx = r === 0 ? 46 : (r === 1 ? (x0 < 0.5 ? 47 : 48) : (r === 2 ? (x0 < 0.5 ? 49 : 50) : 51));
        k.idx = idx;
      });
      return keys;
    }
    // white with dark legends; the cell of each glyph comes from the atlas
    function legendCanvas(keys) {
      var W = 2048, H = Math.round(2048 / 3), sx = W / (15 * U), sz = H / (5 * U);
      var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      var x = cv.getContext('2d');
      x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
      var ink = document.createElement('canvas'); ink.width = 1024; ink.height = 512;
      var ix = ink.getContext('2d');
      ix.drawImage(atlasCanvas, 0, 0, 1024, 512, 0, 0, 1024, 512);
      ix.globalCompositeOperation = 'source-in';
      ix.fillStyle = 'rgba(14,13,12,0.92)'; ix.fillRect(0, 0, 1024, 512);
      keys.forEach(function (k) {
        if (k.idx < 0) return;
        var w = k.x1 - k.x0, hdL = 0.5 * U - 0.0035, hwL = w * 0.5 * U - 0.0035, size = hdL * 2;
        var ax = w > 1.01 ? -hwL + hdL : 0;
        var cxm = (k.x0 + k.x1) * 0.5 * U + ax, czm = (k.r + 0.5) * U;
        var cx = k.idx % 8, cy = Math.floor(k.idx / 8);
        x.drawImage(ink, cx * 64, cy * 64, 64, 64, (cxm - size / 2) * sx, (czm - size / 2) * sz, size * sx, size * sz);
      });
      return cv;
    }

    // ===== Mouse, pad, cables =====
    (function buildMouse() {
      var ms = group(MS_O, [0, MS_YAW, 0]);
      var g = new Geo(), segs = 5, rings = [], k, f, R = 0.008, c = [0, 0.0145, 0], h = [0.029, 0.0145, 0.049];
      for (k = 0; k <= 3; k++) { f = -Math.PI / 2 + k / 3 * Math.PI / 2; rings.push(rr(c[1] - (h[1] - R) + R * Math.sin(f), Math.cos(f))); }
      for (k = 0; k <= 5; k++) { f = k / 5 * Math.PI / 2; rings.push(rr(c[1] + (h[1] - R) + R * Math.sin(f), Math.cos(f))); }
      function rr(y, cf) { return { u: 0, v: 0, w: y, hx: h[0] - R + R * cf, hy: h[2] - R + R * cf, r: R * cf }; }
      loft(g, 'y', rings, segs, 'out');
      cap(g, 'y', rings[0], segs, [0, -1, 0]);
      // top: concentric rings so the dome below has vertices to bend
      var tp = rings[rings.length - 1], o, pts = [], tris = [], sc = [1, 0.8, 0.6, 0.4, 0.2], n = 4 * (segs + 1);
      sc.forEach(function (s) { rrPts(tp.hx * s + 0.0001, tp.hy * s + 0.0001, 0, segs).forEach(function (p) { pts.push([p[0], tp.w, p[1]]); }); });
      pts.push([0, tp.w, 0]);
      for (k = 0; k < sc.length - 1; k++) for (var j = 0; j < n; j++) {
        var a = k * n + j, b = k * n + (j + 1) % n;
        tris.push([a, b, b + n], [a, b + n, a + n]);
      }
      for (j = 0; j < n; j++) tris.push([(sc.length - 1) * n + j, (sc.length - 1) * n + (j + 1) % n, pts.length - 1]);
      g.part(pts, tris, function () { return [0, 1, 0]; });
      // the body is a rounded box cut by a big sphere: a gently domed back
      function dome(x, z) { return -0.19 + Math.sqrt(0.219 * 0.219 - x * x - (z - 0.012) * (z - 0.012)); }
      for (k = 0; k < g.p.length; k += 3) g.p[k + 1] = Math.min(g.p[k + 1], dome(g.p[k], g.p[k + 2]));
      add(g.build(), M.plastic, { parent: ms });
      // button split lines
      var ln = new Geo(), seg = 12;
      function strip(pa, pb, wdt) {
        var p2 = [], t2 = [], dx = pb[0] - pa[0], dz = pb[1] - pa[1], L = Math.hypot(dx, dz), nx = -dz / L * wdt, nz = dx / L * wdt;
        for (var i = 0; i <= seg; i++) {
          var x = pa[0] + dx * i / seg, z = pa[1] + dz * i / seg;
          p2.push([x - nx, dome(x - nx, z - nz) + 0.0003, z - nz], [x + nx, dome(x + nx, z + nz) + 0.0003, z + nz]);
          if (i) t2.push([2 * i - 2, 2 * i - 1, 2 * i + 1], [2 * i - 2, 2 * i + 1, 2 * i]);
        }
        ln.part(p2, t2, function () { return [0, 1, 0]; });
      }
      strip([-0.026, -0.014], [0.026, -0.014], 0.0005);
      strip([0, -0.047], [0, -0.014], 0.0005);
      add(ln.build(), M.slot, { parent: ms, cast: false });

      var pd = new Geo();
      rbox(pd, [0.262, 0.0015, 0.098], [0.118, 0.0015, 0.096], 0.006, 0.0014, 4);
      add(pd.build(), M.pad);

      function cable(A, B, C, rad, lift) {
        var curve = new THREE.Curve();
        curve.getPoint = function (t, out) {
          out = out || new THREE.Vector3();
          var a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t;
          var x = a * A[0] + b * B[0] + c * C[0], z = a * A[1] + b * B[1] + c * C[1];
          var y = 0.0028 + (lift ? 0.003 * smooth(-0.006, 0.006, z) : 0);
          return out.set(x, y, z);
        };
        add(new THREE.TubeGeometry(curve, 48, rad, 10, false), M.cable);
      }
      cable([0.050, 0.016], [0.090, 0.002], [0.122, -0.018], 0.0027, false);
      cable([0.266, 0.060], [0.262, -0.030], [0.188, -0.078], 0.0026, true);
    })();
    function smooth(e0, e1, x) { var t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); }

    // ===== Mug of coffee =====
    (function buildMug() {
      var mg = group(MUG_O);
      var prof = [[0, 0], [0.0385, 0], [0.0396, 0.0004], [0.04, 0.0015], [0.04, 0.0579], [0.04, 0.058], [0.04, 0.066], [0.04, 0.0661],
        [0.04, 0.0925], [0.0396, 0.0936], [0.0385, 0.094], [0.0352, 0.094], [0.0348, 0.0934], [0.0348, 0.0705]];
      var lathe = new THREE.LatheGeometry(prof.map(function (p) { return new THREE.Vector2(p[0], p[1]); }), 48);
      var pos = lathe.attributes.position, cols = [];
      for (var i = 0; i < pos.count; i++) {
        var y = pos.getY(i), r = Math.hypot(pos.getX(i), pos.getZ(i));
        var band = r > 0.0395 && y > 0.05795 && y < 0.06605;
        if (band) cols.push(0.45, 0.05, 0.06); else cols.push(0.80, 0.76, 0.68);
      }
      lathe.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
      add(lathe, M.mug, { parent: mg });
      var handle = new THREE.TorusGeometry(0.021, 0.0055, 12, 32, Math.PI);
      handle.rotateZ(-Math.PI / 2);
      handle.translate(0.041, 0.050, 0);
      handle.rotateY(-0.9);
      var hc = []; for (i = 0; i < handle.attributes.position.count; i++) hc.push(0.80, 0.76, 0.68);
      handle.setAttribute('color', new THREE.Float32BufferAttribute(hc, 3));
      add(handle, M.mug, { parent: mg });
      var cof = new THREE.CircleGeometry(0.0349, 40);
      cof.rotateX(-Math.PI / 2);
      cof.translate(0, 0.071, 0);
      add(cof, M.coffee, { parent: mg, cast: false });
    })();

    // ===== Floppy disks =====
    (function buildFloppies() {
      for (var fi = 0; fi < 3; fi++) {
        var fg = group([FL_O[0] + 0.004 * fi - 0.003, FL_O[1] + 0.0017 + 0.00345 * fi, FL_O[2] - 0.005 * fi], [0, 0.35 - 0.42 * fi + 0.1 * fi * fi, 0]);
        var b = new Geo();
        rbox(b, [0, 0, 0], [0.045, 0.0016, 0.047], 0.0012, 0.0012, 2);
        add(b.build(), M.flop[fi], { parent: fg });
        var s = new Geo();
        rbox(s, [0.006, 0, -0.030], [0.024, 0.00185, 0.0175], 0.0004, 0.0004, 1);
        add(s.build(), M.shutter, { parent: fg });
        var lq = quad([0, 0, 0], [0.035, 0.024], (function (fi) {
          return function (u, v) { return atlasUV(512 + 170 * fi, 256, 170, 113, u, v); };
        })(fi));
        lq.rotateX(-Math.PI / 2);
        lq.translate(0, 0.0018, 0.019);
        add(lq, M.label, { parent: fg, cast: false });
      }
    })();

    // ===== Desk lamp =====
    (function buildLamp() {
      var base = new THREE.LatheGeometry([[0, -0.001], [0.066, -0.001], [0.0685, 0.0015], [0.0685, 0.018], [0.066, 0.0205], [0.04, 0.0215], [0, 0.0215]]
        .map(function (p) { return new THREE.Vector2(p[0], p[1]); }), 48);
      add(base, M.brass).position.set(LB[0], LB[1], LB[2]);
      var top = [LB[0], LB[1] + 0.36, LB[2]];
      rod([LB[0], LB[1] + 0.02, LB[2]], top, 0.0075);
      rod(top, [LA[0] - LD[0] * 0.004, LA[1] - LD[1] * 0.004, LA[2] - LD[2] * 0.004], 0.0065);
      add(new THREE.SphereGeometry(0.012, 20, 14), M.brass).position.set(top[0], top[1], top[2]);
      add(new THREE.SphereGeometry(0.013, 20, 14), M.brass).position.set(LA[0], LA[1], LA[2]);
      function rod(a, b, r) {
        var A = v3(a), B = v3(b), len = A.distanceTo(B);
        var cyl = new THREE.CylinderGeometry(r, r, len, 16, 1, true);
        var m = add(cyl, M.brass);
        m.position.copy(A).add(B).multiplyScalar(0.5);
        m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
      }
      // the shade: a thin cone open at the wide end
      var t = 0.0012;
      function shade(points, mat) {
        var gm = new THREE.LatheGeometry(points.map(function (p) { return new THREE.Vector2(p[0], p[1]); }), 48);
        var m = add(gm, mat);
        m.position.set(LA[0], LA[1], LA[2]);
        m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v3(LD));
        return m;
      }
      shade([[0, -t], [0.018 + t, -t], [0.060 + t, 0.098]], M.shadeOut);
      shade([[0.060 + t, 0.098], [0.060 - t, 0.098]], M.shadeOut);
      shade([[0.060 - t, 0.098], [0.018 - t, t], [0, t]], M.shadeIn);
      add(new THREE.SphereGeometry(0.015, 24, 16), M.bulb, { cast: false }).position.set(LP[0], LP[1], LP[2]);
    })();

    // ===== Room =====
    (function buildRoom() {
      var g = new Geo();
      // back, right wall, desk, floor
      g.part([[XW - 0.12, -0.74, ZW], [1.7, -0.74, ZW], [1.7, 3.0, ZW], [XW - 0.12, 3.0, ZW]], [[0, 1, 2], [0, 2, 3]], function () { return [0, 0, 1]; });
      g.part([[1.7, -0.74, ZW], [1.7, -0.74, 4], [1.7, 3.0, 4], [1.7, 3.0, ZW]], [[0, 1, 2], [0, 2, 3]], function () { return [-1, 0, 0]; });
      // left wall with the window opening and its reveal
      var hole = offsetPts(rrPts(WH[0], WH[1], 0.004, 2), WC[0], WC[1]);
      face(g, 'x', XW, [[ZW, -0.74], [4, -0.74], [4, 3.0], [ZW, 3.0]], [hole], [1, 0, 0]);
      var rv = { u: WC[0], v: WC[1], hx: WH[0], hy: WH[1], r: 0.004 };
      loft(g, 'x', [Object.assign({ w: XW }, rv), Object.assign({ w: XW - 0.12 }, rv)], 2, 'in');
      add(g.build(), M.wall, { cast: false });

      var fl = new Geo();
      fl.part([[-12, -0.74, -12], [1.7, -0.74, -12], [1.7, -0.74, 12], [-12, -0.74, 12]], [[0, 1, 2], [0, 2, 3]], function () { return [0, 1, 0]; });
      add(fl.build(), M.floor, { cast: false });

      var dk = new Geo();
      rbox(dk, [-0.02, -0.018, -0.08], [1.03, 0.018, 0.58], 0.006, 0.006, 3);
      add(dk.build(), M.desk);

      // window frame, sill and blinds (the moon's mask already holds their shadows)
      var fr = new Geo();
      rbox(fr, [XW - 0.075, WC[1], WC[0]], [0.02, WH[1], 0.012], 0.0005, 0.0005, 1);
      rbox(fr, [XW - 0.075, WC[1] + 0.12, WC[0]], [0.02, 0.012, WH[0]], 0.0005, 0.0005, 1);
      rbox(fr, [XW + 0.02, WY[0] - 0.012, WC[0]], [0.05, 0.012, WH[0] + 0.04], 0.002, 0.002, 1);
      add(fr.build(), M.frame, { cast: false });
      var slat = new THREE.BoxGeometry(0.026, 0.0012, WH[0] * 2);
      var blinds = new THREE.InstancedMesh(slat, M.blind, 45), mtx = new THREE.Matrix4(), q = new THREE.Quaternion();
      q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -0.55);
      for (var i = 0; i < 45; i++) {
        mtx.compose(new THREE.Vector3(XW - 0.022, WY[0] + (i + 0.5) * BP, WC[0]), q, new THREE.Vector3(1, 1, 1));
        blinds.setMatrixAt(i, mtx);
      }
      blinds.castShadow = false; blinds.receiveShadow = true;
      scene.add(blinds);

      // poster on the back wall
      var pf = new Geo();
      rbox(pf, [PO[0], PO[1] + 0.206, PO[2] + 0.010], [0.160, 0.009, 0.010], 0.002, 0.002, 1);
      rbox(pf, [PO[0], PO[1] - 0.206, PO[2] + 0.010], [0.160, 0.009, 0.010], 0.002, 0.002, 1);
      rbox(pf, [PO[0] + 0.151, PO[1], PO[2] + 0.010], [0.009, 0.215, 0.010], 0.002, 0.002, 1);
      rbox(pf, [PO[0] - 0.151, PO[1], PO[2] + 0.010], [0.009, 0.215, 0.010], 0.002, 0.002, 1);
      rbox(pf, [PO[0], PO[1], PO[2] + 0.0065], [0.142, 0.197, 0.0065], 0.0005, 0.0005, 1);
      add(pf.build(), M.pframe);
      add(quad([PO[0], PO[1], PO[2] + 0.0131], [0.142, 0.197], function (u, v) { return atlasUV(0, 512, 360, 504, u, v); }), M.poster, { cast: false });

      // night sky behind the window: gradient, moon, stars, a glow on the horizon
      var sky = new THREE.Mesh(new THREE.SphereGeometry(9, 32, 16), new THREE.ShaderMaterial({
        side: THREE.BackSide, depthWrite: true,
        vertexShader: 'varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.0);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
        fragmentShader: [
          'varying vec3 vW;',
          'const vec3 MOON_L=vec3(' + MOON_L.join(',') + ');',
          'float hash2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
          'void main(){',
          ' vec3 rd=normalize(vW-cameraPosition);',
          ' if(vW.x>' + (XW - 0.08).toFixed(3) + '){gl_FragColor=vec4(0.002,0.0025,0.004,1.0);return;}',
          ' float h=clamp(rd.y*0.5+0.5,0.0,1.0);',
          ' vec3 c=mix(vec3(0.004,0.006,0.016),vec3(0.020,0.032,0.075),smoothstep(0.35,0.9,h));',
          ' float md=max(dot(rd,MOON_L),0.0);',
          ' c+=vec3(0.35,0.45,0.7)*pow(md,40.0)*0.3+vec3(1.0,1.0,0.95)*smoothstep(0.9993,0.9996,md)*3.0;',
          ' c+=vec3(0.10,0.06,0.03)*exp(-abs(rd.y+0.05)*18.0)*0.35;',
          ' vec2 sp=floor(vec2(rd.z,rd.y)/max(-rd.x,0.2)*300.0);',
          ' c+=vec3(0.8,0.85,1.0)*step(0.9965,hash2(sp))*smoothstep(0.5,0.7,h)*0.6;',
          ' gl_FragColor=vec4(c,1.0);}'
        ].join('\n')
      }));
      sky.position.set(0, 0.5, 0);
      scene.add(sky);
    })();

    // ===== Lights =====
    var lamp = new THREE.SpotLight(lin(1.0, 0.62, 0.30), 0.42 * 0.4, 0, Math.acos(0.58), 1 - Math.acos(0.86) / Math.acos(0.58), 2);
    lamp.position.set(LP[0], LP[1], LP[2]);
    lamp.target.position.set(LP[0] + LD[0], LP[1] + LD[1], LP[2] + LD[2]);
    lamp.castShadow = true;
    lamp.shadow.mapSize.set(1024, 1024);
    lamp.shadow.camera.near = 0.02;
    lamp.shadow.camera.far = 3;
    lamp.shadow.bias = -0.0004;
    lamp.shadow.normalBias = 0.002;
    lamp.shadow.radius = 3;
    scene.add(lamp, lamp.target);

    var moon = new THREE.DirectionalLight(lin(0.30 * 0.95, 0.45 * 0.95, 0.95 * 0.95), 1.0);
    moon.target.position.set(-0.2, 0.15, -0.1);
    moon.position.set(-0.2 + MOON_L[0] * 4, 0.15 + MOON_L[1] * 4, -0.1 + MOON_L[2] * 4);
    moon.castShadow = true;
    moon.shadow.mapSize.set(2048, 2048);
    var oc = moon.shadow.camera;
    oc.left = -1.4; oc.right = 1.4; oc.top = 1.4; oc.bottom = -1.4; oc.near = 0.5; oc.far = 8;
    moon.shadow.bias = -0.0003;
    moon.shadow.normalBias = 0.006;
    moon.shadow.radius = 2;
    scene.add(moon, moon.target);

    // the picture on the tube lights the room in front of it
    var tube = new THREE.RectAreaLight(lin(0, 0, 0), 1, SH[0] * 2, SH[1] * 2);
    tube.position.set(0, YS, ZD + 0.0008);
    tube.lookAt(0, YS, 5);
    scene.add(tube);

    var PI = Math.PI;
    var hemi = new THREE.HemisphereLight(lin(0.012 * PI, 0.015 * PI, 0.024 * PI), lin(0.010 * PI, 0.008 * PI, 0.006 * PI), 1);
    scene.add(hemi);
    // the lamp's light bouncing off the desk around its pool
    var bounce = new THREE.PointLight(lin(1.0, 0.62, 0.30), 0.42 * 0.012, 0.9, 1);
    bounce.position.set(-0.17, 0.06, 0.12);
    scene.add(bounce);

    // ===== Renderer and passes =====
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false, alpha: false, stencil: false, powerPreference: 'high-performance' });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.shadowMap.autoUpdate = false;   // nothing that casts shadows moves
    renderer.shadowMap.needsUpdate = true;
    renderer.toneMapping = THREE.NoToneMapping;
    aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());

    var cam = new THREE.PerspectiveCamera();
    cam.matrixAutoUpdate = false;
    cam.matrixWorldAutoUpdate = false;
    var NEAR = 0.02, FAR = 30;

    var tri = new THREE.BufferGeometry();
    tri.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    var post = new THREE.Scene(), postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    var quadMesh = new THREE.Mesh(tri, null);
    quadMesh.frustumCulled = false;
    post.add(quadMesh);
    function pass(mat, target) {
      quadMesh.material = mat;
      renderer.setRenderTarget(target);
      renderer.render(post, postCam);
    }

    // haze: lamp cone (analytic) and moon beams (sampled) scattering in the air
    var HAZE = [
      'uniform sampler2D uDepth;uniform vec3 uCamPos;uniform mat3 uCamRot;uniform float uFocal;uniform vec2 uPP;uniform vec2 uView;',
      'const vec3 LP=vec3(' + LP.join(',') + ');',
      'const vec3 LD=vec3(' + LD.join(',') + ');',
      'const vec3 LAMP_C=vec3(1.0,0.62,0.30)*0.42;',
      'const vec3 MOON_C=vec3(0.30,0.45,0.95)*0.95;',
      GLSL_COMMON.replace('varying vec3 vPcWorld;', '').replace(/vec3 pcBump[\s\S]*$/, ''),
      'vec3 haze(vec2 uv){',
      // uv addresses the depth buffer; the pixel grid of this pass is half of it
      ' vec2 css=vec2(uv.x*uView.x,(1.0-uv.y)*uView.y);',
      ' vec3 dv=vec3((css.x-uPP.x)/uFocal,-(css.y-uPP.y)/uFocal,-1.0);',
      ' vec3 rd=normalize(uCamRot*dv),ro=uCamPos;',
      ' float d=texture(uDepth,uv).x;',
      ' const float NEAR=' + NEAR.toFixed(4) + ',FAR=' + FAR.toFixed(4) + ';',
      ' float vz=NEAR*FAR/((FAR-NEAR)*d-FAR);',
      ' float tm=min(-vz*length(dv),3.2);',
      ' float jit=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(0.06711056,0.00583715))));',
      ' const int N=12;float dt=tm/float(N);vec3 moon=vec3(0.0);',
      ' for(int i=0;i<N;i++)moon+=MOON_C*pcMoonMask(ro+rd*((float(i)+jit)*dt));',
      ' vec3 lo=LP-ro;float t0=dot(lo,rd);float H=sqrt(max(dot(lo,lo)-t0*t0,0.0)+0.004);',
      ' vec3 xc=ro+rd*clamp(t0,0.0,tm)-LP;float sp=smoothstep(0.58,0.86,dot(normalize(xc),LD));',
      ' float lamp=(atan((tm-t0)/H)-atan(-t0/H))/H;',
      ' return LAMP_C*lamp*sp*0.009+moon*dt*0.02;}'
    ].join('\n');
    var hazeU = {
      uDepth: { value: null }, uCamPos: { value: new THREE.Vector3() }, uCamRot: { value: new THREE.Matrix3() },
      uFocal: { value: 1 }, uPP: { value: new THREE.Vector2() }, uView: { value: new THREE.Vector2(1, 1) }
    };
    function raw(fs, uniforms) {
      return new THREE.RawShaderMaterial({
        glslVersion: THREE.GLSL3, depthTest: false, depthWrite: false, uniforms: uniforms,
        vertexShader: 'in vec3 position;void main(){gl_Position=vec4(position.xy,0.0,1.0);}',
        fragmentShader: 'precision highp float;\n' + fs
      });
    }
    // the haze is smooth, so it is worked out at half resolution and stretched
    var hazePassU = Object.assign({ uOut: { value: new THREE.Vector2() } }, hazeU);
    var hazePass = raw(HAZE + '\nuniform vec2 uOut;out vec4 o;void main(){o=vec4(haze(gl_FragCoord.xy/uOut),1.0);}', hazePassU);
    var brightU = { uScene: { value: null }, uHaze: { value: null }, uOut: { value: new THREE.Vector2() }, uThr: { value: 0.55 } };
    var bright = raw('uniform sampler2D uScene;uniform sampler2D uHaze;uniform vec2 uOut;uniform float uThr;out vec4 o;' +
      'void main(){vec2 uv=gl_FragCoord.xy/uOut;vec2 d=0.3/uOut;' +
      'vec3 c=texture(uScene,uv+vec2(-d.x,-d.y)).rgb+texture(uScene,uv+vec2(d.x,-d.y)).rgb+texture(uScene,uv+vec2(-d.x,d.y)).rgb+texture(uScene,uv+vec2(d.x,d.y)).rgb;' +
      'c=c*0.25+texture(uHaze,uv).rgb;o=vec4(max(c-uThr,0.0),1.0);}', brightU);
    var blurU = { uTex: { value: null }, uDir: { value: new THREE.Vector2() }, uOut: { value: new THREE.Vector2() } };
    var blur = raw('uniform sampler2D uTex;uniform vec2 uDir;uniform vec2 uOut;out vec4 o;' +
      'void main(){vec2 uv=gl_FragCoord.xy/uOut;vec3 c=texture(uTex,uv).rgb*0.2270;' +
      'c+=(texture(uTex,uv+uDir*1.3846).rgb+texture(uTex,uv-uDir*1.3846).rgb)*0.3162;' +
      'c+=(texture(uTex,uv+uDir*3.2308).rgb+texture(uTex,uv-uDir*3.2308).rgb)*0.0703;o=vec4(c,1.0);}', blurU);
    var finalU = { uScene: { value: null }, uHaze: { value: null }, uBloom: { value: null }, uOut: { value: new THREE.Vector2() } };
    var fin = raw('uniform sampler2D uScene;uniform sampler2D uHaze;uniform sampler2D uBloom;uniform vec2 uOut;out vec4 o;' +
      'vec3 aces(vec3 x){return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.0,1.0);}' +
      'void main(){vec2 uv=gl_FragCoord.xy/uOut;' +
      'vec3 c=texture(uScene,uv).rgb+texture(uHaze,uv).rgb+texture(uBloom,uv).rgb*0.55;' +
      'vec2 q=uv-0.5;c*=1.9*(1.0-dot(q,q)*0.6);c=pow(aces(c),vec3(1.0/2.2));' +
      'float g=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);o=vec4(c+(g-0.5)*0.016,1.0);}', finalU);

    var sceneRT = null, hazeRT = null, bloomA = null, bloomB = null, W = 1, H = 1, cssW = 1, cssH = 1, ratio = 1;
    function rt(w, h, extra) {
      return new THREE.WebGLRenderTarget(w, h, Object.assign({ type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter }, extra || {}));
    }
    function setSize(vw, vh, pr) {
      cssW = vw; cssH = vh; ratio = pr;
      renderer.setPixelRatio(pr);
      renderer.setSize(vw, vh, false);
      W = Math.round(vw * pr); H = Math.round(vh * pr);
      [sceneRT, hazeRT, bloomA, bloomB].forEach(function (t) { if (t) { if (t.depthTexture) t.depthTexture.dispose(); t.dispose(); } });
      // Retina pixels are small enough without MSAA, and 4x would cost ~250 MB there
      sceneRT = rt(W, H, { depthBuffer: true, samples: pr < 1.5 ? 4 : 0, depthTexture: new THREE.DepthTexture(W, H) });
      hazeRT = rt(Math.max(8, Math.ceil(W / 2)), Math.max(8, Math.ceil(H / 2)));
      var bw = Math.max(8, Math.ceil(vw / 6)), bh = Math.max(8, Math.ceil(vh / 6));
      bloomA = rt(bw, bh); bloomB = rt(bw, bh);
    }

    var proj = new THREE.Matrix4(), world = new THREE.Matrix4();
    // c = { pos, B: { r, u, b }, f, px, py } in CSS px, the camera of pc3d.js
    function setCamera(c) {
      var B = c.B, A = 1 - 2 * c.px / cssW, Bv = 2 * c.py / cssH - 1;
      world.set(B.r[0], B.u[0], B.b[0], c.pos[0], B.r[1], B.u[1], B.b[1], c.pos[1], B.r[2], B.u[2], B.b[2], c.pos[2], 0, 0, 0, 1);
      cam.matrixWorld.copy(world);
      cam.matrixWorldInverse.copy(world).invert();
      proj.set(2 * c.f / cssW, 0, A, 0, 0, 2 * c.f / cssH, Bv, 0, 0, 0, -(FAR + NEAR) / (FAR - NEAR), -2 * FAR * NEAR / (FAR - NEAR), 0, 0, -1, 0);
      cam.projectionMatrix.copy(proj);
      cam.projectionMatrixInverse.copy(proj).invert();
      hazeU.uCamPos.value.set(c.pos[0], c.pos[1], c.pos[2]);
      hazeU.uCamRot.value.set(B.r[0], B.u[0], B.b[0], B.r[1], B.u[1], B.b[1], B.r[2], B.u[2], B.b[2]);
      hazeU.uFocal.value = c.f;
      hazeU.uPP.value.set(c.px, c.py);
      hazeU.uView.value.set(cssW, cssH);
    }

    // glow: linear RGB of the tube's picture; led: disk activity LED colour
    function render(c, glow, led) {
      setCamera(c);
      tube.color.setRGB(glow[0], glow[1], glow[2]);
      M.glass.emissive.setRGB(glow[0] * 0.63, glow[1] * 0.63, glow[2] * 0.63);
      M.ledD.emissive.setRGB(led[0], led[1], led[2]);
      renderer.setRenderTarget(sceneRT);
      renderer.render(scene, cam);
      hazeU.uDepth.value = sceneRT.depthTexture;
      hazePassU.uOut.value.set(hazeRT.width, hazeRT.height);
      pass(hazePass, hazeRT);
      brightU.uScene.value = sceneRT.texture;
      brightU.uHaze.value = hazeRT.texture;
      brightU.uOut.value.set(bloomA.width, bloomA.height);
      pass(bright, bloomA);
      blurU.uOut.value.set(bloomA.width, bloomA.height);
      for (var i = 0; i < 2; i++) {
        blurU.uTex.value = bloomA.texture; blurU.uDir.value.set((1 + i) / bloomA.width, 0); pass(blur, bloomB);
        blurU.uTex.value = bloomB.texture; blurU.uDir.value.set(0, (1 + i) / bloomA.height); pass(blur, bloomA);
      }
      finalU.uScene.value = sceneRT.texture;
      finalU.uHaze.value = hazeRT.texture;
      finalU.uBloom.value = bloomA.texture;
      finalU.uOut.value.set(W, H);
      pass(fin, null);
    }

    // compile every program (in parallel where the browser can) before the first frame
    function compile(c) {
      setCamera(c);
      var p = renderer.compileAsync ? renderer.compileAsync(scene, cam) : Promise.resolve();
      return p.then(function () {
        [hazePass, bright, blur, fin].forEach(function (m) { quadMesh.material = m; renderer.compile(post, postCam); });
      });
    }

    atlas.anisotropy = aniso;
    return {
      renderer: renderer,
      setSize: setSize,
      render: render,
      compile: compile,
      pixelRatio: function () { return ratio; },
      // for the headless harness: toggle lights, override materials
      debug: { scene: scene, lights: { lamp: lamp, moon: moon, tube: tube, bounce: bounce, hemi: hemi }, M: M, THREE: THREE },
      stats: function () { return { calls: renderer.info.render.calls, tris: renderer.info.render.triangles, programs: renderer.info.programs.length }; }
    };
  };
})();
