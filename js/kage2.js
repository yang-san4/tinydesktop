// ===== KAGE II — 忍 The Lord's Keep (WebGL Third-Person, AAA pass) =====
// Sequel to KAGE: four zones at ~4x scale, wall-cling with corner peek,
// palace + keep INTERIORS (multi-floor climb, nightingale floors),
// search AI with last-known-position behavior, and a throne-room duel.
// Engine shares GEKKO v2's architecture: unified box geometry (one
// definition drives rendering AND collision), vertex-lit WebGL at
// 400x300 with pixelated upscale, layered 2D HUD canvas.
(function () {
  var canvas = document.getElementById('kage2-canvas');
  var W = 400, H = 300;
  canvas.width = W; canvas.height = H;
  canvas.style.width = '100%';
  canvas.style.aspectRatio = '4/3';
  canvas.style.imageRendering = 'pixelated';
  canvas.style.display = 'block';

  var _wk = document.getElementById('window-kage2');
  if (_wk) {
    _wk.style.width = '352px';
    _wk.style.left = '52px';
    _wk.style.top = '14px';
  }

  // ===== Canvas stack: WebGL below, 2D HUD above =====
  var _kb = document.getElementById('kage2-body');
  var _cw = document.createElement('div');
  _cw.style.cssText = 'position:relative;line-height:0;';
  _kb.insertBefore(_cw, canvas); _cw.appendChild(canvas);
  var hudCanvas = document.createElement('canvas');
  hudCanvas.width = W; hudCanvas.height = H;
  hudCanvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;image-rendering:pixelated;pointer-events:none;z-index:5;';
  _cw.appendChild(hudCanvas);
  var hud = hudCanvas.getContext('2d');

  var gl = canvas.getContext('webgl', { antialias: false, alpha: false }) ||
           canvas.getContext('experimental-webgl', { antialias: false, alpha: false });
  if (!gl) {
    var msg = document.createElement('div');
    msg.style.cssText = 'color:#f44;font-family:monospace;font-size:10px;padding:12px;';
    msg.textContent = 'KAGE requires WebGL.';
    _cw.appendChild(msg);
    return;
  }

  // ===== HTML Overlay (title / zone / pause / win / dead) =====
  var _ov = document.createElement('div');
  _ov.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:hidden;z-index:10;';
  _cw.appendChild(_ov);
  var _ovCss = document.createElement('style');
  _ovCss.textContent =
    '@keyframes kg2Pulse{0%,100%{opacity:.3}50%{opacity:1}}' +
    '@keyframes kg2SlideIn{0%{transform:translateY(-10px);opacity:0}100%{transform:translateY(0);opacity:1}}' +
    '.kg2-scr{position:absolute;top:0;left:0;width:100%;height:100%;display:none;' +
    'flex-direction:column;align-items:center;justify-content:center;gap:0;' +
    'font-family:"Press Start 2P",monospace;text-align:center;box-sizing:border-box;padding:4% 4%;background:rgba(6,5,16,0.55)}' +
    '.kg2-scr.on{display:flex}' +
    '.kg2-blink{animation:kg2Pulse 1.8s ease-in-out infinite}' +
    '.kg2-key{display:inline-block;border:1px solid rgba(232,210,160,0.45);padding:2px 4px;font-size:5px;border-radius:2px;margin:0 1px;background:rgba(232,210,160,0.06);color:#e8d2a0;line-height:1;vertical-align:middle;font-family:"Press Start 2P",monospace}' +
    '.kg2-cr{display:flex;align-items:center;justify-content:center;gap:10px;margin:2px 0;flex-wrap:wrap}' +
    '.kg2-ci{display:flex;align-items:center;gap:4px;font-size:5px;color:#c8c0d8;white-space:nowrap}' +
    '.kg2-logo{background:rgba(6,5,16,0.92);border-top:2px solid #d04050;border-bottom:2px solid #d04050;padding:12px 28px 10px;text-align:center}' +
    '.kg2-logo-t{font-size:18px;color:#e8e4f0;text-shadow:0 0 8px #d0405080,0 0 18px #d0405040;letter-spacing:8px}' +
    '.kg2-logo-sep{width:50%;height:1px;background:linear-gradient(90deg,transparent,#e8d2a060,transparent);margin:8px auto 6px}' +
    '.kg2-logo-sub{font-size:4px;color:#e8d2a0;letter-spacing:2px;opacity:.75}' +
    '.kg2-hud-hint{position:absolute;bottom:3px;right:4px;display:none;align-items:center;gap:3px;font-family:"Press Start 2P",monospace;font-size:4px;text-shadow:0 0 4px rgba(0,0,0,0.9)}.kg2-hud-hint.on{display:flex}' +
    '.kg2-zone-title{font-size:13px;color:#e8e4f0;text-shadow:0 0 10px #d04050;animation:kg2SlideIn 0.5s ease-out}' +
    '.kg2-zone-sub{font-size:6px;color:#e8d2a0;margin-top:6px;animation:kg2SlideIn 0.5s ease-out 0.2s both}' +
    '.kg2-stats{font-size:5px;color:#c8c0d8;margin-top:10px;line-height:2}.kg2-stats b{color:#e8d2a0}';
  document.head.appendChild(_ovCss);
  function _mkScr(){var d=document.createElement('div');d.className='kg2-scr';_ov.appendChild(d);return d;}
  function _pcControls(){return '<div class="kg2-cr"><div class="kg2-ci"><span class="kg2-key">W</span><span class="kg2-key">A</span><span class="kg2-key">S</span><span class="kg2-key">D</span> MOVE</div><div class="kg2-ci"><span class="kg2-key" style="font-size:4px">MOUSE</span> CAMERA</div></div><div class="kg2-cr"><div class="kg2-ci"><span class="kg2-key" style="font-size:4px">CLICK</span> SLASH</div><div class="kg2-ci"><span class="kg2-key" style="font-size:4px">RCLICK/F</span> SHURIKEN</div><div class="kg2-ci"><span class="kg2-key" style="font-size:4px">SPACE</span> JUMP</div></div><div class="kg2-cr"><div class="kg2-ci"><span class="kg2-key" style="font-size:4px">SHIFT</span> SNEAK/CLING</div><div class="kg2-ci"><span class="kg2-key" style="font-size:4px">2x DIR</span> DODGE</div><div class="kg2-ci"><span class="kg2-key">E</span> AIM HOOK</div><div class="kg2-ci"><span class="kg2-key" style="font-size:4px">ESC</span> PAUSE</div></div>';}
  function _mobControls(){return '<div class="kg2-cr"><div class="kg2-ci">KAGE needs a keyboard and mouse.</div></div><div class="kg2-cr"><div class="kg2-ci">Visit again from a desktop, ninja.</div></div>';}
  var _scrTitle=_mkScr();
  _scrTitle.innerHTML='<div class="kg2-logo"><div class="kg2-logo-t">KAGE <span style="color:#d04050">II</span></div><div class="kg2-logo-sep"></div><div class="kg2-logo-sub">THE LORD\'S KEEP &mdash; LEAVE NO TRACE</div></div><div style="flex:1 0 14px;max-height:28px"></div><div class="kg2-blink" style="font-size:8px;color:#fff"></div><div style="flex:1 0 10px;max-height:20px"></div><div style="opacity:.6"></div>';
  var _titlePrompt=_scrTitle.children[2],_titleCtrls=_scrTitle.children[4];
  var _scrZone=_mkScr();_scrZone.style.background='rgba(6,5,16,0.45)';
  _scrZone.innerHTML='<div class="kg2-zone-title"></div><div class="kg2-zone-sub"></div>';
  var _zoneTitle=_scrZone.children[0],_zoneSub=_scrZone.children[1];
  var _scrPause=_mkScr();
  _scrPause.innerHTML='<div style="font-size:14px;color:#e8d2a0;text-shadow:0 0 6px #e8d2a080">PAUSED</div><div class="kg2-blink" style="font-size:7px;color:#fff;margin:14px 0 10px"></div><div style="display:flex;gap:8px;justify-content:center;margin-bottom:10px"></div><div style="opacity:.55"></div>';
  var _pausePrompt=_scrPause.children[1],_pauseMenu=_scrPause.children[2],_pauseCtrls=_scrPause.children[3];
  var _btnStyle='font-size:6px;padding:3px 8px;cursor:pointer;border:1px solid;border-radius:2px;user-select:none;';
  var _btnDebug=document.createElement('div');
  _btnDebug.style.cssText=_btnStyle+'color:#0ae;border-color:#0ae;';
  _btnDebug.textContent='DEBUG';
  _btnDebug.addEventListener('mousedown',function(e){e.stopPropagation();e.preventDefault();debugMode=!debugMode;_btnDebug.style.background=debugMode?'rgba(0,170,238,0.3)':'';});
  var _btnReset=document.createElement('div');
  _btnReset.style.cssText=_btnStyle+'color:#f44;border-color:#f44;';
  _btnReset.textContent='RESET';
  _btnReset.addEventListener('mousedown',function(e){e.stopPropagation();e.preventDefault();gameState='title';manualPause=false;_ovActive='';stopMusic();updateOverlay();});
  var _btnAI=document.createElement('div');
  _btnAI.style.cssText=_btnStyle+'color:#0f8;border-color:#0f8;';
  _btnAI.textContent='AI TEST';
  _btnAI.addEventListener('mousedown',function(e){e.stopPropagation();e.preventDefault();
    aiMode=!aiMode;
    if(aiMode){aiInit();debugMode=true;_btnDebug.style.background='rgba(0,170,238,0.3)';}
    else{keys.w=keys.a=keys.s=keys.d=keys.sp=false;mouseDown=false;}
    _btnAI.style.background=aiMode?'rgba(0,255,136,0.3)':'';
  });
  _pauseMenu.appendChild(_btnDebug);_pauseMenu.appendChild(_btnAI);_pauseMenu.appendChild(_btnReset);
  _scrPause.addEventListener('mousedown',function(e){
    if(e.target===_btnDebug||e.target===_btnAI||e.target===_btnReset)return;
    manualPause=false;
    if(!isMobileKg&&!aiMode)canvas.requestPointerLock();
  });
  var _scrWin=_mkScr();_scrWin.style.background='rgba(6,5,16,0.8)';
  _scrWin.innerHTML='<div style="font-size:13px;color:#e8d2a0;text-shadow:0 0 10px #e8d2a0,0 0 20px #d0405060">THE LORD SLEEPS</div><div style="font-size:5px;color:#d04050;margin-top:6px;letter-spacing:3px">MISSION COMPLETE</div><div class="kg2-stats"></div><div class="kg2-blink" style="font-size:7px;color:#fff;margin-top:16px"></div>';
  var _winStats=_scrWin.children[2],_winPrompt=_scrWin.children[3];
  var _scrDead=_mkScr();_scrDead.style.background='rgba(20,0,0,0.8)';
  _scrDead.innerHTML='<div style="font-size:13px;color:#ff3c3c;text-shadow:0 0 10px #ff3c3c80">YOU WERE SEEN</div><div style="font-size:5px;color:#c8c0d8;margin-top:6px">a ninja\'s end</div><div class="kg2-stats"></div><div class="kg2-blink" style="font-size:7px;color:#fff;margin-top:16px"></div>';
  var _deadStats=_scrDead.children[2],_deadPrompt=_scrDead.children[3];
  var _hudHint=document.createElement('div');_hudHint.className='kg2-hud-hint';
  _hudHint.innerHTML='<span class="kg2-key" style="font-size:4px;padding:1px 3px">ESC</span><span style="color:#c8c0d8">PAUSE</span>';
  _ov.appendChild(_hudHint);
  var _ovActive='';
  function updateOverlay(){
    var isPaused=gameState==='playing'&&!isMobileKg&&(manualPause||(!pointerLocked&&!aiMode));
    var scr='none';
    if(gameState==='title')scr='title';
    else if(gameState==='playing'&&zoneAnnounceT>0)scr='zone';
    else if(isPaused)scr='pause';
    else if(gameState==='win')scr='win';
    else if(gameState==='dead')scr='dead';
    _hudHint.className='kg2-hud-hint'+((gameState==='playing'&&(pointerLocked||aiMode)&&!isMobileKg&&!manualPause)?' on':'');
    if(scr===_ovActive)return;_ovActive=scr;
    _ov.style.pointerEvents=scr==='pause'?'auto':'none';
    _scrTitle.className='kg2-scr'+(scr==='title'?' on':'');
    _scrZone.className='kg2-scr'+(scr==='zone'?' on':'');
    _scrPause.className='kg2-scr'+(scr==='pause'?' on':'');
    _scrWin.className='kg2-scr'+(scr==='win'?' on':'');
    _scrDead.className='kg2-scr'+(scr==='dead'?' on':'');
    if(scr==='title'){_titlePrompt.textContent=isMobileKg?'PLAY ON DESKTOP — PC ONLY':'CLICK TO BEGIN';_titleCtrls.innerHTML=isMobileKg?_mobControls():_pcControls();}
    if(scr==='pause'){_pausePrompt.textContent='CLICK TO RESUME';_pauseCtrls.innerHTML=_pcControls();_btnDebug.style.background=debugMode?'rgba(0,170,238,0.3)':'';_btnAI.style.background=aiMode?'rgba(0,255,136,0.3)':'';}
    if(scr==='win'){_winPrompt.textContent='';_winPrompt.style.display='none';}
    if(scr==='dead'){_deadPrompt.textContent='';_deadPrompt.style.display='none';}
  }
  function updateOverlayPrompts(){
    if(gameState==='win'&&stateTimer<=0&&_winPrompt.style.display==='none'){_winPrompt.textContent=isMobileKg?'TAP TO CONTINUE':'CLICK TO CONTINUE';_winPrompt.style.display='';}
    if(gameState==='dead'&&stateTimer<=0&&_deadPrompt.style.display==='none'){_deadPrompt.textContent=isMobileKg?'TAP TO RETRY':'CLICK TO RETRY';_deadPrompt.style.display='';}
  }

  // ===== CONSTANTS =====
  var PI=Math.PI,TAU=PI*2,DEG=PI/180;
  var FOV_BASE=62*DEG;
  var NEAR=0.1,FAR=130,FOG_START=18,FOG_END=46;
  var GRAVITY=18,PLAYER_R=0.24,PLAYER_H=1.0;
  var VOID_Z=-8;
  // Night palette (sky shader + lighting)
  var SKY_TOP=[0.02,0.03,0.10],SKY_HOR=[0.10,0.13,0.28],SKY_BOT=[0.06,0.07,0.16];
  var FOG_C=[0.05,0.07,0.16];
  var MOON_DIR=norm3([0.42,-0.28,0.62]);
  var MOON_COL=[0.56,0.65,0.92];           // cool moonlight
  var AMB_UP=[0.23,0.27,0.43],AMB_DN=[0.09,0.09,0.16];
  var _time=0;

  // ===== MATH =====
  function norm3(v){var l=Math.sqrt(v[0]*v[0]+v[1]*v[1]+v[2]*v[2])||1;return[v[0]/l,v[1]/l,v[2]/l];}
  function clamp(v,a,b){return v<a?a:(v>b?b:v);}
  function lerp(a,b,t){return a+(b-a)*t;}
  function angLerp(a,b,t){var d=b-a;while(d>PI)d-=TAU;while(d<-PI)d+=TAU;return a+d*t;}
  function dist2d(ax,ay,bx,by){var dx=ax-bx,dy=ay-by;return Math.sqrt(dx*dx+dy*dy);}
  function dist3d(ax,ay,az,bx,by,bz){var dx=ax-bx,dy=ay-by,dz=az-bz;return Math.sqrt(dx*dx+dy*dy+dz*dz);}
  function matPerspective(fov,aspect,near,far){
    var f=1/Math.tan(fov/2),nf=1/(near-far);
    return [f/aspect,0,0,0, 0,f,0,0, 0,0,(far+near)*nf,-1, 0,0,2*far*near*nf,0];
  }
  function matMul(a,b){
    var o=new Array(16);
    for(var c=0;c<4;c++)for(var r=0;r<4;r++){
      o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];
    }
    return o;
  }
  // View matrix: camera at (cx,cy,cz), yaw a (forward = sin a, cos a), pitch p (up+).
  function matView(cx,cy,cz,a,p){
    var ca=Math.cos(a),sa=Math.sin(a),cp=Math.cos(p),sp=Math.sin(p);
    var rx=ca,ry=-sa,rz=0;
    var fx=sa*cp,fy=ca*cp,fz=sp;
    var ux=ry*fz-rz*fy,uy=rz*fx-rx*fz,uz=rx*fy-ry*fx;
    return [
      rx,ux,-fx,0,
      ry,uy,-fy,0,
      rz,uz,-fz,0,
      -(rx*cx+ry*cy+rz*cz), -(ux*cx+uy*cy+uz*cz), (fx*cx+fy*cy+fz*cz), 1
    ];
  }
  function matOrtho(l,r2,b,t,n2,f){
    return[2/(r2-l),0,0,0, 0,2/(t-b),0,0, 0,0,-2/(f-n2),0,
      -(r2+l)/(r2-l),-(t+b)/(t-b),-(f+n2)/(f-n2),1];
  }
  function matLookDir(ex,ey,ez,fx,fy,fz){ // view matrix from eye + forward dir
    var rx=fy*1-fz*0, ry=fz*0-fx*1, rz=fx*0-fy*0; // f x worldUp(0,0,1)
    var rl=Math.sqrt(rx*rx+ry*ry+rz*rz)||1;rx/=rl;ry/=rl;rz/=rl;
    var ux=ry*fz-rz*fy, uy=rz*fx-rx*fz, uz=rx*fy-ry*fx;
    return[
      rx,ux,-fx,0,
      ry,uy,-fy,0,
      rz,uz,-fz,0,
      -(rx*ex+ry*ey+rz*ez), -(ux*ex+uy*ey+uz*ez), (fx*ex+fy*ey+fz*ez), 1
    ];
  }
  function mat4Invert(m){
    var a00=m[0],a01=m[1],a02=m[2],a03=m[3],a10=m[4],a11=m[5],a12=m[6],a13=m[7],
        a20=m[8],a21=m[9],a22=m[10],a23=m[11],a30=m[12],a31=m[13],a32=m[14],a33=m[15];
    var b00=a00*a11-a01*a10,b01=a00*a12-a02*a10,b02=a00*a13-a03*a10,b03=a01*a12-a02*a11,
        b04=a01*a13-a03*a11,b05=a02*a13-a03*a12,b06=a20*a31-a21*a30,b07=a20*a32-a22*a30,
        b08=a20*a33-a23*a30,b09=a21*a32-a22*a31,b10=a21*a33-a23*a31,b11=a22*a33-a23*a32;
    var det=b00*b11-b01*b10+b02*b09+b03*b08-b04*b07+b05*b06;
    if(!det)return null;det=1/det;
    return [
      (a11*b11-a12*b10+a13*b09)*det,(a02*b10-a01*b11-a03*b09)*det,(a31*b05-a32*b04+a33*b03)*det,(a22*b04-a21*b05-a23*b03)*det,
      (a12*b08-a10*b11-a13*b07)*det,(a00*b11-a02*b08+a03*b07)*det,(a32*b02-a30*b05-a33*b01)*det,(a20*b05-a22*b02+a23*b01)*det,
      (a10*b10-a11*b08+a13*b06)*det,(a01*b08-a00*b10-a03*b06)*det,(a30*b04-a31*b02+a33*b00)*det,(a21*b02-a20*b04-a23*b00)*det,
      (a11*b07-a10*b09-a12*b06)*det,(a00*b09-a01*b07+a02*b06)*det,(a31*b01-a30*b03-a32*b00)*det,(a20*b03-a21*b01+a22*b00)*det
    ];
  }

  // ===== WEBGL SETUP =====
  function mkShader(type,src){
    var s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){console.error('KAGE2 shader:',gl.getShaderInfoLog(s));}
    return s;
  }
  function mkProgram(vs,fs){
    var p=gl.createProgram();
    gl.attachShader(p,mkShader(gl.VERTEX_SHADER,vs));
    gl.attachShader(p,mkShader(gl.FRAGMENT_SHADER,fs));
    gl.linkProgram(p);
    if(!gl.getProgramParameter(p,gl.LINK_STATUS)){console.error('KAGE2 link:',gl.getProgramInfoLog(p));}
    return p;
  }

  var VS_WORLD=
    'attribute vec3 aPos;attribute vec3 aNrm;attribute vec4 aCol;attribute float aMat;\n'+
    'uniform mat4 uVP;uniform mat4 uLVP;\n'+
    'varying vec3 vPos;varying vec3 vNrm;varying vec4 vCol;varying float vMat;varying vec4 vShadow;\n'+
    'void main(){\n'+
    '  gl_Position=uVP*vec4(aPos,1.0);\n'+
    '  vPos=aPos;vNrm=aNrm;vCol=aCol;vMat=aMat;\n'+
    '  vShadow=uLVP*vec4(aPos,1.0);\n'+
    '}';
  // per-pixel: procedural materials (triplanar), moonlight + PCF shadow map,
  // 6 point lights, animated water, height fog, soft tonemap
  var FS_WORLD=
    'precision mediump float;\n'+
    'varying vec3 vPos;varying vec3 vNrm;varying vec4 vCol;varying float vMat;varying vec4 vShadow;\n'+
    'uniform vec3 uSunDir;uniform vec3 uSunCol;\n'+
    'uniform vec3 uAmbUp;uniform vec3 uAmbDn;\n'+
    'uniform vec3 uCam;uniform vec3 uFogC;\n'+
    'uniform vec4 uLPos[6];uniform vec4 uLCol[6];\n'+
    'uniform sampler2D uShadowTex;uniform float uShadowOn;uniform float uTime;\n'+
    'float hash3(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}\n'+
    'float hash2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}\n'+
    'float vno(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);\n'+
    '  return mix(mix(hash2(i),hash2(i+vec2(1.0,0.0)),f.x),mix(hash2(i+vec2(0.0,1.0)),hash2(i+vec2(1.0,1.0)),f.x),f.y);}\n'+
    'void main(){\n'+
    '  vec3 n=normalize(vNrm);\n'+
    '  float em=vCol.a;\n'+
    '  vec3 alb=vCol.rgb;\n'+
    '  vec3 an=abs(n);\n'+
    '  vec2 tp=(an.z>0.6)?vPos.xy:((an.x>an.y)?vPos.yz:vPos.xz);\n'+
    '  float m=vMat;\n'+
    '  float sparkle=0.0;\n'+
    '  if(m<0.5){ alb*=1.0+(hash3(floor(vPos*7.0))*0.10-0.05)*(1.0-em); }\n'+
    '  else if(m<1.5){ alb*=0.95+0.08*vno(tp*1.6); }\n'+
    '  else if(m<2.5){\n'+
    '    float px=tp.x*3.2;\n'+
    '    float pl=floor(px)+floor(tp.y*0.7)*7.0;\n'+
    '    alb*=0.88+0.18*fract(pl*0.731);\n'+
    '    alb*=0.95+0.05*sin(tp.y*34.0+pl*2.1);\n'+
    '    float gap=min(smoothstep(0.0,0.07,fract(px)),smoothstep(1.0,0.93,fract(px)));\n'+
    '    alb*=mix(0.72,1.0,gap);\n'+
    '  }else if(m<3.5){\n'+
    '    float row=tp.y*3.4;\n'+
    '    float colu=tp.x*2.4+mod(floor(row),2.0)*0.5;\n'+
    '    alb*=0.85+0.22*hash2(vec2(floor(colu),floor(row)));\n'+
    '    float edge=min(smoothstep(0.0,0.10,fract(row)),smoothstep(0.0,0.07,fract(colu)));\n'+
    '    alb*=mix(0.58,1.0,edge);\n'+
    '  }else if(m<4.5){\n'+
    '    float r2=tp.y*1.5;\n'+
    '    float c2=tp.x*0.95+mod(floor(r2),2.0)*0.5;\n'+
    '    alb*=0.87+0.20*hash2(vec2(floor(c2),floor(r2)));\n'+
    '    float mort=min(smoothstep(0.0,0.06,fract(r2)),smoothstep(0.0,0.04,fract(c2)));\n'+
    '    alb*=mix(0.66,1.0,mort);\n'+
    '  }else if(m<5.5){\n'+
    '    float fx=fract(tp.x*0.55),fy=fract(tp.y*1.05);\n'+
    '    float mid=floor(tp.x*0.55)+floor(tp.y*1.05)*3.0;\n'+
    '    alb*=0.92+0.10*fract(mid*0.617);\n'+
    '    alb*=0.965+0.035*sin((mod(mid,2.0)<1.0?tp.x:tp.y)*80.0);\n'+
    '    float bd=min(min(smoothstep(0.0,0.05,fx),smoothstep(1.0,0.95,fx)),\n'+
    '                 min(smoothstep(0.0,0.09,fy),smoothstep(1.0,0.91,fy)));\n'+
    '    alb=mix(alb*0.72,alb,bd);\n'+
    '  }else if(m<6.5){\n'+
    '    alb*=0.88+0.16*vno(tp*0.8)+0.06*vno(tp*4.5);\n'+
    '  }else if(m<7.5){\n'+
    '    float wv=vno(tp*1.2+vec2(uTime*0.22,uTime*0.15))*0.6+vno(tp*2.9-vec2(uTime*0.18,0.0))*0.4;\n'+
    '    alb*=0.70+0.45*wv;\n'+
    '    sparkle=pow(max(0.0,sin(wv*9.0+uTime*1.6)),28.0)*0.30;\n'+
    '  }else{\n'+
    '    alb*=0.82+0.30*vno(tp*2.2);\n'+
    '  }\n'+
    '  float sun=max(dot(n,uSunDir),0.0);\n'+
    '  float sh=1.0;\n'+
    '  if(uShadowOn>0.5){\n'+
    '    vec3 sc=vShadow.xyz;\n'+
    '    if(sc.x>0.005&&sc.x<0.995&&sc.y>0.005&&sc.y<0.995&&sc.z<1.0){\n'+
    '      float b2=0.0015+0.0035*(1.0-sun);\n'+
    '      float px2=1.5/1024.0;\n'+
    '      sh=(step(sc.z-b2,texture2D(uShadowTex,sc.xy).r)\n'+
    '         +step(sc.z-b2,texture2D(uShadowTex,sc.xy+vec2(px2,0.0)).r)\n'+
    '         +step(sc.z-b2,texture2D(uShadowTex,sc.xy+vec2(0.0,px2)).r)\n'+
    '         +step(sc.z-b2,texture2D(uShadowTex,sc.xy+vec2(px2,px2)).r))*0.25;\n'+
    '      sh=0.25+0.75*sh;\n'+
    '    }\n'+
    '  }\n'+
    '  vec3 amb=mix(uAmbDn,uAmbUp,n.z*0.5+0.5);\n'+
    '  vec3 lit=alb*(amb+uSunCol*sun*sh);\n'+
    '  vec3 vdir=normalize(uCam-vPos);\n'+
    '  float spec=pow(max(dot(reflect(-uSunDir,n),vdir),0.0),18.0)*0.16*(0.4+0.6*max(n.z,0.0));\n'+
    '  lit+=uSunCol*(spec*sh+sparkle);\n'+
    '  for(int i=0;i<6;i++){\n'+
    '    vec3 ld=uLPos[i].xyz-vPos;float d=length(ld);\n'+
    '    float att=max(0.0,1.0-d/max(uLPos[i].w,0.001))*uLCol[i].a;\n'+
    '    float nd=max(dot(n,ld/max(d,0.001)),0.0);\n'+
    '    lit+=alb*uLCol[i].rgb*att*att*nd;\n'+
    '  }\n'+
    '  vec3 col=mix(lit,vCol.rgb,em);\n'+
    '  col=col/(1.0+0.22*max(col-vec3(0.75),vec3(0.0)));\n'+
    '  float dist=distance(vPos,uCam);\n'+
    '  float fog=clamp((dist-'+FOG_START.toFixed(1)+')/('+(FOG_END-FOG_START).toFixed(1)+'),0.0,1.0);\n'+
    '  fog*=mix(1.0,0.55,clamp(vPos.z*0.10,0.0,1.0));\n'+
    '  fog*=(1.0-em*0.5);\n'+
    '  gl_FragColor=vec4(mix(col,uFogC,fog),1.0);\n'+
    '}';
  var VS_BLEND=
    'attribute vec3 aPos;attribute vec4 aCol;\n'+
    'uniform mat4 uVP;uniform vec3 uCam;\n'+
    'varying vec4 vCol;varying float vFog;\n'+
    'void main(){gl_Position=uVP*vec4(aPos,1.0);vCol=aCol;\n'+
    '  float dist=distance(aPos,uCam);\n'+
    '  vFog=clamp((dist-'+FOG_START.toFixed(1)+')/('+(FOG_END-FOG_START).toFixed(1)+'),0.0,1.0)*0.5;\n'+
    '}';
  var FS_BLEND=
    'precision mediump float;\n'+
    'varying vec4 vCol;varying float vFog;uniform vec3 uFogC;\n'+
    'void main(){gl_FragColor=vec4(mix(vCol.rgb,uFogC,vFog),vCol.a);}';
  // Night sky: indigo gradient + full moon with halo + dense twinkling stars
  var VS_SKY=
    'attribute vec2 aPos;varying vec2 vUV;\n'+
    'void main(){vUV=aPos;gl_Position=vec4(aPos,0.9999,1.0);}';
  var FS_SKY=
    'precision mediump float;varying vec2 vUV;\n'+
    'uniform mat4 uInvVP;uniform vec3 uSunDir;uniform float uTime;\n'+
    'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}\n'+
    'float vnoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);\n'+
    '  return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),f.x),mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),f.x),f.y);}\n'+
    'void main(){\n'+
    '  vec4 wp=uInvVP*vec4(vUV,1.0,1.0);\n'+
    '  vec3 dir=normalize(wp.xyz/wp.w);\n'+
    '  float h=dir.z;\n'+
    '  vec3 top=vec3('+SKY_TOP[0]+','+SKY_TOP[1]+','+SKY_TOP[2]+');\n'+
    '  vec3 hor=vec3('+SKY_HOR[0]+','+SKY_HOR[1]+','+SKY_HOR[2]+');\n'+
    '  vec3 bot=vec3('+SKY_BOT[0]+','+SKY_BOT[1]+','+SKY_BOT[2]+');\n'+
    '  vec3 col;\n'+
    '  if(h>0.0){col=mix(hor,top,pow(clamp(h*1.5,0.0,1.0),0.65));}\n'+
    '  else{col=mix(hor,bot,clamp(-h*3.0,0.0,1.0));}\n'+
    '  float md=max(dot(dir,uSunDir),0.0);\n'+
    '  if(h>0.05){\n'+
    '    vec2 sp=dir.xy/(0.001+dir.z)*16.0;\n'+
    '    float st=step(0.997,hash(floor(sp)));\n'+
    '    float tw=0.55+0.45*sin(uTime*2.0+hash(floor(sp)+7.0)*40.0);\n'+
    '    col+=vec3(st)*tw*clamp((h-0.05)*2.4,0.0,0.9);\n'+
    '  }\n'+
    '  col+=vec3(0.95,0.95,0.85)*smoothstep(0.9985,0.9990,md);\n'+      // full moon, larger
    '  col+=vec3(0.55,0.60,0.80)*pow(md,140.0)*0.8;\n'+
    '  col+=vec3(0.25,0.3,0.5)*pow(md,10.0)*0.38;\n'+
    '  if(h>0.02){\n'+                                                   // drifting night clouds
    '    vec2 cp=dir.xy/(0.18+dir.z)*1.4+vec2(uTime*0.009,uTime*0.004);\n'+
    '    float cn=vnoise(cp)*0.62+vnoise(cp*2.3+7.0)*0.38;\n'+
    '    float cl=smoothstep(0.52,0.80,cn)*clamp(h*4.0,0.0,1.0);\n'+
    '    vec3 cc=mix(vec3(0.06,0.08,0.17),vec3(0.30,0.34,0.50),clamp(pow(md,5.0)*0.9+0.18,0.0,1.0));\n'+
    '    col=mix(col,cc,cl*0.85);\n'+
    '  }\n'+
    '  if(h<0.16&&h>-0.06){\n'+                                          // far mountain ridges
    '    float az=atan(dir.y,dir.x);\n'+
    '    float ridge=0.040+0.050*vnoise(vec2(az*2.5,3.7))+0.018*sin(az*9.0);\n'+
    '    float m=smoothstep(ridge,ridge-0.025,h);\n'+
    '    col=mix(col,vec3(0.040,0.050,0.110),m*0.95);\n'+
    '  }\n'+
    '  gl_FragColor=vec4(col,1.0);\n'+
    '}';


  var progWorld=mkProgram(VS_WORLD,FS_WORLD);
  var progBlend=mkProgram(VS_BLEND,FS_BLEND);
  var progSky=mkProgram(VS_SKY,FS_SKY);
  var locW={
    aPos:gl.getAttribLocation(progWorld,'aPos'),
    aNrm:gl.getAttribLocation(progWorld,'aNrm'),
    aCol:gl.getAttribLocation(progWorld,'aCol'),
    uVP:gl.getUniformLocation(progWorld,'uVP'),
    uSunDir:gl.getUniformLocation(progWorld,'uSunDir'),
    uSunCol:gl.getUniformLocation(progWorld,'uSunCol'),
    uAmbUp:gl.getUniformLocation(progWorld,'uAmbUp'),
    uAmbDn:gl.getUniformLocation(progWorld,'uAmbDn'),
    uCam:gl.getUniformLocation(progWorld,'uCam'),
    uFogC:gl.getUniformLocation(progWorld,'uFogC'),
    uLPos:gl.getUniformLocation(progWorld,'uLPos'),
    uLCol:gl.getUniformLocation(progWorld,'uLCol'),
    aMat:gl.getAttribLocation(progWorld,'aMat'),
    uLVP:gl.getUniformLocation(progWorld,'uLVP'),
    uShadowTex:gl.getUniformLocation(progWorld,'uShadowTex'),
    uShadowOn:gl.getUniformLocation(progWorld,'uShadowOn'),
    uTime:gl.getUniformLocation(progWorld,'uTime')
  };
  var locB={
    aPos:gl.getAttribLocation(progBlend,'aPos'),
    aCol:gl.getAttribLocation(progBlend,'aCol'),
    uVP:gl.getUniformLocation(progBlend,'uVP'),
    uCam:gl.getUniformLocation(progBlend,'uCam'),
    uFogC:gl.getUniformLocation(progBlend,'uFogC')
  };
  var locS={
    aPos:gl.getAttribLocation(progSky,'aPos'),
    uInvVP:gl.getUniformLocation(progSky,'uInvVP'),
    uSunDir:gl.getUniformLocation(progSky,'uSunDir'),
    uTime:gl.getUniformLocation(progSky,'uTime')
  };
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.disable(gl.CULL_FACE); // closed boxes + z-buffer; avoids winding pitfalls

  var skyBuf=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,skyBuf);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1, 1,-1, -1,1, 1,-1, 1,1, -1,1]),gl.STATIC_DRAW);

  // ===== POST: bloom + cinematic grade (scene renders to an FBO first) =====
  var VS_POST='attribute vec2 aPos;varying vec2 vUV;void main(){vUV=aPos*0.5+0.5;gl_Position=vec4(aPos,0.0,1.0);}';
  var FS_BRIGHT='precision mediump float;varying vec2 vUV;uniform sampler2D uTex;'+
    'void main(){vec3 c=texture2D(uTex,vUV).rgb;'+
    'float l=dot(c,vec3(0.299,0.587,0.114));'+
    'gl_FragColor=vec4(c*smoothstep(0.62,0.92,l)*1.0,1.0);}';
  var FS_BLUR='precision mediump float;varying vec2 vUV;uniform sampler2D uTex;uniform vec2 uDir;'+
    'void main(){vec3 a=vec3(0.0);'+
    'a+=texture2D(uTex,vUV-uDir*2.0).rgb*0.12;'+
    'a+=texture2D(uTex,vUV-uDir).rgb*0.23;'+
    'a+=texture2D(uTex,vUV).rgb*0.30;'+
    'a+=texture2D(uTex,vUV+uDir).rgb*0.23;'+
    'a+=texture2D(uTex,vUV+uDir*2.0).rgb*0.12;'+
    'gl_FragColor=vec4(a,1.0);}';
  var FS_FINAL='precision mediump float;varying vec2 vUV;uniform sampler2D uTex;uniform sampler2D uBloom;'+
    'void main(){vec3 c=texture2D(uTex,vUV).rgb+texture2D(uBloom,vUV).rgb*0.75;'+
    'float l=dot(c,vec3(0.299,0.587,0.114));'+
    'c=mix(c,c*c*(3.0-2.0*c),0.22);'+
    'c+=vec3(0.012,0.018,0.045)*(1.0-l);'+
    'c+=vec3(0.050,0.024,0.0)*l*l;'+
    'gl_FragColor=vec4(c,1.0);}';
  var progBright=mkProgram(VS_POST,FS_BRIGHT);
  var progBlur=mkProgram(VS_POST,FS_BLUR);
  var progFinal=mkProgram(VS_POST,FS_FINAL);
  function mkFBO(w,h){
    var tex=gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D,tex);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    var fb=gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER,fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,tex,0);
    return{fb:fb,tex:tex,w:w,h:h};
  }
  var fboScene=mkFBO(W,H);
  var _rbDepth=gl.createRenderbuffer();
  gl.bindRenderbuffer(gl.RENDERBUFFER,_rbDepth);
  gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,W,H);
  gl.bindFramebuffer(gl.FRAMEBUFFER,fboScene.fb);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,_rbDepth);
  var fboBloomA=mkFBO(200,150),fboBloomB=mkFBO(200,150);
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);

  // ===== SHADOW MAP (moonlight, ortho around the player) =====
  var shadowExt=gl.getExtension('WEBGL_depth_texture');
  var SHADOW_RES=1024,shadowOn=!!shadowExt;
  var shadowTex=null,shadowFBO=null,_lvp=null,_lvpBias=null;
  if(shadowOn){
    shadowTex=gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D,shadowTex);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT,SHADOW_RES,SHADOW_RES,0,gl.DEPTH_COMPONENT,gl.UNSIGNED_INT,null);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    var shadowColor=gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D,shadowColor);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,SHADOW_RES,SHADOW_RES,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
    shadowFBO=gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER,shadowFBO);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,shadowColor,0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,shadowTex,0);
    if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)shadowOn=false;
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  }
  var progDepth=mkProgram(
    'attribute vec3 aPos;uniform mat4 uVP;void main(){gl_Position=uVP*vec4(aPos,1.0);}',
    'precision mediump float;void main(){gl_FragColor=vec4(1.0);}');
  var locD={aPos:gl.getAttribLocation(progDepth,'aPos'),uVP:gl.getUniformLocation(progDepth,'uVP')};
  var _matIdent=new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
  function renderShadowPass(){
    if(!shadowOn){_lvpBias=null;return;}
    var ex=player.x+MOON_DIR[0]*30,ey=player.y+MOON_DIR[1]*30,ez=player.z+MOON_DIR[2]*30;
    var view=matLookDir(ex,ey,ez,-MOON_DIR[0],-MOON_DIR[1],-MOON_DIR[2]);
    var e2=34;
    _lvp=matMul(matOrtho(-e2,e2,-e2,e2,2,72),view);
    var B=[0.5,0,0,0, 0,0.5,0,0, 0,0,0.5,0, 0.5,0.5,0.5,1];
    _lvpBias=matMul(B,_lvp);
    gl.bindFramebuffer(gl.FRAMEBUFFER,shadowFBO);
    gl.viewport(0,0,SHADOW_RES,SHADOW_RES);
    gl.clearColor(1,1,1,1);
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    gl.useProgram(progDepth);
    gl.uniformMatrix4fv(locD.uVP,false,new Float32Array(_lvp));
    gl.enableVertexAttribArray(locD.aPos);
    gl.bindBuffer(gl.ARRAY_BUFFER,staticBuf);
    gl.vertexAttribPointer(locD.aPos,3,gl.FLOAT,false,44,0);
    gl.drawArrays(gl.TRIANGLES,0,staticCount);
    if(dynLen>0){
      gl.bindBuffer(gl.ARRAY_BUFFER,dynBuf);
      gl.vertexAttribPointer(locD.aPos,3,gl.FLOAT,false,44,0);
      gl.drawArrays(gl.TRIANGLES,0,dynLen/11);
    }
    gl.disableVertexAttribArray(locD.aPos);
  }
  var locBr={aPos:gl.getAttribLocation(progBright,'aPos'),uTex:gl.getUniformLocation(progBright,'uTex')};
  var locBl={aPos:gl.getAttribLocation(progBlur,'aPos'),uTex:gl.getUniformLocation(progBlur,'uTex'),uDir:gl.getUniformLocation(progBlur,'uDir')};
  var locF={aPos:gl.getAttribLocation(progFinal,'aPos'),uTex:gl.getUniformLocation(progFinal,'uTex'),uBloom:gl.getUniformLocation(progFinal,'uBloom')};
  function fsQuad(loc){
    gl.bindBuffer(gl.ARRAY_BUFFER,skyBuf);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc,2,gl.FLOAT,false,8,0);
    gl.drawArrays(gl.TRIANGLES,0,6);
    gl.disableVertexAttribArray(loc);
  }
  function postProcess(){
    gl.disable(gl.DEPTH_TEST);
    gl.bindFramebuffer(gl.FRAMEBUFFER,fboBloomA.fb);
    gl.viewport(0,0,fboBloomA.w,fboBloomA.h);
    gl.useProgram(progBright);
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,fboScene.tex);
    gl.uniform1i(locBr.uTex,0);
    fsQuad(locBr.aPos);
    gl.bindFramebuffer(gl.FRAMEBUFFER,fboBloomB.fb);
    gl.useProgram(progBlur);
    gl.bindTexture(gl.TEXTURE_2D,fboBloomA.tex);
    gl.uniform1i(locBl.uTex,0);
    gl.uniform2f(locBl.uDir,1.0/fboBloomA.w,0);
    fsQuad(locBl.aPos);
    gl.bindFramebuffer(gl.FRAMEBUFFER,fboBloomA.fb);
    gl.bindTexture(gl.TEXTURE_2D,fboBloomB.tex);
    gl.uniform2f(locBl.uDir,0,1.0/fboBloomA.h);
    fsQuad(locBl.aPos);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    gl.viewport(0,0,W,H);
    gl.useProgram(progFinal);
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,fboScene.tex);
    gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,fboBloomA.tex);
    gl.uniform1i(locF.uTex,0);gl.uniform1i(locF.uBloom,1);
    fsQuad(locF.aPos);
    gl.activeTexture(gl.TEXTURE0);
    gl.enable(gl.DEPTH_TEST);
  }

  // ===== DYNAMIC LIGHTS =====
  var lights=[];
  function addLight(x,y,z,radius,r,g,b,intensity,life){
    lights.push({x:x,y:y,z:z,rad:radius,r:r,g:g,b:b,it:intensity,life:life,maxLife:life});
  }
  function updateLights(dt){
    for(var i=lights.length-1;i>=0;i--){
      lights[i].life-=dt;
      if(lights[i].life<=0)lights.splice(i,1);
    }
  }
  var MAXL=6;
  var _lpos=new Float32Array(MAXL*4),_lcol=new Float32Array(MAXL*4);
  function packLights(px,py){
    // nearest-to-player lanterns matter most; sort by distance-weighted intensity
    var ls=lights.slice().sort(function(a,b){
      var da=dist2d(a.x,a.y,px,py),db=dist2d(b.x,b.y,px,py);
      return (da-a.it*6)-(db-b.it*6);
    });
    for(var i=0;i<MAXL;i++){
      var L=ls[i];
      if(L){
        var k=L.maxLife>8888?1:(L.life/L.maxLife); // persistent lights don't decay
        _lpos[i*4]=L.x;_lpos[i*4+1]=L.y;_lpos[i*4+2]=L.z;_lpos[i*4+3]=L.rad;
        _lcol[i*4]=L.r;_lcol[i*4+1]=L.g;_lcol[i*4+2]=L.b;_lcol[i*4+3]=L.it*k;
      }else{
        _lpos[i*4]=0;_lpos[i*4+1]=0;_lpos[i*4+2]=-99;_lpos[i*4+3]=0.001;
        _lcol[i*4]=0;_lcol[i*4+1]=0;_lcol[i*4+2]=0;_lcol[i*4+3]=0;
      }
    }
  }

  // ===== UNIFIED GEOMETRY (one box = render + collide) =====
  var solids=[];
  var staticMesh=[];
  var rngSeed=771177;
  function rng(){rngSeed=(rngSeed*1103515245+12345)&0x7fffffff;return rngSeed/0x7fffffff;}
  function pushQuad(arr,p1,p2,p3,p4,n,r,g,b,em,mat){
    mat=mat||0;
    var pts=[p1,p2,p3,p1,p3,p4];
    for(var i=0;i<6;i++){
      var p=pts[i];
      arr.push(p[0],p[1],p[2],n[0],n[1],n[2],r,g,b,em,mat);
    }
  }
  function pushBoxGeo(arr,cx,cy,z0,w,d,h,side,top,em,bot){
    var x0=cx-w/2,x1=cx+w/2,y0=cy-d/2,y1=cy+d/2,z1=z0+h;
    var mS=side[3]||0,mT=top[3]||0;
    bot=bot||[side[0]*0.5,side[1]*0.5,side[2]*0.5,mS];
    pushQuad(arr,[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1],[0,0,1],top[0],top[1],top[2],em,mT);
    pushQuad(arr,[x0,y1,z0],[x1,y1,z0],[x1,y0,z0],[x0,y0,z0],[0,0,-1],bot[0],bot[1],bot[2],em,bot[3]||0);
    pushQuad(arr,[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[x1,y0,z1],[1,0,0],side[0],side[1],side[2],em,mS);
    pushQuad(arr,[x0,y1,z0],[x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[-1,0,0],side[0],side[1],side[2],em,mS);
    pushQuad(arr,[x1,y1,z0],[x0,y1,z0],[x0,y1,z1],[x1,y1,z1],[0,1,0],side[0],side[1],side[2],em,mS);
    pushQuad(arr,[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1],[0,-1,0],side[0],side[1],side[2],em,mS);
  }
  function S(cx,cy,z0,w,d,h,side,top,em){
    solids.push({x:cx,y:cy,z0:z0,top:z0+h,w:w,d:d});
    pushBoxGeo(staticMesh,cx,cy,z0,w,d,h,side,top,em||0);
  }
  function D(cx,cy,z0,w,d,h,side,top,em){
    pushBoxGeo(staticMesh,cx,cy,z0,w,d,h,side,top,em||0);
  }
  function W2(cx,cy,cz,w,h,dir,r,g,b,em){
    var hw=w/2,hh=h/2,e=0.02;
    if(dir===0)pushQuad(staticMesh,[cx+e,cy-hw,cz-hh],[cx+e,cy+hw,cz-hh],[cx+e,cy+hw,cz+hh],[cx+e,cy-hw,cz+hh],[1,0,0],r,g,b,em);
    else if(dir===1)pushQuad(staticMesh,[cx-e,cy+hw,cz-hh],[cx-e,cy-hw,cz-hh],[cx-e,cy-hw,cz+hh],[cx-e,cy+hw,cz+hh],[-1,0,0],r,g,b,em);
    else if(dir===2)pushQuad(staticMesh,[cx+hw,cy+e,cz-hh],[cx-hw,cy+e,cz-hh],[cx-hw,cy+e,cz+hh],[cx+hw,cy+e,cz+hh],[0,1,0],r,g,b,em);
    else pushQuad(staticMesh,[cx-hw,cy-e,cz-hh],[cx+hw,cy-e,cz-hh],[cx+hw,cy-e,cz+hh],[cx-hw,cy-e,cz+hh],[0,-1,0],r,g,b,em);
  }
  // ===== DYNAMIC MESH (player, enemies, pickups, props) =====
  var DYN_CAP=200000;
  var dynArr=new Float32Array(DYN_CAP);
  var dynLen=0;
  var dynBuf=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,dynBuf);
  gl.bufferData(gl.ARRAY_BUFFER,dynArr.byteLength,gl.DYNAMIC_DRAW);
  function dynQuad(p1,p2,p3,p4,n,r,g,b,em,mat){
    if(dynLen+66>DYN_CAP)return;
    mat=mat||0;
    var pts=[p1,p2,p3,p1,p3,p4];
    for(var i=0;i<6;i++){
      var p=pts[i];
      dynArr[dynLen++]=p[0];dynArr[dynLen++]=p[1];dynArr[dynLen++]=p[2];
      dynArr[dynLen++]=n[0];dynArr[dynLen++]=n[1];dynArr[dynLen++]=n[2];
      dynArr[dynLen++]=r;dynArr[dynLen++]=g;dynArr[dynLen++]=b;dynArr[dynLen++]=em;
      dynArr[dynLen++]=mat;
    }
  }
  var _bc=new Array(8);for(var _i=0;_i<8;_i++)_bc[_i]=[0,0,0];
  // Rotated box: center, half-sizes, yaw(z) + pitch(x) + roll(y). R = Rz*Rx*Ry.
  function dynBoxRot(cx,cy,cz,hx,hy,hz,yaw,pitch,roll,col,em){
    var _m=col[3]||0;
    var cy_=Math.cos(yaw),sy_=Math.sin(yaw);
    var cp_=Math.cos(pitch||0),sp_=Math.sin(pitch||0);
    var cr_=Math.cos(roll||0),sr_=Math.sin(roll||0);
    var r00=cy_*cr_-sy_*sp_*sr_, r01=-sy_*cp_, r02=cy_*sr_+sy_*sp_*cr_;
    var r10=sy_*cr_+cy_*sp_*sr_, r11=cy_*cp_,  r12=sy_*sr_-cy_*sp_*cr_;
    var r20=-cp_*sr_,            r21=sp_,      r22=cp_*cr_;
    function tf(x,y,z,o){
      o[0]=cx+r00*x+r01*y+r02*z;
      o[1]=cy+r10*x+r11*y+r12*z;
      o[2]=cz+r20*x+r21*y+r22*z;
    }
    tf(-hx,-hy,-hz,_bc[0]);tf(hx,-hy,-hz,_bc[1]);tf(hx,hy,-hz,_bc[2]);tf(-hx,hy,-hz,_bc[3]);
    tf(-hx,-hy,hz,_bc[4]);tf(hx,-hy,hz,_bc[5]);tf(hx,hy,hz,_bc[6]);tf(-hx,hy,hz,_bc[7]);
    var r=col[0],g=col[1],b=col[2];
    var nE=[r00,r10,r20],nW=[-r00,-r10,-r20];
    var nN=[r01,r11,r21],nS=[-r01,-r11,-r21];
    var nU=[r02,r12,r22],nD=[-r02,-r12,-r22];
    dynQuad(_bc[4],_bc[5],_bc[6],_bc[7],nU,r,g,b,em,_m);
    dynQuad(_bc[3],_bc[2],_bc[1],_bc[0],nD,r*0.5,g*0.5,b*0.5,em,_m);
    dynQuad(_bc[1],_bc[2],_bc[6],_bc[5],nE,r,g,b,em,_m);
    dynQuad(_bc[3],_bc[0],_bc[4],_bc[7],nW,r,g,b,em,_m);
    dynQuad(_bc[2],_bc[3],_bc[7],_bc[6],nN,r,g,b,em,_m);
    dynQuad(_bc[0],_bc[1],_bc[5],_bc[4],nS,r,g,b,em,_m);
  }

  // ===== BLEND MESH (particles, shadows, beams) =====
  var BL_CAP=28000;
  var blArr=new Float32Array(BL_CAP);
  var blLen=0;
  var blBuf=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,blBuf);
  gl.bufferData(gl.ARRAY_BUFFER,blArr.byteLength,gl.DYNAMIC_DRAW);
  function blVert(x,y,z,r,g,b,a){
    if(blLen+7>BL_CAP)return;
    blArr[blLen++]=x;blArr[blLen++]=y;blArr[blLen++]=z;
    blArr[blLen++]=r;blArr[blLen++]=g;blArr[blLen++]=b;blArr[blLen++]=a;
  }
  function blQuad(p1,p2,p3,p4,r,g,b,a){
    blVert(p1[0],p1[1],p1[2],r,g,b,a);blVert(p2[0],p2[1],p2[2],r,g,b,a);blVert(p3[0],p3[1],p3[2],r,g,b,a);
    blVert(p1[0],p1[1],p1[2],r,g,b,a);blVert(p3[0],p3[1],p3[2],r,g,b,a);blVert(p4[0],p4[1],p4[2],r,g,b,a);
  }
  var _camRight=[1,0,0],_camUp=[0,0,1];
  function blBillboard(x,y,z,size,r,g,b,a){
    var rx=_camRight[0]*size,ry=_camRight[1]*size,rz=_camRight[2]*size;
    var ux=_camUp[0]*size,uy=_camUp[1]*size,uz=_camUp[2]*size;
    blQuad([x-rx-ux,y-ry-uy,z-rz-uz],[x+rx-ux,y+ry-uy,z+rz-uz],
           [x+rx+ux,y+ry+uy,z+rz+uz],[x-rx+ux,y-ry+uy,z-rz+uz],r,g,b,a);
  }
  function blShadow(x,y,z,size,a){
    var e=0.03;
    blQuad([x-size,y-size,z+e],[x+size,y-size,z+e],[x+size,y+size,z+e],[x-size,y+size,z+e],0,0,0.02,a);
  }
  function blBeam(x0,y0,z0,x1,y1,z1,th,r,g,b,a){
    var dx=x1-x0,dy=y1-y0,dz=z1-z0;
    var sx=dy*_camUp[2]-dz*_camUp[1],sy=dz*_camUp[0]-dx*_camUp[2],sz=dx*_camUp[1]-dy*_camUp[0];
    var sl=Math.sqrt(sx*sx+sy*sy+sz*sz)||1;sx=sx/sl*th;sy=sy/sl*th;sz=sz/sl*th;
    blQuad([x0-sx,y0-sy,z0-sz],[x1-sx,y1-sy,z1-sz],[x1+sx,y1+sy,z1+sz],[x0+sx,y0+sy,z0+sz],r,g,b,a);
  }

  // ===== WORLD QUERIES =====
  function pointInSolid(x,y,z,pad){
    pad=pad||0;
    for(var i=0;i<solids.length;i++){
      var s=solids[i];
      if(x>s.x-s.w/2-pad&&x<s.x+s.w/2+pad&&
         y>s.y-s.d/2-pad&&y<s.y+s.d/2+pad&&
         z>s.z0-pad&&z<s.top+pad)return s;
    }
    return null;
  }
  function groundTopAt(x,y,z,r){
    r=r||0;
    var best=-999;
    for(var i=0;i<solids.length;i++){
      var s=solids[i];
      if(x>s.x-s.w/2-r&&x<s.x+s.w/2+r&&y>s.y-s.d/2-r&&y<s.y+s.d/2+r){
        if(s.top<=z+0.05&&s.top>best)best=s.top;
      }
    }
    return best;
  }
  // Line-of-sight: march a ray, true if it reaches target without hitting a solid
  function hasLOS(x0,y0,z0,x1,y1,z1){
    var dx=x1-x0,dy=y1-y0,dz=z1-z0;
    var d=Math.sqrt(dx*dx+dy*dy+dz*dz);
    if(d<0.01)return true;
    var steps=Math.ceil(d/0.4);
    for(var i=1;i<steps;i++){
      var t=i/steps;
      if(pointInSolid(x0+dx*t,y0+dy*t,z0+dz*t,-0.02))return false;
    }
    return true;
  }
  // Pull camera in so it never clips inside geometry
  function cameraClip(px,py,pz,tx,ty,tz){
    var dx=tx-px,dy=ty-py,dz=tz-pz;
    var d=Math.sqrt(dx*dx+dy*dy+dz*dz);
    var steps=Math.ceil(d/0.15);
    for(var i=1;i<=steps;i++){
      var t=i/steps;
      if(pointInSolid(px+dx*t,py+dy*t,pz+dz*t,0.12)){
        var tt=Math.max(0,(i-1)/steps-0.04);
        return[px+dx*tt,py+dy*tt,pz+dz*tt];
      }
    }
    return[tx,ty,tz];
  }
  // ===== GAME STATE =====
  var gameState='title',stateTimer=0,pointerLocked=false;
  var isMobileKg=(('ontouchstart' in window)||navigator.maxTouchPoints>0)&&window.innerWidth<600;
  var zoneAnnounceT=0;
  var manualPause=false;
  var debugMode=false,debugFps=0,debugFrames=0,debugFpsTimer=0;
  var aiMode=false,aiTimer=0,aiState='route',aiWpIdx=0,aiStuck=0,aiLastX=0,aiLastY=0,aiAtkT=0;
  var aiClingT=0,aiClingTry=0;
  var aiProgWp=-1,aiBestWpd=1e9,aiNoProgT=0;
  var keys={w:false,a:false,s:false,d:false,sp:false,sneak:false,shift:false};
  var tapTimes={w:-1,a:-1,s:-1,d:-1};
  var mouseDown=false;
  var spJustPressed=false;
  var screenShake=0,dmgFlash=0,healFlash=0,hitStop=0,slowMo=0,fovKick=0;
  var aimMode=false; // kaginawa aim stance (first-person)
  var killMsgT=0,killMsgTxt='';
  var letterboxT=0,bossIntroT=0;
  var koban=0,kills=0,stealthKills=0,gameTime=0;
  var curZone=0; // 0 town, 1 gate, 2 keep
  var bossActive=false;

  // Movement tuning (TUNE: refined after design panel)
  var WALK_SPD=4.2,SNEAK_SPD=2.0,AIR_CTRL=8,FRICTION=10;
  var JUMP_VEL=6.8,COYOTE_T=0.12;
  var DASH_SPD=11,DASH_T=0.18,DASH_CD=1.0;
  var CLING_SPD=1.7; // wall-hug slide speed
  var ROLL_T=0.5,ROLL_SPD=7.6,ROLL_CD=0.75;      // crouch roll
  var CLING_STEP_SPD=9.0,CLING_STEP_T=0.18;       // quick step while clung
  var DTAP=0.28;                                  // double-tap window (s)
  var GRAP_SPD=16,GRAP_RNG=16;
  var GRAVITY_K=18; // design value

  // ===== PLAYER (third-person ninja) =====
  var player={
    x:0,y:0,z:0.5,vx:0,vy:0,vz:0,
    facing:0,            // body yaw (turns toward movement)
    hp:3,maxHp:3,iFrames:0,
    grounded:false,jumpCount:0,coyote:0,jumpCD:0,
    dashCD:0,dashT:0,dashDx:0,dashDy:0,
    grappling:false,grapX:0,grapY:0,grapZ:0,
    atkPhase:0,atkT:0,combo:0,        // melee state machine
    shuriken:5,maxShuriken:8,
    hasDouble:true,hasHook:true,      // full kit from the start
    cling:false,clingNx:0,clingNy:1,clingSolid:null,peek:0,clingRel:0,
    rollT:0,rollDir:'w',rollDx:0,rollDy:0,rollSpin:0,clingStepT:0,clingStepDir:1,
    runPhase:0,scarfT:0,fellFrom:0,landDip:0
  };
  // Camera (orbit behind player)
  var cam={yaw:0,pitch:-0.18,dist:4.4,x:0,y:0,z:2,lookZ:1.2};

  function resetPlayer(){
    player.x=0;player.y=-44;player.z=0.5;player.vx=0;player.vy=0;player.vz=0;
    player.facing=0;player.hp=player.maxHp;player.iFrames=0;
    player.grounded=false;player.jumpCount=0;player.coyote=0;player.jumpCD=0;
    player.dashCD=0;player.dashT=0;player.grappling=false;
    player.cling=false;player.peek=0;player.clingSolid=null;
    player.rollT=0;player.clingStepT=0;
    player.atkPhase=0;player.atkT=0;player.combo=0;
    player.shuriken=5;
    cam.yaw=0;cam.pitch=-0.18;
  }

  // ===== PARTICLES =====
  var particles=[];
  function spawnP(x,y,z,vx,vy,vz,life,size,r,g,b,grav){
    if(particles.length>340)return;
    particles.push({x:x,y:y,z:z,vx:vx,vy:vy,vz:vz,life:life,maxLife:life,size:size,r:r,g:g,b:b,grav:grav||0});
  }
  function sparks(x,y,z,n,col){
    for(var i=0;i<n;i++){
      var a=Math.random()*TAU,sp=1+Math.random()*4;
      spawnP(x,y,z,Math.cos(a)*sp,Math.sin(a)*sp,Math.random()*3,0.25+Math.random()*0.3,0.05,col[0],col[1],col[2],8);
    }
  }
  function bloodBurst(x,y,z){
    for(var i=0;i<14;i++){
      var a=Math.random()*TAU,e=Math.random()*PI-PI/2,sp=1.5+Math.random()*4;
      spawnP(x,y,z,Math.cos(a)*Math.cos(e)*sp,Math.sin(a)*Math.cos(e)*sp,Math.sin(e)*sp+1.5,
        0.35+Math.random()*0.4,0.07+Math.random()*0.08,0.75,0.08,0.12,10);
    }
  }
  function smokePoof(x,y,z){
    for(var i=0;i<16;i++){
      var a=Math.random()*TAU;
      spawnP(x+Math.cos(a)*0.2,y+Math.sin(a)*0.2,z+Math.random()*0.8,
        Math.cos(a)*1.6,Math.sin(a)*1.6,0.6+Math.random(),
        0.5+Math.random()*0.4,0.16,0.55,0.55,0.65,-1);
    }
  }
  function updateParticles(dt){
    for(var i=particles.length-1;i>=0;i--){
      var p=particles[i];
      p.life-=dt;
      if(p.life<=0){particles.splice(i,1);continue;}
      p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;
      p.vz-=p.grav*dt;
    }
  }
  // Sakura petals (ambient, recycled)
  var petals=[];
  (function(){
    for(var i=0;i<26;i++){
      petals.push({x:(rng()-0.5)*90,y:(rng()-0.5)*120,z:2+rng()*9,
        ph:rng()*TAU,spd:0.5+rng()*0.7});
    }
  })();
  function updatePetals(dt){
    for(var i=0;i<petals.length;i++){
      var pt=petals[i];
      pt.x+=Math.sin(_time*0.7+pt.ph)*0.8*dt+0.35*dt;
      pt.y+=Math.cos(_time*0.5+pt.ph)*0.5*dt;
      pt.z-=pt.spd*dt;
      pt.ph+=dt*2;
      if(pt.z<0){
        pt.z=8+rng()*5;
        pt.x=player.x+(rng()-0.5)*40;
        pt.y=player.y+(rng()-0.5)*40;
      }
    }
  }

  // ===== FLOATING TEXT (damage / pickups, HUD-projected) =====
  var floatTexts=[];
  function addFloat(x,y,z,txt,col,big){
    if(floatTexts.length>30)return;
    floatTexts.push({x:x,y:y,z:z,vz:1.5,txt:txt,life:0.9,col:col,big:big});
  }
  function updateFloats(dt){
    for(var i=floatTexts.length-1;i>=0;i--){
      var f=floatTexts[i];
      f.life-=dt;f.z+=f.vz*dt;f.vz*=0.92;
      if(f.life<=0)floatTexts.splice(i,1);
    }
  }

  // ===== PLAYER PHYSICS (GEKKO v2 lessons baked in) =====
  function resolvePhysics(dt){
    if(player.cling){
      updateCling(dt);
      if(player.cling){
        if(player.iFrames>0)player.iFrames-=dt;
        player.scarfT+=dt*1.5;
        return;
      }
    }
    var prevZ=player.z;
    player.vz-=GRAVITY*dt;

    // Input relative to CAMERA yaw — third-person movement
    var mx=0,my=0;
    var ca=cam.yaw;
    if(keys.w){mx+=Math.sin(ca);my+=Math.cos(ca);}
    if(keys.s){mx-=Math.sin(ca);my-=Math.cos(ca);}
    if(keys.a){mx-=Math.cos(ca);my+=Math.sin(ca);}
    if(keys.d){mx+=Math.cos(ca);my-=Math.sin(ca);}
    var ml=Math.sqrt(mx*mx+my*my);
    if(ml>0.01){mx/=ml;my/=ml;}
    var attacking=player.atkPhase>0;
    var accel=player.grounded?56:AIR_CTRL*3;
    if(attacking)accel*=0.25; // committed swings root you (mostly)
    player.vx+=mx*accel*dt;
    player.vy+=my*accel*dt;
    if(player.grounded&&ml<0.01){
      var f=Math.max(0,1-FRICTION*dt);
      player.vx*=f;player.vy*=f;
    }
    if(!player.grounded){player.vx*=Math.max(0,1-0.5*dt);player.vy*=Math.max(0,1-0.5*dt);}
    var hspd=Math.sqrt(player.vx*player.vx+player.vy*player.vy);
    var cap=(keys.sneak&&player.grounded?SNEAK_SPD:WALK_SPD)*(player.grounded?1:1.1);
    if(player.dashT<=0&&player.rollT<=0&&!player.grappling&&hspd>cap){
      player.vx*=cap/hspd;player.vy*=cap/hspd;
    }
    // Body turns toward movement (the third-person feel)
    if(ml>0.01&&player.dashT<=0&&player.rollT<=0&&!attacking){
      var want=Math.atan2(mx,my);
      player.facing=angLerp(player.facing,want,Math.min(1,14*dt));
    }
    if(ml>0.01&&player.grounded)player.runPhase+=dt*hspd*2.2;

    // Dash
    if(player.dashT>0){
      player.dashT-=dt;
      player.vx=player.dashDx*DASH_SPD;
      player.vy=player.dashDy*DASH_SPD;
      player.vz=0;
    }
    if(player.dashCD>0)player.dashCD-=dt;

    // Roll (crouch dodge): drives velocity like a dash, with a tumble
    if(player.rollT>0){
      player.rollT-=dt;player.rollSpin+=dt;
      player.vx=player.rollDx*ROLL_SPD;player.vy=player.rollDy*ROLL_SPD;player.vz=0;
    }

    // Mantle assist after a grapple release
    if(player.vaultT>0){
      player.vaultT-=dt;
      if(player.grounded||player.grappling)player.vaultT=0;
      else{
        var vxd=player.vaultX-player.x,vyd=player.vaultY-player.y;
        var vl=Math.sqrt(vxd*vxd+vyd*vyd);
        if(vl>0.05){
          player.vx=vxd/vl*1.7;
          player.vy=vyd/vl*1.7;
        }
      }
    }

    // Jump / double jump
    if(player.jumpCD>0)player.jumpCD-=dt;
    if(player.grounded)player.coyote=COYOTE_T;
    else if(player.coyote>0)player.coyote-=dt;
    if(spJustPressed){
      spJustPressed=false;
      var canGround=(player.grounded||player.coyote>0)&&player.jumpCD<=0;
      var maxJumps=player.hasDouble?2:1;
      var canAir=!player.grounded&&player.coyote<=0&&player.jumpCount<maxJumps&&player.jumpCD<=0;
      if(canGround){
        player.vz=JUMP_VEL;player.jumpCD=0.15;player.jumpCount=1;player.coyote=0;
        player.grounded=false;
        playSound('jump');
      }else if(canAir){
        player.vz=JUMP_VEL*0.85;player.jumpCD=0.15;player.jumpCount++;
        smokePoofSmall(player.x,player.y,player.z+0.1);
        playSound('doublejump');
      }
    }

    // Grapple (kaginawa)
    if(player.grappling){
      var gx=player.grapX-player.x,gy=player.grapY-player.y,gz=player.grapZ-(player.z+1.0);
      var gd=Math.sqrt(gx*gx+gy*gy+gz*gz);
      if(gd<1.2){
        releaseGrapple();
      }else{
        player.vx=lerp(player.vx,gx/gd*GRAP_SPD,8*dt);
        player.vy=lerp(player.vy,gy/gd*GRAP_SPD,8*dt);
        player.vz=lerp(player.vz,gz/gd*GRAP_SPD,8*dt);
        // stall watchdog: rope snagged on geometry — let go instead of hanging
        if(gd>player.grapLastD-0.02)player.grapStall+=dt;
        else player.grapStall=0;
        player.grapLastD=gd;
        if(player.grapStall>0.4)releaseGrapple();
      }
    }

    // Integrate
    player.x+=player.vx*dt;
    player.y+=player.vy*dt;
    player.z+=player.vz*dt;

    // XY collision
    var xyPushed=false;
    var feet=player.z+0.05,head=player.z+PLAYER_H;
    for(var i=0;i<solids.length;i++){
      var s=solids[i];
      if(feet>=s.top-0.01||head<=s.z0)continue;
      var dx2=player.x-s.x,dy2=player.y-s.y;
      var ox2=s.w/2+PLAYER_R-Math.abs(dx2),oy2=s.d/2+PLAYER_R-Math.abs(dy2);
      if(ox2>0&&oy2>0){
        // step-up: low ledges (stairs, stones) are climbed by walking
        var rise=s.top-player.z;
        if(rise>0&&rise<=0.55&&player.vz<=0.1&&
           !pointInSolid(player.x,player.y,s.top+PLAYER_H*0.6,PLAYER_R*0.5)){
          player.z=s.top;player.grounded=true;player.jumpCount=0;
          continue;
        }
        if(ox2<oy2){player.x+=dx2>0?ox2:-ox2;player.vx=0;}
        else{player.y+=dy2>0?oy2:-oy2;player.vy=0;}
        xyPushed=true;
      }
    }

    // Z collision: land on highest crossed top
    var wasGrounded=player.grounded;
    player.grounded=false;
    if(player.vz<=0){
      var bestTop=-999;
      for(var j=0;j<solids.length;j++){
        var s2=solids[j];
        if(Math.abs(player.x-s2.x)<s2.w/2+PLAYER_R*0.7&&
           Math.abs(player.y-s2.y)<s2.d/2+PLAYER_R*0.7){
          if(prevZ>=s2.top-0.2&&player.z<=s2.top+0.02&&s2.top>bestTop)bestTop=s2.top;
        }
      }
      if(bestTop>-999){
        player.z=bestTop;
        if(!wasGrounded&&player.vz<-9){player.landDip=1;playSound('land');}
        player.vz=0;
        player.grounded=true;
        player.jumpCount=0;
        player.fellFrom=player.z;
      }
      if(!player.grounded&&xyPushed&&player.vz<=0){
        var sIn=pointInSolid(player.x,player.y,player.z+0.05,PLAYER_R*0.5);
        if(sIn&&player.z>=sIn.top-0.2){
          player.z=sIn.top;player.vz=0;player.grounded=true;player.jumpCount=0;
        }
      }
    }else{
      var sUp=pointInSolid(player.x,player.y,player.z+PLAYER_H,PLAYER_R*0.5);
      if(sUp&&player.z+PLAYER_H>sUp.z0&&player.z<sUp.z0){
        player.z=sUp.z0-PLAYER_H;player.vz=Math.min(player.vz,0);
      }
    }
    if(!player.grounded&&player.vz>=0)player.fellFrom=Math.max(player.fellFrom,player.z);

    // Fell into the moat / void
    if(player.z<VOID_Z){
      player.hp-=1;
      dmgFlash=1;screenShake=4;
      playSound('hurt');
      if(player.hp<=0){player.hp=0;killPlayer('the depths claimed you');return;}
      player.x=checkpoint[0];player.y=checkpoint[1];player.z=checkpoint[2]+0.5;
      player.vx=player.vy=player.vz=0;
      player.grappling=false;player.dashT=0;player.atkPhase=0;player.combo=0;
      player.iFrames=1.2;
    }

    if(player.iFrames>0)player.iFrames-=dt;
    if(player.landDip>0)player.landDip=Math.max(0,player.landDip-4*dt);
    player.scarfT+=dt*(2+hspd*0.8);

    // uguisubari: nightingale boards chirp under a careless step
    if(player.grounded){
      var hs2=Math.sqrt(player.vx*player.vx+player.vy*player.vy);
      for(var sq=0;sq<squeaks.length;sq++){
        var sb=squeaks[sq];
        if(sb.cd>0){sb.cd-=dt;continue;}
        if(hs2>SNEAK_SPD+0.3&&Math.abs(player.x-sb.x)<sb.w/2&&Math.abs(player.y-sb.y)<sb.d/2&&Math.abs(player.z-sb.z)<0.4){
          sb.cd=0.7;
          playSound('squeak');
          addFloat(player.x,player.y,player.z+1.6,'KIRI…',[0.95,0.8,0.4]);
          noisePing(player.x,player.y,player.z,9);
        }
      }
    }
  }
  function smokePoofSmall(x,y,z){
    for(var i=0;i<8;i++){
      var a=i/8*TAU;
      spawnP(x+Math.cos(a)*0.2,y+Math.sin(a)*0.2,z,Math.cos(a)*2,Math.sin(a)*2,0.4,0.3,0.09,0.6,0.6,0.7,0);
    }
  }
  var checkpoint=[0,-44,0];

  // Grapple release: read the platform under the anchor and vault onto it.
  // Handles anchors above roofs, wall lips that pin the climb, everything.
  function releaseGrapple(){
    player.grappling=false;
    var pTop=-999;
    if(player.grapTop!==undefined&&player.grapTop>-900&&player.grapTop-player.grapZ<2.6)pTop=player.grapTop;
    if(pTop<-900)pTop=groundTopAt(player.grapX,player.grapY,player.grapZ+0.6,0.5);
    var dx=player.grapX-player.x,dy=player.grapY-player.y;
    var dl=Math.sqrt(dx*dx+dy*dy);
    if(pTop>-999){
      var need=Math.max(0.3,pTop+0.45-player.z);
      player.vz=Math.min(9,Math.sqrt(2*GRAVITY*need)+0.8);
      if(dl>0.05){player.vx=dx/dl*1.7;player.vy=dy/dl*1.7;}
      else{player.vx*=0.2;player.vy*=0.2;}
      // mantle: keep nudging toward the ledge while airborne, so a slab
      // side-face zeroing our velocity can't strand us a hair short
      player.vaultT=0.8;player.vaultX=player.grapX;player.vaultY=player.grapY;
    }else{
      player.vx*=0.25;player.vy*=0.25;
      player.vz=Math.max(player.vz*0.3,3.0);
    }
  }

  // ===== KABE-HARITSUKI (wall cling + corner peek) =====
  function findClingWall(){
    if(!player.grounded)return null;
    var dirs=[[1,0],[-1,0],[0,1],[0,-1]];
    var fx=Math.sin(player.facing),fy=Math.cos(player.facing);
    dirs.sort(function(a,b){return (b[0]*fx+b[1]*fy)-(a[0]*fx+a[1]*fy);});
    for(var i=0;i<4;i++){
      var d=dirs[i];
      for(var q=0;q<2;q++){ // near and far probe — forgiving reach
        var reach=PLAYER_R+(q?0.62:0.34);
        var s=pointInSolid(player.x+d[0]*reach,player.y+d[1]*reach,player.z+0.7,0.02);
        if(s&&s.top>=player.z+1.35&&s.z0<=player.z+0.3){
          return{nx:-d[0],ny:-d[1],solid:s};
        }
      }
    }
    return null;
  }
  function enterCling(){
    if(player.grappling||player.dashT>0||player.rollT>0||player.atkPhase>0||aimMode)return false;
    var w=findClingWall();
    if(!w)return false;
    player.cling=true;
    player.clingNx=w.nx;player.clingNy=w.ny;player.clingSolid=w.solid;
    player.peek=0;player.clingRel=0;player.rollT=0;player.clingStepT=0;
    keys.sneak=false;
    var s=w.solid;
    if(w.nx>0)player.x=s.x+s.w/2+PLAYER_R+0.06;
    else if(w.nx<0)player.x=s.x-s.w/2-PLAYER_R-0.06;
    if(w.ny>0)player.y=s.y+s.d/2+PLAYER_R+0.06;
    else if(w.ny<0)player.y=s.y-s.d/2-PLAYER_R-0.06;
    player.vx=player.vy=player.vz=0;
    player.facing=Math.atan2(w.nx,w.ny); // back against the wall
    playSound('cling');
    return true;
  }
  function toggleCling(){ // AI + test hook
    if(gameState!=='playing')return;
    if(player.cling){releaseCling();return;}
    if(!enterCling())playSound('grapfail');
  }
  // Shift: cling if a wall is right there, otherwise it is just a crouch
  function onShiftPress(){
    if(gameState!=='playing')return;
    if(player.cling){releaseCling();return;}
    enterCling(); // silent no-op when there is no wall
  }
  function releaseCling(){
    player.cling=false;player.peek=0;player.clingSolid=null;player.clingStepT=0;
    keys.sneak=keys.shift;
    playSound('aimoff');
  }
  function wallBehindAt(x,y){
    return pointInSolid(x-player.clingNx*(PLAYER_R+0.22),y-player.clingNy*(PLAYER_R+0.22),player.z+0.7,0.02);
  }
  function updateCling(dt){
    if(!wallBehindAt(player.x,player.y)&&Math.abs(player.peek)<0.05){releaseCling();return;}
    var g=groundTopAt(player.x,player.y,player.z+0.3,PLAYER_R*0.7);
    if(g<-900){releaseCling();return;}
    player.z=g;player.grounded=true;player.jumpCount=0;
    var mx=0,my=0,ca=cam.yaw;
    if(keys.w){mx+=Math.sin(ca);my+=Math.cos(ca);}
    if(keys.s){mx-=Math.sin(ca);my-=Math.cos(ca);}
    if(keys.a){mx-=Math.cos(ca);my+=Math.sin(ca);}
    if(keys.d){mx+=Math.cos(ca);my-=Math.sin(ca);}
    var tx=-player.clingNy,ty=player.clingNx;
    var lat=mx*tx+my*ty;
    var away=mx*player.clingNx+my*player.clingNy;
    // quick lateral step (double-tap along the wall)
    if(player.clingStepT>0){
      player.clingStepT-=dt;
      var ss=CLING_STEP_SPD*dt*player.clingStepDir;
      var sx=player.x+tx*ss,sy=player.y+ty*ss;
      if(wallBehindAt(sx,sy)&&!pointInSolid(sx+tx*player.clingStepDir*PLAYER_R,sy+ty*player.clingStepDir*PLAYER_R,player.z+0.7,0)&&groundTopAt(sx,sy,player.z+0.3,PLAYER_R*0.7)>-900){
        player.x=sx;player.y=sy;player.runPhase+=dt*8;
      }else player.clingStepT=0;
      player.vx=player.vy=0;
      return;
    }
    if(away>0.55)player.clingRel+=dt;else player.clingRel=0;
    if(player.clingRel>0.18){releaseCling();return;}
    if(spJustPressed){ // hop off the wall
      spJustPressed=false;
      releaseCling();
      player.vx=player.clingNx*2.2;player.vy=player.clingNy*2.2;player.vz=JUMP_VEL*0.85;
      player.grounded=false;playSound('jump');
      return;
    }
    if(Math.abs(lat)>0.25){
      var dirS=lat>0?1:-1;
      var step=CLING_SPD*dt*dirS;
      var nx2=player.x+tx*step,ny2=player.y+ty*step;
      if(wallBehindAt(nx2,ny2)&&
         !pointInSolid(nx2+tx*dirS*PLAYER_R,ny2+ty*dirS*PLAYER_R,player.z+0.7,0)&&
         groundTopAt(nx2,ny2,player.z+0.3,PLAYER_R*0.7)>-900){
        player.x=nx2;player.y=ny2;
        player.peek=lerp(player.peek,0,Math.min(1,10*dt));
        player.runPhase+=dt*2.4;
      }else{
        // wall ends here: lean out and peek past the corner
        player.peek=lerp(player.peek,dirS,Math.min(1,6*dt));
      }
    }else{
      player.peek=lerp(player.peek,0,Math.min(1,8*dt));
    }
    player.vx=player.vy=0;
  }
  // noise events (nightingale floors, knocked objects) pull guards in
  function noisePing(x,y,z,r){
    for(var i=0;i<enemies.length;i++){
      var e=enemies[i];
      if(e.dead||e.alerted||e.def.boss)continue;
      if(dist3d(e.x,e.y,e.z,x,y,z)>r||Math.abs(e.z-z)>3)continue;
      e.susp+=0.7;
      e.facing=Math.atan2(x-e.x,y-e.y);
      e.lastSeen=[x,y];
      if(e.susp>=1)alertEnemy(e);
    }
  }

  function damagePlayer(dmg,kx,ky){
    if(player.iFrames>0||player.dashT>0||gameState!=='playing')return;
    player.hp-=dmg;
    player.iFrames=0.5;
    dmgFlash=1;
    screenShake=Math.max(screenShake,3);
    if(kx||ky){player.vx+=kx;player.vy+=ky;}
    playSound('hurt');
    if(player.hp<=0){player.hp=0;killPlayer('');}
  }
  function killPlayer(why){
    aimMode=false;
    player.cling=false;player.peek=0;player.rollT=0;player.clingStepT=0;
    gameState='dead';stateTimer=1.2;
    stopMusic();
    playSound('die');
    _deadStats.innerHTML='KILLS <b>'+kills+'</b> ('+stealthKills+' silent)<br>KOBAN <b>'+koban+'</b> / ZONE <b>'+(curZone+1)+'/4</b>';
    if(pointerLocked)document.exitPointerLock();
    updateOverlay();
  }
  // ===== TIME SCALE (hit-stop) =====
  var timeScale=1,hitStopT=0;
  function hitStopFor(sec){hitStopT=Math.max(hitStopT,sec);}

  // ===== COMBAT: 3-hit katana combo =====
  // atkPhase: 0 idle, 1 windup, 2 active, 3 recover
  var ATK={ // per combo step [windup, active, recover, dmg]
    1:{wind:0.08,act:0.10,rec:0.22,dmg:1},
    2:{wind:0.08,act:0.10,rec:0.25,dmg:1},
    3:{wind:0.10,act:0.12,rec:0.45,dmg:2}
  };
  var atkBuffer=0; // input buffer for next combo step
  var comboResetT=0;
  var slashTrails=[]; // {x,y,z,yaw,roll,life}

  function tryAttack(){
    if(gameState!=='playing')return;
    if(player.cling){player.cling=false;player.peek=0;player.clingSolid=null;} // strike out of cover
    if(player.atkPhase===0){
      // stealth kill check first
      var sk=stealthTarget();
      if(sk){doStealthKill(sk);return;}
      startSwing(1);
    }else{
      atkBuffer=0.3;
    }
  }
  function startSwing(step){
    player.combo=step;
    player.atkPhase=1;
    comboResetT=0; // don't let the stale reset timer zero the combo mid-swing
    player.atkT=ATK[step].wind;
    // soft-aim: turn toward nearest enemy in front-ish
    var best=null,bd=3.2;
    for(var i=0;i<enemies.length;i++){
      var e=enemies[i];if(e.dead)continue;
      var d=dist2d(e.x,e.y,player.x,player.y);
      if(d<bd){bd=d;best=e;}
    }
    if(best)player.facing=Math.atan2(best.x-player.x,best.y-player.y);
    if(step===3){ // lunge
      player.vx+=Math.sin(player.facing)*6;
      player.vy+=Math.cos(player.facing)*6;
    }
    playSound('swing'+step);
  }
  function updateAttack(dt){
    if(atkBuffer>0)atkBuffer-=dt;
    if(comboResetT>0){comboResetT-=dt;if(comboResetT<=0)player.combo=0;}
    if(player.atkPhase===0)return;
    player.atkT-=dt;
    var A=ATK[player.combo];
    if(!A){player.atkPhase=0;player.combo=0;return;} // safety: never index a missing step
    if(player.atkPhase===1&&player.atkT<=0){
      player.atkPhase=2;player.atkT=A.act;
      meleeHitCheck(A.dmg,player.combo===3);
      // slash trail
      slashTrails.push({x:player.x+Math.sin(player.facing)*0.7,y:player.y+Math.cos(player.facing)*0.7,
        z:player.z+0.9,yaw:-player.facing,roll:(player.combo%2?0.7:-0.7),life:0.16,maxLife:0.16,spin:player.combo===3});
    }else if(player.atkPhase===2&&player.atkT<=0){
      player.atkPhase=3;player.atkT=A.rec;
    }else if(player.atkPhase===3){
      // next combo input accepted in latter half of recovery
      if(atkBuffer>0&&player.atkT<=A.rec*0.5&&player.combo<3){
        atkBuffer=0;
        startSwing(player.combo+1);
        return;
      }
      if(player.atkT<=0){
        player.atkPhase=0;
        comboResetT=0.8;
      }
    }
  }
  function meleeHitCheck(dmg,spin){
    var hitAny=false;
    for(var i=0;i<enemies.length;i++){
      var e=enemies[i];if(e.dead)continue;
      var d=dist2d(e.x,e.y,player.x,player.y);
      var zOk=Math.abs((e.z+e.def.h*0.5)-(player.z+0.8))<1.5;
      if(!zOk)continue;
      var inRange;
      if(spin)inRange=d<1.5;
      else{
        if(d>1.8)continue;
        var ang=Math.atan2(e.x-player.x,e.y-player.y);
        var da=ang-player.facing;
        while(da>PI)da-=TAU;while(da<-PI)da+=TAU;
        inRange=Math.abs(da)<1.05;
      }
      if(inRange){
        damageEnemy(e,dmg,false);
        hitAny=true;
      }
    }
    // lever interaction via slash
    for(var l=0;l<levers.length;l++){
      var lv=levers[l];
      if(!lv.on&&dist3d(lv.x,lv.y,lv.z,player.x,player.y,player.z+0.8)<1.4){
        lv.on=true;
        onLever(lv);
        hitAny=true;
      }
    }
    if(hitAny){
      hitStopFor(player.combo===3?0.08:0.04);
      screenShake=Math.max(screenShake,player.combo===3?2:1.2);
    }
  }

  // ===== STEALTH KILL =====
  function stealthTarget(){
    for(var i=0;i<enemies.length;i++){
      var e=enemies[i];
      if(e.dead||e.alerted||e.def.noStealth)continue;
      var d=dist2d(e.x,e.y,player.x,player.y);
      if(d>1.6)continue;
      if(Math.abs(e.z-player.z)>1.2)continue;
      // behind: player within ±120° of enemy's back
      var toP=Math.atan2(player.x-e.x,player.y-e.y);
      var back=e.facing+PI;
      var da=toP-back;
      while(da>PI)da-=TAU;while(da<-PI)da+=TAU;
      if(Math.abs(da)<2.1)return e;
    }
    return null;
  }
  function doStealthKill(e){
    hitStopFor(0.25);
    // snap behind target
    player.x=e.x-Math.sin(e.facing)*0.6;
    player.y=e.y-Math.cos(e.facing)*0.6;
    player.facing=e.facing;
    stealthKills++;
    sekkenFlash=0.35; // ink-dark flash with single white slash line
    killEnemy(e,true);
    playSound('stealthkill');
  }
  var sekkenFlash=0;

  // ===== SHURIKEN =====
  var shurikens=[];
  var shuCD=0;
  function tryShuriken(){
    if(gameState!=='playing'||shuCD>0||player.shuriken<=0)return;
    shuCD=0.4;
    player.shuriken--;
    // aim along camera forward, soft-aimed at nearest enemy near reticle
    var fa=cam.yaw,fp=cam.pitch;
    var best=null,bd=0.45;
    for(var i=0;i<enemies.length;i++){
      var e=enemies[i];if(e.dead)continue;
      var dx=e.x-player.x,dy=e.y-player.y,dz=(e.z+e.def.h*0.6)-(player.z+1.0);
      var hd=Math.sqrt(dx*dx+dy*dy);
      if(hd>20)continue;
      var ang=Math.atan2(dx,dy);
      var da=ang-fa;while(da>PI)da-=TAU;while(da<-PI)da+=TAU;
      if(Math.abs(da)<bd){bd=Math.abs(da);best=e;}
    }
    var dx2,dy2,dz2;
    if(best){
      dx2=best.x-player.x;dy2=best.y-player.y;dz2=(best.z+best.def.h*0.6)-(player.z+1.0);
      var l=Math.sqrt(dx2*dx2+dy2*dy2+dz2*dz2);dx2/=l;dy2/=l;dz2/=l;
    }else{
      dx2=Math.sin(fa)*Math.cos(fp);dy2=Math.cos(fa)*Math.cos(fp);dz2=Math.sin(fp);
    }
    shurikens.push({x:player.x+dx2*0.5,y:player.y+dy2*0.5,z:player.z+1.0,
      dx:dx2,dy:dy2,dz:dz2,dist:0,spin:0});
    player.facing=Math.atan2(dx2,dy2);
    playSound('shuriken');
  }
  function updateShurikens(dt){
    for(var i=shurikens.length-1;i>=0;i--){
      var sh=shurikens[i];
      var step=30*dt;
      sh.x+=sh.dx*step;sh.y+=sh.dy*step;sh.z+=sh.dz*step;
      sh.dist+=step;sh.spin+=dt*30;
      if(sh.dist>20||pointInSolid(sh.x,sh.y,sh.z)){
        sparks(sh.x,sh.y,sh.z,3,[0.8,0.8,0.9]);
        shurikens.splice(i,1);continue;
      }
      var hit=false;
      // lanterns can be snuffed
      for(var ln=0;ln<lanterns.length;ln++){
        var la=lanterns[ln];
        if(la.lit&&dist3d(sh.x,sh.y,sh.z,la.x,la.y,la.z)<0.5){
          la.lit=false;
          playSound('snuff');
          sparks(la.x,la.y,la.z,5,[1,0.6,0.3]);
          shurikens.splice(i,1);hit=true;break;
        }
      }
      if(hit)continue;
      for(var ei=0;ei<enemies.length;ei++){
        var e=enemies[ei];if(e.dead)continue;
        if(Math.abs(sh.x-e.x)<0.5&&Math.abs(sh.y-e.y)<0.5&&sh.z>e.z&&sh.z<e.z+e.def.h+0.3){
          if(!e.alerted&&!e.def.noStealth){
            stealthKills++;
            killEnemy(e,true);
            playSound('stealthkill');
          }else{
            damageEnemy(e,1,true);
          }
          shurikens.splice(i,1);hit=true;break;
        }
      }
    }
    if(shuCD>0)shuCD-=dt;
  }

  // ===== KAGINAWA (grappling hook) =====
  var anchors=[]; // gold markers — now decorative route hints for the free-aim hook
  var grapCD=0;
  function toggleAim(){
    if(gameState!=='playing'||player.cling)return;
    if(player.grappling){player.grappling=false;return;} // E mid-pull lets go
    aimMode=!aimMode;
    playSound(aimMode?'aimon':'aimoff');
  }
  // March a ray from the eyes along the camera; return hit point + solid
  function aimRay(){
    var fa=cam.yaw,fp=cam.pitch;
    var dx=Math.sin(fa)*Math.cos(fp),dy=Math.cos(fa)*Math.cos(fp),dz=Math.sin(fp);
    var x=player.x,y=player.y,z=player.z+1.45;
    var step=0.2;
    for(var t=0.6;t<GRAP_RNG;t+=step){
      var px=x+dx*t,py=y+dy*t,pz=z+dz*t;
      var hit=pointInSolid(px,py,pz,0.04);
      if(hit)return{x:px,y:py,z:pz,solid:hit,dist:t};
    }
    return null;
  }
  function fireGrapple(){
    if(!aimMode||gameState!=='playing'||grapCD>0)return;
    var hit=aimRay();
    if(hit){
      player.grappling=true;
      player.grapX=hit.x;player.grapY=hit.y;player.grapZ=hit.z;
      player.grapTop=hit.solid.top;
      player.grapLastD=999;player.grapStall=0;
      grapCD=1.2;
      aimMode=false;
      playSound('grapple');
    }else{
      playSound('grapfail');
    }
  }

  // ===== INTERACTABLES =====
  var pickups=[];   // {x,y,z,kind:'koban'|'onigiri'|'scroll1'|'scroll2'|'shubox',t}
  var levers=[];    // {x,y,z,on,gateIdx}
  var gates=[];     // solid indices to remove when opened
  var jizos=[];     // checkpoints {x,y,z,used}
  var lanterns=[];  // {x,y,z,lit,id} — drawn dynamically, feed light pool
  var squeaks=[];   // uguisubari boards {x,y,z,w,d,cd}
  var exitGate=null; // {x,y,zMin..} region triggering zone transition
  var hintTrigs=[];  // one-shot tutorial hints {y, msg}
  var fireflies=[];  // ambient glow motes around water and blossoms
  function fireflyCluster(x,y,r,n,z){
    for(var i=0;i<n;i++)fireflies.push({cx:x,cy:y,r:r,z:(z||0.5)+rng()*1.2,ph:rng()*TAU,sp:0.3+rng()*0.5});
  }
  function updateHintTrigs(){
    for(var i=hintTrigs.length-1;i>=0;i--){
      if(player.y>hintTrigs[i].y){showHint(hintTrigs[i].msg);hintTrigs.splice(i,1);}
    }
  }

  function onLever(lv){
    playSound('lever');
    addFloat(lv.x,lv.y,lv.z+1,'OPEN',[0.9,0.85,0.6],true);
    if(gates[lv.gateIdx]){
      var g=gates[lv.gateIdx];
      var idx=solids.indexOf(g.solid);
      if(idx>=0)solids.splice(idx,1); // doors render dynamically — no rebake needed
      g.open=true;
      playSound('gateopen');
    }
  }
  function updatePickups(dt){
    for(var i=pickups.length-1;i>=0;i--){
      var pk=pickups[i];
      pk.t+=dt;
      var d=dist3d(player.x,player.y,player.z+0.6,pk.x,pk.y,pk.z);
      if(d<2.2&&(pk.kind==='koban'||pk.kind==='scroll1'||pk.kind==='scroll2'))
        {pk.x=lerp(pk.x,player.x,8*dt);pk.y=lerp(pk.y,player.y,8*dt);pk.z=lerp(pk.z,player.z+0.6,8*dt);}
      if(d<0.9){
        if(pk.kind==='koban'){koban++;playSound('coin');addFloat(pk.x,pk.y,pk.z+0.4,'+1',[0.95,0.8,0.35]);}
        else if(pk.kind==='onigiri'){
          if(player.hp>=player.maxHp)continue; // leave it if full
          player.hp=Math.min(player.maxHp,player.hp+1);healFlash=1;playSound('heal');
        }
        else if(pk.kind==='shubox'){player.shuriken=player.maxShuriken;playSound('coin');addFloat(pk.x,pk.y,pk.z+0.6,'SHURIKEN MAX',[0.8,0.85,0.95]);}
        else if(pk.kind==='scroll1'){player.hasDouble=true;playSound('scroll');showHint('NIDAN-TOBI — press SPACE in air');}
        else if(pk.kind==='scroll2'){player.hasHook=true;playSound('scroll');showHint('KAGINAWA — press E near gold anchors');}
        pickups.splice(i,1);
      }
    }
    // jizo checkpoints
    for(var j=0;j<jizos.length;j++){
      var jz=jizos[j];
      if(dist2d(jz.x,jz.y,player.x,player.y)<1.6&&Math.abs(jz.z-player.z)<1.5){
        if(checkpoint[0]!==jz.x||checkpoint[1]!==jz.y){
          checkpoint=[jz.x,jz.y,jz.z];
          if(player.hp<player.maxHp){player.hp=player.maxHp;healFlash=1;}
          playSound('jizo');
          addFloat(jz.x,jz.y,jz.z+1.4,'CHECKPOINT',[0.7,0.9,0.7]);
        }
      }
    }
  }
  var hintMsg='',hintT=0;
  function showHint(msg){hintMsg=msg;hintT=4;}

  function updateSlashTrails(dt){
    for(var i=slashTrails.length-1;i>=0;i--){
      slashTrails[i].life-=dt;
      if(slashTrails[i].life<=0)slashTrails.splice(i,1);
    }
  }
  // ===== ENEMIES =====
  // kinds: ashigaru (spear), archer, samurai (captain/elite), tono (boss)
  var E_DEFS={
    ashigaru:{hp:3,h:1.7,spd:1.5,chase:3.4,reach:1.7,atkCd:1.6,dmg:1,vision:8,col:[0.15,0.17,0.22],score:1},
    archer:{hp:2,h:1.65,spd:1.2,chase:2.2,reach:1.2,atkCd:2.0,dmg:1,vision:8,ranged:true,col:[0.20,0.16,0.13],score:1},
    samurai:{hp:6,h:1.9,spd:1.6,chase:3.8,reach:2.0,atkCd:1.9,dmg:1,vision:9,col:[0.28,0.10,0.12],noStealth:true,score:2},
    elite:{hp:4,h:1.9,spd:1.6,chase:3.8,reach:2.0,atkCd:1.9,dmg:1,vision:8,col:[0.28,0.10,0.12],score:2},
    tono:{hp:20,h:2.3,spd:1.8,chase:2.6,reach:2.4,atkCd:2.4,dmg:1,vision:99,col:[0.10,0.10,0.14],noStealth:true,boss:true,score:10}
  };
  var enemies=[];
  var corpses=[];
  var eProj=[]; // arrows / war fans
  var alertCount=0; // for the SHADOW rating

  function spawnEnemy(kind,x,y,z,opts){
    opts=opts||{};
    var def=E_DEFS[kind];
    enemies.push({
      kind:kind,def:def,x:x,y:y,z:z,vz:0,
      facing:opts.facing||0,
      hp:def.hp,maxHp:def.hp,
      patrol:opts.patrol||null,patIdx:0,patWait:0,  // [[x,y],[x,y]]
      home:[x,y],
      alerted:false,susp:0,loseT:0,
      atkT:1+Math.random(),atkPhase:0,atkAnimT:0,
      lantern:!!opts.lantern,
      flash:0,bob:Math.random()*TAU,
      // boss
      phase:1,bossAtk:0,bossT:2.0,teleT:0,
      dead:false
    });
  }
  function alertEnemy(e){
    if(e.dead||e.alerted)return;
    if(e.def.boss){e.alerted=true;e.loseT=9999;return;} // boss fights don't break the SHADOW rating
    e.alerted=true;e.susp=1;e.loseT=6;
    alertCount++;
    addFloat(e.x,e.y,e.z+e.def.h+0.4,'!',[1,0.2,0.15],true);
    playSound('alert');
    musicAlert=4; // push music to alert layer
    // shout: allies nearby join
    for(var i=0;i<enemies.length;i++){
      var o=enemies[i];
      if(o!==e&&!o.dead&&!o.alerted&&dist2d(o.x,o.y,e.x,e.y)<6){
        o.alerted=true;o.loseT=6;
      }
    }
  }
  function damageEnemy(e,dmg,fromRange){
    // backstab bonus on alerted/boss targets
    var toP=Math.atan2(player.x-e.x,player.y-e.y);
    var back=e.facing+PI;
    var da=toP-back;while(da>PI)da-=TAU;while(da<-PI)da+=TAU;
    if(!fromRange&&Math.abs(da)<2.1)dmg+=1; // behind: +1
    e.hp-=dmg;
    e.flash=0.15;
    bloodBurst(e.x,e.y,e.z+e.def.h*0.6);
    addFloat(e.x,e.y,e.z+e.def.h+0.3,String(dmg),[1,1,1]);
    playSound('hit');
    alertEnemy(e);
    if(!e.def.boss){
      // small knockback
      var kx=e.x-player.x,ky=e.y-player.y;
      var kl=Math.sqrt(kx*kx+ky*ky)||1;
      e.x+=kx/kl*0.25;e.y+=ky/kl*0.25;
    }
    if(e.hp<=0)killEnemy(e,false);
  }
  function killEnemy(e,silent){
    if(e.dead)return;
    e.dead=true;
    kills++;
    // the gate captain carries the key to the first gate
    if(e.kind==='samurai'&&curZone===1&&gates[0]&&!gates[0].open){
      var gi=solids.indexOf(gates[0].solid);
      if(gi>=0)solids.splice(gi,1);
      gates[0].open=true;
      addFloat(e.x,e.y,e.z+2,'GATE OPENS',[0.9,0.85,0.6],true);
      playSound('gateopen');
    }
    corpses.push({x:e.x,y:e.y,z:e.z,facing:e.facing,def:e.def,kind:e.kind,t:10,seen:false});
    // drops
    var n=silent?2:(Math.random()<0.6?1:0);
    for(var i=0;i<n;i++)pickups.push({kind:'koban',x:e.x+(Math.random()-0.5),y:e.y+(Math.random()-0.5),z:e.z+0.4,t:0});
    if(Math.random()<0.10)pickups.push({kind:'onigiri',x:e.x,y:e.y,z:e.z+0.3,t:0});
    if(Math.random()<0.30)pickups.push({kind:'koban',x:e.x,y:e.y,z:e.z+0.5,t:0});
    if(!silent){
      smokePoof(e.x,e.y,e.z);
      playSound('kill');
    }
    if(e.def.boss)winGame();
  }

  // vision factoring lanterns: lit lantern near player exposes; snuffed near enemy dims
  function visionRange(e){
    var v=e.def.vision+(e.lantern?2:0);
    for(var i=0;i<lanterns.length;i++){
      var la=lanterns[i];
      if(la.lit&&dist2d(la.x,la.y,player.x,player.y)<2.5){v*=1.5;break;}
    }
    for(var j=0;j<lanterns.length;j++){
      var lb=lanterns[j];
      if(!lb.lit&&dist2d(lb.x,lb.y,e.x,e.y)<4){v*=0.65;break;}
    }
    return v;
  }
  function canSeePlayer(e){
    var d=dist3d(e.x,e.y,e.z,player.x,player.y,player.z);
    if(d>visionRange(e))return false;
    if(player.cling&&d>visionRange(e)*(Math.abs(player.peek)>0.4?0.55:0.32))return false; // pressed flat into shadow
    var ang=Math.atan2(player.x-e.x,player.y-e.y);
    var da=ang-e.facing;
    while(da>PI)da-=TAU;while(da<-PI)da+=TAU;
    if(Math.abs(da)>0.79&&d>1.5)return false; // ~90° cone
    return hasLOS(e.x,e.y,e.z+e.def.h*0.85,player.x,player.y,player.z+0.7);
  }
  function hearsPlayer(e,dt){
    if(player.cling)return false; // a slow wall-hug makes no sound
    var hspd=Math.sqrt(player.vx*player.vx+player.vy*player.vy);
    if(hspd<0.4||!player.grounded)return false;
    var radius=player.dashT>0?9:(keys.sneak?1.5:6);
    return dist3d(e.x,e.y,e.z,player.x,player.y,player.z)<radius;
  }

  function updateEnemies(dt){
    for(var i=0;i<enemies.length;i++){
      var e=enemies[i];
      if(e.dead)continue;
      if(e.flash>0)e.flash-=dt;
      e.bob+=dt*2;
      if(e.def.boss){updateBoss(e,dt);continue;}

      // gravity / ground snap — and real falls where there is no floor
      var g=groundTopAt(e.x,e.y,e.z+0.5,0.3);
      if(g>-999){
        if(e.z>g+0.05){e.vz-=GRAVITY*dt;e.z+=e.vz*dt;if(e.z<g){e.z=g;e.vz=0;}}
        else e.z=g;
      }else{
        e.vz-=GRAVITY*dt;e.z+=e.vz*dt;
        if(e.z<VOID_Z){e.dead=true;continue;} // lost to the moat
      }
      // wall push-out (GEKKO lesson: chasing enemies must not phase through walls)
      var eFeet=e.z+0.05,eHead=e.z+e.def.h;
      for(var wp2=0;wp2<solids.length;wp2++){
        var ws=solids[wp2];
        if(eFeet>=ws.top-0.01||eHead<=ws.z0)continue;
        var wdx=e.x-ws.x,wdy=e.y-ws.y;
        var wox=ws.w/2+0.25-Math.abs(wdx),woy=ws.d/2+0.25-Math.abs(wdy);
        if(wox>0&&woy>0){
          if(wox<woy)e.x+=wdx>0?wox:-wox;
          else e.y+=wdy>0?woy:-woy;
        }
      }

      var dP=dist2d(e.x,e.y,player.x,player.y);
      // --- perception ---
      if(!e.alerted){
        var sees=canSeePlayer(e);
        var hears=hearsPlayer(e,dt);
        if(sees||hears){
          e.susp+=dt/1.5;
          if(sees){ // turn toward
            e.facing=angLerp(e.facing,Math.atan2(player.x-e.x,player.y-e.y),3*dt);
          }
          if(e.susp>=1)alertEnemy(e);
        }else{
          e.susp=Math.max(0,e.susp-dt*0.5);
        }
        // corpse discovery
        for(var c=0;c<corpses.length;c++){
          var co=corpses[c];
          if(!co.seen&&dist2d(co.x,co.y,e.x,e.y)<5&&hasLOS(e.x,e.y,e.z+1.4,co.x,co.y,co.z+0.3)){
            co.seen=true;
            alertEnemy(e);
          }
        }
      }else{
        var seesNow=canSeePlayer(e)||(dP<3&&Math.abs(e.z-player.z)<2);
        e.seesNow=seesNow;
        if(seesNow){e.loseT=6;e.lastSeen=[player.x,player.y];}
        else{e.loseT-=dt;if(e.loseT<=0){e.alerted=false;e.susp=0;e.lastSeen=null;}}
      }

      // --- movement ---
      if(e.alerted){
        // chase what is seen; otherwise sweep to the last known position
        var tgX=player.x,tgY=player.y;
        if(!e.seesNow&&e.lastSeen){tgX=e.lastSeen[0];tgY=e.lastSeen[1];}
        var dT=dist2d(e.x,e.y,tgX,tgY);
        var want=Math.atan2(tgX-e.x,tgY-e.y);
        if(!e.seesNow&&dT<0.8){
          e.facing+=Math.sin(_time*1.3+e.bob)*1.6*dt; // reached it: scan around
        }else{
          e.facing=angLerp(e.facing,want,6*dt);
        }
        if(e.def.ranged){
          // keep distance, shoot (never backing off a ledge)
          if(dP<5){
            var rnx=e.x-Math.sin(e.facing)*e.def.spd*dt,rny=e.y-Math.cos(e.facing)*e.def.spd*dt;
            if(groundTopAt(rnx,rny,e.z+0.5,0.2)>e.z-1.0){e.x=rnx;e.y=rny;}
          }
          e.atkT-=dt;
          if(e.atkT<=0&&dP<13&&hasLOS(e.x,e.y,e.z+1.4,player.x,player.y,player.z+0.7)){
            e.atkT=e.def.atkCd;
            var dx=player.x-e.x,dy=player.y-e.y,dz=(player.z+0.7)-(e.z+1.4);
            var l=Math.sqrt(dx*dx+dy*dy+dz*dz)||1;
            eProj.push({x:e.x,y:e.y,z:e.z+1.4,dx:dx/l,dy:dy/l,dz:dz/l,spd:10,dmg:1,col:[0.95,0.85,0.55],life:2.4,kind:'arrow'});
            playSound('arrow');
          }
        }else{
          if(dT>e.def.reach*0.8){
            var sp=e.def.chase;
            var nx=e.x+Math.sin(e.facing)*sp*dt;
            var ny=e.y+Math.cos(e.facing)*sp*dt;
            // don't walk off ledges
            if(groundTopAt(nx,ny,e.z+0.5,0.2)>e.z-2.5){e.x=nx;e.y=ny;}
          }
          // melee with telegraph (only on a target it can actually place)
          if(e.atkPhase===0){
            e.atkT-=dt;
            if(e.atkT<=0&&dP<e.def.reach+0.3&&(e.seesNow||dP<1.2)){
              e.atkPhase=1;e.atkAnimT=0.45; // windup (weapon glows)
            }
          }else if(e.atkPhase===1){
            e.atkAnimT-=dt;
            if(e.atkAnimT<=0){
              e.atkPhase=2;e.atkAnimT=0.18;
              if(dP<e.def.reach+0.4&&Math.abs(player.z-e.z)<1.4){
                var aAng=Math.atan2(player.x-e.x,player.y-e.y);
                var aDa=aAng-e.facing;while(aDa>PI)aDa-=TAU;while(aDa<-PI)aDa+=TAU;
                if(Math.abs(aDa)<1.1)damagePlayer(e.def.dmg,Math.sin(e.facing)*5,Math.cos(e.facing)*5);
              }
              playSound('eswing');
            }
          }else if(e.atkPhase===2){
            e.atkAnimT-=dt;
            if(e.atkAnimT<=0){
              // samurai chains a second slash
              if((e.kind==='samurai'||e.kind==='elite')&&!e.chained){
                e.chained=true;e.atkPhase=1;e.atkAnimT=0.22;
              }else{
                e.chained=false;e.atkPhase=0;e.atkT=e.def.atkCd;
              }
            }
          }
        }
      }else{
        // patrol
        if(e.patrol&&e.patrol.length>1){
          if(e.patWait>0){e.patWait-=dt;}
          else{
            var wp=e.patrol[e.patIdx];
            var dW=dist2d(e.x,e.y,wp[0],wp[1]);
            if(dW<0.4){e.patIdx=(e.patIdx+1)%e.patrol.length;e.patWait=1.2+Math.random();}
            else{
              var wa=Math.atan2(wp[0]-e.x,wp[1]-e.y);
              e.facing=angLerp(e.facing,wa,4*dt);
              e.x+=Math.sin(e.facing)*e.def.spd*dt;
              e.y+=Math.cos(e.facing)*e.def.spd*dt;
            }
          }
        }else{
          // idle scan
          e.facing+=Math.sin(_time*0.4+e.bob)*0.25*dt;
        }
      }
    }

    // remove dead
    for(var k=enemies.length-1;k>=0;k--)if(enemies[k].dead)enemies.splice(k,1);
    // corpses fade
    for(var cc=corpses.length-1;cc>=0;cc--){
      corpses[cc].t-=dt;
      if(corpses[cc].t<=0)corpses.splice(cc,1);
    }
    // enemy projectiles
    for(var p=eProj.length-1;p>=0;p--){
      var pr=eProj[p];
      pr.life-=dt;
      pr.x+=pr.dx*pr.spd*dt;pr.y+=pr.dy*pr.spd*dt;pr.z+=pr.dz*pr.spd*dt;
      if(pr.life<=0||pointInSolid(pr.x,pr.y,pr.z)){
        if(pr.life>0)sparks(pr.x,pr.y,pr.z,3,pr.col);
        eProj.splice(p,1);continue;
      }
      if(dist3d(pr.x,pr.y,pr.z,player.x,player.y,player.z+0.7)<0.5){
        damagePlayer(pr.dmg,pr.dx*4,pr.dy*4);
        eProj.splice(p,1);
      }
    }
  }

  // ===== BOSS: the Lord =====
  function updateBoss(e,dt){
    if(!bossActive){
      // wakes when player reaches the arena (not through the floor)
      if(dist2d(e.x,e.y,player.x,player.y)<7&&Math.abs(player.z-e.z)<3){
        bossActive=true;
        bossIntroT=2.2;slowMo=Math.max(slowMo,2.0);player.iFrames=2.5;
        playSound('roar');
        musicAlert=9999; // boss music stays
        showHint('THE LORD — strike from behind for heavy damage');
        screenShake=3;
      }
      return;
    }
    var dP=dist2d(e.x,e.y,player.x,player.y);
    var spd=e.def.spd*(e.phase===2?1.5:1);
    if(e.phase===1&&e.hp<=10){
      e.phase=2;
      playSound('roar');
      smokePoof(e.x,e.y,e.z+1);
      addFloat(e.x,e.y,e.z+e.def.h+0.5,'FURY',[1,0.3,0.2],true);
      screenShake=3;
    }
    // keep the lord grounded inside his arena
    var bg=groundTopAt(e.x,e.y,e.z+0.6,0.3);
    if(bg>-999)e.z=bg;
    if(e.bossAtk===0){
      // approach / circle
      var want=Math.atan2(player.x-e.x,player.y-e.y);
      e.facing=angLerp(e.facing,want,4*dt);
      if(dP>2.2){
        var bnx=e.x+Math.sin(e.facing)*spd*dt,bny=e.y+Math.cos(e.facing)*spd*dt;
        if(groundTopAt(bnx,bny,e.z+0.6,0.3)>e.z-1.0){e.x=bnx;e.y=bny;}
      }
      e.bossT-=dt;
      if(e.bossT<=0){
        if(dP<4.5){e.bossAtk=1;e.atkAnimT=e.phase===2?0.7:1.0;playSound('iai');}     // iai slash
        else{e.bossAtk=2;e.atkAnimT=0.4;e.fanCount=3;}                                // fan throw
      }
    }else if(e.bossAtk===1){
      // iai: long telegraph (blade glows), then 120° arc
      e.atkAnimT-=dt;
      var want2=Math.atan2(player.x-e.x,player.y-e.y);
      e.facing=angLerp(e.facing,want2,(e.atkAnimT>0.3?2.5:0)*dt); // tracks early, commits late
      if(e.atkAnimT<=0){
        var dmg=e.phase===2?2:1;
        var aAng2=Math.atan2(player.x-e.x,player.y-e.y);
        var aDa2=aAng2-e.facing;while(aDa2>PI)aDa2-=TAU;while(aDa2<-PI)aDa2+=TAU;
        if(dP<3.5&&Math.abs(aDa2)<1.05&&Math.abs(player.z-e.z)<1.6){
          damagePlayer(dmg,Math.sin(e.facing)*8,Math.cos(e.facing)*8);
        }
        slashTrails.push({x:e.x+Math.sin(e.facing)*1.4,y:e.y+Math.cos(e.facing)*1.4,
          z:e.z+1.2,yaw:-e.facing,roll:0.4,life:0.2,maxLife:0.2,spin:false,big:true});
        screenShake=Math.max(screenShake,2.5);
        playSound('eswing');
        e.bossAtk=0;e.bossT=e.phase===2?1.4:2.2;
      }
    }else if(e.bossAtk===2){
      // war fans: 3 thrown projectiles
      e.atkAnimT-=dt;
      if(e.atkAnimT<=0&&e.fanCount>0){
        e.fanCount--;
        e.atkAnimT=0.3;
        var dx=player.x-e.x,dy=player.y-e.y,dz=(player.z+0.8)-(e.z+1.6);
        var l=Math.sqrt(dx*dx+dy*dy+dz*dz)||1;
        eProj.push({x:e.x,y:e.y,z:e.z+1.6,dx:dx/l,dy:dy/l,dz:dz/l,spd:14,dmg:1,col:[0.9,0.75,0.4],life:2,kind:'fan'});
        playSound('fan');
        if(e.fanCount<=0){e.bossAtk=0;e.bossT=e.phase===2?1.2:2.0;}
      }
    }
  }

  function winGame(){
    gameState='win';stateTimer=1.6;
    slowMo=1.2;
    stopMusic();
    playSound('win');
    var tm=Math.floor(gameTime);
    var shadow=alertCount===0;
    if(shadow)koban+=50;
    _winStats.innerHTML='TIME <b>'+Math.floor(tm/60)+':'+('0'+tm%60).slice(-2)+'</b> / KILLS <b>'+kills+'</b> ('+stealthKills+' silent)<br>'+
      'KOBAN <b>'+koban+'</b> / ALERTS <b>'+alertCount+'</b>'+
      (shadow?'<br><span style="color:#d04050;letter-spacing:3px">— 影 SHADOW —</span>':'');
    if(pointerLocked)document.exitPointerLock();
    updateOverlay();
  }
  // ===== PALETTE (art direction: warm emissive vs cool surfaces) =====
  // [r,g,b,materialId] — 1 plaster / 2 wood / 3 kawara / 4 stone / 5 tatami / 6 earth / 7 water / 8 rock
  var C_KAWARA=[0.22,0.26,0.34,3],C_KAWARA_L=[0.32,0.37,0.46,3];
  var C_WALL=[0.62,0.66,0.76,1];    // shikkui plaster — brightest under moonlight
  var C_WOOD=[0.20,0.14,0.10,2];
  var C_DIRT=[0.17,0.16,0.19,6];
  var C_STONE=[0.20,0.21,0.26,4];
  var C_TATAMI=[0.25,0.27,0.18,5];
  var C_WATER=[0.04,0.07,0.14,7];
  var C_CHOCHIN=[1.00,0.72,0.34];   // paper lantern, e1.0
  var C_ANDON=[1.00,0.86,0.58];     // e0.85
  var C_GOLD=[0.85,0.70,0.30];      // e0.4
  var C_ROCK=[0.16,0.16,0.20,8];

  // ===== WORLD BUILDERS =====
  // --- triangle layer: free-form quads, tris, sloped roofs (engine v3) ---
  function faceN(p1,p2,p3){
    var ux=p2[0]-p1[0],uy=p2[1]-p1[1],uz=p2[2]-p1[2];
    var vx=p3[0]-p1[0],vy=p3[1]-p1[1],vz=p3[2]-p1[2];
    var nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
    var l=Math.sqrt(nx*nx+ny*ny+nz*nz)||1;
    return[nx/l,ny/l,nz/l];
  }
  function pushTri(arr,p1,p2,p3,n,col,em){
    var m=col[3]||0,pts=[p1,p2,p3];
    for(var i=0;i<3;i++){var p=pts[i];arr.push(p[0],p[1],p[2],n[0],n[1],n[2],col[0],col[1],col[2],em||0,m);}
  }
  function pushQuadN(arr,p1,p2,p3,p4,col,em){
    pushQuad(arr,p1,p2,p3,p4,faceN(p1,p2,p3),col[0],col[1],col[2],em||0,col[3]||0);
  }
  function SCOL(cx,cy,z0,w,d,h){ // collision-only solid (invisible slope steps)
    solids.push({x:cx,y:cy,z0:z0,top:z0+h,w:w,d:d});
  }
  // curved gable roof (sori): steep at the eaves, easing into the ridge
  function gableRoof(cx,cy,z0,w,d,h,col,axis){
    var colE=[col[0]*0.8,col[1]*0.8,col[2]*0.8,col[3]||0];
    function P(u,v,z){return axis?[cx+v*d/2,cy+u*w/2,z]:[cx+u*w/2,cy+v*d/2,z];}
    var zm=z0+h*0.55,zr=z0+h,vm=0.42;
    pushQuadN(staticMesh,P(-1,-1,z0),P(1,-1,z0),P(1,-vm,zm),P(-1,-vm,zm),col,0);
    pushQuadN(staticMesh,P(-1,-vm,zm),P(1,-vm,zm),P(1,0,zr),P(-1,0,zr),col,0);
    pushQuadN(staticMesh,P(1,1,z0),P(-1,1,z0),P(-1,vm,zm),P(1,vm,zm),col,0);
    pushQuadN(staticMesh,P(1,vm,zm),P(-1,vm,zm),P(-1,0,zr),P(1,0,zr),col,0);
    for(var s=-1;s<=1;s+=2){
      var e0=P(s,-1,z0),e1=P(s,-vm,zm),e2=P(s,0,zr),e3=P(s,vm,zm),e4=P(s,1,z0);
      var n2=axis?[0,s,0]:[s,0,0];
      pushTri(staticMesh,e0,e1,e2,n2,colE,0);
      pushTri(staticMesh,e0,e2,e4,n2,colE,0);
      pushTri(staticMesh,e2,e3,e4,n2,colE,0);
    }
    if(axis)D(cx,cy,zr-0.02,0.26,w*1.02,0.10,col,col);
    else D(cx,cy,zr-0.02,w*1.02,0.26,0.10,col,col);
  }
  function pyramidRoof(cx,cy,z0,w,d,h,col){
    var a=[cx,cy,z0+h];
    var c1=[cx-w/2,cy-d/2,z0],c2=[cx+w/2,cy-d/2,z0],c3=[cx+w/2,cy+d/2,z0],c4=[cx-w/2,cy+d/2,z0];
    pushTri(staticMesh,c1,c2,a,faceN(c1,c2,a),col,0);
    pushTri(staticMesh,c2,c3,a,faceN(c2,c3,a),col,0);
    pushTri(staticMesh,c3,c4,a,faceN(c3,c4,a),col,0);
    pushTri(staticMesh,c4,c1,a,faceN(c4,c1,a),col,0);
  }
  // sloped tile band ringing a keep tier (rises from the eave edge to the wall)
  function tierRoofBand(cx,cy,zTop,wOut,dOut,wIn,dIn,rise,col){
    var zo=zTop+0.01,zi=zTop+rise;
    var o=[[cx-wOut/2,cy-dOut/2,zo],[cx+wOut/2,cy-dOut/2,zo],[cx+wOut/2,cy+dOut/2,zo],[cx-wOut/2,cy+dOut/2,zo]];
    var i2=[[cx-wIn/2,cy-dIn/2,zi],[cx+wIn/2,cy-dIn/2,zi],[cx+wIn/2,cy+dIn/2,zi],[cx-wIn/2,cy+dIn/2,zi]];
    pushQuadN(staticMesh,o[0],o[1],i2[1],i2[0],col,0);
    pushQuadN(staticMesh,o[1],o[2],i2[2],i2[1],col,0);
    pushQuadN(staticMesh,o[2],o[3],i2[3],i2[2],col,0);
    pushQuadN(staticMesh,o[3],o[0],i2[0],i2[3],col,0);
  }
  function machiya(cx,cy,w,d,hWall){
    S(cx,cy,0,w,d,hWall,C_WALL,C_WOOD);
    // overhanging eave slab (landable) + curved gable above (walkable via hidden step)
    S(cx,cy,hWall,w+0.9,d+0.9,0.3,C_KAWARA,C_KAWARA);
    gableRoof(cx,cy,hWall+0.28,w+1.1,d+1.1,0.55+w*0.07,C_KAWARA,0);
    SCOL(cx,cy,hWall+0.3,w+0.4,(d+1.1)*0.5,0.4);
    // dark doorway + shoji glow on one side
    W2(cx,cy-d/2,0.8,0.9,1.3,3,0.05,0.04,0.06,0);
    if(rng()<0.5)W2(cx,cy-d/2,0.9,0.7,0.7,3,C_ANDON[0]*0.85,C_ANDON[1]*0.85,C_ANDON[2]*0.85,0.35);
  }
  function chochin(x,y,z){
    lanterns.push({x:x,y:y,z:z,lit:true,id:lanterns.length});
  }
  function jizo(x,y,z){
    S(x,y,z,0.5,0.5,0.7,C_ROCK,C_ROCK);
    D(x,y,z+0.7,0.4,0.4,0.35,C_ROCK,C_STONE);
    D(x,y,z+0.45,0.55,0.12,0.12,[0.75,0.2,0.2],[0.75,0.2,0.2],0.15); // red bib
    jizos.push({x:x,y:y,z:z});
  }
  function anchor(x,y,z){
    anchors.push({x:x,y:y,z:z});
  }
  function barrel(x,y,z){
    S(x,y,z,0.9,0.9,0.9,C_WOOD,[0.28,0.20,0.14,2]);
  }
  function gateDoor(cx,cy,z0,w,d,h){
    var solid={x:cx,y:cy,z0:z0,top:z0+h,w:w,d:d};
    solids.push(solid);
    gates.push({solid:solid,x:cx,y:cy,z0:z0,w:w,d:d,h:h,open:false});
    return gates.length-1;
  }
  function torii(cx,cy,h){
    D(cx-1.4,cy,0,0.3,0.3,h,[0.72,0.18,0.16],[0.72,0.18,0.16]);
    D(cx+1.4,cy,0,0.3,0.3,h,[0.72,0.18,0.16],[0.72,0.18,0.16]);
    D(cx,cy,h,3.6,0.35,0.3,[0.78,0.20,0.18],[0.82,0.24,0.2]);
    D(cx,cy,h-0.7,3.0,0.25,0.2,[0.72,0.18,0.16],[0.72,0.18,0.16]);
  }
  function sakuraTree(x,y){
    S(x,y,0,0.4,0.4,1.8,C_WOOD,C_WOOD);
    D(x,y,1.8,2.4,2.4,1.0,[0.85,0.60,0.70],[0.95,0.72,0.80],0.25);
    D(x,y,2.6,1.6,1.6,0.6,[0.95,0.72,0.80],[0.98,0.80,0.86],0.3);
  }
  // --- interior / town construction kit ---
  function wallX(x0,x1,y,z0,h,th,col,top){S((x0+x1)/2,y,z0,Math.abs(x1-x0),th||0.4,h,col||C_WALL,top||col||C_WALL);}
  function wallY(x,y0,y1,z0,h,th,col,top){S(x,(y0+y1)/2,z0,th||0.4,Math.abs(y1-y0),h,col||C_WALL,top||col||C_WALL);}
  function stairsY(x,y0,z0,n,dirY,wid){for(var i=0;i<n;i++)S(x,y0+dirY*i*0.62,z0+i*0.5,wid||1.4,0.7,0.5,C_WOOD,[0.30,0.22,0.15,2]);}
  function stairsX(x0,y,z0,n,dirX,wid){for(var i=0;i<n;i++)S(x0+dirX*i*0.62,y,z0+i*0.5,0.7,wid||1.4,0.5,C_WOOD,[0.30,0.22,0.15,2]);}
  function stoneStairsY(x,y0,z0,n,dirY,wid){for(var i=0;i<n;i++)S(x,y0+dirY*i*0.75,z0+i*0.5,wid||1.6,1.0,0.5,C_ROCK,C_STONE);}
  function squeakBoard(cx,cy,z,w,d){
    squeaks.push({x:cx,y:cy,z:z,w:w,d:d,cd:0});
    D(cx,cy,z+0.005,w,d,0.015,[0.45,0.28,0.16],[0.52,0.32,0.18]);
  }
  function andon(x,y,z){lanterns.push({x:x,y:y,z:z,lit:true,id:lanterns.length});}
  function yatai(x,y){
    S(x,y,0,2.2,1.1,0.9,C_WOOD,[0.30,0.22,0.15,2]);
    D(x-1.0,y-0.45,0,0.12,0.12,1.9,C_WOOD,C_WOOD);D(x+1.0,y-0.45,0,0.12,0.12,1.9,C_WOOD,C_WOOD);
    D(x-1.0,y+0.45,0,0.12,0.12,1.9,C_WOOD,C_WOOD);D(x+1.0,y+0.45,0,0.12,0.12,1.9,C_WOOD,C_WOOD);
    gableRoof(x,y,1.9,2.6,1.5,0.4,[0.62,0.18,0.20,0],0);
    chochin(x+0.8,y-0.7,1.5);
  }
  function well(x,y){
    S(x,y,0,1.4,1.4,0.7,C_STONE,[0.06,0.08,0.12]);
    D(x-0.6,y,0.7,0.1,0.1,1.0,C_WOOD,C_WOOD);D(x+0.6,y,0.7,0.1,0.1,1.0,C_WOOD,C_WOOD);
    D(x,y,1.7,1.8,1.0,0.15,C_KAWARA,C_KAWARA_L);
    pyramidRoof(x,y,1.85,2.0,1.2,0.5,C_KAWARA);
  }
  function kura(x,y,w,d,h){
    S(x,y,0,w,d,h,C_WALL,C_KAWARA);
    S(x,y,h,w+0.8,d+0.8,0.3,C_KAWARA,C_KAWARA);
    gableRoof(x,y,h+0.28,w+1.0,d+1.0,0.7,C_KAWARA,0);
    SCOL(x,y,h+0.3,w+0.3,(d+1.0)*0.5,0.35);
  }
  function yagura(x,y,h){
    S(x,y,0,2,2,h,C_WOOD,C_WOOD);
    S(x,y,h,3,3,0.25,C_KAWARA,C_KAWARA_L);
    for(var l=0;l<h*2;l++)S(x+1.3,y,l*0.5,0.6,0.8,0.12,C_WOOD,[0.3,0.22,0.16]);
  }
  function crateStack(x,y,z){
    z=z||0;
    S(x,y,z,1.0,1.0,1.0,C_WOOD,[0.28,0.20,0.14,2]);
    S(x+0.7,y+0.3,z,0.8,0.8,0.7,C_WOOD,[0.28,0.20,0.14,2]);
    D(x+0.2,y-0.1,z+1.0,0.7,0.7,0.5,C_WOOD,[0.3,0.22,0.15]);
  }

  // ===== ZONES =====
  var ZONES=[
    {name:'SOTOMACHI',sub:'the outer town sleeps'},
    {name:'OTEMON',sub:'twin moats and the great gate'},
    {name:'NINOMARU',sub:'the palace whispers — tread softly'},
    {name:'TENSHU',sub:'the dark tower — he waits at the top'}
  ];
  var staticVerts=null,staticCount=0,staticBuf=gl.createBuffer();
  function bakeStatic(){
    staticVerts=new Float32Array(staticMesh);
    staticCount=staticVerts.length/11;
    gl.bindBuffer(gl.ARRAY_BUFFER,staticBuf);
    gl.bufferData(gl.ARRAY_BUFFER,staticVerts,gl.STATIC_DRAW);
  }
  function clearZone(){
    solids.length=0;staticMesh.length=0;
    enemies.length=0;corpses.length=0;eProj.length=0;
    pickups.length=0;levers.length=0;gates.length=0;jizos.length=0;
    lanterns.length=0;anchors.length=0;lights.length=0;squeaks.length=0;
    shurikens.length=0;particles.length=0;slashTrails.length=0;floatTexts.length=0;
    exitGate=null;hintTrigs.length=0;fireflies.length=0;
  }
  function announceZone(n){
    zoneAnnounceT=2.4;
    _zoneTitle.textContent=ZONES[n].name;
    _zoneSub.textContent=ZONES[n].sub;
    _ovActive='';updateOverlay();
    playSound('gong');
  }

  // --- Zone 1: the outer town (SOTOMACHI) ---
  function buildZone1(){
    clearZone();
    // ground: south bank / canal (a fall costs a heart) / north bank
    S(0,-27,-1,68,58,1,C_DIRT,C_DIRT);
    D(0,5.5,-0.85,68,7,0.05,C_WATER,C_WATER,0.12);
    S(0,20.5,-1,68,23,1,C_DIRT,C_DIRT);
    // streets
    D(-6,-27,0.02,3.6,58,0.02,C_STONE,C_STONE);
    D(-6,20.5,0.02,3.6,23,0.02,C_STONE,C_STONE);
    D(-2,-22,0.025,40,4,0.02,C_STONE,C_STONE);
    D(12,-35,0.02,3,26,0.02,C_STONE,C_STONE);
    // main bridge + east stepping stones
    S(-6,5.5,-0.3,3.0,9.5,0.3,C_WOOD,[0.30,0.22,0.15,2]);
    D(-7.4,5.5,0,0.15,9.5,0.5,C_WOOD,C_WOOD);
    D(-4.6,5.5,0,0.15,9.5,0.5,C_WOOD,C_WOOD);
    S(18,3.2,-0.6,1.2,1.2,0.45,C_ROCK,C_STONE);
    S(19.2,5.5,-0.6,1.2,1.2,0.45,C_ROCK,C_STONE);
    S(18.2,7.8,-0.6,1.2,1.2,0.45,C_ROCK,C_STONE);
    // machiya districts (west row / east row / side street / north bank)
    machiya(-13,-50,5,3.5,2.0);machiya(-13,-43,5,3.5,2.4);machiya(-13,-36,5,3.5,2.0);
    machiya(1,-49,5,3.5,2.4);machiya(1,-42,5,3.5,2.0);machiya(1,-35,5,3.5,2.4);
    machiya(-13,-16,5,3.5,2.2);machiya(-13,-9,5,3.5,1.8);
    machiya(1,-15,5,3.5,2.0);machiya(1,-8,5,3.5,2.4);
    machiya(7,-46,4,3,1.8);machiya(17,-45,4,3,2.2);
    machiya(7,-39,4,3,2.2);machiya(17,-38,4,3,1.8);machiya(17,-31,4,3,2.0);
    machiya(-22,-48,4,3,2.0);machiya(-22,-41,4,3,2.4);
    machiya(-16,14,4.5,3.5,2.0);machiya(6,13,4.5,3.5,2.2);machiya(16,16,4,3,1.8);
    // roof-route barrels
    barrel(-10,-44.8,0);barrel(3.6,-36.6,0);barrel(15,-39.6,0);barrel(-15.8,12.4,0);
    // market square + garden wall (the cling-and-peek corner)
    yatai(-16,-20.5);yatai(-10,-23.5);yatai(-3,-20.5);yatai(4,-23.5);
    crateStack(-13,-19);barrel(0,-24.4,0);
    wallX(-20,-8.5,-25.6,0,1.9,0.5);
    well(-9,-30);well(8,-12);
    kura(-24,-22,3.5,3,2.4);
    pickups.push({kind:'shubox',x:-24,y:-20.2,z:0.4,t:0});
    yagura(-26,-10,4.5);
    pickups.push({kind:'koban',x:-26,y:-10.4,z:5.0,t:0});
    pickups.push({kind:'onigiri',x:-26.4,y:-9.6,z:5.0,t:0});
    // temple by the canal
    torii(22,-12,2.6);
    S(22,-5,0,6,4,2.6,C_WALL,C_KAWARA);
    S(22,-5,2.6,7,5,0.3,C_KAWARA,C_KAWARA);
    gableRoof(22,-5,2.88,7.4,5.4,1.1,C_KAWARA,0);
    chochin(20.5,-7.5,1.7);chochin(23.5,-7.5,1.7);
    jizo(19,-9,0);
    // sakura
    sakuraTree(-20,-33);sakuraTree(13,-26);sakuraTree(24,-44);sakuraTree(-26,-2);
    sakuraTree(-18,12);sakuraTree(20,12);
    // north wall + gate + guardhouse (lever, west side open)
    S(-21.5,29,0,25,1.6,2.8,C_WALL,C_KAWARA);
    S(15.5,29,0,37,1.6,2.8,C_WALL,C_KAWARA);
    S(-6,29,2.8,9,2.6,0.5,C_KAWARA,C_KAWARA_L);
    gableRoof(-6,29,3.28,9.6,3.2,0.8,C_KAWARA,0);
    gateDoor(-6,29,0,6,0.7,2.8);
    S(1,27,0,4,0.3,2.0,C_WALL,C_WALL);
    S(-1,25.75,0,0.4,2.8,2.0,C_WALL,C_WALL);
    S(3,25.75,0,0.4,2.8,2.0,C_WALL,C_WALL);
    S(1,25.75,2.0,4.8,3.6,0.3,C_KAWARA,C_KAWARA);
    gableRoof(1,25.75,2.28,5.2,4.0,0.7,C_KAWARA,0);
    levers.push({x:1,y:26.4,z:1.0,on:false,gateIdx:0});
    chochin(2.4,24.2,1.8);
    // street lanterns
    chochin(-7.9,-46,1.6);chochin(-4.1,-38,1.6);chochin(-7.9,-30,1.6);
    chochin(-16,-22.6,1.9);chochin(4,-21.4,1.9);
    chochin(-7.6,1.2,1.8);chochin(-4.4,9.8,1.8);
    chochin(12,-46,1.6);chochin(12,-32,1.6);
    chochin(-7.9,16,1.6);chochin(-4.1,24,1.6);
    chochin(-9.1,28,2.2);chochin(-2.9,28,2.2);
    // kaginawa route hints
    anchor(-13,-42,3.4);anchor(1,-34,3.4);anchor(-6,28.3,3.6);anchor(-26,-10.6,4.9);
    // pickups
    var kb=[[-6,-48],[-6,-40],[-6,-32],[-12,-22],[-1,-22],[12,-44],[12,-34],
            [22,-8],[-6,12],[-6,20],[10,14],[-22,-44],[18,3.2],[24,-4]];
    for(var k=0;k<kb.length;k++)pickups.push({kind:'koban',x:kb[k][0],y:kb[k][1],z:kb[k][0]===18?0.15:0.4,t:0});
    pickups.push({kind:'koban',x:-13,y:-41.3,z:3.1,t:0});
    pickups.push({kind:'koban',x:1,y:-33.3,z:3.1,t:0});
    pickups.push({kind:'koban',x:17,y:-36.6,z:2.7,t:0});
    pickups.push({kind:'onigiri',x:4,y:-23.0,z:1.1,t:0});
    pickups.push({kind:'onigiri',x:16,y:18,z:0.4,t:0});
    jizo(3,-52,0);jizo(-22,-19,0);jizo(-2,12,0);
    // enemies
    spawnEnemy('ashigaru',-6,-46,0,{patrol:[[-6,-50],[-6,-40]]});
    spawnEnemy('ashigaru',-6,-30,0,{patrol:[[-6,-36],[-6,-26]],lantern:true});
    spawnEnemy('ashigaru',-8,-22,0,{patrol:[[-14,-22],[2,-22]]});
    spawnEnemy('ashigaru',4,-22,0,{facing:-PI/2});
    spawnEnemy('ashigaru',12,-40,0,{patrol:[[12,-46],[12,-30]]});
    spawnEnemy('ashigaru',-13,-24,0,{patrol:[[-17,-24],[-10,-24]]}); // behind the garden wall
    spawnEnemy('archer',-26,-10,4.75,{facing:PI/2});
    spawnEnemy('ashigaru',22,-12,0,{patrol:[[19,-12],[25,-12]]});
    spawnEnemy('ashigaru',-6,2,0,{patrol:[[-6,-2],[-6,10]],lantern:true});
    spawnEnemy('ashigaru',-6,18,0,{patrol:[[-6,14],[-6,24]]});
    spawnEnemy('ashigaru',1,25.2,0,{facing:PI});
    fireflyCluster(12,2,7,8);fireflyCluster(-20,-33,3,5);fireflyCluster(24,-44,3,4);fireflyCluster(-18,12,3,4);
    hintTrigs.push({y:-31,msg:'C: WALL CLING — hide flat, slide to a corner to peek'});
    checkpoint=[3,-52,0];
    player.x=0;player.y=-53;player.z=0.5;
    exitGate={y:31};
  }

  // --- Zone 2: twin moats and the great gate (OTEMON) ---
  function buildZone2(){
    clearZone();
    S(0,-19,-1,54,22,1,C_DIRT,C_DIRT);
    D(0,-5.5,-0.85,54,5,0.05,C_WATER,C_WATER,0.12);
    S(0,0.5,-1,54,7,1,C_DIRT,C_STONE);
    D(0,6.5,-0.85,54,5,0.05,C_WATER,C_WATER,0.12);
    S(0,19.5,-1,54,21,1,C_DIRT,C_STONE);
    // offset bridges: cross the island under the walls' gaze
    S(-4,-5.5,-0.3,2.6,5.6,0.3,C_WOOD,[0.30,0.22,0.15,2]);
    D(-5.2,-5.5,0,0.15,5.6,0.5,C_WOOD,C_WOOD);
    D(-2.8,-5.5,0,0.15,5.6,0.5,C_WOOD,C_WOOD);
    S(6,6.5,-0.3,2.6,5.6,0.3,C_WOOD,[0.30,0.22,0.15,2]);
    D(4.8,6.5,0,0.15,5.6,0.5,C_WOOD,C_WOOD);
    D(7.2,6.5,0,0.15,5.6,0.5,C_WOOD,C_WOOD);
    // west stepping stones (the quiet route across both moats)
    S(-19,-7,-0.6,1.1,1.1,0.35,C_ROCK,C_STONE);
    S(-20.5,-5,-0.6,1.1,1.1,0.35,C_ROCK,C_STONE);
    S(-19.5,-3.2,-0.6,1.1,1.1,0.35,C_ROCK,C_STONE);
    S(-19,4.8,-0.6,1.1,1.1,0.35,C_ROCK,C_STONE);
    S(-20.5,6.6,-0.6,1.1,1.1,0.35,C_ROCK,C_STONE);
    S(-19.5,8.2,-0.6,1.1,1.1,0.35,C_ROCK,C_STONE);
    // island cover
    S(-3,1.8,0,5,0.8,1.1,C_WOOD,[0.30,0.22,0.15,2]);
    S(10,1,0,4,0.8,1.1,C_WOOD,[0.30,0.22,0.15,2]);
    barrel(-8,0.5,0);barrel(14,0,0);crateStack(-12,1.5);
    // boathouse
    S(-14,-12,0,3,2,1.6,C_WOOD,C_KAWARA);
    S(-14,-12,1.6,3.8,2.8,0.25,C_KAWARA,C_KAWARA);
    gableRoof(-14,-12,1.83,4.2,3.2,0.65,C_KAWARA,0);
    pickups.push({kind:'shubox',x:-14,y:-10.6,z:0.5,t:0});
    pickups.push({kind:'onigiri',x:-15.4,y:-10.6,z:0.4,t:0});
    // masugata enclosure: south wall + gate (key on the captain)
    S(-4.5,10,0,15,1.4,3,C_WALL,C_KAWARA);
    S(11.5,10,0,5,1.4,3,C_WALL,C_KAWARA);
    S(6,10,3,8,2.2,0.5,C_KAWARA,C_KAWARA_L);
    gableRoof(6,10,3.48,8.6,2.8,0.8,C_KAWARA,0);
    gateDoor(6,10,0,6,0.7,3);
    S(-12,16,0,1.4,13.4,3,C_WALL,C_KAWARA);
    S(14,16,0,1.4,13.4,3,C_WALL,C_KAWARA);
    S(-8.85,22,0,7.7,1.4,3,C_WALL,C_KAWARA);
    S(7.85,22,0,13.7,1.4,3,C_WALL,C_KAWARA);
    S(-2,22,3,8,2.2,0.5,C_KAWARA,C_KAWARA_L);
    gableRoof(-2,22,3.48,8.6,2.8,0.8,C_KAWARA,0);
    gateDoor(-2,22,0,6,0.7,3);
    levers.push({x:12,y:20,z:1.1,on:false,gateIdx:1});
    levers.push({x:-16,y:9,z:6.0,on:false,gateIdx:0}); // west tower lever: the quiet way in
    // wall-top walkways + stairs
    S(-4.5,10,3,15,1.8,0.25,C_STONE,C_STONE);
    S(11.5,10,3,5,1.8,0.25,C_STONE,C_STONE);
    S(-8.85,22,3,7.7,1.8,0.25,C_STONE,C_STONE);
    S(7.85,22,3,13.7,1.8,0.25,C_STONE,C_STONE);
    S(-12,16,3,1.8,13.4,0.25,C_STONE,C_STONE);
    S(14,16,3,1.8,13.4,0.25,C_STONE,C_STONE);
    stoneStairsY(-10.6,11.4,0,6,1,1.5);
    // corner towers
    S(-16,9,0,3,3,5.5,C_WALL,C_KAWARA);
    S(-16,9,5.5,4,4,0.3,C_KAWARA,C_KAWARA_L);
    S(18,23,0,3,3,5.5,C_WALL,C_KAWARA);
    S(18,23,5.5,4,4,0.3,C_KAWARA,C_KAWARA_L);
    anchor(-16,8,5.9);anchor(18,22,5.9);anchor(6,9.4,3.9);anchor(-2,21.4,3.9);anchor(-12,12,3.6);
    // lighting
    chochin(-4,-8.6,1.8);chochin(-4,-2.4,1.8);chochin(6,3.4,1.8);
    chochin(3.4,9.4,2.2);chochin(8.6,9.4,2.2);
    chochin(0,16,1.8);chochin(-9,13,1.8);
    chochin(-5,21.4,2.2);chochin(1,21.4,2.2);
    chochin(-12.6,-10.8,1.7);chochin(0,-14,1.6);
    sakuraTree(20,-16);sakuraTree(-24,14);sakuraTree(22,14);
    // pickups
    var kb2=[[-8,-16,0.4],[6,-10,0.4],[-12,0.5,0.4],[3,1.5,0.4],[12,0,0.4],
             [-6,13,0.4],[8,17,0.4],[0,21,0.4],[-20.5,-5,0.2],[-20.5,6.6,0.2],
             [-4.5,10.2,3.65],[-16,9,6.1],[18,23,6.1]];
    for(var k2=0;k2<kb2.length;k2++)pickups.push({kind:'koban',x:kb2[k2][0],y:kb2[k2][1],z:kb2[k2][2],t:0});
    pickups.push({kind:'onigiri',x:18,y:23.6,z:6.1,t:0});
    pickups.push({kind:'onigiri',x:12,y:11.5,z:0.4,t:0});
    pickups.push({kind:'shubox',x:-11,y:20.5,z:0.4,t:0});
    jizo(2,-26,0);jizo(-16,0.5,0);jizo(3,12.5,0);
    // enemies
    spawnEnemy('ashigaru',0,-14,0,{patrol:[[-4,-14],[4,-14]]});
    spawnEnemy('samurai',6,1,0,{patrol:[[6,-1],[6,3]]}); // gate captain, carries the key
    spawnEnemy('ashigaru',-6,0.5,0,{patrol:[[-10,0.5],[2,0.5]],lantern:true});
    spawnEnemy('archer',-4.5,10,3.25,{facing:PI});
    spawnEnemy('archer',11.5,10,3.25,{facing:PI});
    spawnEnemy('archer',-16,9,5.8,{facing:PI});
    spawnEnemy('archer',18,23,5.8,{facing:PI});
    spawnEnemy('ashigaru',0,13,0,{patrol:[[-8,13],[10,13]]});
    spawnEnemy('ashigaru',0,18,0,{patrol:[[0,16],[0,20]]});
    spawnEnemy('elite',-2,19,0,{facing:PI});
    fireflyCluster(-19,0.5,4,6);fireflyCluster(20,-16,3,4);fireflyCluster(22,14,3,4);
    hintTrigs.push({y:-10,msg:'ARCHERS WATCH THE BRIDGES — the west stones are quieter'});
    checkpoint=[2,-26,0];
    player.x=0;player.y=-28;player.z=0.5;
    exitGate={y:26};
  }

  // --- Zone 3: the palace (NINOMARU) — interior infiltration ---
  function buildZone3(){
    clearZone();
    S(0,0,-1,58,52,1,C_DIRT,C_DIRT);
    // approach street + gardens
    D(2,-14,0.02,4,24,0.02,C_STONE,C_STONE);
    S(-17,-15,-1,12,9,0.62,C_ROCK,[0.05,0.08,0.15]); // pond basin — wade it
    D(-17,-15,-0.36,12,9,0.02,C_WATER,C_WATER,0.15);
    S(-17,-15,-0.3,1.4,9.6,0.3,C_WOOD,[0.30,0.22,0.15,2]); // plank over the pond
    S(-23,-12,0,1.6,1.4,1.2,C_ROCK,C_STONE);S(-12,-19,0,1.2,1.2,0.9,C_ROCK,C_STONE);
    D(12,-14,0.02,14,8,0.02,[0.55,0.55,0.6],[0.62,0.62,0.66]);
    S(10,-16,0,1.6,1.4,1.2,C_ROCK,C_STONE);S(14,-12,0,1.2,1.2,0.8,C_ROCK,C_STONE);S(16,-15,0,1.0,1.0,1.5,C_ROCK,C_STONE);
    sakuraTree(-23,-8);sakuraTree(-10,-22);sakuraTree(20,-20);sakuraTree(24,8);sakuraTree(-24,16);
    torii(2,-20,2.8);
    // compound wall (entrance arch x in [-2,5])
    S(-14.5,-2,0,25,1.2,2.6,C_WALL,C_KAWARA);
    S(16,-2,0,22,1.2,2.6,C_WALL,C_KAWARA);
    S(-27,11,0,1.2,27,2.6,C_WALL,C_KAWARA);
    S(27,11,0,1.2,27,2.6,C_WALL,C_KAWARA);
    S(-15,24,0,24,1.2,2.6,C_WALL,C_KAWARA);
    S(15,24,0,24,1.2,2.6,C_WALL,C_KAWARA);
    S(0,24,2.6,7,2.4,0.5,C_KAWARA,C_KAWARA_L);
    gableRoof(0,24,3.08,7.6,3.0,0.7,C_KAWARA,0);
    gateDoor(0,24,0,5,0.7,2.6);
    // goten palace shell
    S(0,3.2,0,26,1.6,0.45,C_WOOD,[0.30,0.22,0.15,2]); // engawa porch
    S(2,2.1,0,2.4,0.8,0.22,C_WOOD,[0.30,0.22,0.15,2]);
    wallX(-12,0.5,4,0,2.6,0.4);wallX(3.5,12,4,0,2.6,0.4);      // south + genkan
    wallX(-12,-1.2,20,0,2.6,0.4);wallX(1.2,12,20,0,2.6,0.4);   // north + rear door
    wallY(-12,4,20,0,2.6,0.4);wallY(12,4,20,0,2.6,0.4);
    S(0,12,2.6,25,17.4,0.35,C_KAWARA,C_KAWARA);
    gableRoof(0,12,2.95,25.4,14.6,1.5,C_KAWARA,0); // long sweeping silhouette
    SCOL(0,12,2.95,24,7.4,0.7);
    W2(-6,4,1.2,3,1.6,3,C_ANDON[0],C_ANDON[1],C_ANDON[2],0.5);
    W2(8,4,1.2,3,1.6,3,C_ANDON[0],C_ANDON[1],C_ANDON[2],0.45);
    // interior floor + partitions (central corridor, two rooms each side)
    S(0,12,0,23.2,15.2,0.45,C_WOOD,[0.32,0.24,0.16,2]);
    wallY(-1.6,4.4,7,0.45,2.15,0.3);wallY(-1.6,9,14,0.45,2.15,0.3);wallY(-1.6,16,19.6,0.45,2.15,0.3);
    wallY(1.6,4.4,6,0.45,2.15,0.3);wallY(1.6,8,15,0.45,2.15,0.3);wallY(1.6,17,19.6,0.45,2.15,0.3);
    wallX(-11.6,-1.6,12,0.45,2.15,0.3);
    wallX(1.6,11.6,11,0.45,2.15,0.3);
    // tatami + nightingale boards
    D(-6.6,8,0.455,9.4,6.8,0.012,C_TATAMI,C_TATAMI);
    D(-6.6,16,0.455,9.4,6.8,0.012,C_TATAMI,C_TATAMI);
    D(6.6,7.5,0.455,9.4,5.6,0.012,C_TATAMI,C_TATAMI);
    D(6.6,15.5,0.455,9.4,7.6,0.012,C_TATAMI,C_TATAMI);
    squeakBoard(0,9.5,0.45,3.0,1.6);
    squeakBoard(0,13.5,0.45,3.0,1.6);
    squeakBoard(2.6,7,0.45,1.8,1.8);
    // interior light + furnishing
    andon(0,5.5,1.6);andon(0,17,1.6);andon(-7,16,1.6);andon(7,7,1.6);andon(7,15,1.6);
    D(-6,18.8,0.45,4,0.15,1.5,C_GOLD,C_GOLD,0.25); // gilded byobu in the shoin
    S(8,5.2,0.45,1.2,0.7,0.6,C_WOOD,[0.3,0.22,0.15]); // chest
    levers.push({x:-9,y:17,z:1.5,on:false,gateIdx:0}); // rear-gate bolt, in the shoin
    // treasure room loot
    var tk=[[5,6],[6.2,7],[7.4,5.5],[8.6,6.5],[5.5,8.2]];
    for(var t3=0;t3<tk.length;t3++)pickups.push({kind:'koban',x:tk[t3][0],y:tk[t3][1],z:0.85,t:0});
    pickups.push({kind:'shubox',x:9.5,y:6,z:0.9,t:0});
    pickups.push({kind:'onigiri',x:10.4,y:8,z:0.85,t:0});
    // outdoor pickups
    var kb3=[[2,-22,0.4],[2,-10,0.4],[-14,-14,0.1],[14,-10,0.4],[8,-5,0.4],
             [-8,-5,0.4],[8,22,0.4],[-8,22,0.4],[-19,-15,0.05],[6,12,3.35],[-6,12,3.35]];
    for(var k3=0;k3<kb3.length;k3++)pickups.push({kind:'koban',x:kb3[k3][0],y:kb3[k3][1],z:kb3[k3][2],t:0});
    pickups.push({kind:'onigiri',x:2,y:-6,z:0.4,t:0});
    jizo(5,-22,0);jizo(6,0,0);jizo(-4,22,0);
    // lighting outside
    chochin(-2.6,-2,2.2);chochin(5.6,-2,2.2);
    chochin(4.2,-14,1.6);chochin(-0.2,-8,1.6);
    chochin(-2.8,23.4,2.2);chochin(2.8,23.4,2.2);
    chochin(-4,2.6,1.9);chochin(8,2.6,1.9);
    anchor(0,2.7,3.2);anchor(0,23.4,3.4);anchor(12.6,12,3.2);
    // enemies
    spawnEnemy('samurai',2,-6,0,{patrol:[[2,-9],[2,-3]]});
    spawnEnemy('ashigaru',-12,-14,0,{patrol:[[-14,-12],[-8,-18]]});
    spawnEnemy('ashigaru',12,-12,0,{patrol:[[8,-12],[16,-12]]});
    spawnEnemy('ashigaru',2,0,0,{patrol:[[6,0],[-2,0]]});
    spawnEnemy('archer',-8,4.5,2.95,{facing:PI});
    spawnEnemy('ashigaru',0,7,0.45,{patrol:[[0,6],[0,18]]});
    spawnEnemy('elite',-6,16,0.45,{facing:-PI/2});
    spawnEnemy('elite',7,13,0.45,{patrol:[[4,13],[10,17]]});
    spawnEnemy('ashigaru',0,22,0,{patrol:[[-6,22],[6,22]]});
    spawnEnemy('ashigaru',-18,3,0,{patrol:[[-18,0],[-18,6]]});
    fireflyCluster(-17,-15,5,9);fireflyCluster(12,-14,4,5);fireflyCluster(-24,16,3,4);
    hintTrigs.push({y:0,msg:'NIGHTINGALE FLOORS SING — cross them slowly (SHIFT)'});
    checkpoint=[5,-22,0];
    player.x=0;player.y=-24;player.z=0.5;
    exitGate={y:25.8};
  }

  // --- Zone 4: the keep (TENSHU) — four floors to the throne room ---
  function buildZone4(){
    clearZone();
    S(0,-1,-1,50,42,1,C_DIRT,C_STONE);
    D(0,-12,0.02,4,18,0.02,C_STONE,C_STONE);
    sakuraTree(-16,-16);sakuraTree(16,-14);sakuraTree(-20,-4);sakuraTree(20,-2);
    torii(0,-19,2.8);
    well(12,-9);
    crateStack(-12,-7);barrel(-10,-5.4,0);
    // stone base + parapet + stairs
    S(0,8,0,22,16,3,C_STONE,C_STONE);
    S(-11,8,3,0.4,16,1.2,C_WALL,C_KAWARA);
    S(11,8,3,0.4,16,1.2,C_WALL,C_KAWARA);
    S(0,16,3,22,0.4,2.6,C_WALL,C_KAWARA);
    S(-9.1,0,3,3.8,0.4,1.2,C_WALL,C_KAWARA);
    S(3.1,0,3,15.8,0.4,1.2,C_WALL,C_KAWARA);
    stoneStairsY(-6,-3.8,0,6,1,1.8);
    // ===== the keep: 1F shell (floor = base top, z3) =====
    wallX(-7,1,2,3,2.7,0.5);wallX(3.4,7,2,3,2.7,0.5); // south + entrance
    S(0,15,3,14,0.5,2.7,C_WALL,C_WALL);
    S(-7,8.5,3,0.5,13,2.7,C_WALL,C_WALL);
    S(7,5,3,0.5,6,2.7,C_WALL,C_WALL);
    S(7,12.3,3,0.5,5.4,2.7,C_WALL,C_WALL);
    S(7,8.8,3,0.5,1.6,1.2,C_WALL,C_WALL);   // east window sill (open z4.2-5.4)
    S(7,8.8,5.4,0.5,1.6,0.3,C_WALL,C_WALL);
    // 2F floor / 1F ceiling + eave ring (stairwell gap on the west)
    S(1.65,8.5,5.7,12.5,14.8,0.4,C_KAWARA,[0.32,0.24,0.16,2]);
    S(-7.25,8.5,5.7,1.3,14.8,0.4,C_KAWARA,C_KAWARA);
    S(-5.6,5.3,5.7,2.0,8.4,0.4,C_KAWARA,[0.32,0.24,0.16,2]);
    S(-5.6,14.95,5.7,2.0,1.9,0.4,C_KAWARA,[0.32,0.24,0.16,2]);
    tierRoofBand(0,8.5,6.1,15.8,14.8,13.2,12.2,0.5,C_KAWARA);
    stairsY(-5.6,13.0,3,6,-1,1.8);
    S(-7,11.7,5.7,0.5,5.6,2.9,C_WALL,C_WALL); // shell wall continues above the 1F west face
    S(-5.3,15,5.7,4.8,0.5,2.9,C_WALL,C_WALL); // ...and above the 1F north face
    crateStack(4,13,3);barrel(5.5,11.8,3);barrel(-4,4,3);
    squeakBoard(2.2,3.6,3,2.4,1.6);
    andon(-4,8,4.2);andon(4,12,4.2);andon(2.2,4.6,4.0);
    // ===== 2F shell (floor 6.1) =====
    S(0,2.6,6.1,12.8,0.5,2.5,C_WALL,C_WALL);
    S(-3.7,14.4,6.1,5.4,0.5,2.5,C_WALL,C_WALL);
    S(3.7,14.4,6.1,5.4,0.5,2.5,C_WALL,C_WALL);
    S(0,14.4,6.1,2,0.5,1.0,C_WALL,C_WALL);  // north window sill (open z7.1-8.4)
    S(0,14.4,8.4,2,0.5,0.2,C_WALL,C_WALL);
    S(-6.4,8.5,6.1,0.5,11.8,2.5,C_WALL,C_WALL);
    S(6.4,8.5,6.1,0.5,11.8,2.5,C_WALL,C_WALL);
    squeakBoard(-3.5,8.5,6.1,2.4,5);
    squeakBoard(2,12,6.1,5,1.6);
    andon(0,4,7.3);andon(0,13,7.3);
    // 3F floor + eave (stairwell on the east)
    S(-1.5,8.5,8.6,11.8,13.8,0.4,C_KAWARA,[0.32,0.24,0.16,2]);
    S(6.9,8.5,8.6,1.0,13.8,0.4,C_KAWARA,C_KAWARA);
    S(5.4,5.05,8.6,2.0,6.9,0.4,C_KAWARA,[0.32,0.24,0.16,2]);
    S(5.4,14.7,8.6,2.0,1.4,0.4,C_KAWARA,[0.32,0.24,0.16,2]);
    tierRoofBand(0,8.5,9.0,14.8,13.8,12.0,11.0,0.5,C_KAWARA);
    stairsY(5.4,13.0,6.1,6,-1,1.8);
    S(6.4,11.7,8.6,0.5,5.6,2.9,C_WALL,C_WALL); // shell wall continues above the 2F east face
    S(5,14.4,8.6,4.8,0.5,2.9,C_WALL,C_WALL);  // ...and above the 2F north face
    // ===== 3F shell (floor 9.0) — armory =====
    S(0,3.2,9,11.6,0.5,2.5,C_WALL,C_WALL);
    S(0,13.8,9,11.6,0.5,2.5,C_WALL,C_WALL);
    S(-5.8,5.1,9,0.5,3.8,2.5,C_WALL,C_WALL);
    S(-5.8,11.4,9,0.5,4.8,2.5,C_WALL,C_WALL);
    S(-5.8,8,9,0.5,2,1.0,C_WALL,C_WALL);    // west window sill (open z10-11.2)
    S(-5.8,8,11.2,0.5,2,0.3,C_WALL,C_WALL);
    S(5.8,8.5,9,0.5,10.6,2.5,C_WALL,C_WALL);
    D(3,13.2,9,3,0.3,1.4,C_WOOD,C_WOOD); // weapon rack
    D(4.2,13.0,9.6,0.04,0.04,1.1,[0.8,0.82,0.9],[0.8,0.82,0.9],0.2);
    squeakBoard(0,8.5,9,2.4,2.4);
    andon(-4,5,10.2);andon(4,11,10.2);
    jizo(4.5,4.5,9); // last rest before the lord
    // 4F floor (stairwell west)
    S(2.0,8.5,11.5,9.6,12.6,0.4,C_KAWARA,C_TATAMI);
    S(-5.8,8.5,11.5,2.0,12.6,0.4,C_KAWARA,C_KAWARA);
    S(-3.8,5.85,11.5,2.0,7.3,0.4,C_KAWARA,C_TATAMI);
    S(-3.8,14.15,11.5,2.0,1.3,0.4,C_KAWARA,C_TATAMI);
    tierRoofBand(0,8.5,11.9,13.6,12.6,10.8,9.8,0.5,C_KAWARA);
    stairsY(-3.8,12.5,9.0,6,-1,1.8);
    S(-3.8,13.8,11.5,3.4,0.5,3.0,C_WALL,C_WALL); // shell wall continues above the 3F north face
    // ===== 4F shell — GOZA-NO-MA, the throne room (floor 11.9) =====
    S(0,3.8,11.9,10.4,0.5,3.2,C_WALL,C_WALL);
    S(0,13.2,11.9,10.4,0.5,3.2,C_WALL,C_WALL);
    S(-5.2,5.4,11.9,0.5,3.2,3.2,C_WALL,C_WALL);
    S(-5.2,11.6,11.9,0.5,3.2,3.2,C_WALL,C_WALL);
    S(-5.2,8.5,11.9,0.5,3,1.1,C_WALL,C_WALL);
    S(-5.2,8.5,14.2,0.5,3,0.9,C_WALL,C_WALL);
    S(5.2,5.4,11.9,0.5,3.2,3.2,C_WALL,C_WALL);
    S(5.2,11.6,11.9,0.5,3.2,3.2,C_WALL,C_WALL);
    S(5.2,8.5,11.9,0.5,3,1.1,C_WALL,C_WALL);
    S(5.2,8.5,14.2,0.5,3,0.9,C_WALL,C_WALL);
    // roof + golden shachihoko
    S(0,8.5,15.1,13.5,12.5,0.5,C_KAWARA,C_KAWARA);
    gableRoof(0,8.5,15.58,13.9,12.9,1.7,C_KAWARA,0);
    D(-4.2,8.5,17.18,0.5,0.4,0.7,C_GOLD,C_GOLD,0.5);
    D(4.2,8.5,17.18,0.5,0.4,0.7,C_GOLD,C_GOLD,0.5);
    // throne dais + pillars + braziers
    S(0,11.5,11.9,6,2.6,0.4,C_WOOD,C_TATAMI);
    D(0,12.9,12.3,5,0.15,1.6,C_GOLD,C_GOLD,0.3);
    S(-3.4,6,11.9,0.6,0.6,3.2,C_WOOD,C_WOOD);
    S(3.4,6,11.9,0.6,0.6,3.2,C_WOOD,C_WOOD);
    S(-3.4,10.6,11.9,0.6,0.6,3.2,C_WOOD,C_WOOD);
    S(3.4,10.6,11.9,0.6,0.6,3.2,C_WOOD,C_WOOD);
    andon(-4.2,4.8,13.1);andon(4.2,4.8,13.1);andon(-2,10.4,12.9);andon(2,10.4,12.9);
    // outside line: scale the eaves to the windows
    anchor(-11.6,8,3.5);anchor(7.7,8.8,4.9);anchor(0,15.0,7.8);anchor(7.5,8.5,8.8);anchor(-6.2,8,10.7);
    // lighting outside
    chochin(-2,-2,2.0);chochin(2,-2,2.0);
    chochin(-7,0.6,3.9);chochin(2.2,1.4,4.2);
    chochin(-10,-16,1.6);chochin(10,-16,1.6);
    // pickups
    var kb4=[[-4,-12,0.4],[6,-7,0.4],[-12,-12,0.4],[0,-6,0.4],[14,-4,0.4],
             [8,1.6,3.4],[-9,14,3.4],[5,8,3.4],[-5,5,3.4],
             [0,8.5,6.5],[4,4,6.5],
             [2,6,9.4],[3.4,7,9.4],[-3,11,9.4],[0,12,9.4]];
    for(var k4=0;k4<kb4.length;k4++)pickups.push({kind:'koban',x:kb4[k4][0],y:kb4[k4][1],z:kb4[k4][2],t:0});
    pickups.push({kind:'shubox',x:-4,y:10,z:9.4,t:0});
    pickups.push({kind:'onigiri',x:-5,y:13.5,z:3.4,t:0});
    pickups.push({kind:'onigiri',x:5,y:12.5,z:6.5,t:0});
    pickups.push({kind:'onigiri',x:-4.6,y:6.5,z:9.4,t:0});
    jizo(4,-18,0);
    // enemies
    spawnEnemy('ashigaru',0,-8,0,{patrol:[[-8,-8],[8,-8]],lantern:true});
    spawnEnemy('ashigaru',0,-14,0,{patrol:[[10,-14],[-10,-14]]});
    spawnEnemy('samurai',-6,-6,0,{facing:PI});
    spawnEnemy('ashigaru',0,4.5,3,{patrol:[[-4,4.5],[4,4.5]]});
    spawnEnemy('ashigaru',4,12,3,{facing:-PI/2});
    spawnEnemy('elite',0,5,6.1,{patrol:[[-2,5],[4,5]]});
    spawnEnemy('elite',0,12,6.1,{patrol:[[3,12],[-3,12]]});
    spawnEnemy('archer',4,8,6.1,{facing:-PI/2});
    spawnEnemy('samurai',0,8,9,{patrol:[[-3,6],[3,11]]});
    spawnEnemy('tono',0,11.5,12.3,{facing:PI});
    bossActive=false;
    fireflyCluster(-16,-16,3,5);fireflyCluster(16,-14,3,5);fireflyCluster(-20,-4,3,4);
    hintTrigs.push({y:-2,msg:'THE KEEP — take the stairs within, or scale the eaves without'});
    checkpoint=[4,-18,0];
    player.x=0;player.y=-20;player.z=0.5;
    exitGate=null;
  }

  var zoneFade=0,zoneFadeDir=0,pendingZone=-1;
  function buildZone(n){
    curZone=n;
    if(n===0)buildZone1();
    else if(n===1)buildZone2();
    else if(n===2)buildZone3();
    else buildZone4();
    bakeStatic();
    player.vx=player.vy=player.vz=0;
    player.grappling=false;player.atkPhase=0;player.combo=0;player.dashT=0;
    aimMode=false;
    if(aiMode){aiWpIdx=0;aiStuck=0;aiTimer=0;}
    announceZone(n);
  }
  function checkZoneExit(){
    if(!exitGate)return;
    if(player.y>exitGate.y){
      zoneFadeDir=1;zoneFade=0.001;
      pendingZone=curZone+1;
      exitGate=null;
      playSound('gong');
    }
  }
  function updateZoneFade(dt){
    if(zoneFadeDir===0)return;
    zoneFade+=dt*2*zoneFadeDir;
    if(zoneFadeDir===1&&zoneFade>=1){
      buildZone(pendingZone);
      zoneFadeDir=-1;
    }else if(zoneFadeDir===-1&&zoneFade<=0){
      zoneFade=0;zoneFadeDir=0;
    }
  }
  // ===== CHARACTER MODELS (articulated box rigs) =====
  function locX(a,lx,ly){return lx*Math.cos(a)+ly*Math.sin(a);}
  function locY(a,lx,ly){return -lx*Math.sin(a)+ly*Math.cos(a);}
  var C_NINJA=[0.16,0.19,0.30],C_NINJA_D=[0.11,0.13,0.22],C_SKIN=[0.85,0.70,0.58],C_SCARF=[0.80,0.16,0.18];
  var C_LACQ=[0.10,0.09,0.09],C_KYAHAN=[0.50,0.45,0.36],C_STEEL=[0.80,0.82,0.90];

  // tapered box: top face scaled by tsT, bottom by tsB (cones, helmets, skirts)
  function dynBoxT(cx,cy,cz,hx,hy,hz,yaw,pitch,roll,col,em,tsT,tsB){
    tsT=(tsT===undefined)?1:tsT;tsB=(tsB===undefined)?1:tsB;
    var cy_=Math.cos(yaw),sy_=Math.sin(yaw);
    var cp_=Math.cos(pitch||0),sp_=Math.sin(pitch||0);
    var cr_=Math.cos(roll||0),sr_=Math.sin(roll||0);
    var r00=cy_*cr_-sy_*sp_*sr_, r01=-sy_*cp_, r02=cy_*sr_+sy_*sp_*cr_;
    var r10=sy_*cr_+cy_*sp_*sr_, r11=cy_*cp_,  r12=sy_*sr_-cy_*sp_*cr_;
    var r20=-cp_*sr_,            r21=sp_,      r22=cp_*cr_;
    function tf(x,y,z,o){
      o[0]=cx+r00*x+r01*y+r02*z;
      o[1]=cy+r10*x+r11*y+r12*z;
      o[2]=cz+r20*x+r21*y+r22*z;
    }
    tf(-hx*tsB,-hy*tsB,-hz,_bc[0]);tf(hx*tsB,-hy*tsB,-hz,_bc[1]);tf(hx*tsB,hy*tsB,-hz,_bc[2]);tf(-hx*tsB,hy*tsB,-hz,_bc[3]);
    tf(-hx*tsT,-hy*tsT,hz,_bc[4]);tf(hx*tsT,-hy*tsT,hz,_bc[5]);tf(hx*tsT,hy*tsT,hz,_bc[6]);tf(-hx*tsT,hy*tsT,hz,_bc[7]);
    var _m=col[3]||0;
    var r=col[0],g=col[1],b=col[2];
    var nE=[r00,r10,r20],nW=[-r00,-r10,-r20];
    var nN=[r01,r11,r21],nS=[-r01,-r11,-r21];
    var nU=[r02,r12,r22],nD=[-r02,-r12,-r22];
    dynQuad(_bc[4],_bc[5],_bc[6],_bc[7],nU,r,g,b,em,_m);
    dynQuad(_bc[3],_bc[2],_bc[1],_bc[0],nD,r*0.5,g*0.5,b*0.5,em,_m);
    dynQuad(_bc[1],_bc[2],_bc[6],_bc[5],nE,r,g,b,em,_m);
    dynQuad(_bc[3],_bc[0],_bc[4],_bc[7],nW,r,g,b,em,_m);
    dynQuad(_bc[2],_bc[3],_bc[7],_bc[6],nN,r,g,b,em,_m);
    dynQuad(_bc[0],_bc[1],_bc[5],_bc[4],nS,r,g,b,em,_m);
  }
  // a limb segment hanging from a pivot, pitched forward by ang; leaves the end in _limbEnd
  var _limbEnd=[0,0,0];
  function limbSeg(px,py,pz,a,ang,len,thx,thy,col,em){
    var f=Math.sin(ang)*len,d=-Math.cos(ang)*len;
    dynBoxRot(px+locX(a,0,f/2),py+locY(a,0,f/2),pz+d/2,thx,thy,len/2,-a,ang,0,col,em||0);
    _limbEnd[0]=px+locX(a,0,f);_limbEnd[1]=py+locY(a,0,f);_limbEnd[2]=pz+d;
  }
  // two articulated legs with knees + feet; ph drives the walk cycle
  function legPair(x,y,hipZ,a,ph,amp,crouch,thT,thS,lenT,lenS,colT,colS,colF,lat){
    for(var s2=-1;s2<=1;s2+=2){
      var phl=ph+(s2>0?0:PI);
      var tA=Math.sin(phl)*amp+crouch;
      var kB=Math.max(0,Math.sin(phl-1.2))*amp*1.4+crouch*0.4;
      limbSeg(x+locX(a,s2*lat,0),y+locY(a,s2*lat,0),hipZ,a,tA,lenT,thT,thT*1.05,colT);
      limbSeg(_limbEnd[0],_limbEnd[1],_limbEnd[2],a,tA-kB,lenS,thS,thS,colS);
      dynBoxRot(_limbEnd[0]+locX(a,0,0.05),_limbEnd[1]+locY(a,0,0.05),_limbEnd[2]+0.035,thS*1.15,0.10,0.035,-a,0,0,colF,0);
    }
  }
  // two arms; returns nothing but stores hand positions in _handR/_handL
  var _handR=[0,0,0],_handL=[0,0,0];
  function armPair(x,y,shZ,a,lat,swing,rU,rF,lU,lF,thU,thF,lenU,lenF,colU,colF,skin){
    limbSeg(x+locX(a,lat,0),y+locY(a,lat,0),shZ,a,rU,lenU,thU,thU,colU);
    limbSeg(_limbEnd[0],_limbEnd[1],_limbEnd[2],a,rF,lenF,thF,thF,colF);
    _handR[0]=_limbEnd[0];_handR[1]=_limbEnd[1];_handR[2]=_limbEnd[2];
    if(skin)dynBoxRot(_handR[0],_handR[1],_handR[2],0.04,0.045,0.04,-a,0,0,skin,0);
    limbSeg(x+locX(a,-lat,0),y+locY(a,-lat,0),shZ,a,lU,lenU,thU,thU,colU);
    limbSeg(_limbEnd[0],_limbEnd[1],_limbEnd[2],a,lF,lenF,thF,thF,colF);
    _handL[0]=_limbEnd[0];_handL[1]=_limbEnd[1];_handL[2]=_limbEnd[2];
    if(skin)dynBoxRot(_handL[0],_handL[1],_handL[2],0.04,0.045,0.04,-a,0,0,skin,0);
  }
  // kusazuri: armored skirt plates flaring from the waist
  function kusazuri(x,y,z,a,col,n,r,flare){
    for(var i=0;i<n;i++){
      var pa=a+(i/n)*TAU;
      dynBoxT(x+locX(pa,0,r),y+locY(pa,0,r),z,0.085,0.028,0.085,-pa,flare,0,col,0,0.8,1.25);
    }
  }

  var dashTrailPos=[]; // afterimage history
  function drawNinjaCling(){
    var nx=player.clingNx,ny=player.clingNy;
    var a=Math.atan2(nx,ny),yaw=-a; // facing out from the wall
    var tx=-ny,ty=nx;
    var x=player.x-nx*0.06,y=player.y-ny*0.06,z=player.z;
    var lean=player.peek*0.35;
    var hipZ=z+0.62;
    // legs pressed together, knees eased off the wall
    limbSeg(x+tx*0.07,y+ty*0.07,hipZ,a,0.28,0.30,0.068,0.075,C_NINJA);
    limbSeg(_limbEnd[0],_limbEnd[1],_limbEnd[2],a,-0.34,0.27,0.055,0.06,C_NINJA_D);
    dynBoxRot(_limbEnd[0]+locX(a,0,0.05),_limbEnd[1]+locY(a,0,0.05),_limbEnd[2]+0.035,0.06,0.10,0.035,yaw,0,0,C_NINJA_D,0);
    limbSeg(x-tx*0.07,y-ty*0.07,hipZ,a,0.28,0.30,0.068,0.075,C_NINJA);
    limbSeg(_limbEnd[0],_limbEnd[1],_limbEnd[2],a,-0.34,0.27,0.055,0.06,C_NINJA_D);
    dynBoxRot(_limbEnd[0]+locX(a,0,0.05),_limbEnd[1]+locY(a,0,0.05),_limbEnd[2]+0.035,0.06,0.10,0.035,yaw,0,0,C_NINJA_D,0);
    // hips + obi + knot
    dynBoxRot(x,y,hipZ+0.03,0.150,0.095,0.065,yaw,-0.08,0,C_NINJA_D,0);
    dynBoxRot(x,y,hipZ+0.115,0.160,0.105,0.034,yaw,-0.08,0,[0.45,0.10,0.12],0.08);
    dynBoxRot(x+locX(a,0,-0.10),y+locY(a,0,-0.10),hipZ+0.11,0.05,0.04,0.05,yaw,0,0,[0.45,0.10,0.12],0.05);
    // torso flattened against the wall, leaning into the peek
    var chestZ=hipZ+0.30;
    dynBoxT(x+tx*lean*0.4,y+ty*lean*0.4,chestZ,0.150,0.085,0.165,yaw,-0.12,lean,C_NINJA,0,1.22,0.92);
    dynBoxRot(x+tx*lean*0.4+locX(a,0,0.072),y+ty*lean*0.4+locY(a,0,0.072),chestZ+0.05,0.112,0.028,0.10,yaw,-0.12,lean,C_NINJA_D,0);
    // arms spread wide along the wall face (upper + forearm + hand)
    var shZ=chestZ+0.15;
    for(var s2=-1;s2<=1;s2+=2){
      dynBoxRot(x+tx*s2*0.27,y+ty*s2*0.27,shZ-0.01,0.046,0.05,0.115,yaw,0,s2*1.30,C_NINJA,0);
      dynBoxRot(x+tx*s2*0.45,y+ty*s2*0.45,shZ-0.055,0.040,0.046,0.10,yaw,0,s2*1.48,C_NINJA,0);
      dynBoxRot(x+tx*s2*0.555,y+ty*s2*0.555,shZ-0.075,0.038,0.042,0.038,yaw,0,s2*1.48,C_SKIN,0);
    }
    // shoulder pads
    dynBoxT(x+tx*0.205,y+ty*0.205,shZ+0.05,0.066,0.072,0.032,yaw,0,0.45,C_NINJA_D,0,0.78);
    dynBoxT(x-tx*0.205,y-ty*0.205,shZ+0.05,0.066,0.072,0.032,yaw,0,-0.45,C_NINJA_D,0,0.78);
    // head turned to scan past the corner
    var hdZ=chestZ+0.295;
    var hYaw=yaw-player.peek*0.8,hA=a+player.peek*0.8;
    var hx=x+tx*lean*0.9,hy=y+ty*lean*0.9;
    dynBoxRot(hx,hy,hdZ-0.075,0.045,0.045,0.04,yaw,0,0,C_SKIN,0);
    dynBoxT(hx,hy,hdZ+0.06,0.112,0.118,0.112,hYaw,0,0,C_NINJA,0,0.84);
    dynBoxT(hx-Math.sin(hA)*0.065,hy-Math.cos(hA)*0.065,hdZ+0.155,0.07,0.08,0.05,hYaw,-0.5,0,C_NINJA_D,0,0.45);
    dynBoxRot(hx+Math.sin(hA)*0.103,hy+Math.cos(hA)*0.103,hdZ+0.08,0.092,0.022,0.036,hYaw,0,0,C_SKIN,0.04);
    dynBoxRot(hx+Math.sin(hA)*0.116+Math.cos(hA)*0.043,hy+Math.cos(hA)*0.116-Math.sin(hA)*0.043,hdZ+0.08,0.02,0.012,0.018,hYaw,0,0,[0.05,0.05,0.07],0);
    dynBoxRot(hx+Math.sin(hA)*0.116-Math.cos(hA)*0.043,hy+Math.cos(hA)*0.116+Math.sin(hA)*0.043,hdZ+0.08,0.02,0.012,0.018,hYaw,0,0,[0.05,0.05,0.07],0);
    // saya lies flat along the wall behind the shoulder
    dynBoxRot(x-nx*0.10+tx*0.05,y-ny*0.10+ty*0.05,chestZ+0.12,0.034,0.034,0.29,yaw,0,1.05,C_LACQ,0);
    // scarf hangs flat against the wall, away from the peek side
    for(var sc=0;sc<3;sc++){
      var szz=hdZ-0.02-sc*0.06+Math.sin(player.scarfT*1.6-sc)*0.02;
      dynBoxRot(x-tx*(0.06+sc*0.05)-nx*0.06,y-ty*(0.06+sc*0.05)-ny*0.06,szz,0.055-sc*0.009,0.05,0.03,yaw,0,0,C_SCARF,0.10);
    }
  }
  function drawNinjaRoll(){
    var x=player.x,y=player.y,a=player.facing,yaw=-a;
    var side=(player.rollDir==='a'||player.rollDir==='d');
    var dirSign=(player.rollDir==='s'||player.rollDir==='a')?-1:1;
    var sp=(player.rollSpin/ROLL_T)*TAU*dirSign;
    var cz=player.z+0.46,cs=Math.cos(sp),sn=Math.sin(sp);
    function place(f,t,u,hx,hy,hz,col,em){
      var f2,t2,u2;
      if(side){t2=t*cs-u*sn;u2=t*sn+u*cs;f2=f;}
      else{f2=f*cs-u*sn;u2=f*sn+u*cs;t2=t;}
      dynBoxT(x+locX(a,t2,f2),y+locY(a,t2,f2),cz+u2,hx,hy,hz,yaw,side?0:sp,side?sp:0,col,em||0,1,1);
    }
    place(0,0,0,0.155,0.135,0.16,C_NINJA,0);
    place(0,0,-0.16,0.135,0.12,0.075,[0.45,0.10,0.12],0.06);
    place(0.17,0,0.05,0.105,0.11,0.10,C_NINJA,0);
    place(0.15,0.10,-0.13,0.07,0.06,0.10,C_NINJA_D,0);
    place(0.15,-0.10,-0.13,0.07,0.06,0.10,C_NINJA_D,0);
    place(0.04,0.14,-0.02,0.05,0.055,0.09,C_NINJA,0);
    place(0.04,-0.14,-0.02,0.05,0.055,0.09,C_NINJA,0);
    for(var sc=0;sc<3;sc++)place(-0.18-sc*0.12,0,0.08,0.05-sc*0.01,0.07,0.025,C_SCARF,0.10);
    dashTrailPos.unshift([x,y,player.z]);if(dashTrailPos.length>5)dashTrailPos.length=5;
  }
  function drawNinja(){
    if(player.cling){drawNinjaCling();return;}
    if(player.rollT>0){drawNinjaRoll();return;}
    var x=player.x,y=player.y,z=player.z,a=player.facing,yaw=-a;
    var sneak=keys.sneak&&player.grounded?1:0;
    var moving=Math.abs(player.vx)+Math.abs(player.vy)>0.5;
    var ph=player.runPhase;
    var amp=moving?0.62:0;
    var air=!player.grounded;
    var crouchZ=sneak*0.14+player.landDip*0.08;
    var hipZ=z+0.64-crouchZ;
    var lean=(moving?0.14:0)+sneak*0.30;
    if(air){
      // tucked jump
      limbSeg(x+locX(a,0.09,0),y+locY(a,0.09,0),hipZ,a,0.7,0.30,0.068,0.075,C_NINJA);
      limbSeg(_limbEnd[0],_limbEnd[1],_limbEnd[2],a,-0.4,0.26,0.055,0.06,C_NINJA_D);
      limbSeg(x+locX(a,-0.09,0),y+locY(a,-0.09,0),hipZ,a,1.0,0.30,0.068,0.075,C_NINJA);
      limbSeg(_limbEnd[0],_limbEnd[1],_limbEnd[2],a,-0.2,0.26,0.055,0.06,C_NINJA_D);
    }else{
      legPair(x,y,hipZ,a,ph,amp,sneak*0.45,0.068,0.055,0.30,0.27,C_NINJA,C_NINJA_D,C_NINJA_D,0.09);
    }
    // hips + obi + knot
    dynBoxRot(x,y,hipZ+0.03,0.150,0.105,0.065,yaw,lean*0.4,0,C_NINJA_D,0);
    dynBoxRot(x,y,hipZ+0.115,0.160,0.115,0.034,yaw,lean*0.5,0,[0.45,0.10,0.12],0.08);
    dynBoxRot(x+locX(a,0,-0.12),y+locY(a,0,-0.12),hipZ+0.11,0.05,0.04,0.05,yaw,0,0,[0.45,0.10,0.12],0.05);
    // torso (tapers up into the shoulders) + chest wrap
    var chestZ=hipZ+0.30;
    dynBoxT(x,y,chestZ,0.142,0.098,0.165,yaw,lean,0,C_NINJA,0,1.25,0.92);
    dynBoxRot(x+locX(a,0,0.082),y+locY(a,0,0.082),chestZ+0.05,0.112,0.03,0.10,yaw,lean,0,C_NINJA_D,0);
    // arms (right arm carries the swing)
    var shZ=chestZ+0.155,shLat=0.205;
    var armSw=moving?Math.sin(ph+PI)*0.5:0;
    var rU=armSw*0.8+0.12,rF=armSw*0.6+0.35;
    if(player.atkPhase===1){rU=-2.3;rF=-2.0;}
    else if(player.atkPhase===2){rU=1.5;rF=1.7;}
    else if(player.atkPhase===3){rU=0.7;rF=1.0;}
    armPair(x,y,shZ,a,shLat,armSw,rU,rF,-armSw*0.8+0.12,-armSw*0.5+0.35,
      0.048,0.040,0.20,0.18,C_NINJA,C_NINJA,C_SKIN);
    // shoulder pads
    dynBoxT(x+locX(a,shLat,0),y+locY(a,shLat,0),shZ+0.045,0.068,0.075,0.034,yaw,0,0.25,C_NINJA_D,0,0.78);
    dynBoxT(x+locX(a,-shLat,0),y+locY(a,-shLat,0),shZ+0.045,0.068,0.075,0.034,yaw,0,-0.25,C_NINJA_D,0,0.78);
    // neck, hooded head, eye band + eyes, hood fold
    var hdZ=chestZ+0.295;
    dynBoxRot(x,y,hdZ-0.075,0.045,0.045,0.04,yaw,0,0,C_SKIN,0);
    dynBoxT(x,y,hdZ+0.06,0.112,0.118,0.112,yaw,lean*0.3,0,C_NINJA,0,0.84);
    dynBoxT(x+locX(a,0,-0.065),y+locY(a,0,-0.065),hdZ+0.155,0.07,0.08,0.05,yaw,-0.5,0,C_NINJA_D,0,0.45);
    dynBoxRot(x+locX(a,0,0.103),y+locY(a,0,0.103),hdZ+0.08,0.092,0.022,0.036,yaw,0,0,C_SKIN,0.04);
    dynBoxRot(x+locX(a,0.043,0.116),y+locY(a,0.043,0.116),hdZ+0.08,0.02,0.012,0.018,yaw,0,0,[0.05,0.05,0.07],0);
    dynBoxRot(x+locX(a,-0.043,0.116),y+locY(a,-0.043,0.116),hdZ+0.08,0.02,0.012,0.018,yaw,0,0,[0.05,0.05,0.07],0);
    // katana: in the right hand mid-swing, otherwise slung across the back
    if(player.atkPhase>0){
      var swingRoll=player.atkPhase===2?(player.combo%2?1.2:-1.2):(player.combo%2?-0.9:0.9);
      dynBoxRot(_handR[0]+locX(a,0,0.26),_handR[1]+locY(a,0,0.26),_handR[2]+0.05,0.018,0.30,0.018,yaw,0.2,swingRoll,C_STEEL,0.4);
      dynBoxRot(_handR[0],_handR[1],_handR[2]+0.01,0.024,0.07,0.024,yaw,0.2,swingRoll,C_LACQ,0);
    }
    dynBoxRot(x+locX(a,0.06,-0.155),y+locY(a,0.06,-0.155),chestZ+0.10,0.034,0.034,0.29,yaw,0.5,0.95,C_LACQ,0);
    dynBoxRot(x+locX(a,-0.10,-0.19),y+locY(a,-0.10,-0.19),chestZ+0.26,0.027,0.027,0.085,yaw,0.5,0.95,[0.55,0.50,0.42],0.05);
    // scarf: four trailing segments
    for(var sc=0;sc<4;sc++){
      var lag=sc*0.13+0.10;
      var flow=Math.sin(player.scarfT*1.6-sc*1.3)*0.14;
      var sx=x+locX(a,flow,-lag-0.08);
      var sy=y+locY(a,flow,-lag-0.08);
      var szz=hdZ-0.02-sc*0.045+Math.sin(player.scarfT*2-sc*1.2)*0.05;
      dynBoxRot(sx,sy,szz,0.06-sc*0.009,0.085,0.026,yaw,0.15,flow*2.2,C_SCARF,0.10);
    }
    if(player.dashT>0){
      dashTrailPos.unshift([x,y,z]);
      if(dashTrailPos.length>6)dashTrailPos.length=6;
    }else if(dashTrailPos.length)dashTrailPos.length=0;
  }

  function alertEyes(e,hx,hy,hz,yaw){
    var col,em;
    if(e.alerted){col=[1.0,0.15,0.10];em=1;}
    else if(e.susp>0.15){col=[0.95,0.8,0.2];em=0.8;}
    else{col=[0.05,0.05,0.05];em=0;}
    var a=e.facing;
    dynBoxRot(hx+locX(a,0.05,0.115),hy+locY(a,0.05,0.115),hz,0.022,0.014,0.022,yaw,0,0,col,em);
    dynBoxRot(hx+locX(a,-0.05,0.115),hy+locY(a,-0.05,0.115),hz,0.022,0.014,0.022,yaw,0,0,col,em);
  }
  function drawEnemy(e){
    var x=e.x,y=e.y,z=e.z,a=e.facing,yaw=-a;
    var d=e.def;
    var col=e.flash>0?[1,1,1]:d.col;
    var colD=[col[0]*0.7,col[1]*0.7,col[2]*0.7];
    var bob=Math.sin(e.bob)*0.018;
    var telegraph=e.atkPhase===1||(d.boss&&e.bossAtk===1&&e.atkAnimT>0);
    // walk cycle driven by actual ground covered
    var mv=dist2d(x,y,e._lx===undefined?x:e._lx,e._ly===undefined?y:e._ly);
    e._lx=x;e._ly=y;
    e.walkPh=(e.walkPh||0)+mv*6.5;
    e._amp=lerp(e._amp||0,mv>0.0008?0.5:0,0.18);
    var ph=e.walkPh,amp=e._amp;
    var armSw=amp>0.05?Math.sin(ph+PI)*amp*0.8:0;

    if(e.kind==='ashigaru'){
      var hipZ=z+0.72;
      legPair(x,y,hipZ,a,ph,amp,0,0.072,0.058,0.34,0.30,col,C_KYAHAN,[0.35,0.30,0.22],0.095);
      kusazuri(x,y,hipZ+0.02,a,[0.24,0.18,0.12],4,0.13,0.30);
      // do (chest armor) over the uniform
      dynBoxT(x,y,hipZ+0.21+bob,0.165,0.115,0.12,yaw,0,0,col,0,1.05,0.92);
      dynBoxT(x,y,hipZ+0.33+bob,0.185,0.135,0.105,yaw,0,0,[0.28,0.21,0.14],0,1.0,0.9);
      dynBoxRot(x+locX(a,0,0.105),y+locY(a,0,0.105),hipZ+0.33+bob,0.13,0.025,0.07,yaw,0,0,[0.34,0.26,0.18],0); // breastplate band
      // arms: spear leveled when alerted
      var shZ2=hipZ+0.44+bob;
      var rU2=e.alerted?1.25:(armSw+0.15),rF2=e.alerted?1.5:(armSw*0.6+0.4);
      armPair(x,y,shZ2,a,0.20,armSw,rU2,rF2,e.alerted?0.9:(-armSw+0.15),e.alerted?1.3:(-armSw*0.6+0.4),
        0.046,0.04,0.20,0.18,col,col,C_SKIN);
      // neck + head + hachimaki + jingasa cone
      var hdZ2=hipZ+0.66;
      dynBoxRot(x,y,hdZ2-0.06,0.04,0.04,0.035,yaw,0,0,C_SKIN,0);
      dynBoxRot(x,y,hdZ2+0.045,0.105,0.105,0.095,yaw,0,0,C_SKIN,0);
      dynBoxRot(x+locX(a,0,0.02),y+locY(a,0,0.02),hdZ2+0.105,0.108,0.108,0.018,yaw,0,0,[0.75,0.72,0.65],0);
      dynBoxT(x,y,hdZ2+0.20,0.275,0.275,0.085,yaw,0,0,[0.25,0.21,0.14],0,0.16);
      dynBoxRot(x,y,hdZ2+0.30,0.028,0.028,0.022,yaw,0,0,[0.32,0.27,0.18],0);
      alertEyes(e,x,y,hdZ2+0.05,yaw);
      // yari: rests upright at the shoulder when calm, leveled from the hand when alerted
      var spearPitch,sx2,sy2,sz2;
      if(e.alerted){spearPitch=1.40;sx2=_handR[0];sy2=_handR[1];sz2=_handR[2]+0.02;}
      else{spearPitch=-0.14;sx2=x+locX(a,0.21,-0.03);sy2=y+locY(a,0.21,-0.03);sz2=z+0.92;}
      dynBoxRot(sx2,sy2,sz2,0.024,0.024,0.85,yaw,spearPitch,0,[0.32,0.22,0.12],0);
      var tipD=0.92;
      dynBoxT(sx2+locX(a,0,Math.sin(spearPitch)*tipD),sy2+locY(a,0,Math.sin(spearPitch)*tipD),
        sz2+Math.cos(spearPitch)*tipD,0.035,0.035,0.10,yaw,spearPitch,0,
        telegraph?[1,0.4,0.2]:C_STEEL,telegraph?0.9:0.18,0.1);
      if(e.lantern){
        var lx2=_handL[0],ly2=_handL[1];
        dynBoxRot(lx2,ly2,_handL[2]-0.10+Math.sin(e.bob*2)*0.03,0.09,0.09,0.12,yaw,0,0,C_CHOCHIN,1);
        dynBoxRot(lx2,ly2,_handL[2]-0.005,0.012,0.012,0.10,yaw,0,0,[0.3,0.22,0.14],0);
      }
    }else if(e.kind==='archer'){
      var hipZ3=z+0.70;
      legPair(x,y,hipZ3,a,ph,amp,0,0.062,0.05,0.33,0.29,col,C_KYAHAN,[0.35,0.30,0.22],0.085);
      dynBoxRot(x,y,hipZ3+0.05,0.13,0.095,0.05,yaw,0,0,[0.30,0.24,0.16],0); // obi
      dynBoxT(x,y,hipZ3+0.24+bob,0.15,0.105,0.17,yaw,0.06,0,col,0,1.12,0.9);
      // muneate (chest guard)
      dynBoxRot(x+locX(a,0,0.085),y+locY(a,0,0.085),hipZ3+0.30+bob,0.105,0.025,0.11,yaw,0.06,0,[0.20,0.15,0.10],0);
      var shZ3=hipZ3+0.42+bob;
      // alerted: left arm extends the bow, right draws
      var lU3=e.alerted?1.5:(-armSw+0.12),lF3=e.alerted?1.55:(-armSw*0.6+0.35);
      var rU3=e.alerted?1.1:(armSw+0.12),rF3=e.alerted?2.0:(armSw*0.6+0.35);
      armPair(x,y,shZ3,a,0.185,armSw,rU3,rF3,lU3,lF3,0.042,0.036,0.19,0.17,col,col,C_SKIN);
      var hdZ3=hipZ3+0.63;
      dynBoxRot(x,y,hdZ3-0.055,0.038,0.038,0.032,yaw,0,0,C_SKIN,0);
      dynBoxRot(x,y,hdZ3+0.045,0.10,0.10,0.092,yaw,0,0,C_SKIN,0);
      dynBoxRot(x,y,hdZ3+0.125,0.105,0.105,0.022,yaw,0,0,[0.2,0.18,0.14],0); // skull cap
      alertEyes(e,x,y,hdZ3+0.05,yaw);
      // yumi (tall bow) in the left hand: grip + two curved limbs + string
      var bx=_handL[0],by=_handL[1],bz=_handL[2];
      dynBoxRot(bx,by,bz,0.018,0.026,0.09,yaw,0,0,[0.35,0.24,0.14],0);
      dynBoxRot(bx+locX(a,0,0.05),by+locY(a,0,0.05),bz+0.27,0.014,0.014,0.20,yaw,0.30,0,[0.35,0.24,0.14],0);
      dynBoxRot(bx+locX(a,0,0.05),by+locY(a,0,0.05),bz-0.27,0.014,0.014,0.20,yaw,-0.30,0,[0.35,0.24,0.14],0);
      dynBoxRot(bx+locX(a,0,0.115),by+locY(a,0,0.115),bz,0.005,0.005,0.40,yaw,0,0,[0.8,0.78,0.7],0.1);
      // quiver with two arrows
      var qx=x+locX(a,-0.16,-0.14),qy=y+locY(a,-0.16,-0.14);
      dynBoxRot(qx,qy,hipZ3+0.36,0.05,0.05,0.16,yaw,0.35,0,[0.28,0.20,0.12],0);
      dynBoxRot(qx,qy,hipZ3+0.56,0.008,0.008,0.10,yaw,0.35,0,[0.6,0.55,0.45],0);
      dynBoxRot(qx+locX(a,0.03,0),qy+locY(a,0.03,0),hipZ3+0.60,0.022,0.022,0.025,yaw,0.35,0,[0.85,0.85,0.9],0.1);
    }else if(e.kind==='samurai'||e.kind==='elite'){
      var hipZ4=z+0.80;
      legPair(x,y,hipZ4,a,ph,amp,0,0.082,0.066,0.36,0.32,colD,C_LACQ,C_LACQ,0.105);
      kusazuri(x,y,hipZ4+0.03,a,colD,5,0.155,0.34);
      // do with lacing bands
      dynBoxT(x,y,hipZ4+0.24+bob,0.205,0.15,0.20,yaw,0,0,col,0,1.06,0.88);
      dynBoxRot(x+locX(a,0,0.135),y+locY(a,0,0.135),hipZ4+0.20+bob,0.15,0.022,0.025,yaw,0,0,C_GOLD,0.12);
      dynBoxRot(x+locX(a,0,0.14),y+locY(a,0,0.14),hipZ4+0.30+bob,0.155,0.022,0.025,yaw,0,0,C_GOLD,0.12);
      var shZ4=hipZ4+0.46+bob;
      var kRaise=e.atkPhase===1?-2.2:(e.atkPhase===2?1.3:0);
      var rU4=e.atkPhase>0?kRaise:(e.alerted?0.5:(armSw+0.1));
      var rF4=e.atkPhase>0?kRaise*0.9:(e.alerted?0.9:(armSw*0.6+0.3));
      armPair(x,y,shZ4,a,0.245,armSw,rU4,rF4,
        e.alerted?0.45:(-armSw+0.1),e.alerted?0.85:(-armSw*0.6+0.3),
        0.055,0.05,0.21,0.19,col,C_LACQ,C_SKIN);
      // sode (big shoulder plates)
      dynBoxT(x+locX(a,0.27,0),y+locY(a,0.27,0),shZ4-0.02,0.085,0.115,0.085,yaw,0,0.55,colD,0,0.75,1.15);
      dynBoxT(x+locX(a,-0.27,0),y+locY(a,-0.27,0),shZ4-0.02,0.085,0.115,0.085,yaw,0,-0.55,colD,0,0.75,1.15);
      // head: menpo mask + kabuto bowl + shikoro + maedate
      var hdZ4=hipZ4+0.70;
      dynBoxRot(x,y,hdZ4-0.06,0.045,0.045,0.035,yaw,0,0,C_SKIN,0);
      dynBoxRot(x,y,hdZ4+0.05,0.105,0.108,0.10,yaw,0,0,C_SKIN,0);
      dynBoxRot(x+locX(a,0,0.075),y+locY(a,0,0.075),hdZ4+0.005,0.085,0.04,0.05,yaw,0,0,C_LACQ,0); // menpo
      dynBoxT(x,y,hdZ4+0.175,0.135,0.14,0.07,yaw,0,0,C_LACQ,0,0.62);
      dynBoxT(x+locX(a,0,-0.045),y+locY(a,0,-0.045),hdZ4+0.10,0.115,0.10,0.045,yaw,0.25,0,C_LACQ,0,0.8,1.45); // shikoro
      dynBoxRot(x+locX(a,0,0.105),y+locY(a,0,0.105),hdZ4+0.225,0.085,0.015,0.075,yaw,-0.15,0,C_GOLD,e.kind==='samurai'?0.55:0.3); // maedate
      alertEyes(e,x,y,hdZ4+0.06,yaw);
      // katana follows the right hand
      var kPitch=e.atkPhase===1?-2.0:(e.atkPhase===2?1.1:0.35);
      dynBoxRot(_handR[0]+locX(a,0,Math.sin(kPitch)*0.26),_handR[1]+locY(a,0,Math.sin(kPitch)*0.26),
        _handR[2]+Math.cos(kPitch)*0.26+0.02,0.02,0.02,0.30,yaw,kPitch,0,
        telegraph?[1,0.4,0.2]:C_STEEL,telegraph?0.9:0.2);
    }else if(e.kind==='tono'){
      var ph2=e.phase===2;
      var hipZ5=z+0.92;
      // wide hakama flares over the legs
      dynBoxT(x+locX(a,0.14,0),y+locY(a,0.14,0),z+0.48,0.135,0.135,0.46,yaw,Math.sin(ph)*amp*0.5,0,C_LACQ,0,0.62,1.15);
      dynBoxT(x+locX(a,-0.14,0),y+locY(a,-0.14,0),z+0.48,0.135,0.135,0.46,yaw,-Math.sin(ph)*amp*0.5,0,C_LACQ,0,0.62,1.15);
      dynBoxRot(x+locX(a,0.13,0.04),y+locY(a,0.13,0.04),z+0.03,0.085,0.13,0.035,yaw,0,0,[0.2,0.18,0.16],0);
      dynBoxRot(x+locX(a,-0.13,0.04),y+locY(a,-0.13,0.04),z+0.03,0.085,0.13,0.035,yaw,0,0,[0.2,0.18,0.16],0);
      // obi + do
      dynBoxRot(x,y,hipZ5+0.05,0.215,0.16,0.06,yaw,0,0,[0.35,0.28,0.14],0.08);
      dynBoxT(x,y,hipZ5+0.28+bob,0.235,0.17,0.22,yaw,0,0,col,0,1.08,0.9);
      // jinbaori (gold war coat, phase 1) — chest trim + flowing back panel
      if(!ph2){
        dynBoxRot(x+locX(a,0,0.155),y+locY(a,0,0.155),hipZ5+0.30+bob,0.17,0.025,0.18,yaw,0,0,C_GOLD,0.3);
        dynBoxT(x+locX(a,0,-0.20),y+locY(a,0,-0.20),hipZ5+0.05,0.20,0.05,0.34,yaw,-0.12,0,C_GOLD,0.25,0.85,1.2);
      }
      var shZ5=hipZ5+0.50+bob;
      var bRaise=e.bossAtk===1?-2.2:0;
      armPair(x,y,shZ5,a,0.30,armSw,
        e.bossAtk===1?bRaise:0.35,e.bossAtk===1?bRaise*0.9:0.7,
        0.30,0.65,0.062,0.055,0.23,0.21,col,C_LACQ,C_SKIN);
      dynBoxT(x+locX(a,0.32,0),y+locY(a,0.32,0),shZ5,0.10,0.13,0.09,yaw,0,0.5,col,0,0.75,1.2);
      dynBoxT(x+locX(a,-0.32,0),y+locY(a,-0.32,0),shZ5,0.10,0.13,0.09,yaw,0,-0.5,col,0,0.75,1.2);
      // head + great kabuto + crescent
      var hdZ5=hipZ5+0.78;
      dynBoxRot(x,y,hdZ5-0.06,0.05,0.05,0.04,yaw,0,0,C_SKIN,0);
      dynBoxRot(x,y,hdZ5+0.06,0.115,0.115,0.105,yaw,0,0,C_SKIN,0);
      dynBoxRot(x+locX(a,0,0.08),y+locY(a,0,0.08),hdZ5+0.005,0.09,0.04,0.05,yaw,0,0,C_LACQ,0);
      dynBoxT(x,y,hdZ5+0.20,0.15,0.155,0.08,yaw,0,0,[0.08,0.08,0.10],0,0.6);
      dynBoxT(x+locX(a,0,-0.05),y+locY(a,0,-0.05),hdZ5+0.115,0.125,0.11,0.05,yaw,0.25,0,[0.08,0.08,0.10],0,0.8,1.5);
      dynBoxRot(x+locX(a,0,0.13),y+locY(a,0,0.13),hdZ5+0.27,0.16,0.018,0.05,yaw,0,0,[0.95,0.80,0.35],ph2?1:0.8);
      dynBoxRot(x+locX(a,0,0.13),y+locY(a,0,0.13),hdZ5+0.33,0.055,0.018,0.07,yaw,0,0,[0.95,0.80,0.35],ph2?1:0.8);
      if(ph2){
        dynBoxRot(x+locX(a,0.06,0.13),y+locY(a,0.06,0.13),hdZ5+0.07,0.03,0.018,0.03,yaw,0,0,[1,0.1,0.1],1);
        dynBoxRot(x+locX(a,-0.06,0.13),y+locY(a,-0.06,0.13),hdZ5+0.07,0.03,0.018,0.03,yaw,0,0,[1,0.1,0.1],1);
      }
      // odachi: glows red through the iai telegraph
      var tg=e.bossAtk===1;
      var bPitch=tg?-2.1:0.5;
      dynBoxRot(_handR[0]+locX(a,0,Math.sin(bPitch)*0.38),_handR[1]+locY(a,0,Math.sin(bPitch)*0.38),
        _handR[2]+Math.cos(bPitch)*0.38+0.02,0.026,0.026,0.42,yaw,bPitch,0,
        tg?[1,0.35,0.18]:C_STEEL,tg?1:0.3);
    }
  }
  function drawCorpse(co){
    var sink=co.t<1?(1-co.t)*0.6:0;
    var tilt=Math.min(1.35,(10-co.t)*4);
    var a=co.facing,yaw=-a;
    var col=[co.def.col[0]*0.6,co.def.col[1]*0.6,co.def.col[2]*0.6];
    // lower half tips forward, upper half slides and tips back
    dynBoxRot(co.x,co.y,co.z+0.3-sink,0.18,0.14,0.3,yaw,tilt,0,col,0);
    dynBoxRot(co.x+locX(a,0,-0.35),co.y+locY(a,0,-0.35),co.z+0.25-sink,0.2,0.16,0.32,yaw,-tilt*1.1,0,col,0);
  }

  // ===== SCENE BUILD =====
  var _camNear=false;
  function buildDynScene(){
    dynLen=0;
    if(!aimMode&&!_camNear)drawNinja(); // hidden while aiming or when the camera hugs the player
    for(var i=0;i<enemies.length;i++)if(!enemies[i].dead)drawEnemy(enemies[i]);
    for(var c=0;c<corpses.length;c++)drawCorpse(corpses[c]);
    // gate doors
    for(var g=0;g<gates.length;g++){
      var gt=gates[g];
      if(gt.open)continue;
      pushDynDoor(gt);
    }
    // levers
    for(var l=0;l<levers.length;l++){
      var lv=levers[l];
      dynBoxRot(lv.x,lv.y,lv.z,0.06,0.06,0.4,0,lv.on?1.1:-0.5,0,[0.6,0.62,0.7],0.2);
      dynBoxRot(lv.x,lv.y,lv.z-0.35,0.18,0.18,0.12,0,0,0,C_ROCK,0);
    }
    // lanterns (paper glows when lit; hidden when the camera backs into one)
    for(var ln=0;ln<lanterns.length;ln++){
      var la=lanterns[ln];
      if(dist3d(la.x,la.y,la.z,cam.x,cam.y,cam.z)<1.4)continue;
      var sway=Math.sin(_time*1.3+la.id)*0.04;
      dynBoxRot(la.x+sway,la.y,la.z+0.16,0.02,0.02,0.12,0,0,0,C_WOOD,0);
      dynBoxRot(la.x+sway,la.y,la.z,0.11,0.11,0.15,0,0,0,
        la.lit?C_CHOCHIN:[0.2,0.18,0.16],la.lit?1:0);
    }
    // pickups
    for(var p=0;p<pickups.length;p++){
      var pk=pickups[p];
      var pz=pk.z+Math.sin(_time*2.5+p)*0.05;
      if(pk.kind==='koban')dynBoxRot(pk.x,pk.y,pz,0.14,0.09,0.02,_time*2.4+p,0.5,0,C_GOLD,0.55);
      else if(pk.kind==='onigiri'){
        dynBoxRot(pk.x,pk.y,pz,0.10,0.09,0.10,_time*1.2,0,0,[0.92,0.92,0.95],0.1);
        dynBoxRot(pk.x,pk.y,pz-0.05,0.09,0.05,0.05,_time*1.2,0,0,[0.10,0.12,0.08],0);
      }
      else if(pk.kind==='scroll1'||pk.kind==='scroll2'){
        dynBoxRot(pk.x,pk.y,pz+0.1,0.07,0.22,0.07,_time*1.5,0,0,[0.9,0.85,0.7],0.25);
        dynBoxRot(pk.x,pk.y,pz+0.1,0.085,0.06,0.085,_time*1.5,0,0,C_GOLD,0.7);
      }
      else if(pk.kind==='shubox'){
        dynBoxRot(pk.x,pk.y,pz,0.18,0.18,0.14,0,0,0,C_WOOD,0);
        dynBoxRot(pk.x,pk.y,pz+0.1,0.06,0.06,0.04,_time*3,0,0,[0.8,0.82,0.9],0.6);
      }
    }
    // anchors (gold, pulsing)
    var aPulse=0.5+0.4*Math.sin(_time*4);
    for(var an=0;an<anchors.length;an++){
      var ac=anchors[an];
      dynBoxRot(ac.x,ac.y,ac.z,0.12,0.12,0.12,_time*1.8,0.6,0,C_GOLD,player.hasHook?aPulse:0.15);
    }
    // shurikens
    for(var sh=0;sh<shurikens.length;sh++){
      var su=shurikens[sh];
      dynBoxRot(su.x,su.y,su.z,0.10,0.10,0.015,su.spin,0,0,[0.8,0.84,0.92],0.5);
    }
    // enemy projectiles
    for(var ep=0;ep<eProj.length;ep++){
      var pr=eProj[ep];
      if(pr.kind==='arrow')dynBoxRot(pr.x,pr.y,pr.z,0.02,0.22,0.02,-Math.atan2(pr.dx,pr.dy),0,0,pr.col,0.6);
      else dynBoxRot(pr.x,pr.y,pr.z,0.14,0.14,0.02,_time*9,0.4,0,pr.col,0.6);
    }
    // slash trails (emissive arcs)
    for(var st=0;st<slashTrails.length;st++){
      var tr=slashTrails[st];
      var k=tr.life/tr.maxLife;
      var len=tr.big?1.6:1.2;
      dynBoxRot(tr.x,tr.y,tr.z,len*0.5,0.04,0.02,tr.yaw+(tr.spin?(1-k)*5:0),0,tr.roll*k,[1,1,1],k);
    }
  }
  function pushDynDoor(gt){
    var c=[0.26,0.18,0.12];
    dynBoxRot(gt.x,gt.y,gt.z0+gt.h/2,gt.w/2,gt.d/2,gt.h/2,0,0,0,c,0);
    // cross bars
    if(gt.w>gt.d){
      dynBoxRot(gt.x,gt.y,gt.z0+gt.h*0.3,gt.w/2+0.03,gt.d/2+0.03,0.06,0,0,0,[0.34,0.26,0.18],0);
      dynBoxRot(gt.x,gt.y,gt.z0+gt.h*0.7,gt.w/2+0.03,gt.d/2+0.03,0.06,0,0,0,[0.34,0.26,0.18],0);
    }else{
      dynBoxRot(gt.x,gt.y,gt.z0+gt.h*0.3,gt.w/2+0.03,gt.d/2+0.03,0.06,0,0,0,[0.34,0.26,0.18],0);
      dynBoxRot(gt.x,gt.y,gt.z0+gt.h*0.7,gt.w/2+0.03,gt.d/2+0.03,0.06,0,0,0,[0.34,0.26,0.18],0);
    }
  }

  // ===== RENDER =====
  var _vp=null;
  function project(x,y,z){
    var m=_vp;
    if(!m)return null;
    var cx=m[0]*x+m[4]*y+m[8]*z+m[12];
    var cy=m[1]*x+m[5]*y+m[9]*z+m[13];
    var cw=m[3]*x+m[7]*y+m[11]*z+m[15];
    if(cw<=0.01)return null;
    return[(cx/cw*0.5+0.5)*W,(1-(cy/cw*0.5+0.5))*H,cw];
  }
  function bindWorldAttribs(){
    gl.enableVertexAttribArray(locW.aPos);
    gl.enableVertexAttribArray(locW.aNrm);
    gl.enableVertexAttribArray(locW.aCol);
    gl.enableVertexAttribArray(locW.aMat);
    gl.vertexAttribPointer(locW.aPos,3,gl.FLOAT,false,44,0);
    gl.vertexAttribPointer(locW.aNrm,3,gl.FLOAT,false,44,12);
    gl.vertexAttribPointer(locW.aCol,4,gl.FLOAT,false,44,24);
    gl.vertexAttribPointer(locW.aMat,1,gl.FLOAT,false,44,40);
  }
  function renderScene(){
    // third-person camera: orbit behind, clipped against world
    var shx=(Math.random()-0.5)*screenShake*0.014,shy=(Math.random()-0.5)*screenShake*0.014;
    var lookX=player.x,lookY=player.y,lookZ=player.z+(aimMode?1.45:1.3);
    if(player.cling){
      var ptx=-player.clingNy,pty=player.clingNx;
      lookX+=ptx*player.peek*1.6+player.clingNx*0.35;
      lookY+=pty*player.peek*1.6+player.clingNy*0.35;
      lookZ=player.z+1.2;
    }
    if(bossIntroT>0){
      var _bi=null;
      for(var bi2=0;bi2<enemies.length;bi2++)if(enemies[bi2].def.boss)_bi=enemies[bi2];
      if(_bi){
        var bk=Math.min(1,bossIntroT/2.2)*0.65;
        lookX=lerp(lookX,_bi.x,bk);lookY=lerp(lookY,_bi.y,bk);lookZ=lerp(lookZ,_bi.z+1.6,bk);
      }
    }
    var cp=clamp(cam.pitch,-1.05,aimMode?1.0:0.55);
    var fx=Math.sin(cam.yaw)*Math.cos(cp),fy=Math.cos(cam.yaw)*Math.cos(cp),fz=Math.sin(cp);
    var aimD=aimMode?0.28:cam.dist;
    var idealX=lookX-fx*aimD,idealY=lookY-fy*aimD,idealZ=lookZ-fz*aimD+(aimMode?0:0.35);
    var cc=cameraClip(lookX,lookY,lookZ,idealX,idealY,idealZ);
    cam.x=cc[0];cam.y=cc[1];
    _camNear=!aimMode&&dist3d(cc[0],cc[1],cc[2],player.x,player.y,player.z+1.0)<1.6;
    var camFloor=groundTopAt(cc[0],cc[1],cc[2],0.1);
    var snapped=Math.max(cc[2],camFloor>-999?camFloor+0.25:cc[2]);
    cam.z=pointInSolid(cc[0],cc[1],snapped,0.1)?cc[2]:snapped;
    var ca=cam.yaw+shx,cpv=cp+shy;
    var fov=FOV_BASE*(1+fovKick*0.12)*(aimMode?0.82:1);
    var proj=matPerspective(fov,W/H,NEAR,FAR);
    var view=matView(cam.x,cam.y,cam.z,ca,cpv);
    _vp=matMul(proj,view);
    _camRight=[Math.cos(ca),-Math.sin(ca),0];
    var fwd=[Math.sin(ca)*Math.cos(cpv),Math.cos(ca)*Math.cos(cpv),Math.sin(cpv)];
    _camUp=[ _camRight[1]*fwd[2]-_camRight[2]*fwd[1],
             _camRight[2]*fwd[0]-_camRight[0]*fwd[2],
             _camRight[0]*fwd[1]-_camRight[1]*fwd[0] ];

    // build dynamic mesh + moonlight depth pass before the main pass
    buildDynScene();
    if(dynLen>0){
      gl.bindBuffer(gl.ARRAY_BUFFER,dynBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER,0,dynArr.subarray(0,dynLen));
    }
    renderShadowPass();

    gl.bindFramebuffer(gl.FRAMEBUFFER,fboScene.fb);
    gl.viewport(0,0,W,H);
    gl.clearColor(FOG_C[0],FOG_C[1],FOG_C[2],1);
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);

    // sky
    var view0=matView(0,0,0,ca,cpv);
    var inv=mat4Invert(matMul(proj,view0));
    if(inv){
      gl.useProgram(progSky);
      gl.depthMask(false);
      gl.bindBuffer(gl.ARRAY_BUFFER,skyBuf);
      gl.enableVertexAttribArray(locS.aPos);
      gl.vertexAttribPointer(locS.aPos,2,gl.FLOAT,false,8,0);
      gl.uniformMatrix4fv(locS.uInvVP,false,new Float32Array(inv));
      gl.uniform3f(locS.uSunDir,MOON_DIR[0],MOON_DIR[1],MOON_DIR[2]);
      gl.uniform1f(locS.uTime,_time);
      gl.drawArrays(gl.TRIANGLES,0,6);
      gl.disableVertexAttribArray(locS.aPos);
      gl.depthMask(true);
    }

    // merge lantern lights into the transient pool for this frame
    var savedLights=lights;
    var frameLights=lights.slice();
    for(var li=0;li<lanterns.length;li++){
      var la=lanterns[li];
      if(!la.lit)continue;
      if(dist2d(la.x,la.y,player.x,player.y)>26)continue;
      var fl=1.2*(1.0+0.15*Math.sin(_time*7+la.id)+0.08*Math.sin(_time*13+la.id*2));
      frameLights.push({x:la.x,y:la.y,z:la.z+0.1,rad:6,r:1.0,g:0.62,b:0.28,it:fl,life:1,maxLife:9999});
    }
    lights=frameLights;
    packLights(player.x,player.y);
    lights=savedLights;

    gl.useProgram(progWorld);
    gl.uniformMatrix4fv(locW.uVP,false,new Float32Array(_vp));
    gl.uniform3f(locW.uSunDir,MOON_DIR[0],MOON_DIR[1],MOON_DIR[2]);
    gl.uniform3f(locW.uSunCol,MOON_COL[0],MOON_COL[1],MOON_COL[2]);
    gl.uniform3f(locW.uAmbUp,AMB_UP[0],AMB_UP[1],AMB_UP[2]);
    gl.uniform3f(locW.uAmbDn,AMB_DN[0],AMB_DN[1],AMB_DN[2]);
    gl.uniform3f(locW.uCam,cam.x,cam.y,cam.z);
    gl.uniform3f(locW.uFogC,FOG_C[0],FOG_C[1],FOG_C[2]);
    gl.uniform4fv(locW.uLPos,_lpos);
    gl.uniform4fv(locW.uLCol,_lcol);
    gl.uniformMatrix4fv(locW.uLVP,false,_lvpBias?new Float32Array(_lvpBias):_matIdent);
    gl.uniform1f(locW.uShadowOn,_lvpBias?1:0);
    gl.uniform1f(locW.uTime,_time);
    gl.activeTexture(gl.TEXTURE2);
    if(shadowTex)gl.bindTexture(gl.TEXTURE_2D,shadowTex);
    gl.uniform1i(locW.uShadowTex,2);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindBuffer(gl.ARRAY_BUFFER,staticBuf);
    bindWorldAttribs();
    gl.drawArrays(gl.TRIANGLES,0,staticCount);
    if(dynLen>0){
      gl.bindBuffer(gl.ARRAY_BUFFER,dynBuf);
      bindWorldAttribs();
      gl.drawArrays(gl.TRIANGLES,0,dynLen/11);
    }

    // blend pass A: shadows + ground fog (alpha)
    gl.useProgram(progBlend);
    gl.uniformMatrix4fv(locB.uVP,false,new Float32Array(_vp));
    gl.uniform3f(locB.uCam,cam.x,cam.y,cam.z);
    gl.uniform3f(locB.uFogC,FOG_C[0],FOG_C[1],FOG_C[2]);
    gl.enable(gl.BLEND);
    gl.depthMask(false);
    gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    blLen=0;
    var pg=groundTopAt(player.x,player.y,player.z+0.1,PLAYER_R);
    if(pg>-999){
      var ph2=clamp(player.z-pg,0,8);
      blShadow(player.x,player.y,pg,lerp(0.36,0.15,ph2/8),lerp(0.5,0.18,ph2/8));
    }
    for(var i3=0;i3<enemies.length;i3++){
      var e3=enemies[i3];if(e3.dead)continue;
      var eg=groundTopAt(e3.x,e3.y,e3.z+0.1,0.3);
      if(eg>-999)blShadow(e3.x,e3.y,eg,0.4,0.4);
    }
    // ground mist (two soft layers following the player)
    blQuad([player.x-14,player.y-14,0.25],[player.x+14,player.y-14,0.25],
           [player.x+14,player.y+14,0.25],[player.x-14,player.y+14,0.25],0.55,0.6,0.72,0.05);
    blQuad([player.x-9,player.y-9,0.45],[player.x+9,player.y-9,0.45],
           [player.x+9,player.y+9,0.45],[player.x-9,player.y+9,0.45],0.55,0.6,0.72,0.04);
    if(blLen>0){
      gl.bindBuffer(gl.ARRAY_BUFFER,blBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER,0,blArr.subarray(0,blLen));
      gl.enableVertexAttribArray(locB.aPos);
      gl.enableVertexAttribArray(locB.aCol);
      gl.vertexAttribPointer(locB.aPos,3,gl.FLOAT,false,28,0);
      gl.vertexAttribPointer(locB.aCol,4,gl.FLOAT,false,28,12);
      gl.drawArrays(gl.TRIANGLES,0,blLen/7);
    }

    // blend pass B: additive (petals get soft-light, particles, rope, afterimages)
    gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
    blLen=0;
    for(var p4=0;p4<particles.length;p4++){
      var pt=particles[p4];
      var k4=pt.life/pt.maxLife;
      blBillboard(pt.x,pt.y,pt.z,pt.size*(0.5+k4),pt.r,pt.g,pt.b,k4*0.9);
    }
    for(var pe2=0;pe2<petals.length;pe2++){
      var pl2=petals[pe2];
      var psz=0.05+0.025*Math.sin(_time*4+pl2.ph);
      blBillboard(pl2.x,pl2.y,pl2.z,psz,0.95,0.62,0.72,0.5);
    }
    for(var ff=0;ff<fireflies.length;ff++){
      var fl2=fireflies[ff];
      var fx2=fl2.cx+Math.cos(_time*fl2.sp+fl2.ph)*fl2.r+Math.sin(_time*0.7+fl2.ph*2)*0.6;
      var fy2=fl2.cy+Math.sin(_time*fl2.sp*0.8+fl2.ph)*fl2.r;
      if(dist2d(fx2,fy2,player.x,player.y)>30)continue;
      var fz2=fl2.z+Math.sin(_time*1.3+fl2.ph)*0.3;
      var fa2=0.30+0.28*Math.sin(_time*2.2+fl2.ph*3);
      blBillboard(fx2,fy2,fz2,0.035,0.85,0.95,0.45,Math.max(0,fa2));
    }
    if(player.grappling){
      blBeam(player.x,player.y,player.z+1.0,player.grapX,player.grapY,player.grapZ,0.02,0.75,0.7,0.55,0.8);
    }
    for(var dt2=0;dt2<dashTrailPos.length;dt2+=2){
      var dp=dashTrailPos[dt2];
      blBillboard(dp[0],dp[1],dp[2]+0.8,0.35,0.4,0.5,0.9,0.18-dt2*0.03);
    }
    if(blLen>0){
      gl.bindBuffer(gl.ARRAY_BUFFER,blBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER,0,blArr.subarray(0,blLen));
      gl.enableVertexAttribArray(locB.aPos);
      gl.enableVertexAttribArray(locB.aCol);
      gl.vertexAttribPointer(locB.aPos,3,gl.FLOAT,false,28,0);
      gl.vertexAttribPointer(locB.aCol,4,gl.FLOAT,false,28,12);
      gl.drawArrays(gl.TRIANGLES,0,blLen/7);
    }
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    postProcess();
  }
  // ===== HUD =====
  function renderHUD(){
    hud.clearRect(0,0,W,H);
    if(gameState!=='playing'){
      if(zoneFade>0){hud.fillStyle='rgba(2,2,8,'+Math.min(1,zoneFade)+')';hud.fillRect(0,0,W,H);}
      return;
    }
    var t=_time;
    // vignette (ink-wash dark corners)
    var vg=hud.createRadialGradient(W/2,H/2,H*0.40,W/2,H/2,H*0.78);
    vg.addColorStop(0,'rgba(0,0,0,0)');
    vg.addColorStop(1,'rgba(4,3,12,0.5)');
    hud.fillStyle=vg;hud.fillRect(0,0,W,H);
    // flashes
    if(dmgFlash>0){hud.fillStyle='rgba(200,30,30,'+(dmgFlash*0.3)+')';hud.fillRect(0,0,W,H);}
    if(healFlash>0){hud.strokeStyle='rgba(120,230,140,'+(healFlash*0.5)+')';hud.lineWidth=5;hud.strokeRect(3,3,W-6,H-6);}
    if(player.iFrames>0&&Math.sin(player.iFrames*30)>0){hud.fillStyle='rgba(255,255,255,0.06)';hud.fillRect(0,0,W,H);}
    // stealth-kill ink flash: brief blackout + single white slash
    if(sekkenFlash>0){
      var sk=sekkenFlash/0.35;
      hud.fillStyle='rgba(2,2,6,'+(sk*0.85)+')';
      hud.fillRect(0,0,W,H);
      hud.strokeStyle='rgba(255,255,255,'+sk+')';
      hud.lineWidth=2;
      hud.beginPath();
      hud.moveTo(W*0.25,H*0.3);hud.lineTo(W*0.75,H*0.62);
      hud.stroke();
    }
    // --- enemy overhead markers ---
    for(var i=0;i<enemies.length;i++){
      var e=enemies[i];
      if(e.dead)continue;
      var pr=project(e.x,e.y,e.z+e.def.h+0.5);
      if(!pr||pr[2]>30)continue;
      hud.textAlign='center';hud.textBaseline='middle';
      if(e.alerted){
        hud.font='bold 11px monospace';
        hud.fillStyle='rgba(255,50,40,'+(0.7+0.3*Math.sin(t*8))+')';
        hud.fillText('!',pr[0],pr[1]);
      }else if(e.susp>0.15){
        hud.font='bold 10px monospace';
        hud.fillStyle='rgba(240,210,60,'+(0.4+e.susp*0.6)+')';
        hud.fillText('?',pr[0],pr[1]);
      }
      // boss HP
      if(e.def.boss&&bossActive){
        var bw=W*0.42;
        hud.fillStyle='rgba(0,0,0,0.55)';
        hud.fillRect(W/2-bw/2-1,16,bw+2,7);
        hud.fillStyle=e.phase===2?'#d04050':'#9a3540';
        hud.fillRect(W/2-bw/2,17,bw*(e.hp/e.maxHp),5);
        hud.strokeStyle='rgba(232,210,160,0.5)';hud.lineWidth=1;
        hud.strokeRect(W/2-bw/2-1.5,15.5,bw+3,8);
        hud.fillStyle='#e8d2a0';hud.font='7px monospace';hud.textAlign='center';
        hud.fillText('— THE LORD —',W/2,11);
      }
    }
    // stealth-kill prompt (sword icon over target)
    var sk2=stealthTarget();
    if(sk2&&player.atkPhase===0){
      var pr2=project(sk2.x,sk2.y,sk2.z+sk2.def.h+0.9);
      if(pr2){
        var pls=0.6+0.4*Math.sin(t*7);
        hud.strokeStyle='rgba(255,255,255,'+pls+')';
        hud.lineWidth=1.5;
        hud.beginPath();
        hud.moveTo(pr2[0]-4,pr2[1]+4);hud.lineTo(pr2[0]+4,pr2[1]-4);
        hud.moveTo(pr2[0]+1,pr2[1]+1);hud.lineTo(pr2[0]+3,pr2[1]+3);
        hud.stroke();
        hud.fillStyle='rgba(255,255,255,'+pls*0.8+')';
        hud.font='5px monospace';hud.textAlign='center';
        hud.fillText('SILENT KILL',pr2[0],pr2[1]+10);
      }
    }
    // float texts
    for(var f=0;f<floatTexts.length;f++){
      var ft=floatTexts[f];
      var pr3=project(ft.x,ft.y,ft.z);
      if(!pr3)continue;
      var a3=Math.min(1,ft.life*2.5);
      hud.font=(ft.big?'bold 10px':'8px')+' monospace';
      hud.textAlign='center';
      hud.fillStyle='rgba(0,0,0,'+a3*0.7+')';
      hud.fillText(ft.txt,pr3[0]+1,pr3[1]+1);
      hud.fillStyle='rgba('+(ft.col[0]*255|0)+','+(ft.col[1]*255|0)+','+(ft.col[2]*255|0)+','+a3+')';
      hud.fillText(ft.txt,pr3[0],pr3[1]);
    }
    // --- top-left: hearts ---
    for(var h2=0;h2<player.maxHp;h2++){
      var hx2=14+h2*15,hy2=14;
      var on=h2<player.hp;
      hud.fillStyle=on?'#d04050':'rgba(80,70,90,0.5)';
      hud.beginPath();
      hud.arc(hx2-2.5,hy2-2,3.4,0,TAU);hud.arc(hx2+2.5,hy2-2,3.4,0,TAU);
      hud.fill();
      hud.beginPath();
      hud.moveTo(hx2-5.7,hy2-0.6);hud.lineTo(hx2,hy2+6);hud.lineTo(hx2+5.7,hy2-0.6);
      hud.fill();
      if(on&&player.hp===1&&Math.sin(t*6)>0){
        hud.strokeStyle='rgba(255,120,120,0.8)';hud.lineWidth=1;
        hud.beginPath();hud.arc(hx2,hy2,8,0,TAU);hud.stroke();
      }
    }
    // shuriken + koban
    hud.font='8px monospace';hud.textAlign='left';hud.textBaseline='middle';
    hud.fillStyle='#aeb6c8';
    hud.fillText('✦ '+player.shuriken,10,30);
    hud.fillStyle='#e0c068';
    hud.fillText('● '+koban,10,42);
    // zone name top right
    hud.textAlign='right';
    hud.font='7px monospace';
    hud.fillStyle='rgba(232,210,160,0.75)';
    hud.fillText(ZONES[curZone].name,W-10,12);
    if(alertCount===0){
      hud.font='6px monospace';
      hud.fillStyle='rgba(160,170,200,0.6)';
      hud.fillText('shadow',W-10,22);
    }
    // kaginawa aim stance: reticle + predicted hit point
    if(aimMode){
      hud.strokeStyle='rgba(232,210,160,0.9)';
      hud.lineWidth=1.5;
      hud.beginPath();
      hud.moveTo(W/2-8,H/2);hud.lineTo(W/2-3,H/2);
      hud.moveTo(W/2+3,H/2);hud.lineTo(W/2+8,H/2);
      hud.moveTo(W/2,H/2-8);hud.lineTo(W/2,H/2-3);
      hud.moveTo(W/2,H/2+3);hud.lineTo(W/2,H/2+8);
      hud.stroke();
      var ah=aimRay();
      if(ah){
        var ap=project(ah.x,ah.y,ah.z);
        if(ap){
          var pls2=0.7+0.3*Math.sin(t*9);
          hud.strokeStyle='rgba(120,255,170,'+pls2+')';
          hud.beginPath();
          hud.moveTo(ap[0],ap[1]-5);hud.lineTo(ap[0]+5,ap[1]);
          hud.lineTo(ap[0],ap[1]+5);hud.lineTo(ap[0]-5,ap[1]);
          hud.closePath();hud.stroke();
          hud.font='6px monospace';hud.textAlign='center';
          hud.fillStyle='rgba(120,255,170,0.8)';
          hud.fillText(ah.dist.toFixed(1),ap[0],ap[1]+12);
        }
      }else{
        hud.font='7px monospace';hud.textAlign='center';
        hud.fillStyle='rgba(255,90,90,0.8)';
        hud.fillText('OUT OF REACH',W/2,H/2+16);
      }
      hud.font='6px monospace';hud.textAlign='center';
      hud.fillStyle='rgba(232,210,160,0.6)';
      hud.fillText('CLICK: THROW   E: LOWER',W/2,H-14);
    }
    // gold markers: suggested hook routes
    if(!aimMode){
      for(var an2=0;an2<anchors.length;an2++){
        var ac2=anchors[an2];
        var d2=dist3d(ac2.x,ac2.y,ac2.z,player.x,player.y,player.z+1);
        if(d2<GRAP_RNG){
          var pr4=project(ac2.x,ac2.y,ac2.z);
          if(pr4){
            hud.strokeStyle='rgba(224,192,104,0.8)';
            hud.lineWidth=1;
            hud.strokeRect(pr4[0]-3,pr4[1]-3,6,6);
          }
        }
      }
    }
    // wall cling state / affordance
    if(player.cling){
      hud.font='6px monospace';hud.textAlign='center';
      hud.fillStyle='rgba(140,200,255,0.8)';
      hud.fillText(Math.abs(player.peek)>0.4?'— PEEKING —':'— HIDDEN —',W/2,H-24);
    }else if(player.grounded&&!aimMode&&player.atkPhase===0&&!player.grappling&&findClingWall()){
      hud.font='5px monospace';hud.textAlign='center';
      hud.fillStyle='rgba(200,200,220,0.45)';
      hud.fillText('C: WALL CLING',W/2,H-24);
    }
    // hint
    if(hintT>0){
      hud.font='8px monospace';hud.textAlign='center';
      hud.fillStyle='rgba(0,0,0,0.6)';
      hud.fillRect(W/2-130,H-40,260,14);
      hud.fillStyle='rgba(232,210,160,'+Math.min(1,hintT)+')';
      hud.fillText(hintMsg,W/2,H-33);
    }
    // cinematic letterbox
    if(letterboxT>0.02){
      var lbh=24*letterboxT;
      hud.fillStyle='#000';
      hud.fillRect(0,0,W,lbh);
      hud.fillRect(0,H-lbh,W,lbh);
    }
    // boss title card
    if(bossIntroT>0){
      var ba=Math.min(1,(2.2-bossIntroT)*2.2)*Math.min(1,bossIntroT*2.2);
      hud.font='15px monospace';hud.textAlign='center';hud.textBaseline='middle';
      hud.fillStyle='rgba(0,0,0,'+ba*0.6+')';
      hud.fillText('— 殿 THE LORD —',W/2+1,H*0.76+1);
      hud.fillStyle='rgba(232,210,160,'+ba+')';
      hud.fillText('— 殿 THE LORD —',W/2,H*0.76);
    }
    drawGrain();
    // zone fade
    if(zoneFade>0){
      hud.fillStyle='rgba(2,2,8,'+Math.min(1,zoneFade)+')';
      hud.fillRect(0,0,W,H);
    }
    if(debugMode)renderDebugHUD();
  }
  // subtle animated film grain over the frame
  var _grainC=null;
  function drawGrain(){
    if(!_grainC){
      _grainC=document.createElement('canvas');
      _grainC.width=128;_grainC.height=96;
      var g=_grainC.getContext('2d');
      var id=g.createImageData(128,96);
      for(var i=0;i<id.data.length;i+=4){
        var v=128+(Math.random()*70-35)|0;
        id.data[i]=id.data[i+1]=id.data[i+2]=v;id.data[i+3]=255;
      }
      g.putImageData(id,0,0);
    }
    hud.globalAlpha=0.05;
    hud.drawImage(_grainC,(Math.random()*16)|0,(Math.random()*12)|0,112,84,0,0,W,H);
    hud.globalAlpha=1;
  }
  function renderDebugHUD(){
    var lines=[
      'FPS '+debugFps,
      'P '+player.x.toFixed(1)+','+player.y.toFixed(1)+','+player.z.toFixed(2),
      'zone '+curZone+' gnd '+(player.grounded?'Y':'n')+' hp '+player.hp,
      'E '+enemies.length+' alert '+alertCount+' dyn '+(dynLen/10|0),
      aiMode?('AI '+aiState+' wp'+aiWpIdx):''
    ];
    hud.font='6px monospace';hud.textAlign='left';hud.textBaseline='top';
    for(var i=0;i<lines.length;i++){
      if(!lines[i])continue;
      hud.fillStyle='rgba(0,0,0,0.6)';
      hud.fillRect(8,52+i*8,lines[i].length*3.8+4,7);
      hud.fillStyle='#7dff9a';
      hud.fillText(lines[i],10,52.5+i*8);
    }
  }

  // ===== SOUND (Web Audio, 都節ペンタトニック) =====
  var audioCtx=null,masterGain=null,ambNodes=null;
  function ensureAudio(){
    if(audioCtx)return;
    try{
      audioCtx=new(window.AudioContext||window.webkitAudioContext)();
      masterGain=audioCtx.createGain();
      masterGain.gain.value=0.5;
      masterGain.connect(audioCtx.destination);
    }catch(e){}
  }
  function sOK(){return audioCtx&&window._tinyDesktopSound;}
  function env(g,t0,a,peak,dur){
    g.gain.setValueAtTime(0.0001,t0);
    g.gain.exponentialRampToValueAtTime(peak,t0+a);
    g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
  }
  function osc(type,f0,f1,t0,dur,peak,dest){
    var o=audioCtx.createOscillator(),g=audioCtx.createGain();
    o.type=type;
    o.frequency.setValueAtTime(f0,t0);
    if(f1!==f0)o.frequency.exponentialRampToValueAtTime(Math.max(1,f1),t0+dur);
    env(g,t0,0.005,peak,dur);
    o.connect(g);g.connect(dest||masterGain);
    o.start(t0);o.stop(t0+dur+0.02);
  }
  var _noiseBuf=null;
  function noiseBuffer(){
    if(_noiseBuf)return _noiseBuf;
    var len=audioCtx.sampleRate*0.5|0;
    _noiseBuf=audioCtx.createBuffer(1,len,audioCtx.sampleRate);
    var ch=_noiseBuf.getChannelData(0);
    for(var i=0;i<len;i++)ch[i]=Math.random()*2-1;
    return _noiseBuf;
  }
  function noise(t0,dur,peak,fc,type){
    var n=audioCtx.createBufferSource();n.buffer=noiseBuffer();n.loop=true;
    var f=audioCtx.createBiquadFilter();f.type=type||'lowpass';f.frequency.value=fc;
    var g=audioCtx.createGain();
    env(g,t0,0.005,peak,dur);
    n.connect(f);f.connect(g);g.connect(masterGain);
    n.start(t0);n.stop(t0+dur+0.02);
  }
  // koto pluck: triangle pair with slight detune, fast decay
  function koto(freq,t0,peak){
    osc('triangle',freq,freq,t0,0.5,peak||0.09);
    osc('triangle',freq*1.007,freq*1.007,t0,0.4,(peak||0.09)*0.4);
  }
  function taiko(t0,peak){osc('sine',65,40,t0,0.22,peak||0.5);noise(t0,0.05,0.12,300);}
  function shime(t0){noise(t0,0.06,0.12,1800,'bandpass');}
  function hyoshigi(t0){noise(t0,0.03,0.18,4000,'highpass');noise(t0+0.12,0.03,0.15,4000,'highpass');}
  function playSound(name){
    if(!sOK())return;
    try{
      var t0=audioCtx.currentTime;
      switch(name){
        case'swing1':noise(t0,0.10,0.16,5200,'bandpass');break;
        case'swing2':noise(t0,0.10,0.17,5800,'bandpass');break;
        case'swing3':noise(t0,0.16,0.2,4600,'bandpass');osc('sine',300,180,t0,0.12,0.06);break;
        case'hit':osc('square',880,500,t0,0.06,0.13);noise(t0,0.05,0.1,2500);koto(587,t0,0.06);break;
        case'kill':taiko(t0,0.4);koto(440,t0+0.05,0.08);break;
        case'stealthkill':osc('sine',3000,1800,t0,0.18,0.10);taiko(t0+0.15,0.5);koto(587,t0+0.2,0.1);break;
        case'eswing':noise(t0,0.12,0.14,3800,'bandpass');break;
        case'hurt':osc('sawtooth',220,90,t0,0.2,0.22);taiko(t0,0.3);break;
        case'die':osc('sawtooth',180,50,t0,0.7,0.25);taiko(t0,0.5);taiko(t0+0.4,0.4);break;
        case'jump':osc('square',300,480,t0,0.1,0.08);break;
        case'doublejump':osc('square',380,640,t0,0.1,0.08);noise(t0,0.06,0.07,6000);break;
        case'land':noise(t0,0.08,0.1,700);break;
        case'dash':noise(t0,0.15,0.16,6000);break;
        case'shuriken':noise(t0,0.08,0.12,7000,'highpass');osc('sine',1400,900,t0,0.08,0.05);break;
        case'snuff':noise(t0,0.12,0.1,900);break;
        case'grapple':osc('square',900,1800,t0,0.08,0.08);noise(t0+0.05,0.06,0.08,5000);break;
        case'grapfail':osc('square',400,260,t0,0.08,0.06);break;
        case'aimon':osc('sine',700,1100,t0,0.08,0.06);break;
        case'cling':noise(t0,0.08,0.1,900);osc('sine',230,170,t0,0.09,0.05);break;
        case'squeak':osc('sine',1900,2700,t0,0.16,0.05);osc('sine',2500,2250,t0+0.06,0.12,0.035);break;
        case'aimoff':osc('sine',1100,700,t0,0.08,0.05);break;
        case'alert':hyoshigi(t0);osc('square',587,784,t0+0.05,0.15,0.1);break;
        case'arrow':noise(t0,0.14,0.1,3000,'bandpass');break;
        case'fan':noise(t0,0.12,0.12,2400,'bandpass');osc('sine',800,500,t0,0.1,0.05);break;
        case'iai':osc('sine',120,80,t0,0.8,0.07);break; // low menace during draw
        case'coin':koto(1047,t0,0.07);koto(1319,t0+0.06,0.05);break;
        case'scroll':koto(294,t0,0.09);koto(392,t0+0.08,0.09);koto(440,t0+0.16,0.09);koto(587,t0+0.24,0.11);break;
        case'heal':koto(523,t0,0.08);koto(659,t0+0.08,0.07);break;
        case'jizo':koto(392,t0,0.07);koto(587,t0+0.1,0.07);osc('sine',1175,1175,t0+0.2,0.4,0.04);break;
        case'lever':noise(t0,0.08,0.12,1200);osc('square',200,150,t0,0.1,0.08);break;
        case'gateopen':osc('sine',90,60,t0,0.6,0.18);noise(t0,0.5,0.1,400);break;
        case'gong':osc('sine',196,180,t0,1.6,0.22);osc('sine',392,370,t0,1.2,0.08);break;
        case'roar':osc('sawtooth',110,55,t0,0.7,0.25);noise(t0,0.4,0.15,800);break;
        case'win':koto(294,t0,0.1);koto(392,t0+0.15,0.1);koto(440,t0+0.3,0.1);koto(587,t0+0.45,0.12);taiko(t0+0.6,0.4);osc('sine',196,190,t0+0.7,1.4,0.15);break;
        case'gameover':koto(466,t0,0.1);koto(440,t0+0.25,0.09);koto(311,t0+0.5,0.09);koto(294,t0+0.75,0.12);break;
      }
    }catch(e){}
  }

  // ===== MUSIC (2 layers: stealth 84bpm / alert 132bpm) =====
  var musicOn=false,musStep=0,musNext=0,musicAlert=0;
  // 都節 on D: D, Eb, G, A, Bb
  var SC=[293.7,311.1,392.0,440.0,466.2];
  function startMusic(){musicOn=true;musStep=0;if(audioCtx)musNext=audioCtx.currentTime+0.1;}
  function stopMusic(){musicOn=false;musicAlert=0;}
  function scheduleMusic(){
    if(!musicOn||!sOK()||gameState!=='playing')return;
    if(!isKgOpen())return;
    var t=audioCtx.currentTime;
    if(musNext<t-0.3)musNext=t+0.05;
    var alertMode=musicAlert>0;
    var spb=alertMode?(60/132/2):(60/84/2); // 8th notes
    while(musNext<t+0.15){
      var st=musStep%16;
      if(alertMode){
        if(st%4===0)taiko(musNext,0.4);
        if(st%2===1)shime(musNext);
        if(st%8===6)hyoshigi(musNext);
        // koto tremolo line
        koto(SC[[0,2,3,4,3,2,1,0][Math.floor(st/2)]],musNext,0.05);
        if(musicAlert<9000&&st===0)osc('sawtooth',73.4,73.4,musNext,spb*1.8,0.05);
      }else{
        if(st===0||st===10)taiko(musNext,0.28);
        // sparse descending koto, one note sometimes withheld
        var seq=[0,-1,4,-1,3,-1,2,-1,1,-1,0,-1,-1,-1,2,-1];
        var ni=seq[st];
        if(ni>=0&&Math.random()>0.18)koto(SC[ni]/2*((st%4===0)?1:2),musNext,0.06);
        if(st===8&&Math.random()<0.3)osc('sine',SC[2],SC[2]*0.985,musNext,spb*6,0.03); // shakuhachi-ish breath
      }
      musNext+=spb;
      musStep++;
    }
  }
  // ===== ACTIONS =====
  // camera-relative unit vector for a direction key
  function dirVecFor(dir){
    var ca=cam.yaw,mx=0,my=0;
    if(dir==='w'){mx=Math.sin(ca);my=Math.cos(ca);}
    else if(dir==='s'){mx=-Math.sin(ca);my=-Math.cos(ca);}
    else if(dir==='a'){mx=-Math.cos(ca);my=Math.sin(ca);}
    else{mx=Math.cos(ca);my=-Math.sin(ca);}
    return [mx,my];
  }
  function dirFromKeys(){
    var mx=0,my=0,ca=cam.yaw;
    if(keys.w){mx+=Math.sin(ca);my+=Math.cos(ca);}
    if(keys.s){mx-=Math.sin(ca);my-=Math.cos(ca);}
    if(keys.a){mx-=Math.cos(ca);my+=Math.sin(ca);}
    if(keys.d){mx+=Math.cos(ca);my-=Math.sin(ca);}
    var ml=Math.sqrt(mx*mx+my*my);
    if(ml<0.1){mx=Math.sin(player.facing);my=Math.cos(player.facing);}
    return [mx,my];
  }
  function tryDashDir(dx,dy){
    if(player.dashCD>0||gameState!=='playing')return;
    if(player.cling)releaseCling();
    player.rollT=0;
    player.dashT=DASH_T;player.dashCD=DASH_CD;
    var ml=Math.sqrt(dx*dx+dy*dy)||1;
    player.dashDx=dx/ml;player.dashDy=dy/ml;
    player.facing=Math.atan2(player.dashDx,player.dashDy);
    fovKick=1;
    playSound('dash');
  }
  function tryDash(){ var d=dirFromKeys(); tryDashDir(d[0],d[1]); } // AI / fallback
  // crouch roll: 前転/後転 (somersault) or 側転 (cartwheel), with i-frames
  function tryRoll(dir){
    if(player.dashCD>0||player.rollT>0||player.atkPhase>0||player.grappling||gameState!=='playing'||!player.grounded)return;
    var d=dirVecFor(dir);
    player.rollT=ROLL_T;player.dashCD=ROLL_CD;
    player.rollDir=dir;player.rollDx=d[0];player.rollDy=d[1];player.rollSpin=0;
    player.iFrames=Math.max(player.iFrames,ROLL_T*0.85);
    player.facing=Math.atan2(d[0],d[1]);
    fovKick=0.6;playSound('dash');
  }
  // step sideways along the wall, or kick off it — never into the wall
  function clingStep(dir){
    if(player.clingStepT>0)return;
    var d=dirVecFor(dir);
    var dot=d[0]*player.clingNx+d[1]*player.clingNy; // away from wall = positive
    if(dot<-0.35)return; // cannot step toward the wall
    if(dot>0.45){ releaseCling(); tryDashDir(d[0],d[1]); return; } // kick off
    var tx=-player.clingNy,ty=player.clingNx;
    var lat=d[0]*tx+d[1]*ty;
    player.clingStepDir=lat>0?1:-1;
    player.clingStepT=CLING_STEP_T;
    player.iFrames=Math.max(player.iFrames,CLING_STEP_T);
    playSound('dash');
  }
  // double-tap router: cling step / crouch roll / dash
  function onDoubleTap(dir){
    if(gameState!=='playing')return;
    if(player.cling){clingStep(dir);return;}
    if(keys.sneak&&player.grounded){tryRoll(dir);return;}
    var d=dirVecFor(dir);
    tryDashDir(d[0],d[1]);
  }
  function onDirTap(dir){
    var t=_time;
    if(tapTimes[dir]>0&&t-tapTimes[dir]<DTAP){tapTimes[dir]=-1;onDoubleTap(dir);}
    else tapTimes[dir]=t;
  }

  // ===== GAME FLOW =====
  function startGame(){
    koban=0;kills=0;stealthKills=0;alertCount=0;gameTime=0;
    player.maxHp=3;player.hasDouble=true;player.hasHook=true;
    resetPlayer();
    manualPause=false;bossActive=false;
    zoneFade=0;zoneFadeDir=0;
    buildZone(0);
    gameState='playing';
    showHint('SHIFT: SNEAK (CLING NEAR A WALL) - DOUBLE-TAP A DIRECTION TO DODGE');
    startMusic();
    if(!isMobileKg)canvas.requestPointerLock();
    updateOverlay();
  }
  function reviveAtCheckpoint(){
    player.hp=player.maxHp;
    player.x=checkpoint[0];player.y=checkpoint[1];player.z=checkpoint[2]+0.5;
    player.vx=player.vy=player.vz=0;
    player.grappling=false;player.dashT=0;player.atkPhase=0;player.combo=0;
    player.cling=false;player.peek=0;player.clingSolid=null;player.rollT=0;player.clingStepT=0;
    if(aiMode){aiWpIdx=aiNearestWp();aiStuck=0;aiTimer=0;aiProgWp=-1;aiBestWpd=1e9;aiNoProgT=0;}
    player.iFrames=2;
    koban=Math.floor(koban/2);
    for(var i=0;i<enemies.length;i++){enemies[i].alerted=false;enemies[i].susp=0;}
    eProj.length=0;
    gameState='playing';
    startMusic();
    if(!isMobileKg&&!aiMode)canvas.requestPointerLock();
    updateOverlay();
  }

  // ===== INPUT =====
  function handleKey(e,down){
    switch(e.code){
      case'KeyW':if(down&&!keys.w)onDirTap('w');keys.w=down;break;
      case'KeyA':if(down&&!keys.a)onDirTap('a');keys.a=down;break;
      case'KeyS':if(down&&!keys.s)onDirTap('s');keys.s=down;break;
      case'KeyD':if(down&&!keys.d)onDirTap('d');keys.d=down;break;
      case'ShiftLeft':case'ShiftRight':
        if(down){if(!keys.shift){keys.shift=true;onShiftPress();}}
        else keys.shift=false;
        keys.sneak=keys.shift&&!player.cling;
        break;
      case'Space':if(down&&!keys.sp)spJustPressed=true;keys.sp=down;if(down)e.preventDefault();break;
      case'KeyE':if(down)toggleAim();break;
      case'KeyF':if(down)tryShuriken();break;
      case'Escape':
        if(down&&gameState==='playing'){
          if(aimMode){aimMode=false;playSound('aimoff');break;}
          if(aiMode){manualPause=!manualPause;if(pointerLocked)document.exitPointerLock();}
          else if(pointerLocked)document.exitPointerLock();
        }
        break;
      case'F3':if(down){debugMode=!debugMode;e.preventDefault();}break;
    }
  }
  document.addEventListener('keydown',function(e){if(isKgActive())handleKey(e,true);});
  document.addEventListener('keyup',function(e){handleKey(e,false);});
  document.addEventListener('mousemove',function(e){
    if(!pointerLocked||gameState!=='playing')return;
    cam.yaw+=e.movementX*(aimMode?0.002:0.0032);
    cam.pitch-=e.movementY*(aimMode?0.002:0.0032);
    cam.pitch=clamp(cam.pitch,-1.05,aimMode?1.0:0.55);
  });
  canvas.addEventListener('mousedown',function(e){
    ensureAudio();
    if(audioCtx&&audioCtx.state==='suspended')audioCtx.resume();
    if(gameState==='title'){if(isMobileKg)return;startGame();return;}
    if(gameState==='dead'){if(stateTimer<=0)reviveAtCheckpoint();return;}
    if(gameState==='win'){if(stateTimer<=0){gameState='title';_ovActive='';updateOverlay();}return;}
    if(gameState==='playing'&&!pointerLocked&&!isMobileKg&&!aiMode){canvas.requestPointerLock();return;}
    if(gameState==='playing'){
      if(aimMode){
        if(e.button===2){aimMode=false;playSound('aimoff');}
        else fireGrapple();
        return;
      }
      if(e.button===2)tryShuriken();
      else{mouseDown=true;tryAttack();}
    }
  });
  canvas.addEventListener('mouseup',function(){mouseDown=false;});
  canvas.addEventListener('contextmenu',function(e){e.preventDefault();});
  document.addEventListener('pointerlockchange',function(){
    pointerLocked=document.pointerLockElement===canvas;
    if(!pointerLocked){keys.w=keys.a=keys.s=keys.d=keys.sp=keys.sneak=keys.shift=false;tapTimes.w=tapTimes.a=tapTimes.s=tapTimes.d=-1;mouseDown=false;}
  });

  // ===== WINDOW STATE =====
  function isKgOpen(){
    return _wk&&!_wk.classList.contains('closed')&&!_wk.classList.contains('minimized');
  }
  function isKgActive(){
    if(!isKgOpen())return false;
    var z=parseInt(_wk.style.zIndex)||0;
    var maxZ=z;
    var wins=document.querySelectorAll('.window:not(.closed):not(.minimized)');
    for(var i=0;i<wins.length;i++){var wz=parseInt(wins[i].style.zIndex)||0;if(wz>maxZ)maxZ=wz;}
    return z>=maxZ;
  }
  if(_wk){
    new MutationObserver(function(){
      if(!isKgOpen()&&pointerLocked)document.exitPointerLock();
    }).observe(_wk,{attributes:true,attributeFilter:['class']});
  }

  // ===== AI TEST (plays the route through all three zones) =====
  var AI_ROUTES=[
    // Zone 1: main street north, cling demo at the garden wall, lever, gate
    [{x:0,y:-50},{x:-6,y:-44},{x:-6,y:-34},{x:-8,y:-28.6},
     {x:-10,y:-26.7,cling:true,fx:0,fy:1},
     {x:-6,y:-22},{x:-6,y:-12},{x:-6,y:-2},{x:-6,y:6},
     {x:-6,y:12},{x:-6,y:22},{x:1,y:23.5},{x:1,y:25.8,lever:true},
     {x:-6,y:27},{x:-6,y:31.5}],
    // Zone 2: bridge 1, kill the captain, bridge 2, yard, lever, north gate
    [{x:0,y:-24},{x:-4,y:-14},{x:-4,y:-8.6},{x:-4,y:-3.2},
     {x:6,y:0.5,kill:'samurai'},
     {x:6,y:3},{x:6,y:8.6},{x:6,y:11},{x:6,y:13},
     {x:12,y:19.2,lever:true},
     {x:-2,y:19},{x:-2,y:23},{x:0,y:27}],
    // Zone 3: arch, genkan, corridor, shoin lever, rear door, rear gate
    [{x:2,y:-18},{x:2,y:-8},{x:2,y:-3},{x:2,y:0.5},
     {x:2,y:2.8},{x:2,y:5,z:0.45},
     {x:0,y:6.5,z:0.45},{x:0,y:13.6,z:0.45},
     {x:-0.8,y:15,z:0.45},{x:-4,y:15.5,z:0.45},
     {x:-8.6,y:17,z:0.45,lever:true},
     {x:-4,y:15,z:0.45},{x:-0.4,y:15,z:0.45},
     {x:0,y:18.5,z:0.45},{x:0,y:21},{x:0,y:23.2},{x:0,y:25.8}],
    // Zone 4: yard, base stairs, 1F-3F interior stairs, throne room
    [{x:0,y:-16},{x:-6,y:-9},{x:-6,y:-5},
     {x:-6,y:-1.8,z:1.5},{x:-6,y:0.8,z:3},
     {x:-3,y:1.2,z:3},{x:2.2,y:1.2,z:3},{x:2.2,y:3.6,z:3},
     {x:0,y:6,z:3},{x:-3.4,y:9.5,z:3},{x:-3.4,y:13.0,z:3},
     {x:-5.6,y:14.05,z:3},
     {x:-5.6,y:10.2,z:5.5},{x:-5.6,y:8.6,z:6.1},
     {x:-3,y:6.5,z:6.1},{x:2,y:6,z:6.1},
     {x:2.5,y:13.2,z:6.1},{x:5.4,y:13.75,z:6.1},
     {x:5.4,y:10.2,z:8.6},{x:5.4,y:8.6,z:9.0},
     {x:4.2,y:4.8,z:9.0},
     {x:-1.8,y:13.0,z:9.0},{x:-3.8,y:13.25,z:9.0},
     {x:-3.8,y:9.6,z:11.4},{x:-3.8,y:8.6,z:11.9},
     {x:0,y:9.2,z:11.9,boss:true}]
  ];
  function aiNearestWp(){
    var route=AI_ROUTES[curZone]||[];
    var best=0,bd=1e9;
    for(var i=0;i<route.length;i++){
      var w=route[i];
      var d=dist2d(player.x,player.y,w.x,w.y)+Math.abs((w.z||0)-player.z)*4;
      if(d<bd){bd=d;best=i;}
    }
    return best;
  }
  function aiNearestLever(wp){
    var lvT=null,lvD=99;
    for(var lv=0;lv<levers.length;lv++){
      var dd=dist2d(levers[lv].x,levers[lv].y,wp.x,wp.y);
      if(dd<lvD){lvD=dd;lvT=levers[lv];}
    }
    return lvT;
  }
  function aiInit(){
    aiWpIdx=0;aiStuck=0;aiTimer=0;aiAtkT=0;aiClingT=0;aiClingTry=0;
    aiProgWp=-1;aiBestWpd=1e9;aiNoProgT=0;
    aiLastX=player.x;aiLastY=player.y;
    if(gameState!=='playing')startGame();
  }
  function aiUpdate(dt){
    if(gameState!=='playing')return;
    keys.w=keys.a=keys.s=keys.d=false;keys.sneak=false;
    aiTimer+=dt;aiAtkT-=dt;
    var route=AI_ROUTES[curZone]||[];
    if(aiWpIdx>=route.length)aiWpIdx=route.length-1;
    var wp=route[aiWpIdx]||{x:player.x,y:player.y+5};
    if(aiTimer>1){
      if(!player.cling&&dist2d(player.x,player.y,aiLastX,aiLastY)<0.7){
        aiStuck++;
        if(!keys.sp)spJustPressed=true;
        if(aiStuck>2)tryDash();
        if(aiStuck>4&&player.hasDouble)spJustPressed=true;
        if(aiStuck>10){ // wedged beyond saving: restart the route from the jizo
          player.x=checkpoint[0];player.y=checkpoint[1];player.z=checkpoint[2]+0.5;
          player.vx=player.vy=player.vz=0;player.grappling=false;player.cling=false;
          aiWpIdx=aiNearestWp();aiStuck=0;
        }
      }else aiStuck=0;
      aiLastX=player.x;aiLastY=player.y;aiTimer=0;
    }
    var threat=null,td=5;
    for(var i=0;i<enemies.length;i++){
      var e=enemies[i];
      if(e.dead||!e.alerted||e.def.boss)continue;
      if(Math.abs(e.z-player.z)>2.2)continue; // unreachable floor — ignore
      var d=dist2d(e.x,e.y,player.x,player.y);
      if(d<td){td=d;threat=e;}
    }
    var wpd=dist2d(player.x,player.y,wp.x,wp.y);
    var zOk=wp.z===undefined||Math.abs(player.z-wp.z)<1.6;
    if(aiWpIdx!==aiProgWp){aiProgWp=aiWpIdx;aiBestWpd=1e9;aiNoProgT=0;}
    if(wpd<aiBestWpd-0.3){aiBestWpd=wpd;aiNoProgT=0;}
    else if(!(wp.boss&&bossActive)){
      aiNoProgT+=dt;
      if(aiNoProgT>25){ // wedged beyond saving: restart the route from the jizo
        player.x=checkpoint[0];player.y=checkpoint[1];player.z=checkpoint[2]+0.5;
        player.vx=player.vy=player.vz=0;player.grappling=false;player.cling=false;player.dashT=0;
        aiWpIdx=aiNearestWp();aiProgWp=-1;aiBestWpd=1e9;aiNoProgT=0;aiStuck=0;
        return;
      }
    }
    if(wp.kill){
      var target=null;
      for(var k2=0;k2<enemies.length;k2++)if(!enemies[k2].dead&&enemies[k2].kind===wp.kill)target=enemies[k2];
      if(!target){aiWpIdx++;return;}
      threat=target;td=dist2d(target.x,target.y,player.x,player.y);
    }
    if(threat){
      aiState='fight';
      cam.yaw=Math.atan2(threat.x-player.x,threat.y-player.y);
      if(td>1.3)keys.w=true;
      if(td<2.2&&aiAtkT<=0){tryAttack();aiAtkT=0.35;}
      return;
    }
    var sk=stealthTarget();
    if(sk&&aiAtkT<=0){tryAttack();aiAtkT=0.6;return;}
    if(wp.cling){
      if(player.cling){
        aiClingT-=dt;
        keys.d=true; // slide along the wall to the corner and peek
        if(aiClingT<=0){releaseCling();aiClingTry=0;aiWpIdx++;}
        return;
      }
      if(wpd<1.5){
        player.facing=Math.atan2(wp.fx||0,wp.fy||1); // square up to the wall
        toggleCling();
        if(player.cling){aiClingT=1.2;return;}
        aiClingTry++;
        if(aiClingTry>2){aiClingTry=0;aiWpIdx++;}
        return;
      }
    }
    if(wp.lever){
      var lvT=aiNearestLever(wp);
      if(!lvT||lvT.on){aiWpIdx++;return;}
      if(wpd<1.3){
        cam.yaw=Math.atan2(lvT.x-player.x,lvT.y-player.y);
        player.facing=cam.yaw;
        if(aiAtkT<=0){tryAttack();aiAtkT=0.5;}
        return;
      }
    }
    if(wp.hook&&wpd<GRAP_RNG-2&&player.z<((wp.z||0)-1)){
      if(!player.grappling&&grapCD<=0){
        var hdx=wp.x-player.x,hdy=wp.y-player.y;
        var hh=Math.sqrt(hdx*hdx+hdy*hdy)||0.1;
        var htz=(wp.z||player.z)-0.35; // aim just under the ledge line
        cam.yaw=Math.atan2(hdx,hdy);
        cam.pitch=clamp(Math.atan2(htz-(player.z+1.45),hh),-1.0,1.0);
        aimMode=true;
        fireGrapple();
        if(!player.grappling)aimMode=false; // missed: walk on, retry next pass
      }
      if(player.grappling)return;
    }
    if(wp.boss){
      var boss=null;
      for(var b=0;b<enemies.length;b++)if(enemies[b].def.boss)boss=enemies[b];
      if(boss&&wpd<8){
        aiState='boss';
        var bd=dist2d(boss.x,boss.y,player.x,player.y);
        cam.yaw=Math.atan2(boss.x-player.x,boss.y-player.y);
        if(bd>1.2)keys.w=true;
        if(boss.bossAtk===1&&boss.atkAnimT>0.3)tryDash();
        if(bd<2.0&&aiAtkT<=0){tryAttack();aiAtkT=0.35;}
        else if(bd>=2.4&&player.shuriken>0&&aiAtkT<=0){tryShuriken();aiAtkT=0.5;}
        return;
      }
    }
    aiState='route';
    if(wp.z!==undefined&&player.grounded&&player.z<wp.z-1.8&&aiWpIdx>0){
      aiWpIdx--; // fell off the climb — retry from the previous waypoint
      return;
    }
    var lvN=wp.lever?aiNearestLever(wp):null;
    var leverPending=!!(lvN&&!lvN.on);
    if(wpd<1.4&&zOk&&!leverPending&&!wp.cling){
      if(aiWpIdx<route.length-1)aiWpIdx++;
    }else{
      cam.yaw=angLerp(cam.yaw,Math.atan2(wp.x-player.x,wp.y-player.y),Math.min(1,8*dt));
      keys.w=true;
      if(wp.z!==undefined&&wp.z>player.z+0.8&&player.grounded&&aiStuck>0)spJustPressed=true;
    }
  }

  // ===== GAME LOOP =====
  var lastT=0;
  function gameLoop(ts){
    requestAnimationFrame(gameLoop);
    if(!isKgOpen())return;
    var rawDt=Math.min(0.05,(ts-lastT)/1000||0.016);
    lastT=ts;
    _time+=rawDt;
    debugFrames++;debugFpsTimer+=rawDt;
    if(debugFpsTimer>=0.5){debugFps=Math.round(debugFrames/debugFpsTimer);debugFrames=0;debugFpsTimer=0;}

    var dt=rawDt;
    if(hitStopT>0){hitStopT-=rawDt;dt*=0.1;}
    if(slowMo>0){slowMo-=rawDt;dt*=0.35;}
    if(aimMode&&gameState==='playing')dt*=0.45; // focus: the world slows while you aim

    if(gameState==='title'){
      cam.yaw=_time*0.06;
      cam.pitch=-0.3;
      cam.dist=7;
      updatePetals(rawDt);updateLights(rawDt);
    }else if(gameState==='playing'){
      cam.dist=4.4;
      var canRun=(pointerLocked||isMobileKg||aiMode)&&!manualPause&&zoneFadeDir===0;
      if(zoneAnnounceT>0)zoneAnnounceT-=rawDt;
      updateZoneFade(rawDt);
      if(canRun&&dt>0&&zoneAnnounceT<=0){
        gameTime+=dt;
        if(aiMode)aiUpdate(dt);
        updateAttack(dt);
        resolvePhysics(dt);
        updateEnemies(dt);
        updateShurikens(dt);
        updatePickups(dt);
        updateParticles(dt);
        updatePetals(dt);
        updateFloats(dt);
        updateLights(dt);
        updateSlashTrails(dt);
        checkZoneExit();
        updateHintTrigs();
        if(grapCD>0)grapCD-=dt;
        if(musicAlert>0&&musicAlert<9000)musicAlert-=dt;
      }
    }else{
      if(stateTimer>0)stateTimer-=rawDt;
      if(aiMode&&gameState==='dead'&&stateTimer<=0)reviveAtCheckpoint(); // AI run never stops at a grave
      updateParticles(rawDt);updatePetals(rawDt);updateLights(rawDt);updateFloats(rawDt);
    }

    if(screenShake>0)screenShake=Math.max(0,screenShake-12*rawDt);
    if(dmgFlash>0)dmgFlash=Math.max(0,dmgFlash-3*rawDt);
    if(healFlash>0)healFlash=Math.max(0,healFlash-2.5*rawDt);
    if(sekkenFlash>0)sekkenFlash=Math.max(0,sekkenFlash-rawDt);
    if(fovKick>0)fovKick=Math.max(0,fovKick-5*rawDt);
    if(hintT>0)hintT-=rawDt;
    if(bossIntroT>0)bossIntroT=Math.max(0,bossIntroT-rawDt);
    var lbWant=(gameState==='playing'&&(zoneAnnounceT>0||bossIntroT>0||aimMode))?1:0;
    letterboxT+=(lbWant-letterboxT)*Math.min(1,6*rawDt);

    scheduleMusic();
    renderScene();
    renderHUD();
    updateOverlay();
    updateOverlayPrompts();
  }

  // ===== TEST HOOK (headless harness + AI verification) =====
  window._kage2Test={
    state:function(){
      var boss=null;
      for(var i=0;i<enemies.length;i++)if(enemies[i].def.boss)boss=enemies[i];
      return{zone:curZone,hp:player.hp,x:player.x,y:player.y,z:player.z,
        kills:kills,stealthKills:stealthKills,alerts:alertCount,koban:koban,
        gameState:gameState,enemies:enemies.length,bossHp:boss?boss.hp:-1,aiWp:aiWpIdx,aiState:aiState,
        hasDouble:player.hasDouble,hasHook:player.hasHook,solids:solids.length,
        cling:player.cling,peek:player.peek,squeaks:squeaks.length,
        dashT:player.dashT,rollT:player.rollT,rollDir:player.rollDir,sneak:keys.sneak,clingStepT:player.clingStepT};
    },
    warp:function(x,y,z){player.x=x;player.y=y;player.z=z;player.vx=player.vy=player.vz=0;},
    give:function(){player.hasDouble=true;player.hasHook=true;player.shuriken=8;},
    zone:function(n){buildZone(n);},
    lock:function(v){pointerLocked=!!v;},
    aim:function(yaw,pitch){cam.yaw=yaw;cam.pitch=pitch;},
    key:function(code,down){handleKey({code:code,preventDefault:function(){}},down);},
    grap:function(){return{grappling:player.grappling,cd:grapCD,anchors:anchors.length};},
    cling:function(){toggleCling();},
    cam:function(){return{x:cam.x,y:cam.y,z:cam.z,yaw:cam.yaw,pitch:cam.pitch,px:player.x,py:player.y,pz:player.z,peek:player.peek};},
    nuke:function(){for(var i=0;i<enemies.length;i++)if(!enemies[i].def.boss)enemies[i].dead=true;},
    ai:function(v){aiMode=!!v;if(aiMode){aiInit();debugMode=true;}else{keys.w=keys.a=keys.s=keys.d=keys.sp=false;mouseDown=false;}},
    hurtBoss:function(n){for(var i=0;i<enemies.length;i++)if(enemies[i].def.boss){enemies[i].hp-=n;if(enemies[i].hp<=0)killEnemy(enemies[i],false);}}
  };

  // ===== INIT =====
  buildZone1();        // backdrop for the title screen
  bakeStatic();
  zoneAnnounceT=0;_ovActive='';
  updateOverlay();
  requestAnimationFrame(gameLoop);
})();
