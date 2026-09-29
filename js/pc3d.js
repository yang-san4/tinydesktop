// ===== Tiny Desktop - 3D PC =====
// The physical machine around the virtual screen: a beige all-in-one CRT
// computer with keyboard and mouse on a desk at night (brass desk lamp,
// moonlight through window blinds, a mug of coffee, floppies, dust in the air).
//
// Rendering: the whole room is a signed-distance field raymarched in one
// fragment shader. While the camera moves it renders at reduced resolution;
// once it stops, samples are accumulated at full resolution (split into
// horizontal bands so a frame never stalls) and then nothing heavy runs any
// more. The tube's light on the room goes to a separate buffer, so theme or
// content colour changes only re-run the cheap composite pass.
//
// The real DOM #screen is laid onto the tube glass with a CSS homography that
// is computed from the same camera, so the desktop stays fully interactive.
// At the seated "home" view that transform is an integer translate, keeping
// pixel text crisp and every existing clientX-based drag handler exact.
(function () {
  'use strict';

  var canvas = document.getElementById('pc3d-canvas');
  var dustCv = document.getElementById('pc3d-dust');
  var monitor = document.getElementById('monitor');
  var screenEl = document.getElementById('screen');
  var hintEl = document.getElementById('pc3d-hint');
  var body = document.body;

  // ----- Power-on gate: boot.js starts printing once the tube lights up -----
  var powered = false, powerWaiters = [];
  window._pc3dPowerOn = function (cb) {
    if (powered) cb(); else powerWaiters.push(cb);
  };
  function firePower() {
    if (powered) return;
    powered = true;
    var w = powerWaiters; powerWaiters = [];
    for (var i = 0; i < w.length; i++) { try { w[i](); } catch (e) {} }
  }

  var started = false, failed = false;
  function fallback(why) {
    if (failed) return;
    failed = true;
    if (why && window.console) console.warn('[pc3d] using the 2D monitor:', why);
    body.classList.remove('pc3d', 'pc3d-off', 'pc3d-away', 'pc3d-live', 'pc3d-dragging');
    if (monitor) monitor.style.transform = '';
    firePower();
  }
  if (!canvas || !monitor || !screenEl) { fallback('missing elements'); return; }

  var gl = null;
  try {
    gl = canvas.getContext('webgl2', {
      antialias: false, alpha: false, depth: false, stencil: false,
      premultipliedAlpha: false, preserveDrawingBuffer: false,
      powerPreference: 'high-performance'
    });
  } catch (e) { gl = null; }
  if (!gl) { fallback('WebGL2 unavailable'); return; }

  body.classList.add('pc3d', 'pc3d-off');
  var failTimer = setTimeout(function () { if (!started) fallback('shader compile timeout'); }, 9000);
  canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); fallback('context lost'); });

  // ===== World constants (metres; desk top y=0, PC front face z=0) =====
  // Must match the shader. The DOM screen (440x330 CSS px) spans W_S x H_S.
  var W_S = 0.27, H_S = 0.2025, YS = 0.205, ZD = -0.006;
  var PIVOT = [0.0, 0.16, 0.03];
  var HOME_D = 1.05, HOME_X = 0.10;
  var SCR_W = 440, SCR_H = 330;
  var XW = -1.05, BP = 0.034, WZ = [-0.56, 0.95], WY = [0.10, 1.65];
  var MOON_L = norm3([-0.78, 0.50, 0.35]);
  var LA = [-0.39, 0.40, -0.09];
  var LD = norm3([-0.15 - LA[0], 0.0 - LA[1], 0.14 - LA[2]]);
  var LP = [LA[0] + LD[0] * 0.045, LA[1] + LD[1] * 0.045, LA[2] + LD[2] * 0.045];
  var MUG = [-0.262, 0.0, 0.100];

  function norm3(v) { var l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; }

  // ===== Shaders =====
  var VS = '#version 300 es\nvoid main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));gl_Position=vec4(p*2.0-1.0,0.0,1.0);}';

  var FS_SCENE = [
    '#version 300 es',
    'precision highp float;',
    'precision highp int;',
    'uniform vec2 uRes;uniform vec2 uView;uniform vec3 uCamPos;uniform mat3 uCamRot;',
    'uniform float uFocal;uniform vec2 uPP;uniform vec2 uJitter;uniform float uSeed;',
    'uniform int uHQ;uniform int uZero;uniform float uEnc;uniform sampler2D uAtlas;',
    'layout(location=0) out vec4 oBase;',
    'layout(location=1) out vec4 oScr;',
    '#define ZERO min(uZero,0)',
    '#define PI 3.14159265',
    // material ids
    '#define M_WALL 1.0',
    '#define M_DESK 2.0',
    '#define M_FLOOR 3.0',
    '#define M_CASE 4.0',
    '#define M_GLASS 5.0',
    '#define M_SLOT 6.0',
    '#define M_KEYA 7.0',
    '#define M_KEYM 8.0',
    '#define M_KBCASE 9.0',
    '#define M_MOUSE 10.0',
    '#define M_PAD 11.0',
    '#define M_CABLE 12.0',
    '#define M_MUG 13.0',
    '#define M_COFFEE 14.0',
    '#define M_LAMP 15.0',
    '#define M_BRASS 16.0',
    '#define M_BULB 17.0',
    '#define M_SHADEIN 18.0',
    '#define M_LEDP 19.0',
    '#define M_LEDD 20.0',
    '#define M_NOTE 21.0',
    '#define M_BADGE 22.0',
    '#define M_FLOP 23.0',
    '#define M_SHUTTER 26.0',
    '#define M_LABEL 27.0',
    '#define M_FRAME 30.0',
    '#define M_BLIND 31.0',
    '#define M_POSTER 32.0',
    '#define M_PFRAME 33.0',
    // scene layout
    'const float YS=0.205;const float ZD=-0.006;',
    'const vec2 SH=vec2(0.135,0.10125);',
    'const vec2 OPH=vec2(0.149,0.1145);',
    'const float XW=-1.05;const float ZW=-0.66;const float BP=0.034;',
    'const vec2 WZ=vec2(-0.56,0.95);const vec2 WY=vec2(0.10,1.65);',
    'const vec2 WC=vec2(0.195,0.875);const vec2 WH=vec2(0.755,0.775);',
    'const vec3 LB=vec3(-0.47,0.0,-0.22);',
    'const vec3 LA=vec3(-0.39,0.40,-0.09);',
    'const vec3 LD=normalize(vec3(-0.15,0.0,0.14)-LA);',
    'const vec3 LP=LA+LD*0.045;',
    'const vec3 LAMP_C=vec3(1.0,0.62,0.30)*0.42;',
    'const vec3 MOON_L=normalize(vec3(-0.78,0.50,0.35));',
    'const vec3 MOON_C=vec3(0.30,0.45,0.95)*0.95;',
    'const vec3 KB_O=vec3(-0.015,0.0,0.160);',
    'const float KB_YAW=0.025;const float KB_TILT=0.055;',
    'const float U=0.019;const float KZ0=-0.1255;const float KEYB=0.0165;const float KEYH=0.0115;',
    'const vec3 MS_O=vec3(0.262,0.003,0.100);const float MS_YAW=-0.20;',
    'const vec3 MUG_O=vec3(-0.262,0.0,0.100);',
    'const vec3 FL_O=vec3(0.318,0.0,-0.090);',
    'const vec3 PO=vec3(0.54,0.50,-0.66);',

    // ---------- helpers ----------
    'float hash1(vec3 p){p=fract(p*0.3183099+0.1);p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}',
    'float hash2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
    'float noise3(vec3 x){vec3 i=floor(x);vec3 f=fract(x);f=f*f*(3.0-2.0*f);',
    ' return mix(mix(mix(hash1(i),hash1(i+vec3(1,0,0)),f.x),mix(hash1(i+vec3(0,1,0)),hash1(i+vec3(1,1,0)),f.x),f.y),',
    '  mix(mix(hash1(i+vec3(0,0,1)),hash1(i+vec3(1,0,1)),f.x),mix(hash1(i+vec3(0,1,1)),hash1(i+vec3(1,1,1)),f.x),f.y),f.z);}',
    'float fbm(vec3 p){float a=0.5,s=0.0;for(int i=0;i<4;i++){s+=a*noise3(p);p=p*2.03+vec3(1.7,9.2,3.1);a*=0.5;}return s;}',
    'mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,s,-s,c);}',
    'float dot2(vec2 v){return dot(v,v);}',
    'float sdBox(vec3 p,vec3 b){vec3 q=abs(p)-b;return length(max(q,0.0))+min(max(q.x,max(q.y,q.z)),0.0);}',
    'float sdRBox(vec3 p,vec3 b,float r){vec3 q=abs(p)-b+r;return length(max(q,0.0))+min(max(q.x,max(q.y,q.z)),0.0)-r;}',
    'float sdRect2(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return length(max(q,0.0))+min(max(q.x,q.y),0.0)-r;}',
    'float sdCyl(vec3 p,float r,float h){vec2 d=abs(vec2(length(p.xz),p.y))-vec2(r,h);return min(max(d.x,d.y),0.0)+length(max(d,0.0));}',
    'float sdCapsule(vec3 p,vec3 a,vec3 b,float r){vec3 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.0,1.0);return length(pa-ba*h)-r;}',
    'float smin(float a,float b,float k){float h=clamp(0.5+0.5*(b-a)/k,0.0,1.0);return mix(b,a,h)-k*h*(1.0-h);}',
    // capped cone, q=(radial,axial), axial from -h (r1) to +h (r2)
    'float sdConeQ(vec2 q,float h,float r1,float r2){vec2 k1=vec2(r2,h);vec2 k2=vec2(r2-r1,2.0*h);',
    ' vec2 ca=vec2(q.x-min(q.x,(q.y<0.0)?r1:r2),abs(q.y)-h);',
    ' vec2 cb=q-k1+k2*clamp(dot(k1-q,k2)/dot(k2,k2),0.0,1.0);',
    ' float s=(cb.x<0.0&&ca.y<0.0)?-1.0:1.0;return s*sqrt(min(dot(ca,ca),dot(cb,cb)));}',
    // quadratic bezier distance (2D)
    'float sdBezier(vec2 pos,vec2 A,vec2 B,vec2 C){vec2 a=B-A;vec2 b=A-2.0*B+C;vec2 c=a*2.0;vec2 d=A-pos;',
    ' float kk=1.0/dot(b,b);float kx=kk*dot(a,b);float ky=kk*(2.0*dot(a,a)+dot(d,b))/3.0;float kz=kk*dot(d,a);',
    ' float res=0.0;float p=ky-kx*kx;float p3=p*p*p;float q=kx*(2.0*kx*kx-3.0*ky)+kz;float h=q*q+4.0*p3;',
    ' if(h>=0.0){h=sqrt(h);vec2 x=(vec2(h,-h)-q)/2.0;vec2 uv=sign(x)*pow(abs(x),vec2(1.0/3.0));',
    '  float t=clamp(uv.x+uv.y-kx,0.0,1.0);res=dot2(d+(c+b*t)*t);}',
    ' else{float z=sqrt(-p);float v=acos(q/(p*z*2.0))/3.0;float m=cos(v);float n=sin(v)*1.732050808;',
    '  vec3 t=clamp(vec3(m+m,-n-m,n-m)*z-kx,0.0,1.0);res=min(dot2(d+(c+b*t.x)*t.x),dot2(d+(c+b*t.y)*t.y));}',
    ' return sqrt(res);}',

    // ---------- keyboard layout (15u wide, 5 rows) ----------
    'void keySpan(float r,float xu,out float x0,out float x1){',
    ' if(r>3.5){',
    '  if(xu<1.5){x0=0.0;x1=1.5;}else if(xu<2.75){x0=1.5;x1=2.75;}else if(xu<12.25){x0=2.75;x1=12.25;}',
    '  else if(xu<13.5){x0=12.25;x1=13.5;}else{x0=13.5;x1=15.0;}return;}',
    ' float L=r<0.5?0.0:(r<1.5?1.5:(r<2.5?1.75:2.25));',
    ' float R=r<0.5?2.0:(r<1.5?1.5:(r<2.5?2.25:2.75));',
    ' if(xu<L){x0=0.0;x1=L;}else if(xu>=15.0-R){x0=15.0-R;x1=15.0;}else{x0=L+floor(xu-L);x1=x0+1.0;}}',
    'vec3 kbLocal(vec3 p){vec3 q=p-KB_O;q.xz=rot(KB_YAW)*q.xz;float c=cos(KB_TILT),s=sin(KB_TILT);',
    ' return vec3(q.x,q.y*c+q.z*s,-q.y*s+q.z*c);}',
    'float keysSDF(vec3 q,out float mat){',
    ' vec2 kp=vec2(q.x+7.5*U,q.z-KZ0);',
    ' float r=clamp(floor(kp.y/U),0.0,4.0);float xu=clamp(kp.x/U,0.0,14.999);',
    ' float x0,x1;keySpan(r,xu,x0,x1);',
    ' vec3 k=vec3(kp.x-(x0+x1)*0.5*U,q.y-KEYB,kp.y-(r+0.5)*U);',
    ' float hw=(x1-x0)*0.5*U-0.0011,hd=0.5*U-0.0011;',
    ' float sh=clamp(k.y/KEYH,0.0,1.0)*0.0024;',
    ' float d=sdRBox(k-vec3(0.0,KEYH*0.5,0.0),vec3(hw-sh,KEYH*0.5,hd-sh),0.0016);',
    // conservative bound so a ray never skips into a neighbouring key
    ' float bL=x0>0.5?kp.x-x0*U:1.0;float bR=x1<14.5?x1*U-kp.x:1.0;',
    ' float bB=r>0.5?kp.y-r*U:1.0;float bF=r<3.5?(r+1.0)*U-kp.y:1.0;',
    ' float grid=sdRect2(kp-vec2(7.5*U,2.5*U),vec2(7.5*U,2.5*U),0.0);',
    ' d=min(d,max(max(min(min(bL,bR),min(bB,bF))+0.0011,k.y-KEYH),grid));',
    ' float w=x1-x0;bool space=r>3.5&&w>5.0;',
    ' mat=(!space&&(w>1.01||r>3.5))?M_KEYM:M_KEYA;',
    ' return d;}',

    // ---------- scene pieces ----------
    'bool gShadow=false;',
    'vec2 mapRoom(vec3 p){',
    ' vec2 res=vec2(p.z-ZW,M_WALL);',
    ' float wall=max(abs(p.x-(XW-0.06))-0.06,-sdRect2(vec2(p.z,p.y)-WC,WH,0.004));',
    ' if(wall<res.x)res=vec2(wall,M_WALL);',
    ' if(p.x-(XW+0.07)<res.x){',
    '  vec3 wq=vec3(p.x-(XW-0.075),p.y-WC.y,p.z-WC.x);',
    '  float fr=min(sdBox(wq,vec3(0.02,WH.y,0.012)),sdBox(wq-vec3(0.0,0.12,0.0),vec3(0.02,0.012,WH.x)));',
    '  float sill=sdBox(p-vec3(XW+0.02,WY.x-0.012,WC.x),vec3(0.05,0.012,WH.x+0.04));',
    '  fr=min(fr,sill);',
    '  if(fr<res.x)res=vec2(fr,M_FRAME);',
    '  float sl=sdBox(vec3(p.x-(XW-0.022),p.y-WC.y,p.z-WC.x),vec3(0.016,WH.y,WH.x));',
    '  if(sl<0.004){',
    '   float by=p.y-WY.x;float bi=clamp(floor(by/BP),0.0,44.0);',
    '   vec2 bq=rot(0.55)*vec2(p.x-(XW-0.022),by-(bi+0.5)*BP);',
    '   sl=sdBox(vec3(bq.x,bq.y,p.z-WC.x),vec3(0.013,0.0006,WH.x));',
    '   sl=min(sl,max(min(by-bi*BP,(bi+1.0)*BP-by),0.0)+0.009);',
    '  }',
    '  if(sl<res.x)res=vec2(sl,M_BLIND);',
    ' }',
    ' float desk=sdRBox(p-vec3(-0.02,-0.018,-0.08),vec3(1.03,0.018,0.58),0.006);',
    ' if(desk<res.x)res=vec2(desk,M_DESK);',
    ' float fl=p.y+0.74;if(fl<res.x)res=vec2(fl,M_FLOOR);',
    ' float rw=1.7-p.x;if(rw<res.x)res=vec2(rw,M_WALL);',
    ' vec3 pp=p-PO;',
    ' float pf=sdRBox(pp-vec3(0.0,0.0,0.010),vec3(0.160,0.215,0.010),0.003);',
    ' if(pf<res.x){',
    '  float fr=max(pf,-sdBox(pp-vec3(0.0,0.0,0.019),vec3(0.142,0.197,0.006)));',
    '  if(fr<res.x)res=vec2(fr,M_PFRAME);',
    '  float art=sdBox(pp-vec3(0.0,0.0,0.0125),vec3(0.142,0.197,0.0005));',
    '  if(art<res.x)res=vec2(art,M_POSTER);',
    ' }',
    ' return res;}',

    'vec2 mapPC(vec3 p,vec2 res){',
    ' float bb=sdBox(p-vec3(0.0,0.195,-0.205),vec3(0.205,0.197,0.21));',
    ' if(bb>res.x)return res;',
    ' float m=M_CASE;',
    ' float d=sdRBox(p-vec3(0.0,0.1905,-0.110),vec3(0.200,0.1785,0.110),0.014);',
    // rear hood tapers towards the back like a real tube housing
    ' float t=clamp((-p.z-0.19)/0.21,0.0,1.0);float k=1.0-0.27*t;',
    ' vec3 q=vec3(p.x/k,(p.y-(0.012+0.1785*k))/k,p.z+0.30);',
    ' d=smin(d,sdRBox(q,vec3(0.196,0.1785,0.105),0.028)*0.58,0.012);',
    ' float sg=max(abs(p.z+0.021)-0.0006,-(d+0.0016));d=max(d,-sg);',
    ' float vy=p.y-0.21;float vr=vy-0.0115*clamp(floor(vy/0.0115+0.5),-6.0,6.0);',
    ' float vent=max(max(abs(vr)-0.0016,abs(p.z+0.325)-0.05),max(-(d+0.0025),0.11-abs(p.x)));',
    ' d=max(d,-vent);',
    ' float hd=max(max(sdRect2(p.xz-vec2(0.0,-0.315),vec2(0.07,0.013),0.012),-(d+0.012)),0.25-p.y);',
    ' d=max(d,-hd);',
    ' float cf=max(p.z+0.012,0.0)*0.7;',
    ' d=max(d,-max(sdRect2(p.xy-vec2(0.0,YS),OPH+cf,0.02+cf),-(p.z+0.035)));',
    ' if(p.z>-0.04){',
    '  d=max(d,-max(sdRect2(p.xy-vec2(0.098,0.060),vec2(0.068,0.018),0.005),-(p.z+0.003)));',
    '  float slot=max(sdRect2(p.xy-vec2(0.090,0.064),vec2(0.049,0.0026),0.0016),-(p.z+0.03));',
    '  vec2 gq=p.xy-vec2(-0.085,0.062);float gy=gq.y-0.0056*clamp(floor(gq.y/0.0056+0.5),-3.0,3.0);',
    '  float gr=max(sdRect2(vec2(gq.x,gy),vec2(0.034,0.0012),0.0012),-(p.z+0.004));',
    '  float cav=min(slot,gr);',
    '  if(-cav>d){d=-cav;m=M_SLOT;}',
    '  float btn=sdRBox(p-vec3(0.150,0.052,-0.003),vec3(0.0085,0.0032,0.0016),0.001);',
    '  if(btn<d){d=btn;m=M_CASE;}',
    '  float badge=sdRBox(p-vec3(-0.158,0.066,0.0),vec3(0.0115,0.0115,0.0011),0.0022);',
    '  if(badge<d){d=badge;m=M_BADGE;}',
    '  float pled=length(p-vec3(-0.158,0.038,-0.0005))-0.0021;',
    '  if(pled<d){d=pled;m=M_LEDP;}',
    '  float dled=sdRBox(p-vec3(0.036,0.052,-0.003),vec3(0.0032,0.0014,0.0012),0.0006);',
    '  if(dled<d){d=dled;m=M_LEDD;}',
    '  vec3 nq=p-vec3(0.140,0.349,0.0007);nq.xy=rot(0.07)*nq.xy;',
    '  float note=sdBox(nq,vec3(0.020,0.020,0.0004));',
    '  if(note<d){d=note;m=M_NOTE;}',
    ' }',
    ' if(d<res.x)res=vec2(d,m);',
    ' float pl=sdRBox(p-vec3(0.0,0.0065,-0.205),vec3(0.186,0.0065,0.192),0.003);',
    ' if(pl<res.x)res=vec2(pl,M_SLOT);',
    ' float gl=max(max(length(p-vec3(0.0,YS,ZD-1.6))-1.6,sdRect2(p.xy-vec2(0.0,YS),OPH+0.004,0.02)),-(p.z+0.05));',
    ' if(!gShadow&&gl<res.x)res=vec2(gl,M_GLASS);',
    ' return res;}',

    'vec2 mapKB(vec3 p,vec2 res){',
    ' vec3 q=kbLocal(p);',
    ' if(sdBox(q-vec3(0.0,0.016,-0.074),vec3(0.176,0.022,0.080))>res.x)return res;',
    ' float cs=sdRBox(q-vec3(0.0,0.0115,-0.074),vec3(0.170,0.0115,0.074),0.005);',
    ' cs=max(cs,-sdRBox(q-vec3(0.0,0.0295,-0.078),vec3(0.1455,0.013,0.0492),0.0015));',
    ' cs=min(cs,sdRBox(vec3(abs(q.x)-0.14,q.y+0.004,q.z+0.135),vec3(0.012,0.0045,0.006),0.002));',
    ' if(cs<res.x)res=vec2(cs,M_KBCASE);',
    ' float km;float kd=keysSDF(q,km);',
    ' if(kd<res.x)res=vec2(kd,km);',
    ' return res;}',

    'vec2 mapMouse(vec3 p,vec2 res){',
    ' vec3 q=p-MS_O;q.xz=rot(MS_YAW)*q.xz;',
    ' if(sdBox(q-vec3(0.0,0.016,0.0),vec3(0.034,0.02,0.054))>res.x)return res;',
    ' float b=sdRBox(q-vec3(0.0,0.0145,0.0),vec3(0.029,0.0145,0.049),0.008);',
    ' b=max(b,length(q-vec3(0.0,-0.19,0.012))-0.219);',
    ' float g1=max(abs(q.z+0.014)-0.0005,-(b+0.0012));',
    ' float g2=max(max(abs(q.x)-0.0005,q.z+0.014),-(b+0.0012));',
    ' b=max(b,-min(g1,g2));',
    ' if(b<res.x)res=vec2(b,M_MOUSE);',
    ' return res;}',

    'vec2 mapMug(vec3 p,vec2 res){',
    ' vec3 q=p-MUG_O;',
    ' if(sdBox(q-vec3(0.012,0.048,0.012),vec3(0.07,0.052,0.07))>res.x)return res;',
    ' float outer=sdCyl(q-vec3(0.0,0.047,0.0),0.0385,0.0455)-0.0015;',
    ' vec3 hq=q;hq.xz=rot(-0.9)*hq.xz;',
    ' float th=length(vec2(length(hq.xy-vec2(0.041,0.050))-0.021,hq.z))-0.0055;',
    ' float inner=sdCyl(q-vec3(0.0,0.055,0.0),0.0348,0.046);',
    ' float mug=max(smin(outer,th,0.004),-inner);',
    ' if(mug<res.x)res=vec2(mug,M_MUG);',
    ' float cof=max(inner,q.y-0.071);',
    ' if(cof<res.x)res=vec2(cof,M_COFFEE);',
    ' return res;}',

    'vec3 flopLocal(vec3 p,float fi){vec3 q=p-FL_O-vec3(0.004*fi-0.003,0.0017+0.00345*fi,-0.005*fi);',
    ' q.xz=rot(0.35-0.42*fi+0.1*fi*fi)*q.xz;return q;}',
    'vec2 mapFloppy(vec3 p,vec2 res){',
    ' if(sdBox(p-FL_O-vec3(0.0,0.006,0.0),vec3(0.075,0.008,0.075))>res.x)return res;',
    ' for(int i=ZERO;i<3;i++){',
    '  float fi=float(i);vec3 q=flopLocal(p,fi);',
    '  float b=sdRBox(q,vec3(0.045,0.0016,0.047),0.0012);',
    '  if(b<res.x)res=vec2(b,M_FLOP+fi);',
    '  float sh=sdRBox(q-vec3(0.006,0.0,-0.030),vec3(0.024,0.00185,0.0175),0.0004);',
    '  if(sh<res.x)res=vec2(sh,M_SHUTTER);',
    '  float lb=sdBox(q-vec3(0.0,0.0016,0.019),vec3(0.035,0.0002,0.024));',
    '  if(lb<res.x)res=vec2(lb,M_LABEL+fi);',
    ' }',
    ' return res;}',

    'vec2 mapLamp(vec3 p,vec2 res){',
    ' if(sdBox(p-vec3(-0.42,0.22,-0.14),vec3(0.13,0.25,0.15))>res.x)return res;',
    ' vec3 top=LB+vec3(0.0,0.36,0.0);',
    ' float base=sdCyl(p-LB-vec3(0.0,0.011,0.0),0.066,0.0095)-0.0025;',
    ' float metal=min(base,sdCapsule(p,LB+vec3(0.0,0.02,0.0),top,0.0075));',
    ' metal=min(metal,sdCapsule(p,top,LA-LD*0.004,0.0065));',
    ' metal=min(metal,length(p-top)-0.012);',
    ' metal=min(metal,length(p-LA)-0.013);',
    ' if(metal<res.x)res=vec2(metal,M_BRASS);',
    ' vec3 sp=p-LA;float y=dot(sp,LD);vec2 cq=vec2(length(sp-LD*y),y-0.050);',
    ' float cone=sdConeQ(cq,0.050,0.018,0.060);',
    ' float shell=max(abs(cone)-0.0012,cq.y-0.048);',
    ' if(shell<res.x)res=vec2(shell,cone<0.0?M_SHADEIN:M_LAMP);',
    ' float bulb=length(p-LP)-0.015;',
    ' if(bulb<res.x)res=vec2(bulb,M_BULB);',
    ' return res;}',

    'vec2 mapSmall(vec3 p,vec2 res){',
    ' float pad=sdRBox(p-vec3(0.262,0.0015,0.098),vec3(0.118,0.0015,0.096),0.006);',
    ' if(pad<res.x)res=vec2(pad,M_PAD);',
    ' if(p.y-0.006<res.x){',
    '  float kc=length(vec2(sdBezier(p.xz,vec2(0.050,0.016),vec2(0.090,0.002),vec2(0.122,-0.018)),p.y-0.0028))-0.0027;',
    '  float mc=length(vec2(sdBezier(p.xz,vec2(0.266,0.060),vec2(0.262,-0.030),vec2(0.188,-0.078)),p.y-0.0028-0.003*smoothstep(-0.006,0.006,p.z)))-0.0026;',
    '  float c=min(kc,mc);',
    '  if(c<res.x)res=vec2(c,M_CABLE);',
    ' }',
    ' return res;}',

    'vec2 map(vec3 p){',
    ' vec2 res=mapRoom(p);',
    ' res=mapPC(p,res);res=mapKB(p,res);res=mapMouse(p,res);res=mapSmall(p,res);',
    ' res=mapMug(p,res);res=mapFloppy(p,res);res=mapLamp(p,res);',
    ' return res;}',

    // ---------- lighting ----------
    'vec3 calcNormal(vec3 p,float t){float e=0.00012+0.00008*t;vec3 n=vec3(0.0);',
    ' for(int i=ZERO;i<4;i++){vec3 s=0.5773*(2.0*vec3(float(((i+3)>>1)&1),float((i>>1)&1),float(i&1))-1.0);n+=s*map(p+s*e).x;}',
    ' return normalize(n);}',
    'float calcAO(vec3 p,vec3 n){float occ=0.0,sca=1.0;',
    ' for(int i=ZERO;i<5;i++){float h=0.003+0.035*float(i)/4.0;float d=map(p+h*n).x;occ+=(h-d)*sca;sca*=0.8;}',
    ' return clamp(1.0-12.0*occ,0.0,1.0);}',
    'float softShadow(vec3 ro,vec3 rd,float tmin,float tmax,float k){',
    ' float res=1.0,t=tmin;int N=uHQ==1?64:24;gShadow=true;',
    ' for(int i=ZERO;i<64;i++){if(i>=N||t>tmax)break;',
    '  float h=map(ro+rd*t).x;',
    '  res=min(res,k*h/t);t+=clamp(h,0.0015,0.06);if(res<0.002)break;}',
    ' gShadow=false;res=clamp(res,0.0,1.0);return res*res*(3.0-2.0*res);}',
    'vec3 brdf(vec3 n,vec3 v,vec3 l,vec3 alb,float a,vec3 f0){',
    ' vec3 h=normalize(v+l);float nh=max(dot(n,h),0.0),nl=max(dot(n,l),0.0),nv=max(dot(n,v),0.001),vh=max(dot(v,h),0.0);',
    ' float a2=a*a;float dd=nh*nh*(a2-1.0)+1.0;float D=a2/(PI*dd*dd);',
    ' float k=a*0.5;float G=0.25/((nv*(1.0-k)+k)*(nl*(1.0-k)+k));',
    ' vec3 F=f0+(1.0-f0)*pow(1.0-vh,5.0);',
    ' return alb/PI*(1.0-F)+D*G*F;}',
    // light that makes it through the window: blinds, mullion, transom, soft edges
    'float moonMask(vec3 p){',
    ' if(p.x<XW)return 0.0;',
    ' float s=(XW-0.022-p.x)/MOON_L.x;vec3 w=p+MOON_L*s;',
    ' float pen=0.002+s*0.006;',
    ' float m=1.0-smoothstep(-pen,pen,sdRect2(vec2(w.z,w.y)-WC,WH-0.02,0.0));',
    ' float sb=clamp(pen/BP,0.012,0.5);',
    ' m*=mix(0.18,1.0,smoothstep(0.21-sb,0.21+sb,abs(fract((w.y-WY.x)/BP)-0.5)));',
    ' float s2=(XW-0.075-p.x)/MOON_L.x;vec3 w2=p+MOON_L*s2;float p2=0.002+s2*0.006;',
    ' m*=smoothstep(0.012-p2,0.012+p2,abs(w2.z-WC.x));',
    ' m*=smoothstep(0.012-p2,0.012+p2,abs(w2.y-(WC.y+0.12)));',
    ' return m;}',
    // form factor of the tube rectangle (Lambert polygon light)
    'float edgeI(vec3 a,vec3 b,vec3 n){float c=clamp(dot(a,b),-0.9999,0.9999);vec3 cr=cross(a,b);return acos(c)*dot(cr,n)/max(length(cr),1e-6);}',
    'float rectFF(vec3 p,vec3 n){',
    ' vec3 a=normalize(vec3(-SH.x,YS-SH.y,ZD)-p);vec3 b=normalize(vec3(SH.x,YS-SH.y,ZD)-p);',
    ' vec3 c=normalize(vec3(SH.x,YS+SH.y,ZD)-p);vec3 d=normalize(vec3(-SH.x,YS+SH.y,ZD)-p);',
    ' float s=edgeI(a,b,n)+edgeI(b,c,n)+edgeI(c,d,n)+edgeI(d,a,n);',
    ' return max(-s,0.0)/(2.0*PI);}',

    // ---------- materials ----------
    'struct Mat{vec3 alb;float rough;vec3 f0;vec3 emi;float halo;float led;};',
    'vec3 atl(vec2 uv,vec4 r){uv=clamp(uv,0.0,1.0);return pow(texture(uAtlas,(r.xy+uv*r.zw)/1024.0).rgb,vec3(2.2));}',
    'vec3 bump(vec3 p,vec3 n,float fr,float amt){vec3 g=vec3(noise3(p*fr),noise3(p*fr+vec3(17.1)),noise3(p*fr+vec3(-9.3)))-0.5;',
    ' return normalize(n+(g-n*dot(g,n))*amt);}',
    'float keyLegend(vec3 p){',
    ' vec3 q=kbLocal(p);',
    ' if(q.y<KEYB+KEYH-0.0012)return 0.0;',
    ' vec2 kp=vec2(q.x+7.5*U,q.z-KZ0);',
    ' float r=clamp(floor(kp.y/U),0.0,4.0);float xu=clamp(kp.x/U,0.0,14.999);',
    ' float x0,x1;keySpan(r,xu,x0,x1);',
    ' vec2 k=vec2(kp.x-(x0+x1)*0.5*U,kp.y-(r+0.5)*U);',
    ' float w=x1-x0;float hd=0.5*U-0.0035;float hw=w*0.5*U-0.0035;',
    ' float idx=-1.0;',
    ' if(r>3.5){idx=x0<0.5?52.0:(x0<2.0?53.0:(x0<3.0?-1.0:(x0<13.0?53.0:54.0)));}',
    ' else if(w<1.01){float L=r<0.5?0.0:(r<1.5?1.5:(r<2.5?1.75:2.25));',
    '  idx=(r<0.5?0.0:(r<1.5?13.0:(r<2.5?25.0:36.0)))+floor(x0-L+0.5);}',
    ' else{idx=r<0.5?46.0:(r<1.5?(x0<0.5?47.0:48.0):(r<2.5?(x0<0.5?49.0:50.0):51.0));}',
    ' if(idx<0.0)return 0.0;',
    ' float sz=hd*2.0;float ax=w>1.01?-hw+hd:0.0;',
    ' vec2 uv=vec2((k.x-ax)/sz+0.5,k.y/sz+0.5);',
    ' if(uv.x<0.0||uv.y<0.0||uv.x>1.0||uv.y>1.0)return 0.0;',
    ' vec2 cell=vec2(mod(idx,8.0),floor(idx/8.0));',
    ' return texture(uAtlas,(cell+uv)*64.0/1024.0).a;}',
    'Mat getMat(int mi,vec3 p,inout vec3 n){',
    ' Mat M;M.alb=vec3(0.5);M.rough=0.6;M.f0=vec3(0.04);M.emi=vec3(0.0);M.halo=0.0;M.led=0.0;',
    ' if(mi==1){',
    '  float f=fbm(p*38.0);float st=0.96+0.04*smoothstep(0.30,0.5,abs(fract((p.x+p.z)*14.0)-0.5));',
    '  M.alb=vec3(0.060,0.068,0.070)*(0.82+0.36*f)*st;M.rough=0.92;',
    ' }else if(mi==2){',
    '  float g=fbm(vec3(p.x*7.0,p.z*70.0,p.y*70.0));',
    '  float ring=fract(p.z*38.0+g*2.6+sin(p.x*3.0)*0.4);',
    '  float w=smoothstep(0.0,0.6,ring)*smoothstep(1.0,0.7,ring);',
    '  M.alb=mix(vec3(0.050,0.024,0.011),vec3(0.170,0.088,0.040),0.35+0.45*w+0.2*g);',
    '  M.rough=0.26+0.25*g;',
    ' }else if(mi==3){M.alb=vec3(0.02,0.018,0.016);M.rough=0.8;',
    ' }else if(mi==4||mi==10){',
    '  float y=fbm(p*9.0);',
    '  M.alb=mix(vec3(0.60,0.55,0.44),vec3(0.56,0.48,0.34),y*0.8);M.rough=0.52;M.f0=vec3(0.035);',
    '  n=bump(p,n,700.0,0.10);',
    ' }else if(mi==5){',
    '  M.alb=vec3(0.028,0.034,0.031);M.rough=0.05;M.f0=vec3(0.045);',
    '  float dO=max(sdRect2(p.xy-vec2(0.0,YS),SH,0.008),0.0);',
    '  M.halo=0.55*exp(-dO/0.0032)+0.08*exp(-dO/0.02);',
    ' }else if(mi==6){M.alb=vec3(0.012);M.rough=0.7;',
    ' }else if(mi==7||mi==8){',
    '  M.alb=mi==7?vec3(0.66,0.62,0.52):vec3(0.42,0.40,0.36);',
    '  M.alb=mix(M.alb,vec3(0.05,0.045,0.04),keyLegend(p)*0.92);',
    '  M.rough=0.48;n=bump(p,n,900.0,0.05);',
    ' }else if(mi==9){M.alb=vec3(0.56,0.51,0.41);M.rough=0.55;n=bump(p,n,700.0,0.08);',
    ' }else if(mi==11){M.alb=vec3(0.020,0.028,0.056)*(0.75+0.5*noise3(p*2500.0));M.rough=1.0;',
    ' }else if(mi==12){M.alb=vec3(0.46,0.43,0.36);M.rough=0.4;',
    ' }else if(mi==13){',
    '  float hy=p.y-MUG_O.y;M.alb=(hy>0.058&&hy<0.066)?vec3(0.45,0.05,0.06):vec3(0.80,0.76,0.68);',
    '  M.rough=0.16;M.f0=vec3(0.05);',
    ' }else if(mi==14){M.alb=vec3(0.030,0.014,0.006);M.rough=0.06;M.f0=vec3(0.03);',
    ' }else if(mi==15){M.alb=vec3(0.012,0.070,0.036);M.rough=0.22;M.f0=vec3(0.05);',
    ' }else if(mi==16){M.alb=vec3(0.07,0.045,0.018);M.rough=0.30;M.f0=vec3(0.80,0.58,0.26);',
    ' }else if(mi==17){M.alb=vec3(0.9);M.emi=vec3(1.0,0.80,0.55)*7.0;',
    ' }else if(mi==18){M.alb=vec3(0.75,0.68,0.52);M.rough=0.5;',
    '  M.emi=M.alb*LAMP_C*3.5*exp(-length(p-LP)/0.045);',
    ' }else if(mi==19){M.alb=vec3(0.1);M.emi=vec3(0.30,1.0,0.35)*2.4;',
    ' }else if(mi==20){M.alb=vec3(0.10,0.06,0.02);M.rough=0.3;M.led=1.0;',
    ' }else if(mi==21){',
    '  vec3 nq=p-vec3(0.140,0.349,0.0007);nq.xy=rot(0.07)*nq.xy;',
    '  M.alb=atl(vec2(nq.x/0.040+0.5,-nq.y/0.040+0.5),vec4(512.0,0.0,256.0,256.0))*0.85;M.rough=0.85;',
    ' }else if(mi==22){',
    '  M.alb=atl(vec2((p.x+0.158)/0.023+0.5,-(p.y-0.066)/0.023+0.5),vec4(768.0,0.0,128.0,128.0));M.rough=0.3;M.f0=vec3(0.05);',
    ' }else if(mi>=23&&mi<=25){',
    '  M.alb=mi==23?vec3(0.018,0.018,0.020):(mi==24?vec3(0.020,0.045,0.13):vec3(0.14,0.018,0.018));M.rough=0.42;',
    ' }else if(mi==26){M.alb=vec3(0.02);M.rough=0.3;M.f0=vec3(0.60,0.61,0.63);',
    ' }else if(mi>=27&&mi<=29){',
    '  float fi=float(mi-27);vec3 q=flopLocal(p,fi);',
    '  M.alb=atl(vec2(q.x/0.070+0.5,(q.z-0.019)/0.048+0.5),vec4(512.0+170.0*fi,256.0,170.0,113.0))*0.9;M.rough=0.8;',
    ' }else if(mi==30){M.alb=vec3(0.07,0.07,0.075);M.rough=0.6;',
    ' }else if(mi==31){M.alb=vec3(0.26,0.27,0.28);M.rough=0.55;',
    ' }else if(mi==32){',
    '  vec3 pp=p-PO;M.alb=atl(vec2(pp.x/0.284+0.5,-(pp.y)/0.394+0.5),vec4(0.0,512.0,360.0,504.0))*0.9;M.rough=0.45;',
    ' }else if(mi==33){M.alb=vec3(0.015,0.013,0.012);M.rough=0.35;',
    ' }',
    ' return M;}',

    'vec3 shadeDirect(vec3 p,vec3 n,vec3 v,Mat M,float ao){',
    ' vec3 col=vec3(0.0);float a=max(M.rough*M.rough,0.015);vec3 po=p+n*0.0012;',
    ' vec3 lv=LP-p;float ld2=dot(lv,lv);float ld=sqrt(ld2);vec3 l=lv/ld;',
    ' float spot=smoothstep(0.58,0.86,dot(-l,LD));float nl=dot(n,l);',
    ' if(nl>0.0&&spot>0.0&&M.emi.r<=0.0){',
    '  float s=softShadow(po,l,0.002,ld-0.024,18.0);',
    '  col+=brdf(n,v,l,M.alb,a,M.f0)*nl*LAMP_C*spot*s/ld2;}',
    ' float ml=M.emi.r>0.0?0.0:dot(n,MOON_L);',
    ' if(ml>0.0){float mk=moonMask(p);',
    '  if(mk>0.002){float wd=(XW-p.x)/MOON_L.x;float s=softShadow(po,MOON_L,0.002,wd-0.12,10.0);',
    '   col+=brdf(n,v,MOON_L,M.alb,a,M.f0)*ml*MOON_C*mk*s;}}',
    ' float hemi=0.5+0.5*n.y;',
    ' col+=M.alb*mix(vec3(0.010,0.008,0.006),vec3(0.012,0.015,0.024),hemi)*ao;',
    ' vec3 bp=vec3(-0.17,0.0,0.12)-p;float bd=dot(bp,bp);',
    ' col+=M.alb*LAMP_C*0.06*ao*(0.35+0.65*max(dot(n,normalize(bp)),0.0))/(1.0+bd*30.0);',
    ' return col;}',

    'vec3 shadeScreen(vec3 p,vec3 n,vec3 v,Mat M,float ao){',
    ' if(p.z<ZD+0.0008)return vec3(0.0);',
    ' vec3 c=vec3(0.0);float ff=rectFF(p,n);',
    ' if(ff>0.0005){float s=1.0;',
    '  if(uHQ==1){vec3 sc=vec3(0.0,YS,ZD)-p;float sd=length(sc);s=mix(softShadow(p+n*0.0012,sc/sd,0.002,sd-0.03,2.5),1.0,0.15);}',
    '  c+=M.alb*ff*s*mix(ao,1.0,0.4);}',
    ' vec3 r=reflect(-v,n);',
    ' if(r.z<-0.02){float tt=(ZD-p.z)/r.z;vec2 h=p.xy+r.xy*tt-vec2(0.0,YS);',
    '  float sp=0.002+tt*M.rough*M.rough*1.6;',
    '  float ox=clamp(min(h.x+sp,SH.x)-max(h.x-sp,-SH.x),0.0,2.0*sp)/(2.0*sp);',
    '  float oy=clamp(min(h.y+sp,SH.y)-max(h.y-sp,-SH.y),0.0,2.0*sp)/(2.0*sp);',
    '  float nv=max(dot(n,v),0.0);vec3 F=M.f0+(1.0-M.f0)*pow(1.0-nv,5.0);',
    '  c+=F*ox*oy*ao;}',
    ' return c;}',

    'vec3 skyCol(vec3 rd){',
    ' float h=clamp(rd.y*0.5+0.5,0.0,1.0);',
    ' vec3 c=mix(vec3(0.004,0.006,0.016),vec3(0.020,0.032,0.075),smoothstep(0.35,0.9,h));',
    ' float md=max(dot(rd,MOON_L),0.0);',
    ' c+=vec3(0.35,0.45,0.7)*pow(md,40.0)*0.3+vec3(1.0,1.0,0.95)*smoothstep(0.9993,0.9996,md)*3.0;',
    ' c+=vec3(0.10,0.06,0.03)*exp(-abs(rd.y+0.05)*18.0)*0.35;',
    ' vec2 sp=floor(vec2(rd.z,rd.y)/max(-rd.x,0.2)*300.0);',
    ' c+=vec3(0.8,0.85,1.0)*step(0.9965,hash2(sp))*smoothstep(0.5,0.7,h)*0.6;',
    ' return c;}',

    // haze: lamp cone and moon beams scattering in the air
    'vec3 volume(vec3 ro,vec3 rd,float tEnd,float jit){',
    ' int N=uHQ==1?20:7;float tm=min(tEnd,3.2);float dt=tm/float(N);vec3 moon=vec3(0.0);',
    ' vec3 lo=LP-ro;float t0=dot(lo,rd);float H=sqrt(max(dot(lo,lo)-t0*t0,0.0)+0.004);',
    ' for(int i=ZERO;i<20;i++){if(i>=N)break;moon+=MOON_C*moonMask(ro+rd*((float(i)+jit)*dt));}',
    ' vec3 xc=ro+rd*clamp(t0,0.0,tm)-LP;float sp=smoothstep(0.58,0.86,dot(normalize(xc),LD));',
    ' float lamp=(atan((tm-t0)/H)-atan(-t0/H))/H;',
    ' return LAMP_C*lamp*sp*0.009+moon*dt*0.02;}',

    'void main(){',
    ' vec2 fc=gl_FragCoord.xy+uJitter;',
    ' vec2 css=vec2(fc.x/uRes.x*uView.x,(1.0-fc.y/uRes.y)*uView.y);',
    ' vec3 rd=normalize(uCamRot*vec3((css.x-uPP.x)/uFocal,-(css.y-uPP.y)/uFocal,-1.0));',
    ' vec3 ro=uCamPos;float t=0.0,m=-1.0;int NS=uHQ==1?240:140;',
    ' for(int i=ZERO;i<240;i++){if(i>=NS)break;',
    '  vec2 h=map(ro+rd*t);if(h.x<0.0001+t*0.00015){m=h.y;break;}',
    '  t+=h.x*0.9;if(t>6.0)break;}',
    ' float jit=hash2(gl_FragCoord.xy*0.731+vec2(uSeed*13.1,uSeed*7.7));',
    ' vec3 base=vec3(0.0),scr=vec3(0.0);float led=0.0;',
    ' if(m<0.0){vec3 pe=ro+rd*t;base=pe.x<XW-0.08?skyCol(rd):vec3(0.002,0.0025,0.004);t=min(t,6.0);}',
    ' else{',
    '  vec3 p=ro+rd*t;vec3 n=calcNormal(p,t);vec3 v=-rd;int mi=int(m+0.5);',
    '  Mat M=getMat(mi,p,n);float ao=calcAO(p,n);',
    '  base=shadeDirect(p,n,v,M,ao)+M.emi;',
    '  scr=shadeScreen(p,n,v,M,ao)+vec3(M.halo);led=M.led;',
    ' }',
    ' base+=volume(ro,rd,t,jit);',
    ' if(uEnc>0.5){base=sqrt(clamp(base/8.0,0.0,1.0));scr=sqrt(clamp(scr/4.0,0.0,1.0));}',
    ' oBase=vec4(base,1.0);oScr=vec4(scr,led);',
    '}'
  ].join('\n');

  var FS_COMMON = [
    '#version 300 es',
    'precision highp float;',
    'uniform sampler2D uBase;uniform sampler2D uScr;uniform vec3 uGlow;uniform vec3 uLed;',
    'uniform float uEnc;uniform vec2 uUVS;uniform vec2 uOut;',
    'out vec4 o;',
    'vec3 radiance(vec2 uv){uv*=uUVS;vec4 s=texture(uScr,uv);vec3 b=texture(uBase,uv).rgb;vec3 r=s.rgb;',
    ' if(uEnc>0.5){b=b*b*8.0;r=r*r*4.0;}',
    ' return b+r*uGlow+s.a*uLed;}'
  ].join('\n');

  var FS_BRIGHT = FS_COMMON + '\n' + [
    'uniform float uThr;',
    'void main(){vec2 uv=gl_FragCoord.xy/uOut;vec2 d=0.3/uOut;',
    ' vec3 c=radiance(uv+vec2(-d.x,-d.y))+radiance(uv+vec2(d.x,-d.y))+radiance(uv+vec2(-d.x,d.y))+radiance(uv+vec2(d.x,d.y));',
    ' c*=0.25;o=vec4(max(c-uThr,0.0),1.0);}'
  ].join('\n');

  var FS_BLUR = [
    '#version 300 es',
    'precision highp float;',
    'uniform sampler2D uTex;uniform vec2 uDir;uniform vec2 uOut;out vec4 o;',
    'void main(){vec2 uv=gl_FragCoord.xy/uOut;',
    ' vec3 c=texture(uTex,uv).rgb*0.2270;',
    ' c+=(texture(uTex,uv+uDir*1.3846).rgb+texture(uTex,uv-uDir*1.3846).rgb)*0.3162;',
    ' c+=(texture(uTex,uv+uDir*3.2308).rgb+texture(uTex,uv-uDir*3.2308).rgb)*0.0703;',
    ' o=vec4(c,1.0);}'
  ].join('\n');

  var FS_FINAL = FS_COMMON + '\n' + [
    'uniform sampler2D uBloom;uniform float uExpo;uniform float uBloomK;',
    'vec3 aces(vec3 x){return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.0,1.0);}',
    'void main(){vec2 uv=gl_FragCoord.xy/uOut;',
    ' vec3 c=radiance(uv)+texture(uBloom,uv).rgb*uBloomK;',
    ' vec2 q=uv-0.5;c*=uExpo*(1.0-dot(q,q)*0.6);',
    ' c=pow(aces(c),vec3(1.0/2.2));',
    ' float g=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);',
    ' o=vec4(c+(g-0.5)*0.016,1.0);}'
  ].join('\n');

  // ===== GL plumbing =====
  var extCBF = gl.getExtension('EXT_color_buffer_float');
  var extPar = gl.getExtension('KHR_parallel_shader_compile');
  var extAniso = gl.getExtension('EXT_texture_filter_anisotropic');
  var HDR = !!extCBF;
  gl.bindVertexArray(gl.createVertexArray());

  function makeTarget(w, h, n) {
    var fb = gl.createFramebuffer(), tex = [];
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    for (var i = 0; i < n; i++) {
      var t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texStorage2D(gl.TEXTURE_2D, 1, HDR ? gl.RGBA16F : gl.RGBA8, w, h);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, t, 0);
      tex.push(t);
    }
    gl.drawBuffers(n === 2 ? [gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1] : [gl.COLOR_ATTACHMENT0]);
    var ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    var tgt = { fb: fb, tex: tex, w: w, h: h };
    if (!ok) { freeTarget(tgt); return null; }
    return tgt;
  }
  function freeTarget(t) {
    if (!t) return;
    gl.deleteFramebuffer(t.fb);
    for (var i = 0; i < t.tex.length; i++) gl.deleteTexture(t.tex[i]);
  }
  function target(w, h, n) {
    var t = makeTarget(w, h, n);
    if (!t && HDR) { HDR = false; t = makeTarget(w, h, n); }
    return t;
  }

  function program(fs) {
    var p = gl.createProgram();
    var a = gl.createShader(gl.VERTEX_SHADER), b = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(a, VS); gl.compileShader(a);
    gl.shaderSource(b, fs); gl.compileShader(b);
    gl.attachShader(p, a); gl.attachShader(p, b);
    gl.linkProgram(p);
    p._sh = [a, b];
    return p;
  }
  function programReady(p) {
    return !extPar || gl.getProgramParameter(p, extPar.COMPLETION_STATUS_KHR);
  }
  function programOK(p) {
    if (gl.getProgramParameter(p, gl.LINK_STATUS)) return true;
    if (window.console) {
      console.warn('[pc3d] shader error', gl.getShaderInfoLog(p._sh[1]) || '', gl.getProgramInfoLog(p) || '');
    }
    return false;
  }
  function locs(p, names) {
    var u = {};
    for (var i = 0; i < names.length; i++) u[names[i]] = gl.getUniformLocation(p, names[i]);
    return u;
  }

  var P = {
    scene: program(FS_SCENE),
    bright: program(FS_BRIGHT),
    blur: program(FS_BLUR),
    fin: program(FS_FINAL)
  };
  var U = {};

  // ===== Texture atlas: key legends, sticky note, badge, floppy labels, poster =====
  var atlasTex = null;
  function buildAtlas() {
    var c = document.createElement('canvas');
    c.width = 1024; c.height = 1024;
    var x = c.getContext('2d');
    var sans = 'Helvetica, Arial, sans-serif';
    var hand = '"Marker Felt", "Comic Sans MS", "Chalkboard SE", cursive';
    var pix = '"Press Start 2P", monospace';

    // legends: white on transparent (alpha is the mask)
    var keys = '`1234567890-=QWERTYUIOP[]ASDFGHJKL;\'ZXCVBNM,./';
    var shifted = { '`': '~', '1': '!', '2': '@', '3': '#', '4': '$', '5': '%', '6': '^', '7': '&',
      '8': '*', '9': '(', '0': ')', '-': '_', '=': '+', '[': '{', ']': '}', ';': ':', "'": '"',
      ',': '<', '.': '>', '/': '?' };
    x.fillStyle = '#fff';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    for (var i = 0; i < keys.length; i++) {
      var cx = (i % 8) * 64 + 32, cy = Math.floor(i / 8) * 64 + 32, ch = keys[i];
      if (shifted[ch]) {
        x.font = 'bold 18px ' + sans;
        x.fillText(shifted[ch], cx, cy - 11);
        x.fillText(ch, cx, cy + 12);
      } else {
        x.font = 'bold 26px ' + sans;
        x.fillText(ch, cx, cy + 1);
      }
    }
    var words = { 46: 'DELETE', 47: 'TAB', 49: 'CAPS', 50: 'RETURN', 51: 'SHIFT', 52: 'CTRL', 54: 'ALT' };
    x.textAlign = 'left';
    x.font = 'bold 11px ' + sans;
    for (var k in words) {
      var id = +k;
      x.fillText(words[k], (id % 8) * 64 + 7, Math.floor(id / 8) * 64 + 46);
    }
    x.font = 'bold 18px ' + sans;
    x.fillText('|', (48 % 8) * 64 + 12, Math.floor(48 / 8) * 64 + 20);
    x.fillText('\\', (48 % 8) * 64 + 12, Math.floor(48 / 8) * 64 + 44);
    // command key: the TinyOS diamond
    var dx = (53 % 8) * 64 + 20, dy = Math.floor(53 / 8) * 64 + 40;
    x.beginPath(); x.moveTo(dx, dy - 9); x.lineTo(dx + 9, dy); x.lineTo(dx, dy + 9); x.lineTo(dx - 9, dy); x.closePath();
    x.lineWidth = 3; x.strokeStyle = '#fff'; x.stroke();

    // sticky note (512,0 256x256)
    var g = x.createLinearGradient(512, 0, 768, 256);
    g.addColorStop(0, '#f7e98a'); g.addColorStop(1, '#e9d160');
    x.fillStyle = g; x.fillRect(512, 0, 256, 256);
    x.fillStyle = 'rgba(120,90,0,0.10)'; x.fillRect(512, 0, 256, 34);
    x.save();
    x.translate(640, 128); x.rotate(-0.06);
    x.fillStyle = '#1f2d6b'; x.textAlign = 'center';
    x.font = 'bold 50px ' + hand; x.fillText('BACK UP', 0, -40);
    x.font = 'bold 46px ' + hand; x.fillText('FRIDAY!', 0, 22);
    x.lineWidth = 5; x.strokeStyle = '#1f2d6b';
    x.beginPath(); x.moveTo(-80, 58); x.quadraticCurveTo(0, 70, 86, 52); x.stroke();
    x.restore();

    // badge (768,0 128x128)
    x.fillStyle = '#2b2a2e'; roundRect(x, 768, 0, 128, 128, 26); x.fill();
    x.save();
    x.translate(832, 64); x.rotate(Math.PI / 4);
    var dg = x.createLinearGradient(-34, -34, 34, 34);
    dg.addColorStop(0, '#00e5ff'); dg.addColorStop(0.5, '#ff71ce'); dg.addColorStop(1, '#b967ff');
    x.fillStyle = dg; x.fillRect(-32, -32, 64, 64);
    x.restore();
    x.fillStyle = '#fff'; x.textAlign = 'center'; x.font = 'bold 44px ' + sans; x.fillText('T', 832, 66);

    // floppy labels (512+170i, 256, 170x113)
    var labels = [['SYSTEM', 'DISK 1', '#d83a3a'], ['GAMES!!', 'kage2', '#2c7bd6'], ['BACKUP', '6/94', '#2aa35a']];
    for (var li = 0; li < 3; li++) {
      var lx = 512 + 170 * li;
      x.fillStyle = '#f2efe6'; x.fillRect(lx, 256, 170, 113);
      x.fillStyle = labels[li][2]; x.fillRect(lx, 256, 170, 16);
      x.strokeStyle = 'rgba(80,110,170,0.35)'; x.lineWidth = 1.5;
      for (var ly = 300; ly < 369; ly += 20) { x.beginPath(); x.moveTo(lx + 8, ly); x.lineTo(lx + 162, ly); x.stroke(); }
      x.fillStyle = '#222'; x.textAlign = 'center';
      x.font = 'bold 30px ' + hand; x.fillText(labels[li][0], lx + 85, 312);
      x.font = '24px ' + hand; x.fillText(labels[li][1], lx + 85, 346);
    }

    // poster (0,512 360x504) — pixel art drawn small, scaled up crisp
    var pc = document.createElement('canvas');
    pc.width = 90; pc.height = 126;
    var y = pc.getContext('2d');
    var sky = y.createLinearGradient(0, 0, 0, 126);
    sky.addColorStop(0, '#1b4a98'); sky.addColorStop(0.55, '#5fa8e8'); sky.addColorStop(1, '#c4e8ff');
    y.fillStyle = sky; y.fillRect(0, 0, 90, 126);
    y.fillStyle = '#ffe98a'; y.fillRect(66, 24, 10, 10); y.fillRect(64, 26, 14, 6); y.fillRect(68, 22, 6, 14);
    y.fillStyle = '#ffffff';
    [[6, 40, 18], [52, 52, 22], [14, 96, 26], [60, 104, 20]].forEach(function (cl) {
      y.fillRect(cl[0], cl[1], cl[2], 4); y.fillRect(cl[0] + 3, cl[1] - 3, cl[2] - 8, 3);
    });
    y.fillStyle = '#6b4a2b';
    for (var r = 0; r < 14; r++) y.fillRect(22 + r, 78 + r, 46 - 2 * r, 1);
    y.fillStyle = '#4caf50'; y.fillRect(20, 74, 50, 5);
    y.fillStyle = '#9aa7b8'; y.fillRect(34, 56, 22, 18); y.fillRect(30, 50, 6, 24); y.fillRect(54, 50, 6, 24); y.fillRect(42, 44, 6, 12);
    y.fillStyle = '#c0504d'; y.fillRect(29, 47, 8, 3); y.fillRect(53, 47, 8, 3); y.fillRect(41, 41, 8, 3);
    y.fillStyle = '#2a3140'; y.fillRect(43, 64, 4, 10);
    y.fillStyle = '#e8e2d0'; y.fillRect(24, 64, 3, 10); y.fillRect(20, 62, 11, 1); y.fillRect(25, 58, 1, 9);
    y.fillStyle = '#9ad8ff'; y.fillRect(66, 79, 2, 40); y.fillStyle = '#ffffff'; y.fillRect(66, 84, 1, 30);
    y.fillStyle = 'rgba(0,0,0,0.35)'; y.fillRect(0, 0, 90, 20);
    y.font = '8px ' + pix; y.textAlign = 'center'; y.textBaseline = 'top';
    y.fillStyle = '#1a1030'; y.fillText('SKYHOLM', 46, 7);
    y.fillStyle = '#ffffff'; y.fillText('SKYHOLM', 45, 6);
    y.font = '4px ' + pix; y.fillStyle = '#10253f'; y.fillText('A TINYOS ORIGINAL', 45, 118);
    x.imageSmoothingEnabled = false;
    x.drawImage(pc, 0, 512, 360, 504);

    if (!atlasTex) atlasTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, atlasTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (extAniso) {
      gl.texParameterf(gl.TEXTURE_2D, extAniso.TEXTURE_MAX_ANISOTROPY_EXT,
        Math.min(8, gl.getParameter(extAniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
    }
  }
  function roundRect(x, l, t, w, h, r) {
    x.beginPath();
    x.moveTo(l + r, t); x.arcTo(l + w, t, l + w, t + h, r); x.arcTo(l + w, t + h, l, t + h, r);
    x.arcTo(l, t + h, l, t, r); x.arcTo(l, t, l + w, t, r); x.closePath();
  }

  // ===== Camera =====
  // cam = { pos:[x,y,z], yaw, pitch, f (px), px, py (principal point, CSS px) }
  // yaw/pitch = Ry(yaw)*Rx(pitch); the camera looks down -Z of that frame.
  var vw = 0, vh = 0, dpr = 1;
  var home = null, homeOrb = null;
  var mode = 'wait';           // wait | intro | home | orbit | return
  var lift = 1;                // 0 = seated home view, 1 = free orbit camera
  var orb = { a: 0, b: 0, d: 1 }, orbT = { a: 0, b: 0, d: 1 };
  var tween = null;

  function camBasis(c) {
    var cy = Math.cos(c.yaw), sy = Math.sin(c.yaw), cp = Math.cos(c.pitch), sp = Math.sin(c.pitch);
    return { r: [cy, 0, -sy], u: [sy * sp, cp, cy * sp], b: [sy * cp, -sp, cy * cp] };
  }
  function project(c, B, X) {
    var dx = X[0] - c.pos[0], dy = X[1] - c.pos[1], dz = X[2] - c.pos[2];
    var xc = dx * B.r[0] + dy * B.r[1] + dz * B.r[2];
    var yc = dx * B.u[0] + dy * B.u[1] + dz * B.u[2];
    var w = -(dx * B.b[0] + dy * B.b[1] + dz * B.b[2]);
    return [c.px + c.f * xc / w, c.py - c.f * yc / w, w];
  }
  function orbitCam(o) {
    var ca = Math.cos(o.a), sa = Math.sin(o.a), cb = Math.cos(o.b), sb = Math.sin(o.b);
    return {
      pos: [PIVOT[0] + o.d * sa * cb, PIVOT[1] + o.d * sb, PIVOT[2] + o.d * ca * cb],
      yaw: o.a, pitch: -o.b, f: home.f, px: vw / 2, py: vh / 2
    };
  }
  function mix(a, b, t) { return a + (b - a) * t; }
  function blendCam(a, b, t) {
    return {
      pos: [mix(a.pos[0], b.pos[0], t), mix(a.pos[1], b.pos[1], t), mix(a.pos[2], b.pos[2], t)],
      yaw: mix(a.yaw, b.yaw, t), pitch: mix(a.pitch, b.pitch, t),
      f: mix(a.f, b.f, t), px: mix(a.px, b.px, t), py: mix(a.py, b.py, t)
    };
  }
  function currentCam() { return lift <= 0 ? home : blendCam(home, orbitCam(orb), lift); }

  // Seated view: image plane parallel to the tube face (so the screen stays an
  // exact 440x330 rectangle) with lens shift to frame the desk below it.
  function computeHome() {
    var f = SCR_W * HOME_D / W_S;
    var sx = Math.round((vw - SCR_W) / 2);
    var tops = [[-0.19, 0.369, -0.01], [0.19, 0.369, -0.01], [0, 0.369, -0.21]];
    var bots = [[-0.18, 0.0, 0.162], [0.15, 0.0, 0.166], [0.262, 0.0, 0.194], [-0.262, 0.0, 0.140]];
    var mTop = 22, mBot = 30, pick = null;
    var elev = [0.24, 0.21, 0.18, 0.15, 0.12];
    for (var i = 0; i < elev.length; i++) {
      var c = { pos: [HOME_X, YS + elev[i], ZD + HOME_D], yaw: 0, pitch: 0, f: f, px: 0, py: 0 };
      var B = camBasis(c), sc = project(c, B, [0, YS, ZD])[1];
      var lo = Infinity, hi = -Infinity;
      tops.forEach(function (X) { lo = Math.min(lo, project(c, B, X)[1] - sc); });
      bots.forEach(function (X) { hi = Math.max(hi, project(c, B, X)[1] - sc); });
      pick = { e: elev[i], lo: lo, hi: hi };
      if (hi - lo + mTop + mBot <= vh) break;
    }
    var span = pick.hi - pick.lo;
    var scY = span + mTop + mBot <= vh ? mTop + (vh - mTop - mBot - span) / 2 - pick.lo : mTop - pick.lo;
    var sy = Math.round(scY - SCR_H / 2);
    home = {
      pos: [HOME_X, YS + pick.e, ZD + HOME_D], yaw: 0, pitch: 0, f: f,
      px: sx + SCR_W / 2 + f * HOME_X / HOME_D,
      py: sy + SCR_H / 2 - f * pick.e / HOME_D,
      sx: sx, sy: sy
    };
    var dx = home.pos[0] - PIVOT[0], dy = home.pos[1] - PIVOT[1], dz = home.pos[2] - PIVOT[2];
    homeOrb = { a: Math.atan2(dx, dz), b: Math.atan2(dy, Math.hypot(dx, dz)), d: Math.hypot(dx, dy, dz) };
  }

  function clampOrb(o) {
    o.a = Math.max(homeOrb.a - 0.85, Math.min(homeOrb.a + 0.85, o.a));
    o.b = Math.max(0.03, Math.min(0.72, o.b));
    o.d = Math.max(homeOrb.d * 0.55, Math.min(homeOrb.d * 2.4, o.d));
  }
  function copyOrb(o) { return { a: o.a, b: o.b, d: o.d }; }
  function ease(u) { return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; }

  var nowT = 0;
  function startTween(dur, toLift, toOrb, done) {
    tween = { t0: nowT, dur: dur, from: { lift: lift, orb: copyOrb(orb) }, to: { lift: toLift, orb: copyOrb(toOrb) }, done: done };
  }
  function enterOrbit() {
    if (mode === 'orbit') return;
    if (mode === 'home') orb = copyOrb(homeOrb);
    tween = null;
    mode = 'orbit';
    orbT = copyOrb(orb);
    showHint('CLICK TO SIT BACK DOWN  ·  SCROLL TO ZOOM', 0);
  }
  function goHome(dur) {
    mode = 'return';
    hideHint();
    startTween(dur || 1.1, 0, homeOrb, function () { mode = 'home'; lift = 0; });
  }

  // ===== DOM screen placement =====
  var domKey = '';
  function applyDom(c) {
    if (lift <= 0) {
      var k = 'h' + home.sx + ',' + home.sy;
      if (k !== domKey) {
        domKey = k;
        monitor.style.transform = 'translate(' + home.sx + 'px,' + home.sy + 'px)';
        monitor.style.visibility = '';
      }
      body.classList.remove('pc3d-away');
      return;
    }
    body.classList.add('pc3d-away');
    var B = camBasis(c), hw = W_S / 2, hh = H_S / 2;
    var p0 = project(c, B, [-hw, YS + hh, ZD]), p1 = project(c, B, [hw, YS + hh, ZD]);
    var p2 = project(c, B, [hw, YS - hh, ZD]), p3 = project(c, B, [-hw, YS - hh, ZD]);
    if (p0[2] < 0.05 || p1[2] < 0.05 || p2[2] < 0.05 || p3[2] < 0.05) {
      monitor.style.visibility = 'hidden'; domKey = ''; return;
    }
    monitor.style.visibility = '';
    // unit square -> quad (Heckbert), then pre-scale by the element size
    var x0 = p0[0], y0 = p0[1], x1 = p1[0], y1 = p1[1], x2 = p2[0], y2 = p2[1], x3 = p3[0], y3 = p3[1];
    var dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3;
    var dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
    var det = dx1 * dy2 - dx2 * dy1;
    var gg = (dx3 * dy2 - dx2 * dy3) / det, hh2 = (dx1 * dy3 - dx3 * dy1) / det;
    var a = x1 - x0 + gg * x1, b = x3 - x0 + hh2 * x3, d = y1 - y0 + gg * y1, e = y3 - y0 + hh2 * y3;
    var m = [a / SCR_W, d / SCR_W, 0, gg / SCR_W, b / SCR_H, e / SCR_H, 0, hh2 / SCR_H, 0, 0, 1, 0, x0, y0, 0, 1];
    var s = 'matrix3d(' + m.map(function (v) { return +v.toFixed(8); }).join(',') + ')';
    if (s !== domKey) { domKey = s; monitor.style.transform = s; }
  }

  // ===== Render state =====
  var still = null, motion = null, bloomA = null, bloomB = null;
  var MOTION_MAX = 0.75, motionScale = 0.55;
  var src = null;              // {tgt, w, h} currently displayed
  var acc = { k: 0, band: 0, bands: 4, N: 12, done: false, fresh: false };
  var lastCamKey = '';
  var needComposite = true;

  function allocTargets() {
    freeTarget(still); freeTarget(motion); freeTarget(bloomA); freeTarget(bloomB);
    still = target(canvas.width, canvas.height, 2);
    motion = target(Math.ceil(vw * MOTION_MAX), Math.ceil(vh * MOTION_MAX), 2);
    var bw = Math.max(8, Math.ceil(vw / 6)), bh = Math.max(8, Math.ceil(vh / 6));
    bloomA = target(bw, bh, 1);
    bloomB = target(bw, bh, 1);
    if (!still || !motion || !bloomA || !bloomB) fallback('render targets');
  }

  function resize() {
    vw = document.documentElement.clientWidth || window.innerWidth;
    vh = document.documentElement.clientHeight || window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    // explicit CSS size so the 3D image and the DOM screen share one geometry
    canvas.width = Math.round(vw * dpr); canvas.height = Math.round(vh * dpr);
    canvas.style.width = vw + 'px'; canvas.style.height = vh + 'px';
    if (dustCv) {
      dustCv.width = Math.round(vw * dpr); dustCv.height = Math.round(vh * dpr);
      dustCv.style.width = vw + 'px'; dustCv.style.height = vh + 'px';
    }
    computeHome();
    if (mode === 'home') lift = 0;
    allocTargets();
    acc.N = dpr >= 1.5 ? 8 : 14;
    acc.bands = dpr >= 1.5 ? 4 : 2;
    lastCamKey = '';
    domKey = '';
  }

  function halton(i, b) { var f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; }

  function drawScene(c, tgt, w, h, hq, jx, jy, seed) {
    var B = camBasis(c);
    gl.useProgram(P.scene);
    gl.bindFramebuffer(gl.FRAMEBUFFER, tgt.fb);
    gl.viewport(0, 0, w, h);
    gl.uniform2f(U.scene.uRes, w, h);
    gl.uniform2f(U.scene.uView, vw, vh);
    gl.uniform3f(U.scene.uCamPos, c.pos[0], c.pos[1], c.pos[2]);
    gl.uniformMatrix3fv(U.scene.uCamRot, false, [B.r[0], B.r[1], B.r[2], B.u[0], B.u[1], B.u[2], B.b[0], B.b[1], B.b[2]]);
    gl.uniform1f(U.scene.uFocal, c.f);
    gl.uniform2f(U.scene.uPP, c.px, c.py);
    gl.uniform2f(U.scene.uJitter, jx, jy);
    gl.uniform1f(U.scene.uSeed, seed);
    gl.uniform1i(U.scene.uHQ, hq ? 1 : 0);
    gl.uniform1i(U.scene.uZero, 0);
    gl.uniform1f(U.scene.uEnc, HDR ? 0 : 1);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, atlasTex);
    gl.uniform1i(U.scene.uAtlas, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function renderMotion(c) {
    var w = Math.max(16, Math.round(vw * motionScale)), h = Math.max(16, Math.round(vh * motionScale));
    gl.disable(gl.BLEND);
    gl.disable(gl.SCISSOR_TEST);
    drawScene(c, motion, w, h, false, 0, 0, 0);
    src = { tgt: motion, w: w, h: h };
  }

  function renderStillBand(c) {
    var W = still.w, H = still.h;
    var bandH = Math.ceil(H / acc.bands);
    var y0 = acc.band * bandH;
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(0, y0, W, Math.min(bandH, H - y0));
    if (acc.k === 0) {
      gl.disable(gl.BLEND);
    } else {
      gl.enable(gl.BLEND);
      gl.blendColor(0, 0, 0, 1 / (acc.k + 1));
      gl.blendFunc(gl.CONSTANT_ALPHA, gl.ONE_MINUS_CONSTANT_ALPHA);
    }
    var jx = acc.k === 0 ? 0 : halton(acc.k, 2) - 0.5, jy = acc.k === 0 ? 0 : halton(acc.k, 3) - 0.5;
    drawScene(c, still, W, H, true, jx, jy, acc.k + 1);
    gl.disable(gl.BLEND);
    gl.disable(gl.SCISSOR_TEST);
    acc.band++;
    if (acc.band >= acc.bands) {
      acc.band = 0;
      acc.k++;
      src = { tgt: still, w: W, h: H };
      if (acc.k >= acc.N) acc.done = true;
    }
  }

  // ===== Screen glow (the tube lights the room) =====
  var GLOW_GAIN = 2.4;
  var glowT = [0, 0, 0], glowC = [0, 0, 0];
  var powerT0 = -1, ledUntil = 0;
  function powerLevel(t) {
    if (powerT0 < 0) return 0;
    var u = t - powerT0;
    if (u < 0) return 0;
    if (u < 0.09) return u / 0.09 * 2.6;
    return 1 + 1.6 * Math.exp(-(u - 0.09) / 0.22);
  }
  function lin(c) { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  function parseColor(s) {
    s = (s || '').trim();
    var m;
    if ((m = /^#([0-9a-f]{3})$/i.exec(s))) return [17 * parseInt(m[1][0], 16), 17 * parseInt(m[1][1], 16), 17 * parseInt(m[1][2], 16)];
    if ((m = /^#([0-9a-f]{6})$/i.exec(s))) return [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16)];
    if ((m = /rgba?\(([^)]+)\)/i.exec(s))) { var p = m[1].split(','); return [+p[0], +p[1], +p[2]]; }
    return null;
  }
  var wallCv = document.getElementById('desktop-wallpaper');
  var bootEl = document.getElementById('boot-screen');
  function sampleGlow() {
    if (bootEl && bootEl.style.display !== 'none' && !bootEl.classList.contains('boot-fade')) {
      glowT = [0.018, 0.02, 0.018];
      return;
    }
    var avg = [0.05, 0.06, 0.09];
    try {
      var d = wallCv.getContext('2d').getImageData(0, 0, wallCv.width, wallCv.height).data;
      var r = 0, g = 0, b = 0, n = 0;
      for (var i = 0; i < d.length; i += 16) { r += lin(d[i]); g += lin(d[i + 1]); b += lin(d[i + 2]); n++; }
      if (n) avg = [r / n, g / n, b / n];
    } catch (e) {}
    var bg = parseColor(getComputedStyle(screenEl).getPropertyValue('--body-bg')) || [200, 200, 200];
    var win = [lin(bg[0]), lin(bg[1]), lin(bg[2])];
    var cov = 0, dark = 0, total = SCR_W * 306;
    var list = screenEl.querySelectorAll('.window:not(.closed):not(.minimized)');
    for (var j = 0; j < list.length; j++) {
      var w = list[j], a = w.offsetWidth * w.offsetHeight;
      var cv = w.querySelector('.window-body canvas');
      if (cv && cv.offsetWidth * cv.offsetHeight > a * 0.5) dark += a; else cov += a;
    }
    cov = Math.min(0.85, cov / total); dark = Math.min(0.85 - cov, dark / total);
    var rest = 1 - cov - dark;
    var next = [], delta = 0;
    for (var c = 0; c < 3; c++) {
      next[c] = (avg[c] * rest + win[c] * cov + 0.05 * dark) * 0.92 + 0.02;
      delta = Math.max(delta, Math.abs(next[c] - glowT[c]) / (glowT[c] + 0.01));
    }
    if (delta > 0.03) glowT = next;
  }

  // ===== Dust motes and coffee steam (2D overlay, projected from 3D) =====
  var dctx = dustCv ? dustCv.getContext('2d') : null;
  var motes = [], steam = [];
  (function seed() {
    var rnd = mulberry(7);
    for (var i = 0; i < 120; i++) {
      motes.push({ x: -0.72 + rnd() * 1.18, y: 0.03 + rnd() * 0.6, z: rnd() * 0.46,
        s: 0.5 + rnd() * 0.9, ph: rnd() * 6.283, sp: 0.4 + rnd() * 0.8 });
    }
    for (var j = 0; j < 12; j++) steam.push({ age: rnd() * 3.2, life: 2.6 + rnd() * 1.4, ph: rnd() * 6.283, ox: (rnd() - 0.5) * 0.02 });
  })();
  function mulberry(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function smooth(e0, e1, x) { var t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); }
  function lampAt(x, y, z) {
    var dx = x - LP[0], dy = y - LP[1], dz = z - LP[2], d2 = dx * dx + dy * dy + dz * dz, il = 1 / Math.sqrt(d2);
    return smooth(0.58, 0.86, (dx * LD[0] + dy * LD[1] + dz * LD[2]) * il) / (d2 + 0.006);
  }
  function moonAt(x, y, z) {
    if (x < XW) return 0;
    var s = (XW - 0.022 - x) / MOON_L[0];
    var wy = y + MOON_L[1] * s, wz = z + MOON_L[2] * s;
    if (wy < WY[0] || wy > WY[1] || wz < WZ[0] || wz > WZ[1]) return 0;
    var fy = (wy - WY[0]) / BP; fy -= Math.floor(fy);
    return smooth(0.20, 0.32, Math.abs(fy - 0.5));
  }
  var dustAcc = 0;
  function drawDust(c, dt, t) {
    if (!dctx) return;
    dustAcc += dt;
    if (dustAcc < 1 / 30) return;
    var step = dustAcc; dustAcc = 0;
    var W = dustCv.width, H = dustCv.height, B = camBasis(c);
    dctx.setTransform(1, 0, 0, 1, 0, 0);
    dctx.clearRect(0, 0, W, H);
    if (powerT0 < 0 && mode === 'wait') return;
    dctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    dctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < motes.length; i++) {
      var m = motes[i];
      m.ph += step * m.sp * 0.6;
      m.x += (Math.sin(m.ph * 0.7 + i) * 0.004 + 0.0015) * step;
      m.y += (Math.cos(m.ph) * 0.003 + 0.0012) * step;
      m.z += Math.sin(m.ph * 1.3 + i * 0.5) * 0.003 * step;
      if (m.y > 0.64) m.y = 0.03; if (m.x > 0.46) m.x = -0.72;
      var il = lampAt(m.x, m.y, m.z) * 0.9, im = moonAt(m.x, m.y, m.z) * 1.3;
      var tw = 0.55 + 0.45 * Math.sin(m.ph * 2.3);
      var a = Math.min(1, (il * 0.06 + im * 0.5) * tw);
      if (a < 0.03) continue;
      var p = project(c, B, [m.x, m.y, m.z]);
      if (p[2] < 0.05) continue;
      var rad = Math.max(0.45, Math.min(2.2, m.s * c.f * 0.0006 / p[2]));
      var wr = il * 0.06 / (il * 0.06 + im * 0.5 + 1e-6);
      dctx.fillStyle = 'rgba(' + Math.round(mix(170, 255, wr)) + ',' + Math.round(mix(200, 214, wr)) + ',' + Math.round(mix(255, 160, wr)) + ',' + (a * 0.8).toFixed(3) + ')';
      dctx.beginPath(); dctx.arc(p[0], p[1], rad, 0, 6.283); dctx.fill();
    }
    dctx.globalCompositeOperation = 'source-over';
    for (var j = 0; j < steam.length; j++) {
      var s = steam[j];
      s.age += step;
      if (s.age > s.life) { s.age = 0; s.ph = Math.random() * 6.283; s.ox = (Math.random() - 0.5) * 0.02; }
      var u = s.age / s.life;
      var sx = MUG[0] + s.ox + Math.sin(u * 5 + s.ph) * 0.012 * u, sy = 0.078 + u * 0.13, sz = MUG[2] + Math.cos(u * 4 + s.ph) * 0.008 * u;
      var q = project(c, B, [sx, sy, sz]);
      if (q[2] < 0.05) continue;
      var r2 = c.f * (0.008 + u * 0.022) / q[2];
      var al = Math.sin(Math.PI * u) * 0.045 * (0.6 + lampAt(sx, sy, sz) * 0.02);
      var gr = dctx.createRadialGradient(q[0], q[1], 0, q[0], q[1], r2);
      gr.addColorStop(0, 'rgba(255,236,214,' + Math.min(0.09, al).toFixed(3) + ')');
      gr.addColorStop(1, 'rgba(255,236,214,0)');
      dctx.fillStyle = gr;
      dctx.beginPath(); dctx.arc(q[0], q[1], r2, 0, 6.283); dctx.fill();
    }
  }

  // ===== Composite (cheap; runs whenever glow/LED/source change) =====
  function composite(t) {
    if (!src) return;
    var pw = powerLevel(t);
    var glow = [glowC[0] * pw * GLOW_GAIN, glowC[1] * pw * GLOW_GAIN, glowC[2] * pw * GLOW_GAIN];
    var ledOn = (t < ledUntil && Math.sin(t * 53) + Math.sin(t * 31) > 0.2) ? 1 : 0;
    var led = [ledOn * 5.0, ledOn * 2.2, ledOn * 0.25];
    var uvs = [src.w / src.tgt.w, src.h / src.tgt.h];
    function common(u) {
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, src.tgt.tex[0]); gl.uniform1i(u.uBase, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, src.tgt.tex[1]); gl.uniform1i(u.uScr, 1);
      gl.uniform3f(u.uGlow, glow[0], glow[1], glow[2]);
      gl.uniform3f(u.uLed, led[0], led[1], led[2]);
      gl.uniform1f(u.uEnc, HDR ? 0 : 1);
      gl.uniform2f(u.uUVS, uvs[0], uvs[1]);
    }
    gl.disable(gl.BLEND);
    // bright pass -> blur x2
    gl.useProgram(P.bright);
    gl.bindFramebuffer(gl.FRAMEBUFFER, bloomA.fb);
    gl.viewport(0, 0, bloomA.w, bloomA.h);
    common(U.bright);
    gl.uniform2f(U.bright.uOut, bloomA.w, bloomA.h);
    gl.uniform1f(U.bright.uThr, 0.55);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.useProgram(P.blur);
    gl.uniform2f(U.blur.uOut, bloomA.w, bloomA.h);
    gl.uniform1i(U.blur.uTex, 0);
    for (var i = 0; i < 2; i++) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, bloomB.fb);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, bloomA.tex[0]);
      gl.uniform2f(U.blur.uDir, (1 + i) / bloomA.w, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindFramebuffer(gl.FRAMEBUFFER, bloomA.fb);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, bloomB.tex[0]);
      gl.uniform2f(U.blur.uDir, 0, (1 + i) / bloomA.h);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    // final
    gl.useProgram(P.fin);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    common(U.fin);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, bloomA.tex[0]); gl.uniform1i(U.fin.uBloom, 2);
    gl.uniform2f(U.fin.uOut, canvas.width, canvas.height);
    gl.uniform1f(U.fin.uExpo, 1.9);
    gl.uniform1f(U.fin.uBloomK, 0.55);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  // ===== Hint =====
  var hintTimer = null;
  function showHint(text, ms) {
    if (!hintEl) return;
    hintEl.textContent = text;
    hintEl.classList.add('show');
    clearTimeout(hintTimer);
    if (ms) hintTimer = setTimeout(hideHint, ms);
  }
  function hideHint() { if (hintEl) hintEl.classList.remove('show'); clearTimeout(hintTimer); }

  // ===== Input: drag the room to look around, click to sit back down =====
  var drag = null;
  canvas.addEventListener('pointerdown', function (e) {
    if (e.button !== 0 || !home) return;
    if (mode === 'intro') { skipIntro(); return; }
    drag = { x: e.clientX, y: e.clientY, moved: false };
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
  });
  canvas.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved) {
      if (Math.abs(dx) + Math.abs(dy) < 5) return;
      drag.moved = true;
      enterOrbit();
      body.classList.add('pc3d-dragging');
    }
    orbT.a -= dx * 0.0055;
    orbT.b += dy * 0.0045;
    clampOrb(orbT);
    drag.x = e.clientX; drag.y = e.clientY;
  });
  function endDrag() {
    if (!drag) return;
    if (!drag.moved && mode === 'orbit') goHome();
    drag = null;
    body.classList.remove('pc3d-dragging');
  }
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('wheel', function (e) {
    if (!home || mode === 'intro' || mode === 'wait') return;
    e.preventDefault();
    enterOrbit();
    orbT.d *= Math.exp(e.deltaY * 0.0012);
    clampOrb(orbT);
  }, { passive: false });
  canvas.addEventListener('dblclick', function () {
    if (mode !== 'home') return;
    enterOrbit();
    orbT = { a: homeOrb.a + 0.55, b: 0.40, d: homeOrb.d * 1.5 };
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && mode === 'orbit') goHome();
    else if (mode === 'intro') skipIntro();
  });

  // ===== Intro: wide shot of the dark room -> tube powers on -> sit down =====
  var introT0 = 0, tubeOn = false;
  var query = (/[?&]pc3d=([^&]*)/.exec(location.search) || [])[1] || '';
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function powerTube() {
    if (tubeOn) return;
    tubeOn = true;
    powerT0 = nowT;
    body.classList.remove('pc3d-off');
    screenEl.classList.add('crt-poweron');
    setTimeout(function () { screenEl.classList.remove('crt-poweron'); }, 900);
    ledUntil = nowT + 3.4;
    firePower();
  }
  function skipIntro() {
    if (mode !== 'intro') return;
    powerTube();
    mode = 'return';
    startTween(0.8, 0, homeOrb, introDone);
  }
  function introDone() {
    mode = 'home'; lift = 0;
    showHint('DRAG THE ROOM TO LOOK AROUND', 5000);
  }
  // opening shot: three-quarter view from the right, window and lamp in frame
  var INTRO = null;
  function beginIntro() {
    INTRO = { a: homeOrb.a + 0.80, b: 0.36, d: homeOrb.d * 1.85 };
    // screenshot hooks: ?pc3d=home | ?pc3d=orbit,<yaw deg from home>,<pitch deg>,<distance x>
    //                   | ?pc3d=introAt,<0..1> (intro frozen at that progress)
    var q = query.split(',');
    if (q[0] === 'orbit') {
      powerTube();
      mode = 'orbit'; lift = 1;
      orb = { a: homeOrb.a + (+q[1] || 0) * Math.PI / 180, b: (+q[2] || 15) * Math.PI / 180, d: homeOrb.d * (+q[3] || 1) };
      orbT = copyOrb(orb);
      return;
    }
    if (q[0] === 'introAt') {
      var e = ease(Math.max(0, Math.min(1, +q[1] || 0)));
      if (e > 0.02) powerTube();
      mode = 'frozen'; lift = 1 - e;
      orb = { a: mix(INTRO.a, homeOrb.a, e), b: mix(INTRO.b, homeOrb.b, e), d: mix(INTRO.d, homeOrb.d, e) };
      return;
    }
    if (q[0] === 'home' || reduced) {
      powerTube();
      mode = 'home'; lift = 0;
      return;
    }
    mode = 'intro';
    introT0 = nowT;
    lift = 1;
    orb = { a: INTRO.a, b: INTRO.b, d: INTRO.d };
    startTween(4.6, 0, homeOrb, introDone);
  }

  // disk activity LED when an app opens
  new MutationObserver(function (list) {
    for (var i = 0; i < list.length; i++) {
      var r = list[i], el = r.target;
      if (!el.classList || !(el.classList.contains('window') || el.classList.contains('widget'))) continue;
      if ((r.oldValue || '').indexOf('closed') >= 0 && !el.classList.contains('closed')) ledUntil = Math.max(ledUntil, nowT + 0.7);
    }
  }).observe(screenEl, { subtree: true, attributes: true, attributeFilter: ['class'], attributeOldValue: true });

  // ===== Main loop =====
  var lastT = -1, glowTimer = 0, frameDt = [];
  function camKey(c) {
    return c.pos[0].toFixed(6) + c.pos[1].toFixed(6) + c.pos[2].toFixed(6) + c.yaw.toFixed(6) +
      c.pitch.toFixed(6) + c.f.toFixed(3) + c.px.toFixed(3) + c.py.toFixed(3);
  }
  function update(dt) {
    if (tween) {
      var u = Math.min(1, (nowT - tween.t0) / tween.dur), e = ease(u);
      lift = mix(tween.from.lift, tween.to.lift, e);
      orb.a = mix(tween.from.orb.a, tween.to.orb.a, e);
      orb.b = mix(tween.from.orb.b, tween.to.orb.b, e);
      orb.d = mix(tween.from.orb.d, tween.to.orb.d, e);
      if (u >= 1) { var done = tween.done; tween = null; if (done) done(); }
    } else if (mode === 'orbit') {
      var k1 = 1 - Math.exp(-dt * 6), k2 = 1 - Math.exp(-dt * 10);
      lift += (1 - lift) * k1; if (lift > 0.9995) lift = 1;
      ['a', 'b', 'd'].forEach(function (key) {
        orb[key] += (orbT[key] - orb[key]) * k2;
        if (Math.abs(orbT[key] - orb[key]) < 2e-5) orb[key] = orbT[key];
      });
    }
    if (mode === 'intro' && !tubeOn && nowT - introT0 > 0.75) powerTube();
  }

  function frame(ts) {
    requestAnimationFrame(frame);
    var t = ts / 1000;
    var dt = lastT < 0 ? 1 / 60 : Math.min(0.1, Math.max(0.001, t - lastT));
    lastT = t; nowT = t;
    if (!home) return;
    update(dt);

    var c = currentCam();
    var key = camKey(c);
    if (key !== lastCamKey) {
      lastCamKey = key;
      // adapt motion resolution to how long frames take
      frameDt.push(dt); if (frameDt.length > 6) frameDt.shift();
      var avg = frameDt.reduce(function (s, v) { return s + v; }, 0) / frameDt.length;
      if (avg > 0.028) motionScale = Math.max(0.33, motionScale * 0.9);
      else if (avg < 0.018) motionScale = Math.min(MOTION_MAX, motionScale * 1.04);
      renderMotion(c);
      acc.k = 0; acc.band = 0; acc.done = false;
      needComposite = true;
    } else if (!acc.done) {
      if (dt > 0.045 && acc.bands < 32) acc.bands *= 2;
      renderStillBand(c);
      if (acc.band === 0) needComposite = true;
    }
    applyDom(c);

    glowTimer -= dt;
    if (glowTimer <= 0) { glowTimer = 1.0; sampleGlow(); }
    var moving = false;
    for (var i = 0; i < 3; i++) {
      var dg = glowT[i] - glowC[i];
      if (Math.abs(dg) > 1e-4) { glowC[i] += dg * (1 - Math.exp(-dt * 3.5)); moving = true; }
    }
    if (moving || t < ledUntil + 0.1 || (powerT0 >= 0 && t - powerT0 < 1.6)) needComposite = true;
    if (needComposite) { composite(t); needComposite = false; }
    drawDust(c, dt, t);
  }

  // ===== Start: compile (in parallel when possible), build atlas, go =====
  function whenFonts(cb) {
    var done = false, go = function () { if (!done) { done = true; cb(); } };
    try {
      if (document.fonts && document.fonts.load) document.fonts.load('8px "Press Start 2P"').then(go, go);
      else go();
    } catch (e) { go(); }
    setTimeout(go, 1500);
  }
  var fontsReady = false;
  whenFonts(function () { fontsReady = true; });

  function waitReady() {
    if (failed) return;
    if (!fontsReady || !programReady(P.scene) || !programReady(P.fin) || !programReady(P.bright) || !programReady(P.blur)) {
      requestAnimationFrame(waitReady);
      return;
    }
    if (!programOK(P.scene) || !programOK(P.fin) || !programOK(P.bright) || !programOK(P.blur)) { fallback('shader'); return; }
    U.scene = locs(P.scene, ['uRes', 'uView', 'uCamPos', 'uCamRot', 'uFocal', 'uPP', 'uJitter', 'uSeed', 'uHQ', 'uZero', 'uEnc', 'uAtlas']);
    var cu = ['uBase', 'uScr', 'uGlow', 'uLed', 'uEnc', 'uUVS', 'uOut'];
    U.bright = locs(P.bright, cu.concat(['uThr']));
    U.blur = locs(P.blur, ['uTex', 'uDir', 'uOut']);
    U.fin = locs(P.fin, cu.concat(['uBloom', 'uExpo', 'uBloomK']));
    buildAtlas();
    resize();
    if (failed) return;
    started = true;
    clearTimeout(failTimer);
    var rt = null;
    var onResize = function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        var w = document.documentElement.clientWidth || window.innerWidth;
        var h = document.documentElement.clientHeight || window.innerHeight;
        if (w === vw && h === vh && Math.min(window.devicePixelRatio || 1, 2) === dpr) return;
        resize(); needComposite = true;
      }, 120);
    };
    window.addEventListener('resize', onResize);
    if (window.ResizeObserver) new ResizeObserver(onResize).observe(document.documentElement);
    beginIntro();
    body.classList.add('pc3d-live');
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(waitReady);

  // small hook for the headless screenshot harness
  window._pc3d = {
    state: function () { return { mode: mode, lift: lift, samples: acc.k, done: acc.done, hdr: HDR }; }
  };
})();
