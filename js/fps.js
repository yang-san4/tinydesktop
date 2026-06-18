// ===== SKYHOLM — Floating Isles FPS (WebGL) | (formerly GEKKO) =====
// v2 rewrite: WebGL renderer (low-res + pixelated upscale), unified
// geometry (one box list drives both rendering and collision), dusk
// synthwave palette, dynamic lights, 3D enemy meshes, richer audio.
(function () {
  var canvas = document.getElementById('fps-canvas');
  // Internal render resolution (4:3) — upscaled by CSS, pixelated.
  var W = 400, H = 300;
  canvas.width = W; canvas.height = H;
  canvas.style.width = '100%';
  canvas.style.aspectRatio = '4/3';
  canvas.style.imageRendering = 'pixelated';
  canvas.style.display = 'block';

  // ===== Window sizing (80% of tinydesktop screen: 440x330) =====
  var _wfps = document.getElementById('window-fps');
  if (_wfps) {
    _wfps.style.width = '352px';
    _wfps.style.left = '44px';
    _wfps.style.top = '10px';
  }

  // ===== Canvas stack: WebGL below, 2D HUD above =====
  var _fb = document.getElementById('fps-body');
  var _cw = document.createElement('div');
  _cw.style.cssText = 'position:relative;line-height:0;';
  _fb.insertBefore(_cw, canvas); _cw.appendChild(canvas);
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
    msg.textContent = 'SKYHOLM requires WebGL.';
    _cw.appendChild(msg);
    return;
  }

  // ===== HTML Overlay (title / wave / pause / win / dead) =====
  var _ov = document.createElement('div');
  _ov.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:hidden;z-index:10;';
  _cw.appendChild(_ov);
  var _ovCss = document.createElement('style');
  _ovCss.textContent =
    '@keyframes fpsPulse{0%,100%{opacity:.3}50%{opacity:1}}' +
    '@keyframes fpsSlideIn{0%{transform:translateY(-10px);opacity:0}100%{transform:translateY(0);opacity:1}}' +
    '.fps-scr{position:absolute;top:0;left:0;width:100%;height:100%;display:none;' +
    'flex-direction:column;align-items:center;justify-content:center;gap:0;' +
    'font-family:"Press Start 2P",monospace;text-align:center;box-sizing:border-box;padding:4% 4%;background:rgba(34,26,18,0.55)}' +
    '.fps-scr.on{display:flex}' +
    '.fps-blink{animation:fpsPulse 1.8s ease-in-out infinite}' +
    '.fps-key{display:inline-block;border:1px solid rgba(200,155,90,0.45);padding:2px 4px;font-size:5px;border-radius:2px;margin:0 1px;background:rgba(200,155,90,0.06);color:#c89b5a;line-height:1;vertical-align:middle;font-family:"Press Start 2P",monospace}' +
    '.fps-si{display:inline-block;width:14px;height:14px;border:1px solid;border-radius:50%;vertical-align:middle;position:relative;box-sizing:border-box}' +
    '.fps-si::after{content:"";position:absolute;width:6px;height:6px;border-radius:50%;top:50%;left:50%;transform:translate(-50%,-50%);background:currentColor;opacity:.35}' +
    '.fps-bi{display:inline-block;width:10px;height:10px;border-radius:3px;border:1px solid;vertical-align:middle;box-sizing:border-box}' +
    '.fps-cr{display:flex;align-items:center;justify-content:center;gap:10px;margin:2px 0;flex-wrap:wrap}' +
    '.fps-ci{display:flex;align-items:center;gap:4px;font-size:5px;color:#e8dcc4;white-space:nowrap}' +
    '.fps-logo{background:rgba(34,26,18,0.92);border-top:2px solid #c89b5a;border-bottom:2px solid #8a4a2a;padding:12px 28px 10px;text-align:center}' +
    '.fps-logo-t{font-size:18px;color:#c89b5a;text-shadow:0 0 8px #c89b5a80,0 0 18px #c89b5a40;letter-spacing:8px}' +
    '.fps-logo-sep{width:50%;height:1px;background:linear-gradient(90deg,transparent,#8a4a2a60,transparent);margin:8px auto 6px}' +
    '.fps-logo-sub{font-size:4px;color:#8a4a2a;letter-spacing:2px;opacity:.65}' +
    '.fps-hud-hint{position:absolute;bottom:3px;right:4px;display:none;align-items:center;gap:3px;font-family:"Press Start 2P",monospace;font-size:4px;text-shadow:0 0 4px rgba(0,0,0,0.9)}.fps-hud-hint.on{display:flex}' +
    '.fps-wave-title{font-size:14px;color:#c89b5a;text-shadow:0 0 10px #c89b5a;animation:fpsSlideIn 0.5s ease-out}' +
    '.fps-wave-sub{font-size:6px;color:#8a4a2a;margin-top:6px;animation:fpsSlideIn 0.5s ease-out 0.2s both}' +
    '.fps-wave-info{font-size:4px;color:#e8dcc4;margin-top:4px;opacity:.7;animation:fpsSlideIn 0.5s ease-out 0.4s both}' +
    '.fps-stats{font-size:5px;color:#e8dcc4;margin-top:10px;line-height:2}.fps-stats b{color:#c89b5a}';
  document.head.appendChild(_ovCss);
  function _mkScr(){var d=document.createElement('div');d.className='fps-scr';_ov.appendChild(d);return d;}
  function _pcControls(){return '<div class="fps-cr"><div class="fps-ci"><span class="fps-key">W</span><span class="fps-key">A</span><span class="fps-key">S</span><span class="fps-key">D</span> MOVE</div><div class="fps-ci"><span class="fps-key" style="font-size:4px">MOUSE</span> LOOK</div></div><div class="fps-cr"><div class="fps-ci"><span class="fps-key" style="font-size:4px">CLICK</span> SHOOT</div><div class="fps-ci"><span class="fps-key" style="font-size:4px">SPACE</span> JUMP/JET</div><div class="fps-ci"><span class="fps-key">Q</span> DASH</div><div class="fps-ci"><span class="fps-key">E</span> GRAPPLE</div></div><div class="fps-cr"><div class="fps-ci"><span class="fps-key">1</span><span class="fps-key">2</span><span class="fps-key">3</span> WEAPONS</div><div class="fps-ci"><span class="fps-key" style="font-size:4px">ESC</span> PAUSE</div></div>';}
  function _mobControls(){return '<div class="fps-cr"><div class="fps-ci"><span class="fps-si" style="color:#c89b5a;border-color:rgba(200,155,90,0.45)"></span> MOVE</div><div class="fps-ci"><span class="fps-si" style="color:#8a4a2a;border-color:rgba(138,74,42,0.45)"></span> LOOK</div></div><div class="fps-cr"><div class="fps-ci"><span class="fps-bi" style="border-color:#ff3c3c;background:rgba(255,60,60,0.15)"></span> FIRE</div><div class="fps-ci"><span class="fps-bi" style="border-color:#c89b5a;background:rgba(200,155,90,0.15)"></span> JUMP</div><div class="fps-ci"><span class="fps-bi" style="border-color:#8a4a2a;background:rgba(138,74,42,0.15)"></span> DASH</div></div>';}
  var _scrTitle=_mkScr();
  _scrTitle.innerHTML='<div class="fps-logo"><div class="fps-logo-t">SKYHOLM</div><div class="fps-logo-sep"></div><div class="fps-logo-sub">FLOATING ISLES</div></div><div style="flex:1 0 14px;max-height:28px"></div><div class="fps-blink" style="font-size:8px;color:#fff"></div><div style="flex:1 0 10px;max-height:20px"></div><div style="opacity:.6"></div>';
  var _titlePrompt=_scrTitle.children[2],_titleCtrls=_scrTitle.children[4];
  var _scrWave=_mkScr();_scrWave.style.background='rgba(10,5,20,0.5)';
  _scrWave.innerHTML='<div class="fps-wave-title"></div><div class="fps-wave-sub"></div><div class="fps-wave-info"></div>';
  var _waveTitle=_scrWave.children[0],_waveSub=_scrWave.children[1],_waveInfo=_scrWave.children[2];
  var _scrPause=_mkScr();
  _scrPause.innerHTML='<div style="font-size:14px;color:#c89b5a;text-shadow:0 0 6px #c89b5a80">PAUSED</div><div class="fps-blink" style="font-size:7px;color:#fff;margin:14px 0 10px"></div><div style="display:flex;gap:8px;justify-content:center;margin-bottom:10px"></div><div style="opacity:.55"></div>';
  var _pausePrompt=_scrPause.children[1],_pauseMenu=_scrPause.children[2],_pauseCtrls=_scrPause.children[3];
  var _btnStyle='font-size:6px;padding:3px 8px;cursor:pointer;border:1px solid;border-radius:2px;user-select:none;';
  var _btnDebug=document.createElement('div');
  _btnDebug.style.cssText=_btnStyle+'color:#b5894f;border-color:#b5894f;';
  _btnDebug.textContent='DEBUG';
  _btnDebug.addEventListener('mousedown',function(e){e.stopPropagation();e.preventDefault();debugMode=!debugMode;_btnDebug.style.background=debugMode?'rgba(181,137,79,0.3)':'';});
  var _btnReset=document.createElement('div');
  _btnReset.style.cssText=_btnStyle+'color:#f44;border-color:#f44;';
  _btnReset.textContent='RESET';
  _btnReset.addEventListener('mousedown',function(e){e.stopPropagation();e.preventDefault();gameState='title';manualPause=false;_ovActive='';stopMusic();updateOverlay();});
  var _btnAI=document.createElement('div');
  _btnAI.style.cssText=_btnStyle+'color:#0f8;border-color:#0f8;';
  _btnAI.textContent='AI TEST';
  _btnAI.addEventListener('mousedown',function(e){e.stopPropagation();e.preventDefault();
    aiMode=!aiMode;
    if(aiMode){aiInit();debugMode=true;_btnDebug.style.background='rgba(181,137,79,0.3)';}
    else{keys.w=keys.a=keys.s=keys.d=keys.sp=false;mouseDown=false;}
    _btnAI.style.background=aiMode?'rgba(0,255,136,0.3)':'';
  });
  _pauseMenu.appendChild(_btnDebug);_pauseMenu.appendChild(_btnAI);_pauseMenu.appendChild(_btnReset);
  _scrPause.addEventListener('mousedown',function(e){
    if(e.target===_btnDebug||e.target===_btnAI||e.target===_btnReset)return;
    manualPause=false;
    if(!isMobileFps&&!aiMode)canvas.requestPointerLock();
  });
  var _scrWin=_mkScr();_scrWin.style.background='rgba(0,10,20,0.8)';
  _scrWin.innerHTML='<div style="font-size:16px;color:#c89b5a;text-shadow:0 0 10px #c89b5a,0 0 20px #c89b5a60">YOU WIN!</div><div class="fps-stats"></div><div class="fps-blink" style="font-size:7px;color:#fff;margin-top:16px"></div>';
  var _winStats=_scrWin.children[1],_winPrompt=_scrWin.children[2];
  var _scrDead=_mkScr();_scrDead.style.background='rgba(20,0,0,0.8)';
  _scrDead.innerHTML='<div style="font-size:14px;color:#ff3c3c;text-shadow:0 0 10px #ff3c3c80">GAME OVER</div><div class="fps-stats"></div><div class="fps-blink" style="font-size:7px;color:#fff;margin-top:16px"></div>';
  var _deadStats=_scrDead.children[1],_deadPrompt=_scrDead.children[2];
  var _hudHint=document.createElement('div');_hudHint.className='fps-hud-hint';
  _hudHint.innerHTML='<span class="fps-key" style="font-size:4px;padding:1px 3px">ESC</span><span style="color:#e8dcc4">PAUSE</span>';
  _ov.appendChild(_hudHint);
  var _ovActive='';
  function updateOverlay(){
    var isPaused=gameState==='playing'&&!isMobileFps&&(manualPause||(!pointerLocked&&!aiMode));
    var scr='none';
    if(gameState==='title')scr='title';
    else if(gameState==='playing'&&waveAnnounceTimer>0)scr='wave';
    else if(isPaused)scr='pause';
    else if(gameState==='win')scr='win';
    else if(gameState==='gameover')scr='dead';
    _hudHint.className='fps-hud-hint'+((gameState==='playing'&&(pointerLocked||aiMode)&&!isMobileFps&&!manualPause)?' on':'');
    if(scr===_ovActive)return;_ovActive=scr;
    _ov.style.pointerEvents=scr==='pause'?'auto':'none';
    _scrTitle.className='fps-scr'+(scr==='title'?' on':'');
    _scrWave.className='fps-scr'+(scr==='wave'?' on':'');
    _scrPause.className='fps-scr'+(scr==='pause'?' on':'');
    _scrWin.className='fps-scr'+(scr==='win'?' on':'');
    _scrDead.className='fps-scr'+(scr==='dead'?' on':'');
    if(scr==='title'){_titlePrompt.textContent=isMobileFps?'TAP TO START':'CLICK TO START';_titleCtrls.innerHTML=isMobileFps?_mobControls():_pcControls();}
    if(scr==='pause'){_pausePrompt.textContent='CLICK TO RESUME';_pauseCtrls.innerHTML=_pcControls();_btnDebug.style.background=debugMode?'rgba(181,137,79,0.3)':'';_btnAI.style.background=aiMode?'rgba(0,255,136,0.3)':'';}
    if(scr==='win'){_winPrompt.textContent='';_winPrompt.style.display='none';}
    if(scr==='dead'){_deadPrompt.textContent='';_deadPrompt.style.display='none';}
  }
  function updateOverlayPrompts(){
    if(gameState==='win'&&stateTimer<=0&&_winPrompt.style.display==='none'){_winPrompt.textContent=isMobileFps?'TAP TO CONTINUE':'CLICK TO CONTINUE';_winPrompt.style.display='';}
    if(gameState==='gameover'&&stateTimer<=0&&_deadPrompt.style.display==='none'){_deadPrompt.textContent=isMobileFps?'TAP TO CONTINUE':'CLICK TO CONTINUE';_deadPrompt.style.display='';}
  }

  // ===== CONSTANTS =====
  var PI=Math.PI,TAU=PI*2,DEG=PI/180;
  var FOV_BASE=70*DEG;
  var NEAR=0.1,FAR=160,FOG_START=38,FOG_END=95;
  var GRAVITY=18,PLAYER_EYE=0.7,PLAYER_R=0.22,PLAYER_H=0.85;
  var WALK_SPD=4.5,AIR_CTRL=8,FRICTION=10;
  var JUMP_VEL=9.0,JET_ACC=26,JET_MAX=1.8,JET_VZMAX=5.8;
  var DASH_SPD=15,DASH_T=0.15,DASH_CD=1.2;
  var GRAP_SPD=18,GRAP_RNG=18;
  var MOM_MAX=1.4,MOM_GAIN=0.3,MOM_DECAY=2;
  var COYOTE_T=0.12;
  var VOID_Z=-10;
  // Clear-sky daylight palette
  var SKY_TOP=[0.22,0.48,0.85],SKY_HOR=[0.80,0.90,0.98],SKY_BOT=[0.72,0.84,0.93];
  var FOG_C=[0.78,0.86,0.95];
  var SUN_DIR=norm3([0.35,-0.25,0.9]); // high midday sun
  var SUN_COL=[1.25,1.18,1.02];
  var AMB_UP=[0.55,0.68,0.85],AMB_DN=[0.42,0.40,0.32]; // hemisphere ambient (sky blue / warm ground)
  var _time=0;

  // ===== MATH =====
  function norm3(v){var l=Math.sqrt(v[0]*v[0]+v[1]*v[1]+v[2]*v[2])||1;return[v[0]/l,v[1]/l,v[2]/l];}
  function clamp(v,a,b){return v<a?a:(v>b?b:v);}
  function lerp(a,b,t){return a+(b-a)*t;}
  function dist2d(ax,ay,bx,by){var dx=ax-bx,dy=ay-by;return Math.sqrt(dx*dx+dy*dy);}
  function dist3d(ax,ay,az,bx,by,bz){var dx=ax-bx,dy=ay-by,dz=az-bz;return Math.sqrt(dx*dx+dy*dy+dz*dz);}
  // 4x4 column-major matrices. World: x=east, y=north, z=up.
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
  // View matrix from camera pos + yaw(a, 0=+y) + pitch(p, up positive).
  // Maps world (x,y,z up) into GL view space (x right, y up, -z forward).
  function matView(cx,cy,cz,a,p){
    var ca=Math.cos(a),sa=Math.sin(a),cp=Math.cos(p),sp=Math.sin(p);
    // Basis vectors in world space
    var rx=ca,ry=-sa,rz=0;                       // right
    var ux=sa*sp,uy=ca*sp,uz=cp;                 // up (after pitch)... compute via cross
    var fx=sa*cp,fy=ca*cp,fz=sp;                 // forward
    // up = right x forward... ensure orthogonal: up = cross(right, forward)
    ux=ry*fz-rz*fy; uy=rz*fx-rx*fz; uz=rx*fy-ry*fx;
    return [
      rx,ux,-fx,0,
      ry,uy,-fy,0,
      rz,uz,-fz,0,
      -(rx*cx+ry*cy+rz*cz), -(ux*cx+uy*cy+uz*cz), (fx*cx+fy*cy+fz*cz), 1
    ];
  }

  // ===== WEBGL SETUP =====
  function mkShader(type,src){
    var s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){console.error('GEKKO shader:',gl.getShaderInfoLog(s));}
    return s;
  }
  function mkProgram(vs,fs){
    var p=gl.createProgram();
    gl.attachShader(p,mkShader(gl.VERTEX_SHADER,vs));
    gl.attachShader(p,mkShader(gl.FRAGMENT_SHADER,fs));
    gl.linkProgram(p);
    if(!gl.getProgramParameter(p,gl.LINK_STATUS)){console.error('GEKKO link:',gl.getProgramInfoLog(p));}
    return p;
  }

  // --- Main world shader: vertex-lit (sun + hemisphere + 4 point lights), fog, emissive ---
  var VS_WORLD=
    'attribute vec3 aPos;attribute vec3 aNrm;attribute vec4 aCol;\n'+
    'uniform mat4 uVP;uniform vec3 uSunDir;uniform vec3 uSunCol;\n'+
    'uniform vec3 uAmbUp;uniform vec3 uAmbDn;uniform vec3 uCam;\n'+
    'uniform vec4 uLPos[4];uniform vec4 uLCol[4];\n'+ // pos.xyz + radius, col.rgb + intensity
    'varying vec4 vCol;varying float vFog;\n'+
    'void main(){\n'+
    '  vec4 cp=uVP*vec4(aPos,1.0);gl_Position=cp;\n'+
    '  float em=aCol.a;\n'+
    '  vec3 n=aNrm;\n'+
    '  float sun=max(dot(n,uSunDir),0.0);\n'+
    '  vec3 amb=mix(uAmbDn,uAmbUp,n.z*0.5+0.5);\n'+
    '  vec3 lit=aCol.rgb*(amb+uSunCol*sun);\n'+
    '  for(int i=0;i<4;i++){\n'+
    '    vec3 ld=uLPos[i].xyz-aPos;float d=length(ld);\n'+
    '    float att=max(0.0,1.0-d/max(uLPos[i].w,0.001))*uLCol[i].a;\n'+
    '    float nd=max(dot(n,ld/max(d,0.001)),0.0);\n'+
    '    lit+=aCol.rgb*uLCol[i].rgb*att*att*nd;\n'+
    '  }\n'+
    '  vec3 col=mix(lit,aCol.rgb,em);\n'+ // emissive ignores lighting
    '  vCol=vec4(col,1.0);\n'+
    '  float dist=distance(aPos,uCam);\n'+
    '  vFog=clamp((dist-'+FOG_START.toFixed(1)+')/('+(FOG_END-FOG_START).toFixed(1)+'),0.0,1.0)*(1.0-em*0.55);\n'+
    '}';
  var FS_WORLD=
    'precision mediump float;\n'+
    'varying vec4 vCol;varying float vFog;\n'+
    'uniform vec3 uFogC;\n'+
    'void main(){gl_FragColor=vec4(mix(vCol.rgb,uFogC,vFog),vCol.a);}';

  // --- Blend shader: particles / shadows / translucent quads (no lighting, alpha) ---
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

  // --- Sky shader: fullscreen quad, dusk gradient + sun + stars ---
  var VS_SKY=
    'attribute vec2 aPos;varying vec2 vUV;\n'+
    'void main(){vUV=aPos;gl_Position=vec4(aPos,0.9999,1.0);}';
  var FS_SKY=
    'precision mediump float;varying vec2 vUV;\n'+
    'uniform mat4 uInvVP;uniform vec3 uSunDir;uniform float uTime;\n'+
    'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}\n'+
    'void main(){\n'+
    '  vec4 wp=uInvVP*vec4(vUV,1.0,1.0);\n'+
    '  vec3 dir=normalize(wp.xyz/wp.w);\n'+
    '  float h=dir.z;\n'+
    '  vec3 top=vec3('+SKY_TOP[0]+','+SKY_TOP[1]+','+SKY_TOP[2]+');\n'+
    '  vec3 hor=vec3('+SKY_HOR[0]+','+SKY_HOR[1]+','+SKY_HOR[2]+');\n'+
    '  vec3 bot=vec3('+SKY_BOT[0]+','+SKY_BOT[1]+','+SKY_BOT[2]+');\n'+
    '  vec3 col;\n'+
    '  if(h>0.0){col=mix(hor,top,pow(clamp(h*1.6,0.0,1.0),0.7));}\n'+
    '  else{col=mix(hor,bot,clamp(-h*3.0,0.0,1.0));}\n'+
    '  float sd=max(dot(dir,uSunDir),0.0);\n'+
    '  col+=vec3(1.0,0.97,0.90)*pow(sd,320.0)*1.5;\n'+ // sun disc (small, white)
    '  col+=vec3(0.85,0.92,1.0)*pow(sd,10.0)*0.18;\n'+ // soft glow
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
    uLCol:gl.getUniformLocation(progWorld,'uLCol')
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
  // No face culling: closed boxes + z-buffer handle visibility; avoids
  // winding-order pitfalls with the rotated enemy parts.
  gl.disable(gl.CULL_FACE);

  // Sky fullscreen quad
  var skyBuf=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,skyBuf);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1, 1,-1, -1,1, 1,-1, 1,1, -1,1]),gl.STATIC_DRAW);

  // Inverse of view-projection rotation for sky ray reconstruction:
  // build VP without translation, invert via transpose trick on CPU (small helper).
  function mat4Invert(m){
    // general 4x4 inverse (adapted from gl-matrix), returns null if singular
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

  // ===== DYNAMIC LIGHTS (4 slots: pos xyz + radius, col rgb + intensity) =====
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
  var _lpos=new Float32Array(16),_lcol=new Float32Array(16);
  function packLights(){
    // pick 4 strongest (most recent are usually relevant; sort by it*life)
    var ls=lights.slice().sort(function(a,b){return(b.it*b.life/b.maxLife)-(a.it*a.life/a.maxLife);});
    for(var i=0;i<4;i++){
      var L=ls[i];
      if(L){
        var k=L.life/L.maxLife;
        _lpos[i*4]=L.x;_lpos[i*4+1]=L.y;_lpos[i*4+2]=L.z;_lpos[i*4+3]=L.rad;
        _lcol[i*4]=L.r;_lcol[i*4+1]=L.g;_lcol[i*4+2]=L.b;_lcol[i*4+3]=L.it*k;
      }else{
        _lpos[i*4]=0;_lpos[i*4+1]=0;_lpos[i*4+2]=-99;_lpos[i*4+3]=0.001;
        _lcol[i*4]=0;_lcol[i*4+1]=0;_lcol[i*4+2]=0;_lcol[i*4+3]=0;
      }
    }
  }
  // ===== UNIFIED GEOMETRY =====
  // ONE definition drives BOTH rendering and collision (v1 lesson: split
  // platform/decor lists caused "visible but not solid" bugs).
  var solids=[];        // collision AABBs: {x,y,z0,top,w,d}  (x,y center; w,d full size)
  var staticMesh=[];    // flat vertex floats: pos3 nrm3 col4
  var rngSeed=12345;
  function rng(){rngSeed=(rngSeed*1103515245+12345)&0x7fffffff;return rngSeed/0x7fffffff;}

  function pushQuad(arr,p1,p2,p3,p4,n,r,g,b,em){
    // two tris: p1p2p3, p1p3p4 — counter-clockwise as seen from normal side
    var i;var pts=[p1,p2,p3,p1,p3,p4];
    for(i=0;i<6;i++){
      var p=pts[i];
      arr.push(p[0],p[1],p[2],n[0],n[1],n[2],r,g,b,em);
    }
  }
  // Axis-aligned box: cx,cy center; z0 bottom; w,d,h sizes. side/top/bottom colors.
  function pushBoxGeo(arr,cx,cy,z0,w,d,h,side,top,em,bot){
    var x0=cx-w/2,x1=cx+w/2,y0=cy-d/2,y1=cy+d/2,z1=z0+h;
    bot=bot||[side[0]*0.5,side[1]*0.5,side[2]*0.5];
    // top (+z)
    pushQuad(arr,[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1],[0,0,1],top[0],top[1],top[2],em);
    // bottom (-z)
    pushQuad(arr,[x0,y1,z0],[x1,y1,z0],[x1,y0,z0],[x0,y0,z0],[0,0,-1],bot[0],bot[1],bot[2],em);
    // +x east
    pushQuad(arr,[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[x1,y0,z1],[1,0,0],side[0],side[1],side[2],em);
    // -x west
    pushQuad(arr,[x0,y1,z0],[x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[-1,0,0],side[0],side[1],side[2],em);
    // +y north
    pushQuad(arr,[x1,y1,z0],[x0,y1,z0],[x0,y1,z1],[x1,y1,z1],[0,1,0],side[0],side[1],side[2],em);
    // -y south
    pushQuad(arr,[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1],[0,-1,0],side[0],side[1],side[2],em);
  }
  // Solid box: visible AND collidable.
  function S(cx,cy,z0,w,d,h,side,top,em){
    solids.push({x:cx,y:cy,z0:z0,top:z0+h,w:w,d:d});
    pushBoxGeo(staticMesh,cx,cy,z0,w,d,h,side,top,em||0);
  }
  // Decor box: visible only (explicitly non-solid — rails, antennae, signs).
  function D(cx,cy,z0,w,d,h,side,top,em){
    pushBoxGeo(staticMesh,cx,cy,z0,w,d,h,side,top,em||0);
  }
  // Single emissive quad stuck on a wall face (windows, signs). dir: 0=+x,1=-x,2=+y,3=-y
  function W2(cx,cy,cz,w,h,dir,r,g,b,em){
    var hw=w/2,hh=h/2,e=0.02;
    if(dir===0)pushQuad(staticMesh,[cx+e,cy-hw,cz-hh],[cx+e,cy+hw,cz-hh],[cx+e,cy+hw,cz+hh],[cx+e,cy-hw,cz+hh],[1,0,0],r,g,b,em);
    else if(dir===1)pushQuad(staticMesh,[cx-e,cy+hw,cz-hh],[cx-e,cy-hw,cz-hh],[cx-e,cy-hw,cz+hh],[cx-e,cy+hw,cz+hh],[-1,0,0],r,g,b,em);
    else if(dir===2)pushQuad(staticMesh,[cx+hw,cy+e,cz-hh],[cx-hw,cy+e,cz-hh],[cx-hw,cy+e,cz+hh],[cx+hw,cy+e,cz+hh],[0,1,0],r,g,b,em);
    else pushQuad(staticMesh,[cx-hw,cy-e,cz-hh],[cx+hw,cy-e,cz-hh],[cx+hw,cy-e,cz+hh],[cx-hw,cy-e,cz+hh],[0,-1,0],r,g,b,em);
  }

  // ===== PALETTE ===== (medieval sky-town: stone / timber / grass / thatch)
  var C_DECK=[0.42,0.55,0.30];      // island top — grass
  var C_DECK2=[0.60,0.56,0.48];     // island top — stone plaza
  var C_ROCK=[0.45,0.37,0.30];      // island underside — brown cliff rock
  var C_BLDG=[0.82,0.74,0.60];      // plaster wall (cream)
  var C_BLDG2=[0.55,0.40,0.28];     // timber wall (brown)
  var C_TRIM_C=[0.70,0.68,0.62];    // stone trim (was cyan)
  var C_TRIM_M=[0.40,0.28,0.18];    // dark wood trim (was magenta)
  var C_TRIM_A=[0.85,0.62,0.32];    // warm lit window / awning (was amber)
  var C_RAIL=[0.45,0.32,0.20];      // wood rail
  var C_ROOF=[0.70,0.35,0.25];      // terracotta roof
  var C_ROOF2=[0.42,0.44,0.50];     // slate roof
  var C_WATER=[0.40,0.62,0.78];     // water (for later phases)
  var C_TORCH=[1.0,0.72,0.34];      // torch/lantern flame

  // Stone/wood edge trim around a platform top (decor, non-emissive)
  function edgeTrim(cx,cy,top,w,d,col){
    var t=0.12,zt=top+0.02;
    D(cx,cy-d/2+t/2,top-0.05,w,t,0.09,col,col,0);
    D(cx,cy+d/2-t/2,top-0.05,w,t,0.09,col,col,0);
    D(cx-w/2+t/2,cy,top-0.05,t,d,0.09,col,col,0);
    D(cx+w/2-t/2,cy,top-0.05,t,d,0.09,col,col,0);
  }
  // Floating island: grassy/stone deck (solid) + tapered rock cliff underside (decor) + stone rim
  function island(cx,cy,top,w,d,trimCol){
    S(cx,cy,top-0.6,w,d,0.6,C_ROCK,(rng()<0.5?C_DECK:C_DECK2));
    D(cx,cy,top-1.5,w*0.72,d*0.72,0.95,C_ROCK,C_ROCK);
    D(cx,cy,top-2.2,w*0.42,d*0.42,0.8,[0.30,0.24,0.20],C_ROCK);
    edgeTrim(cx,cy,top,w,d,trimCol||C_TRIM_C);
  }
  // Pitched (hip) roof: four sloped quads meeting at a ridge point. Decor only.
  function roof(cx,cy,zBase,w,d,h,col){
    var x0=cx-w/2,x1=cx+w/2,y0=cy-d/2,y1=cy+d/2,zp=zBase+h;
    var dk=[col[0]*0.82,col[1]*0.82,col[2]*0.82];
    pushQuad(staticMesh,[x0,y0,zBase],[x1,y0,zBase],[cx,cy,zp],[cx,cy,zp],[0,-0.7,0.7],col[0],col[1],col[2],0);
    pushQuad(staticMesh,[x1,y1,zBase],[x0,y1,zBase],[cx,cy,zp],[cx,cy,zp],[0,0.7,0.7],col[0],col[1],col[2],0);
    pushQuad(staticMesh,[x1,y0,zBase],[x1,y1,zBase],[cx,cy,zp],[cx,cy,zp],[0.7,0,0.7],dk[0],dk[1],dk[2],0);
    pushQuad(staticMesh,[x0,y1,zBase],[x0,y0,zBase],[cx,cy,zp],[cx,cy,zp],[-0.7,0,0.7],dk[0],dk[1],dk[2],0);
  }
  // Bridge between two points (axis-aligned), solid walkway + decor rails
  function bridge(x0,y0,x1,y1,top,wd){
    var cx=(x0+x1)/2,cy=(y0+y1)/2;
    var w=Math.abs(x1-x0)||wd,d=Math.abs(y1-y0)||wd;
    if(Math.abs(x1-x0)<0.01)w=wd; if(Math.abs(y1-y0)<0.01)d=wd;
    S(cx,cy,top-0.18,w,d,0.18,[0.34,0.24,0.16],C_RAIL);
    // rails (decor only — solid rails caused edge-stuck bugs in v1)
    var t=0.07;
    if(d===wd){ // east-west bridge
      D(cx,cy-wd/2+t,top,w,t,0.32,C_RAIL,C_RAIL,0);
      D(cx,cy+wd/2-t,top,w,t,0.32,C_RAIL,C_RAIL,0);
    }else{
      D(cx-wd/2+t,cy,top,t,d,0.32,C_RAIL,C_RAIL,0);
      D(cx+wd/2-t,cy,top,t,d,0.32,C_RAIL,C_RAIL,0);
    }
  }
  // Building with window grid + roof trim + optional sign
  function building(cx,cy,z0,w,d,h,signCol){
    var body=rng()<0.5?C_BLDG:C_BLDG2;
    S(cx,cy,z0,w,d,h,body,[0.62,0.50,0.38]);
    edgeTrim(cx,cy,z0+h,w,d,C_TRIM_M); // dark-wood eaves
    roof(cx,cy,z0+h,w*1.06,d*1.06,Math.max(0.6,Math.min(w,d)*0.45),rng()<0.5?C_ROOF:C_ROOF2);
    // window rows on all 4 faces (warm, dim — daytime glass)
    var rows=Math.max(1,Math.floor(h/0.9)),colsX=Math.max(1,Math.floor(w/0.8)),colsY=Math.max(1,Math.floor(d/0.8));
    for(var r=0;r<rows;r++){
      var wz=z0+0.55+r*(h-0.7)/rows;
      for(var c=0;c<colsY;c++){
        var wy=cy-d/2+(c+0.5)*d/colsY;
        if(rng()<0.5)W2(cx+w/2,wy,wz,0.28,0.4,0,C_TRIM_A[0],C_TRIM_A[1],C_TRIM_A[2],0.3);
        if(rng()<0.5)W2(cx-w/2,wy,wz,0.28,0.4,1,C_TRIM_A[0],C_TRIM_A[1],C_TRIM_A[2],0.3);
      }
      for(var c2=0;c2<colsX;c2++){
        var wx=cx-w/2+(c2+0.5)*w/colsX;
        if(rng()<0.5)W2(wx,cy+d/2,wz,0.28,0.4,2,C_TRIM_A[0],C_TRIM_A[1],C_TRIM_A[2],0.3);
        if(rng()<0.5)W2(wx,cy-d/2,wz,0.28,0.4,3,C_TRIM_A[0],C_TRIM_A[1],C_TRIM_A[2],0.3);
      }
    }
  }
  // Lantern post (wood pole + small warm flame head)
  function lamp(cx,cy,z0,col){
    D(cx,cy,z0,0.09,0.09,1.5,[0.34,0.24,0.16],[0.40,0.30,0.20]);
    D(cx,cy,z0+1.5,0.2,0.2,0.22,C_TORCH,C_TORCH,0.7);
  }
  // Crate / barrel (solid, jumpable cover) — wood
  function crate(cx,cy,z0,s){
    S(cx,cy,z0,s,s,s,[0.46,0.32,0.20],[0.56,0.42,0.28]);
  }
  // Distant mountain / floating-isle silhouette (decor only, fog backdrop)
  function skyTower(cx,cy,h,w){
    var z0=-14;
    var rockLo=[0.40,0.34,0.30],rockHi=[0.50,0.44,0.38],grass=[0.40,0.52,0.32],snow=[0.86,0.90,0.95];
    // stacked tapered tiers = a peak rising from the haze
    pushBoxGeo(staticMesh,cx,cy,z0,w*1.15,w*1.15,h*0.5,rockLo,rockHi,0);
    pushBoxGeo(staticMesh,cx,cy,z0+h*0.5,w*0.74,w*0.74,h*0.32,rockHi,(h>30?snow:grass),0);
    pushBoxGeo(staticMesh,cx,cy,z0+h*0.82,w*0.4,w*0.4,h*0.18,rockHi,(h>30?snow:grass),0);
    // pointed cap via roof()
    roof(cx,cy,z0+h,w*0.4,w*0.4,w*0.5,(h>30?snow:grass));
  }

  // ===== MEDIEVAL LANDMARKS (decor only — no collision, gameplay unchanged) =====
  var windmills=[],flags=[],waterfalls=[],rivers=[];
  var C_LEAF=[0.30,0.50,0.24],C_LEAF2=[0.38,0.58,0.30],C_TRUNK=[0.40,0.28,0.18];
  var C_BANNER=[0.74,0.20,0.22],C_BANNER2=[0.22,0.40,0.66],C_STONEW=[0.74,0.71,0.64];
  var C_SAIL=[0.88,0.85,0.74];
  // Tree: trunk + layered foliage
  function tree(cx,cy,z,scale){
    var s=scale||1;
    D(cx,cy,z,0.24*s,0.24*s,1.1*s,C_TRUNK,C_TRUNK,0);
    D(cx,cy,z+1.0*s,1.3*s,1.3*s,0.9*s,C_LEAF,C_LEAF2,0);
    D(cx,cy,z+1.7*s,1.0*s,1.0*s,0.8*s,C_LEAF2,C_LEAF,0);
    D(cx,cy,z+2.3*s,0.6*s,0.6*s,0.6*s,C_LEAF,C_LEAF2,0);
  }
  // Well: stone ring + water + two posts + little roof
  function well(cx,cy,z){
    D(cx,cy,z,1.2,1.2,0.55,C_STONEW,[0.66,0.62,0.55],0);
    D(cx,cy,z+0.05,0.78,0.78,0.45,[0.12,0.18,0.22],C_WATER,0.14);
    D(cx-0.5,cy,z+0.55,0.12,0.12,1.1,C_TRUNK,C_TRUNK,0);
    D(cx+0.5,cy,z+0.55,0.12,0.12,1.1,C_TRUNK,C_TRUNK,0);
    roof(cx,cy,z+1.65,1.5,1.0,0.5,C_ROOF);
  }
  // Windmill: stone tower + cap; blades spin (drawn in buildDynScene)
  function windmill(cx,cy,z){
    D(cx,cy,z,1.6,1.6,3.2,C_BLDG,[0.66,0.60,0.50],0);
    D(cx,cy,z+3.2,1.8,1.8,0.4,C_TRUNK,C_TRUNK,0);
    roof(cx,cy,z+3.6,1.9,1.9,1.0,C_ROOF2);
    windmills.push({x:cx,y:cy-1.05,z:z+2.6,r:1.7,spd:1.4});
  }
  // Banner: pole + waving cloth (cloth drawn in buildDynScene)
  function banner(cx,cy,zBase,h,col){
    D(cx,cy,zBase,0.1,0.1,h,C_TRUNK,C_TRUNK,0);
    flags.push({x:cx,y:cy,z:zBase+h-0.1,len:1.4,hgt:0.85,col:col,spd:3.0,dir:(cx<0?-1:1)});
  }
  // Castle: central keep + 4 corner towers w/ conical roofs + banners (open courtyard)
  function castle(cx,cy,z){
    D(cx,cy,z,3.2,3.2,4.5,C_STONEW,[0.66,0.62,0.55],0);
    roof(cx,cy,z+4.5,3.6,3.6,2.2,C_ROOF);
    banner(cx,cy,z+6.7,1.2,C_BANNER);
    var off=4.2;
    for(var i=0;i<4;i++){
      var tx=cx+((i&1)?off:-off),ty=cy+((i&2)?off:-off);
      D(tx,ty,z,1.4,1.4,5.2,C_STONEW,[0.66,0.62,0.55],0);
      roof(tx,ty,z+5.2,1.6,1.6,1.6,C_ROOF2);
      banner(tx,ty,z+6.8,0.9,(i&1)?C_BANNER:C_BANNER2);
    }
  }
  // River patch: flat water quad on an island top (subtle shimmer via low emissive)
  function riverPatch(cx,cy,z,w,d){
    D(cx,cy,z-0.02,w,d,0.06,C_WATER,C_WATER,0.18);
  }
  // Waterfall emitter: drawn as downward-scrolling billboards in the blend pass
  function waterfall(cx,cy,zTop,len,w){
    waterfalls.push({x:cx,y:cy,z:zTop,len:len,w:w});
  }
  // Mountain: stacked tapered rock tiers + snow cap (river source). Decor.
  function mountain(cx,cy,z,bw,h){
    var rk=[0.46,0.40,0.34],rk2=[0.54,0.47,0.40],grass=[0.34,0.48,0.26],snow=[0.90,0.93,0.97];
    D(cx,cy,z,bw,bw,h*0.45,rk,grass,0);
    D(cx,cy,z+h*0.45,bw*0.66,bw*0.66,h*0.32,rk,rk2,0);
    D(cx,cy,z+h*0.77,bw*0.36,bw*0.36,h*0.16,rk2,snow,0);
    roof(cx,cy,z+h*0.93,bw*0.4,bw*0.4,h*0.26,snow);
  }
  // River: water channel following waypoints across an island; flow foam drawn in blend pass.
  // pts = [[x,y],...] on the island top; water sheet sits just above deck z.
  function river(z,w,pts){
    var zz=z+0.03;
    for(var i=0;i<pts.length-1;i++){
      var ax=pts[i][0],ay=pts[i][1],bx=pts[i+1][0],by=pts[i+1][1];
      var dx=bx-ax,dy=by-ay,ln=Math.sqrt(dx*dx+dy*dy)||1,px=-dy/ln*w/2,py=dx/ln*w/2;
      pushQuad(staticMesh,[ax+px,ay+py,zz],[bx+px,by+py,zz],[bx-px,by-py,zz],[ax-px,ay-py,zz],[0,0,1],C_WATER[0],C_WATER[1],C_WATER[2],0.16);
      // stony banks: small rocks on each side at the segment midpoint
      var mx=(ax+bx)/2,my=(ay+by)/2,bk=w*0.62;
      D(mx+px/ (w/2)*bk,my+py/(w/2)*bk,z,0.5,0.5,0.28,[0.42,0.36,0.30],[0.50,0.44,0.36],0);
      D(mx-px/(w/2)*bk,my-py/(w/2)*bk,z,0.5,0.5,0.28,[0.42,0.36,0.30],[0.50,0.44,0.36],0);
    }
    rivers.push({z:zz,w:w,pts:pts});
  }

  // ===== WORLD BUILD =====
  // v3: three vertical layers (LOWER ~0 / MID ~7 / UPPER ~14) + N-S expansion.
  // Layer hubs offset by 2-4m horizontally so you can drop down through openings
  // (landing snaps to highest overlapping top — never stack hubs directly).
  function buildWorld(){
    // ===== A. CENTRAL SPINE (spawn -> mid -> upper) =====
    // Lower hub (spawn at origin)
    island(0,0,0,20,20,C_TRIM_C);
    building(-6.0,5.5,0,3.2,2.6,2.4,C_TRIM_C);
    building(6.0,5.0,0,2.8,3.0,3.2,C_TRIM_M);
    crate(-2.2,-3.0,0,0.9);crate(-1.2,-3.2,0,0.7);crate(-1.8,-3.1,0.9,0.6);
    crate(3.0,-1.5,0,0.8);
    lamp(-9,-9,0,C_TRIM_C);lamp(9,-9,0,C_TRIM_C);
    lamp(-9,9,0,C_TRIM_C);lamp(9,9,0,C_TRIM_C);
    S(0,-6.0,0,4.5,0.5,0.9,C_BLDG,[0.36,0.32,0.54]); // low cover
    // jet step-ups: lower -> mid (XY offset to avoid direct stacking)
    S(7,7,1.6,3,3,0.4,C_ROCK,C_DECK2);   edgeTrim(7,7,2.0,3,3,C_TRIM_C);
    S(-7,-7,3.4,3,3,0.4,C_ROCK,C_DECK2); edgeTrim(-7,-7,3.8,3,3,C_TRIM_C);
    // Mid hub (center shifted +2,+2)
    island(2,2,7,16,16,C_TRIM_M);
    building(-4,6,7,3,2.6,3,C_TRIM_C);   // cover + step toward upper
    crate(4,-1,7,0.9);crate(5,-1.5,7,0.7);
    lamp(-5,-4,7,C_TRIM_M);lamp(9,8,7,C_TRIM_M);
    S(0,-2,7,4.5,0.5,0.9,C_BLDG,[0.36,0.32,0.54]); // low cover
    S(7,-3,9.5,2.6,2.6,0.4,C_ROCK,C_DECK2); edgeTrim(7,-3,9.9,2.6,2.6,C_TRIM_A); // mid->upper step
    // Upper hub (center shifted to 0,-2 — narrow sky fortress)
    island(0,-2,14,11,11,C_TRIM_A);
    crate(-2,-4,14,0.8);crate(3,1,14,0.8);
    lamp(-4,2,14,C_TRIM_A);lamp(4,-5,14,C_TRIM_A);

    // ===== B. LOWER RING (wide roaming floor, N-S expanded) =====
    island(0,28,0,16,14,C_TRIM_M);       // north
    building(-3.6,30.5,0,3.0,2.6,2.8,C_TRIM_C);
    building(3.8,30.0,0,2.6,2.4,2.0,C_TRIM_A);
    crate(0.5,26.5,0,0.8);crate(1.5,26.7,0,0.7);
    lamp(-6,24,0,C_TRIM_M);lamp(6,24,0,C_TRIM_M);
    island(0,-34,0,18,16,C_TRIM_M);      // south (expanded)
    building(-4.5,-37,0,3.0,2.6,2.8,C_TRIM_C);
    crate(2,-31,0,0.9);crate(3,-31.3,0,0.7);
    lamp(-7,-30,0,C_TRIM_M);lamp(7,-30,0,C_TRIM_M);
    island(26,6,-1.5,14,12,C_TRIM_C);    // east (low)
    building(28.5,8.0,-1.5,2.8,2.6,2.6,C_TRIM_M);
    crate(24.5,4.0,-1.5,0.9);
    lamp(22,9.5,-1.5,C_TRIM_C);
    island(-26,6,0.5,14,12,C_TRIM_A);    // west (high)
    building(-28.5,8.5,0.5,2.6,2.6,3.0,C_TRIM_C);
    crate(-24,3.5,0.5,0.8);crate(-27.5,2.5,0.5,0.9);
    lamp(-22,9.5,0.5,C_TRIM_A);
    // lower-ring bridges (axis-aligned; step diffs absorbed by jump)
    bridge(0,10,0,21,0,2.6);             // hub -> north
    bridge(0,-10,0,-25,0,2.6);           // hub -> south
    bridge(11,6,19,6,-0.7,2.4);          // hub -> east (mid top)
    bridge(-11,6,-19,6,0.2,2.4);         // hub -> west (mid top)

    // ===== C. MID RING (main aerial arena) + twin towers =====
    island(18,18,7,8,8,C_TRIM_C);
    island(-18,18,7.5,8,8,C_TRIM_M);
    island(20,-16,8,8,8,C_TRIM_A);
    island(-20,-16,6.5,8,8,C_TRIM_C);
    crate(18,18,7,0.8);crate(-20,-16,6.5,0.8);
    // twin towers from lower floor to mid + catwalk (vertical play)
    S(-6,-8,0,2.4,2.4,7,C_BLDG2,[0.34,0.30,0.50]);
    S(6,-8,0,2.4,2.4,7,C_BLDG2,[0.34,0.30,0.50]);
    edgeTrim(-6,-8,7,2.4,2.4,C_TRIM_M);edgeTrim(6,-8,7,2.4,2.4,C_TRIM_M);
    bridge(-4.8,-8,4.8,-8,7,1.4);        // catwalk (mid height)
    D(-6,-8,7,0.1,0.1,1.6,[0.2,0.2,0.3],C_TRIM_C,0.4); // antennas
    D(6,-8,7,0.1,0.1,1.6,[0.2,0.2,0.3],C_TRIM_C,0.4);

    // ===== D. UPPER (boss / final-wave sky fort, top ~13-15) =====
    island(12,8,15,6,6,C_TRIM_M);
    island(-12,8,15.5,6,6,C_TRIM_C);
    island(0,-20,13,9,9,C_TRIM_M);       // upper-south boss perch
    // cross cover pillars on upper hub (0,-2,14)
    S(-4,-2,14,1.4,1.4,3.2,C_BLDG,[0.36,0.32,0.54]);
    S(4,-2,14,1.4,1.4,3.2,C_BLDG,[0.36,0.32,0.54]);
    S(0,1.5,14,1.4,1.4,3.2,C_BLDG,[0.36,0.32,0.54]);
    S(0,-5.5,14,1.4,1.4,3.2,C_BLDG,[0.36,0.32,0.54]);
    edgeTrim(-4,-2,17.2,1.4,1.4,C_TRIM_M);edgeTrim(4,-2,17.2,1.4,1.4,C_TRIM_M);
    edgeTrim(0,1.5,17.2,1.4,1.4,C_TRIM_M);edgeTrim(0,-5.5,17.2,1.4,1.4,C_TRIM_M);

    // ===== E. VERTICAL ROUTE STONES (jet pads + grapple anchors) =====
    // edges kept < grapple range; spiral up lower->mid->upper.
    var stones=[
      [10,4,3.5],[12,0,5.0],[-10,4,3.8],[-12,0,5.2],[4,14,4.0],[-4,-16,4.4], // lower->mid
      [6,6,10.0],[-6,6,11.0],[0,-10,11.5],[9,-4,10.5],[-9,-4,12.0]           // mid->upper
    ];
    for(var i=0;i<stones.length;i++){
      var st=stones[i];
      S(st[0],st[1],st[2],2.0,2.0,0.45,C_ROCK,C_DECK2);
      D(st[0],st[1],st[2]-0.5,1.2,1.2,0.55,[0.18,0.14,0.28],C_ROCK);
      edgeTrim(st[0],st[1],st[2]+0.45,2.0,2.0,(i%2?C_TRIM_M:C_TRIM_C));
    }

    // ===== F. DISTANT SKYLINE (decor silhouettes, pushed outward, count trimmed) =====
    var towers=[[64,24,30,7],[72,-12,36,8],[54,52,26,6],[-66,20,32,7],[-58,-44,28,6],
                [-74,-6,40,8],[20,72,30,6],[-24,70,26,5],[40,-66,32,6],[-38,-70,24,5]];
    for(var t2=0;t2<towers.length;t2++)skyTower(towers[t2][0],towers[t2][1],towers[t2][2],towers[t2][3]);

    // ===== G. LANDMARKS (decor: trees / wells / windmills / banners / castle / water) =====
    // Lower hub plaza (spawn at origin — keep center clear)
    well(6,6,0);
    tree(8,-8,0);tree(-8,-7,0);tree(7.5,8.5,0,1.1);
    // hero water feature: mountain spring -> river across the isle -> waterfall off the SE edge
    mountain(-7.5,7.5,0,4.5,6.5);
    river(0,1.6,[[-6,5.2],[-3,2.5],[1,0.3],[5,-2.5],[9.4,-5]]);
    waterfall(9.9,-5,0.02,11,1.2);
    banner(0,-6.0,0.9,1.6,C_BANNER); // on the cover wall
    // North island — windmill + grove
    windmill(-4,30,0);
    tree(5,30,0);tree(6,26,0);tree(-6,25,0);
    banner(4,24,0,2.0,C_BANNER2);
    river(0,1.4,[[-3,29.5],[-1,31.5],[0.5,34.2]]);
    waterfall(0.5,34.6,0.02,10,1.0);
    // South island — well + grove
    well(-5,-36,0);
    tree(6,-37,0,1.2);tree(7,-31,0);tree(-7,-31,0);tree(1,-39,0);
    // East island — windmill
    windmill(28,8,-1.5);
    tree(23,3,-1.5);tree(29,2.5,-1.5);
    // West island — grove + banner
    tree(-23,9,0.5);tree(-29,4,0.5,1.2);tree(-24,3,0.5);
    banner(-22,9,0.5,2.0,C_BANNER);
    // Mid hub — small grove + well + banner
    well(6,6,7);
    tree(-3,8,7);tree(8,-2,7);
    banner(0,8,7,2.4,C_BANNER);
    // Upper hub — the CASTLE (open courtyard for combat) + dramatic edge waterfall
    castle(0,-2,14);
    waterfall(0,3.4,13.6,16,1.4);
    // Upper/mid satellite isles — banners + a tree
    banner(12,8,15,1.6,C_BANNER2);tree(12,9.5,15,0.8);
    banner(-12,8,15.5,1.6,C_BANNER);
    tree(19.5,19.5,7,0.9);tree(-21.3,-17.4,6.5,0.9);
  }
  buildWorld();

  // ===== STATIC VBO =====
  var STRIDE=10*4; // pos3 nrm3 col4 floats
  var staticVerts=new Float32Array(staticMesh);
  var staticCount=staticVerts.length/10;
  var staticBuf=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,staticBuf);
  gl.bufferData(gl.ARRAY_BUFFER,staticVerts,gl.STATIC_DRAW);
  staticMesh=null; // free build array

  // ===== DYNAMIC MESH (enemies, bullets, pickups, viewmodel-ish) =====
  var DYN_CAP=96000; // floats (~260 animated boxes per frame)
  var dynArr=new Float32Array(DYN_CAP);
  var dynLen=0;
  var dynBuf=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,dynBuf);
  gl.bufferData(gl.ARRAY_BUFFER,dynArr.byteLength,gl.DYNAMIC_DRAW);
  function dynQuad(p1,p2,p3,p4,n,r,g,b,em){
    if(dynLen+60>DYN_CAP)return;
    var pts=[p1,p2,p3,p1,p3,p4];
    for(var i=0;i<6;i++){
      var p=pts[i];
      dynArr[dynLen++]=p[0];dynArr[dynLen++]=p[1];dynArr[dynLen++]=p[2];
      dynArr[dynLen++]=n[0];dynArr[dynLen++]=n[1];dynArr[dynLen++]=n[2];
      dynArr[dynLen++]=r;dynArr[dynLen++]=g;dynArr[dynLen++]=b;dynArr[dynLen++]=em;
    }
  }
  // Rotated box for enemy parts: center cx,cy,cz; half-sizes hx,hy,hz;
  // yaw around z; optional pitch (x-axis) and roll (y-axis) for animation.
  var _bc=new Array(8);for(var _i=0;_i<8;_i++)_bc[_i]=[0,0,0];
  function dynBoxRot(cx,cy,cz,hx,hy,hz,yaw,pitch,roll,col,em){
    var cy_=Math.cos(yaw),sy_=Math.sin(yaw);
    var cp_=Math.cos(pitch||0),sp_=Math.sin(pitch||0);
    var cr_=Math.cos(roll||0),sr_=Math.sin(roll||0);
    // R = Rz(yaw) * Rx(pitch) * Ry(roll)
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
    // normals (rotated axes)
    var nE=[r00,r10,r20],nW=[-r00,-r10,-r20];
    var nN=[r01,r11,r21],nS=[-r01,-r11,-r21];
    var nU=[r02,r12,r22],nD=[-r02,-r12,-r22];
    dynQuad(_bc[4],_bc[5],_bc[6],_bc[7],nU,r,g,b,em);          // top
    dynQuad(_bc[3],_bc[2],_bc[1],_bc[0],nD,r*0.5,g*0.5,b*0.5,em); // bottom
    dynQuad(_bc[1],_bc[2],_bc[6],_bc[5],nE,r,g,b,em);
    dynQuad(_bc[3],_bc[0],_bc[4],_bc[7],nW,r,g,b,em);
    dynQuad(_bc[2],_bc[3],_bc[7],_bc[6],nN,r,g,b,em);
    dynQuad(_bc[0],_bc[1],_bc[5],_bc[4],nS,r,g,b,em);
  }

  // ===== BLEND MESH (particles, shadows, beams — pos3 col4) =====
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
  // camera-facing billboard square
  var _camRight=[1,0,0],_camUp=[0,0,1];
  function blBillboard(x,y,z,size,r,g,b,a){
    var rx=_camRight[0]*size,ry=_camRight[1]*size,rz=_camRight[2]*size;
    var ux=_camUp[0]*size,uy=_camUp[1]*size,uz=_camUp[2]*size;
    blQuad([x-rx-ux,y-ry-uy,z-rz-uz],[x+rx-ux,y+ry-uy,z+rz-uz],
           [x+rx+ux,y+ry+uy,z+rz+uz],[x-rx+ux,y-ry+uy,z-rz+uz],r,g,b,a);
  }
  // flat ground shadow blob
  function blShadow(x,y,z,size,a){
    var e=0.03;
    blQuad([x-size,y-size,z+e],[x+size,y-size,z+e],[x+size,y+size,z+e],[x-size,y+size,z+e],0,0,0.02,a);
  }
  // thick beam between two 3D points (camera-faced ribbon)
  function blBeam(x0,y0,z0,x1,y1,z1,th,r,g,b,a){
    var dx=x1-x0,dy=y1-y0,dz=z1-z0;
    // side vector = dir x camForward approx via camRight fallback
    var sx=dy*_camUp[2]-dz*_camUp[1],sy=dz*_camUp[0]-dx*_camUp[2],sz=dx*_camUp[1]-dy*_camUp[0];
    var sl=Math.sqrt(sx*sx+sy*sy+sz*sz)||1;sx=sx/sl*th;sy=sy/sl*th;sz=sz/sl*th;
    blQuad([x0-sx,y0-sy,z0-sz],[x1-sx,y1-sy,z1-sz],[x1+sx,y1+sy,z1+sz],[x0+sx,y0+sy,z0+sz],r,g,b,a);
  }
  // ===== GAME STATE =====
  var gameState='title',stateTimer=0,pointerLocked=false;
  var isMobileFps=(('ontouchstart' in window)||navigator.maxTouchPoints>0)&&window.innerWidth<600;
  var waveAnnounceTimer=0;
  var score=0,combo=0,comboTimer=0,maxCombo=0,totalKills=0,gameTime=0;
  var currentWave=0,totalWaves=5;
  var screenShake=0,dmgFlash=0,healFlash=0,hitMarker=0,killMarker=0,hitStop=0;
  var fovKick=0,grappleInRange=false,grapplePoint=null;
  var debugMode=false,debugFps=0,debugFrames=0,debugFpsTimer=0;
  var manualPause=false; // explicit ESC pause — needed in AI mode where no pointer lock exists
  var RESPAWN_T=0.9;
  var respawnT=0,fallMsgT=0; // void-fall blackout + post-respawn message
  var spJustPressed=false,recentJet=0,jetCutoff=false;
  var aiMode=false,aiTimer=0,aiState='explore',aiWp=null,aiStuck=0,aiLastX=0,aiLastY=0,aiShootT=0;
  var keys={w:false,a:false,s:false,d:false,sp:false};
  var mouseDown=false;
  var weaponIdx=0;
  var slowMo=0; // wave-clear slow motion

  // ===== PLAYER =====
  var player={x:0,y:0,z:0.5,vx:0,vy:0,vz:0,a:0,p:0,
    hp:100,maxHp:100,grounded:false,iFrames:0,
    jetFuel:JET_MAX,jumpCD:0,jumpCount:0,coyote:0,
    dashCD:0,dashTimer:0,dashDx:0,dashDy:0,
    mom:1,grappling:false,grapX:0,grapY:0,grapZ:0,
    bobPhase:0,landDip:0,fellFrom:0};

  function resetPlayer(){
    player.x=0;player.y=0;player.z=0.5;player.vx=0;player.vy=0;player.vz=0;
    player.a=PI;player.p=0;player.hp=100;player.grounded=false;player.iFrames=0;
    player.jetFuel=JET_MAX;player.jumpCD=0;player.jumpCount=0;player.coyote=0;
    player.dashCD=0;player.dashTimer=0;
    player.mom=1;player.grappling=false;player.bobPhase=0;player.landDip=0;
  }
  function respawnPlayer(){
    player.x=0;player.y=0;player.z=0.5;player.vx=0;player.vy=0;player.vz=0;
    player.grappling=false;player.dashTimer=0;
    player.jetFuel=JET_MAX;player.jumpCD=0;player.jumpCount=0;
  }

  // ===== WEAPONS =====
  var weapons=[
    {name:'BLASTER',cd:0.16,dmg:14,ammo:Infinity,maxAmmo:Infinity,spread:0.025,count:1,speed:42,color:[0.0,0.9,1.0],timer:0,auto:true,kick:1.2},
    {name:'RAIL',cd:0.85,dmg:60,ammo:14,maxAmmo:14,spread:0.0,count:1,speed:0,color:[1.0,0.78,0.1],timer:0,auto:false,kick:3.4,hitscan:true},
    {name:'SCATTER',cd:0.55,dmg:9,ammo:28,maxAmmo:28,spread:0.13,count:6,speed:34,color:[1.0,0.25,0.3],timer:0,auto:false,kick:2.6}
  ];
  function refillAmmo(){for(var i=0;i<weapons.length;i++){weapons[i].ammo=weapons[i].maxAmmo;weapons[i].timer=0;}}
  var vmKick=0,vmFlash=0; // viewmodel recoil + muzzle flash strength

  // ===== BULLETS =====
  var bullets=[],enemyBullets=[],beams=[];
  function spawnBullet(arr,x,y,z,dx,dy,dz,spd,dmg,col,life){
    arr.push({x:x,y:y,z:z,dx:dx,dy:dy,dz:dz,spd:spd,dmg:dmg,col:col,life:life||2.2});
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
  // Highest platform top at (x,y) below z (for shadows / enemy ground)
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
  // Grapple ray: march forward, return hit point or null
  function grappleRay(){
    var fwd=[Math.sin(player.a)*Math.cos(player.p),Math.cos(player.a)*Math.cos(player.p),Math.sin(player.p)];
    var x=player.x,y=player.y,z=player.z+PLAYER_EYE;
    var step=0.18;
    for(var t=step;t<GRAP_RNG;t+=step){
      var px=x+fwd[0]*t,py=y+fwd[1]*t,pz=z+fwd[2]*t;
      if(pointInSolid(px,py,pz,0.05))return[px,py,pz];
    }
    return null;
  }

  // ===== ACTIONS (shared by input + AI) =====
  function tryDash(){
    if(player.dashCD>0||gameState!=='playing')return;
    player.dashTimer=DASH_T;player.dashCD=DASH_CD;
    var mx=0,my=0;
    if(keys.w){mx+=Math.sin(player.a);my+=Math.cos(player.a);}
    if(keys.s){mx-=Math.sin(player.a);my-=Math.cos(player.a);}
    if(keys.a){mx-=Math.cos(player.a);my+=Math.sin(player.a);}
    if(keys.d){mx+=Math.cos(player.a);my-=Math.sin(player.a);}
    var ml=Math.sqrt(mx*mx+my*my);
    if(ml<0.1){mx=Math.sin(player.a);my=Math.cos(player.a);ml=1;}
    player.dashDx=mx/ml;player.dashDy=my/ml;
    fovKick=1;
    playSound('dash');
  }
  function tryGrapple(){
    if(gameState!=='playing')return;
    var hit=grappleRay();
    if(hit){
      player.grappling=true;
      player.grapX=hit[0];player.grapY=hit[1];player.grapZ=hit[2];
      playSound('grapple');
    }else{
      playSound('grapfail');
    }
  }
  function playerShoot(){
    var w=weapons[weaponIdx];
    if(w.timer>0||w.ammo<=0||gameState!=='playing')return;
    w.timer=w.cd;
    if(w.ammo!==Infinity)w.ammo--;
    var fwd=[Math.sin(player.a)*Math.cos(player.p),Math.cos(player.a)*Math.cos(player.p),Math.sin(player.p)];
    var rt=[Math.cos(player.a),-Math.sin(player.a),0];
    var up=[-Math.sin(player.a)*Math.sin(player.p),-Math.cos(player.a)*Math.sin(player.p),Math.cos(player.p)];
    var ox=player.x+rt[0]*0.15,oy=player.y+rt[1]*0.15,oz=player.z+PLAYER_EYE-0.06;
    if(w.hitscan){
      // RAIL: instant ray, pierces one enemy, leaves a beam
      var bx=ox,by=oy,bz=oz,hitE=null,t;
      var step=0.22,maxT=60;
      for(t=step;t<maxT;t+=step){
        var px=ox+fwd[0]*t,py=oy+fwd[1]*t,pz=oz+fwd[2]*t;
        var eh=enemyAt(px,py,pz);
        if(eh){damageEnemy(eh,w.dmg,px,py,pz,true);hitE=eh;}
        if(eh||pointInSolid(px,py,pz)){bx=px;by=py;bz=pz;break;}
        bx=px;by=py;bz=pz;
      }
      beams.push({x0:ox+fwd[0]*0.4,y0:oy+fwd[1]*0.4,z0:oz-0.05,x1:bx,y1:by,z1:bz,life:0.22,maxLife:0.22,col:w.color});
      if(!hitE){sparks(bx,by,bz,6,w.color);}
      addLight(bx,by,bz,4,w.color[0],w.color[1],w.color[2],1.4,0.18);
    }else{
      for(var i=0;i<w.count;i++){
        var sx=(Math.random()-0.5)*w.spread*2,sy2=(Math.random()-0.5)*w.spread*2;
        var dx=fwd[0]+rt[0]*sx+up[0]*sy2,dy=fwd[1]+rt[1]*sx+up[1]*sy2,dz=fwd[2]+rt[2]*sx+up[2]*sy2;
        var len=Math.sqrt(dx*dx+dy*dy+dz*dz);dx/=len;dy/=len;dz/=len;
        spawnBullet(bullets,ox+fwd[0]*0.4,oy+fwd[1]*0.4,oz,dx,dy,dz,w.speed,w.dmg,w.color,1.6);
      }
    }
    playSound('shoot'+weaponIdx);
    screenShake=Math.max(screenShake,w.kick*0.8);
    vmKick=1;vmFlash=1;
    addLight(ox+fwd[0]*0.7,oy+fwd[1]*0.7,oz,3.5,w.color[0],w.color[1],w.color[2],1.2,0.1);
  }
  function damagePlayer(dmg,kx,ky){
    if(player.iFrames>0||gameState!=='playing')return;
    player.hp-=dmg;
    player.iFrames=0.4;
    dmgFlash=1;
    screenShake=Math.max(screenShake,3);
    if(kx||ky){player.vx+=kx;player.vy+=ky;}
    playSound('hurt');
    if(player.hp<=0){player.hp=0;gameOver();}
  }

  // ===== PLAYER PHYSICS =====
  // Hard-won v1 lessons baked in:
  //  - jumpCD 0.15s kills grounded-flicker double-fires
  //  - recentJet 0.4s guard kills jet->jump surprise launches
  //  - landing picks the HIGHEST crossed top (bestTop), not the first hit
  //  - anti-stuck snap only when an XY push happened this frame (0.2u window)
  function resolvePhysics(dt){
    var prevZ=player.z;
    player.vz-=GRAVITY*dt;

    // --- input accel ---
    var mx=0,my=0;
    if(keys.w){mx+=Math.sin(player.a);my+=Math.cos(player.a);}
    if(keys.s){mx-=Math.sin(player.a);my-=Math.cos(player.a);}
    if(keys.a){mx-=Math.cos(player.a);my+=Math.sin(player.a);}
    if(keys.d){mx+=Math.cos(player.a);my-=Math.sin(player.a);}
    var ml=Math.sqrt(mx*mx+my*my);
    if(ml>0.01){mx/=ml;my/=ml;}
    var accel=player.grounded?60:AIR_CTRL*3;
    player.vx+=mx*accel*dt;
    player.vy+=my*accel*dt;
    // friction (grounded, no input)
    if(player.grounded&&ml<0.01){
      var f=Math.max(0,1-FRICTION*dt);
      player.vx*=f;player.vy*=f;
    }
    // air drag (light)
    if(!player.grounded){player.vx*=Math.max(0,1-0.6*dt);player.vy*=Math.max(0,1-0.6*dt);}
    // momentum multiplier
    var hspd=Math.sqrt(player.vx*player.vx+player.vy*player.vy);
    if(hspd>WALK_SPD*0.9)player.mom=Math.min(MOM_MAX,player.mom+MOM_GAIN*dt);
    else player.mom=Math.max(1,player.mom-MOM_DECAY*dt);
    // clamp horizontal speed (walk * momentum), dash overrides
    var cap=WALK_SPD*player.mom*(player.grounded?1:1.15);
    if(player.dashTimer<=0&&!player.grappling&&hspd>cap){
      player.vx*=cap/hspd;player.vy*=cap/hspd;
    }

    // --- dash ---
    if(player.dashTimer>0){
      player.dashTimer-=dt;
      player.vx=player.dashDx*DASH_SPD;
      player.vy=player.dashDy*DASH_SPD;
      player.vz=0;
    }
    if(player.dashCD>0)player.dashCD-=dt;

    // --- jump / double jump (coyote + guards) ---
    if(player.jumpCD>0)player.jumpCD-=dt;
    if(recentJet>0)recentJet-=dt;
    if(player.grounded)player.coyote=COYOTE_T;
    else if(player.coyote>0)player.coyote-=dt;
    if(spJustPressed){
      spJustPressed=false;
      var canGround=(player.grounded||player.coyote>0)&&player.jumpCD<=0&&recentJet<=0;
      var canAir=!player.grounded&&player.coyote<=0&&player.jumpCount<2&&player.jumpCD<=0&&recentJet<=0;
      if(canGround){
        player.vz=JUMP_VEL;player.jumpCD=0.15;player.jumpCount=1;player.coyote=0;
        player.grounded=false;jetCutoff=true;
        playSound('jump');
      }else if(canAir){
        player.vz=JUMP_VEL*0.85;player.jumpCD=0.15;player.jumpCount=2;jetCutoff=true;
        ringParticles(player.x,player.y,player.z+0.1,[0.4,0.9,1.0]);
        playSound('doublejump');
      }
    }
    if(!keys.sp)jetCutoff=false;
    else if(jetCutoff&&!player.grounded&&player.vz<=0)jetCutoff=false; // 押しっぱなし: ジャンプ頂点でジェット自動起動

    // --- jetpack: hold space while airborne after jump apex-ish ---
    var jetting=false;
    if(keys.sp&&!player.grounded&&!jetCutoff&&player.jetFuel>0&&player.jumpCD<=0&&player.dashTimer<=0){
      player.vz+=JET_ACC*dt;
      if(player.vz>JET_VZMAX)player.vz=JET_VZMAX;
      player.jetFuel-=dt;
      recentJet=0.4;
      jetting=true;
      if(Math.random()<0.55)jetParticle();
    }
    player.jetting=jetting;
    if(player.grounded)player.jetFuel=Math.min(JET_MAX,player.jetFuel+0.96*dt);

    // --- grapple pull ---
    if(player.grappling){
      var gx=player.grapX-player.x,gy=player.grapY-player.y,gz=player.grapZ-(player.z+PLAYER_EYE);
      var gd=Math.sqrt(gx*gx+gy*gy+gz*gz);
      if(gd<1.2){player.grappling=false;player.vz=Math.max(player.vz,3.5);}
      else{
        player.vx=lerp(player.vx,gx/gd*GRAP_SPD,8*dt);
        player.vy=lerp(player.vy,gy/gd*GRAP_SPD,8*dt);
        player.vz=lerp(player.vz,gz/gd*GRAP_SPD,8*dt);
        if(Math.random()<0.3)sparks(player.grapX,player.grapY,player.grapZ,1,[0.0,0.9,1.0]);
      }
    }

    // --- integrate ---
    player.x+=player.vx*dt;
    player.y+=player.vy*dt;
    player.z+=player.vz*dt;

    // --- XY collision (separate axis push-out) ---
    var xyPushed=false;
    var feet=player.z+0.05,head=player.z+PLAYER_H;
    for(var i=0;i<solids.length;i++){
      var s=solids[i];
      if(feet>=s.top-0.01||head<=s.z0)continue;
      if(player.vz<=0&&prevZ>=s.top-0.2)continue; // 降下中にこの天面へ着地する最中: 壁ではなく床。高速落下時の横弾き→床抜けを防ぐ
      var dx2=player.x-s.x,dy2=player.y-s.y;
      var ox2=s.w/2+PLAYER_R-Math.abs(dx2),oy2=s.d/2+PLAYER_R-Math.abs(dy2);
      if(ox2>0&&oy2>0){
        if(ox2<oy2){player.x+=dx2>0?ox2:-ox2;player.vx=0;}
        else{player.y+=dy2>0?oy2:-oy2;player.vy=0;}
        xyPushed=true;
        if(player.grappling&&ox2>0.1&&oy2>0.1)player.grappling=false;
      }
    }

    // --- Z collision: land on HIGHEST crossed top ---
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
        if(!wasGrounded){
          // landing
          var fall=player.fellFrom-player.z;
          if(fall>3.5){screenShake=Math.max(screenShake,2);playSound('land');}
          if(player.vz<-9){player.landDip=1;dustRing(player.x,player.y,player.z);}
          player.vz*=-0.0; // no bounce; momentum keeps horizontal flow
        }
        player.vz=0;
        player.grounded=true;
        player.jumpCount=0;
        player.fellFrom=player.z;
      }
      // anti-stuck: only when XY pushed this frame (v1: 0.35 was too grabby)
      if(!player.grounded&&xyPushed&&player.vz<=0){
        var sIn=pointInSolid(player.x,player.y,player.z+0.05,PLAYER_R*0.5);
        if(sIn&&player.z>=sIn.top-0.2){
          player.z=sIn.top;player.vz=0;player.grounded=true;player.jumpCount=0;
        }
      }
    }else{
      // ceiling
      var sUp=pointInSolid(player.x,player.y,player.z+PLAYER_H,PLAYER_R*0.5);
      if(sUp&&player.z+PLAYER_H>sUp.z0&&player.z<sUp.z0){
        player.z=sUp.z0-PLAYER_H;player.vz=Math.min(player.vz,0);
      }
    }
    if(!player.grounded&&player.vz>=0)player.fellFrom=Math.max(player.fellFrom,player.z);

    // --- void fall ---
    if(player.z<VOID_Z&&respawnT<=0){
      beginVoidRespawn();
    }

    // --- timers ---
    if(player.iFrames>0)player.iFrames-=dt;
    if(player.landDip>0)player.landDip=Math.max(0,player.landDip-4*dt);
    // head bob
    if(player.grounded&&hspd>0.5)player.bobPhase+=dt*hspd*1.8;
  }
  // Void fall: 20 dmg + combo lost + ~0.9s blackout respawn.
  // Falling has to hurt — the whole movement kit exists to avoid this.
  var FALL_DMG=20;
  function beginVoidRespawn(){
    player.hp-=FALL_DMG;
    combo=0;comboTimer=0;
    dmgFlash=1;screenShake=5;
    playSound('fall');
    if(player.hp<=0){player.hp=0;respawnPlayer();gameOver();return;}
    respawnT=RESPAWN_T;
    player.iFrames=RESPAWN_T+1.0; // covers blackout + recovery window
  }
  function updateRespawn(dt){
    if(respawnT<=0)return;
    var prev=respawnT;
    respawnT-=dt;
    // teleport at the midpoint, while the screen is fully dark
    if(prev>RESPAWN_T/2&&respawnT<=RESPAWN_T/2){
      respawnPlayer();
      fallMsgT=1.6;
      ringParticles(player.x,player.y,player.z+0.2,[0.0,0.9,1.0]);
      ringParticles(player.x,player.y,player.z+0.9,[0.6,0.4,1.0]);
      for(var i=0;i<10;i++){
        spawnP(player.x+(Math.random()-0.5)*0.4,player.y+(Math.random()-0.5)*0.4,player.z+Math.random()*1.2,
          0,0,2+Math.random()*2,0.4+Math.random()*0.3,0.07,0.3,0.9,1.0,-3);
      }
      addLight(player.x,player.y,player.z+1,5,0.1,0.9,1.0,1.8,0.5);
      playSound('respawn');
    }
  }
  // ===== PARTICLES =====
  var particles=[];
  function spawnP(x,y,z,vx,vy,vz,life,size,r,g,b,grav){
    if(particles.length>320)return;
    particles.push({x:x,y:y,z:z,vx:vx,vy:vy,vz:vz,life:life,maxLife:life,size:size,r:r,g:g,b:b,grav:grav||0});
  }
  function sparks(x,y,z,n,col){
    for(var i=0;i<n;i++){
      var a=Math.random()*TAU,sp=1+Math.random()*4;
      spawnP(x,y,z,Math.cos(a)*sp,Math.sin(a)*sp,Math.random()*3,0.25+Math.random()*0.3,0.05,col[0],col[1],col[2],8);
    }
  }
  function explosion(x,y,z,col){
    for(var i=0;i<22;i++){
      var a=Math.random()*TAU,e=Math.random()*PI-PI/2,sp=2+Math.random()*6;
      spawnP(x,y,z,Math.cos(a)*Math.cos(e)*sp,Math.sin(a)*Math.cos(e)*sp,Math.sin(e)*sp+2,
        0.4+Math.random()*0.5,0.08+Math.random()*0.12,col[0],col[1],col[2],10);
    }
    for(var j=0;j<8;j++){
      spawnP(x,y,z,(Math.random()-0.5)*3,(Math.random()-0.5)*3,1+Math.random()*3,
        0.5+Math.random()*0.4,0.14,0.25,0.22,0.3,12); // dark debris
    }
    addLight(x,y,z,6,col[0],col[1],col[2],2.2,0.35);
  }
  function dustRing(x,y,z){
    for(var i=0;i<10;i++){
      var a=i/10*TAU;
      spawnP(x+Math.cos(a)*0.3,y+Math.sin(a)*0.3,z+0.05,Math.cos(a)*2.4,Math.sin(a)*2.4,0.5,0.35,0.07,0.5,0.45,0.6,4);
    }
  }
  function ringParticles(x,y,z,col){
    for(var i=0;i<12;i++){
      var a=i/12*TAU;
      spawnP(x+Math.cos(a)*0.2,y+Math.sin(a)*0.2,z,Math.cos(a)*3,Math.sin(a)*3,0,0.3,0.06,col[0],col[1],col[2],0);
    }
  }
  function jetParticle(){
    spawnP(player.x+(Math.random()-0.5)*0.2,player.y+(Math.random()-0.5)*0.2,player.z+0.05,
      (Math.random()-0.5)*1.5,(Math.random()-0.5)*1.5,-3-Math.random()*2,
      0.3+Math.random()*0.2,0.07,1.0,0.6+Math.random()*0.3,0.15,-2);
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

  // ===== FLOATING DAMAGE NUMBERS (projected to HUD) =====
  var dmgNums=[];
  function addDmgNum(x,y,z,val,col,crit){
    if(dmgNums.length>40)return;
    dmgNums.push({x:x,y:y,z:z,vz:1.6,val:Math.round(val),life:0.8,col:col,crit:crit});
  }
  function updateDmgNums(dt){
    for(var i=dmgNums.length-1;i>=0;i--){
      var d=dmgNums[i];
      d.life-=dt;d.z+=d.vz*dt;d.vz*=0.92;
      if(d.life<=0)dmgNums.splice(i,1);
    }
  }

  // ===== HP PICKUPS =====
  var pickups=[];
  function spawnPickup(x,y,z){
    pickups.push({x:x,y:y,z:z,vz:2,t:Math.random()*TAU,settled:false});
  }
  function updatePickups(dt){
    for(var i=pickups.length-1;i>=0;i--){
      var pk=pickups[i];
      pk.t+=dt;
      if(!pk.settled){
        pk.vz-=GRAVITY*0.6*dt;pk.z+=pk.vz*dt;
        var g=groundTopAt(pk.x,pk.y,pk.z+0.5,0.3);
        if(g>-999&&pk.z<=g+0.3){pk.z=g+0.3;pk.settled=true;}
        if(pk.z<VOID_Z){pickups.splice(i,1);continue;}
      }
      // magnet
      var d=dist3d(player.x,player.y,player.z+0.5,pk.x,pk.y,pk.z);
      if(d<2.6){
        pk.x=lerp(pk.x,player.x,8*dt);pk.y=lerp(pk.y,player.y,8*dt);pk.z=lerp(pk.z,player.z+0.5,8*dt);
      }
      if(d<0.9){
        player.hp=Math.min(player.maxHp,player.hp+15);
        healFlash=1;
        playSound('pickup');
        ringParticles(pk.x,pk.y,pk.z,[0.2,1.0,0.5]);
        pickups.splice(i,1);
      }
    }
  }

  // ===== ENEMIES =====
  // type: 0 wyvern (flyer, dive melee), 1 harpy (flyer, shoot+retreat),
  //       2 golem (walker tank, rock throw), 3 serpent (fast walker melee),
  //       4 dragon (boss flyer, spread shots)
  var E_DEF=[
    {hp:20,spd:4.0,atkCd:2.0,dmg:8, score:100,fly:true, hov:1.6,col:[0.85,0.2,0.25],size:0.55,name:'WYVERN'},
    {hp:22,spd:3.5,atkCd:2.2,dmg:5, score:120,fly:true, hov:2.4,col:[0.15,0.75,0.7],size:0.5,name:'HARPY'},
    {hp:55,spd:1.7,atkCd:2.8,dmg:12,score:200,fly:false,hov:0,  col:[0.45,0.4,0.6],size:0.85,name:'GOLEM'},
    {hp:16,spd:5.2,atkCd:1.1,dmg:6, score:150,fly:false,hov:0,  col:[0.5,0.9,0.25],size:0.45,name:'SERPENT'},
    {hp:300,spd:2.6,atkCd:1.8,dmg:6,score:1000,fly:true,hov:2.8,col:[0.7,0.2,0.85],size:1.5,name:'DRAGON'}
  ];
  var enemies=[];
  function spawnEnemy(type,x,y,z){
    var d=E_DEF[type];
    enemies.push({
      type:type,x:x,y:y,z:z,vx:0,vy:0,vz:0,a:Math.random()*TAU,
      hp:d.hp,maxHp:d.hp,atkT:1+Math.random()*d.atkCd,
      flap:Math.random()*TAU,flash:0,state:'chase',stateT:0,
      strafeDir:Math.random()<0.5?1:-1,bob:Math.random()*TAU,
      grounded:false,dead:false
    });
  }
  function enemyAt(x,y,z){
    for(var i=0;i<enemies.length;i++){
      var e=enemies[i];if(e.dead)continue;
      var s=E_DEF[e.type].size;
      if(Math.abs(x-e.x)<s&&Math.abs(y-e.y)<s&&z>e.z-0.1&&z<e.z+s*2.2)return e;
    }
    return null;
  }
  function damageEnemy(e,dmg,hx,hy,hz,isRail){
    e.hp-=dmg;
    e.flash=0.12;
    hitMarker=0.18;
    addDmgNum(hx,hy,hz+0.4,dmg,isRail?[1,0.8,0.2]:[1,1,1],isRail);
    playSound('hit');
    if(e.hp<=0&&!e.dead)killEnemy(e);
  }
  function killEnemy(e){
    e.dead=true;
    var d=E_DEF[e.type];
    explosion(e.x,e.y,e.z+d.size,d.col);
    combo++;comboTimer=3;maxCombo=Math.max(maxCombo,combo);
    var pts=d.score*combo;
    score+=pts;totalKills++;
    addDmgNum(e.x,e.y,e.z+d.size+0.7,pts,[0.2,1,0.6],combo>1);
    killMarker=0.3;
    hitStop=0.04;
    playSound(e.type===4?'bosskill':'kill');
    if(Math.random()<0.3||e.type===4)spawnPickup(e.x,e.y,e.z+0.5);
    if(e.type===4)spawnPickup(e.x+0.5,e.y,e.z+0.5);
  }

  // ===== ENEMY AI =====
  function updateEnemies(dt){
    var alive=0;
    for(var i=enemies.length-1;i>=0;i--){
      var e=enemies[i];
      if(e.dead){enemies.splice(i,1);continue;}
      alive++;
      var d=E_DEF[e.type];
      if(e.flash>0)e.flash-=dt;
      e.flap+=dt*(d.fly?(8+(e.type===4?-3:0)):4);
      e.bob+=dt*2;
      var dx=player.x-e.x,dy=player.y-e.y;
      var hdist=Math.sqrt(dx*dx+dy*dy);
      var ndx=hdist>0.01?dx/hdist:1,ndy=hdist>0.01?dy/hdist:0;
      // face player smoothly (human-like turn — v1 lesson)
      var targA=Math.atan2(dx,dy);
      var da=targA-e.a;
      while(da>PI)da-=TAU;while(da<-PI)da+=TAU;
      e.a+=clamp(da,-4*dt,4*dt);
      e.atkT-=dt;
      e.stateT-=dt;

      if(d.fly){
        // --- flyers: hover toward orbit point, dive (wyvern) or kite (harpy) ---
        var wantD=e.type===0?1.2:(e.type===4?7:9);  // preferred range
        var tz=player.z+d.hov+Math.sin(e.bob)*0.4;
        var spd=d.spd;
        var mvx,mvy;
        if(e.type===0){ // wyvern: charge straight in
          mvx=ndx;mvy=ndy;
          if(hdist<6)spd*=1.5; // dive burst
        }else{
          // harpy/dragon: keep range + strafe orbit
          var rad=(hdist-wantD);
          mvx=ndx*clamp(rad,-1,1)+(-ndy)*e.strafeDir*0.8;
          mvy=ndy*clamp(rad,-1,1)+( ndx)*e.strafeDir*0.8;
          if(e.stateT<=0){e.strafeDir*=-1;e.stateT=2+Math.random()*2;}
        }
        var mvl=Math.sqrt(mvx*mvx+mvy*mvy)||1;
        e.vx=lerp(e.vx,mvx/mvl*spd,3*dt);
        e.vy=lerp(e.vy,mvy/mvl*spd,3*dt);
        e.vz=lerp(e.vz,clamp((tz-e.z)*2,-3.5,3.5),4*dt);
        e.x+=e.vx*dt;e.y+=e.vy*dt;e.z+=e.vz*dt;
        // soft world avoid: push out of solids
        var sIn=pointInSolid(e.x,e.y,e.z+d.size,d.size*0.6);
        if(sIn){
          var pdx=e.x-sIn.x,pdy=e.y-sIn.y;
          var pl=Math.sqrt(pdx*pdx+pdy*pdy)||1;
          e.x+=pdx/pl*3*dt;e.y+=pdy/pl*3*dt;e.z+=2.5*dt;
        }
        // attacks
        if(e.type===0){ // melee contact
          if(hdist<1.1&&Math.abs(player.z+0.5-e.z)<1.2&&e.atkT<=0){
            e.atkT=d.atkCd;
            damagePlayer(d.dmg,ndx*4,ndy*4);
          }
        }else if(e.atkT<=0&&hdist<22){
          e.atkT=d.atkCd;
          enemyShoot(e,d);
        }
      }else{
        // --- walkers: gravity + platform-bound with edge check ---
        e.vz-=GRAVITY*dt;
        var spd2=d.spd;
        var wantD2=e.type===2?6:1.0;
        var mvx2=ndx,mvy2=ndy;
        if(e.type===2&&hdist<wantD2*0.7){mvx2=-ndx;mvy2=-ndy;} // golem keeps range
        if(e.type===3){ // serpent weaves
          mvx2=ndx+(-ndy)*Math.sin(e.bob*3)*0.6;
          mvy2=ndy+( ndx)*Math.sin(e.bob*3)*0.6;
        }
        var ml2=Math.sqrt(mvx2*mvx2+mvy2*mvy2)||1;
        // edge check: don't walk off (1.2u lookahead — v1 lesson)
        if(e.grounded){
          var lx=e.x+mvx2/ml2*1.2,ly=e.y+mvy2/ml2*1.2;
          var gAhead=groundTopAt(lx,ly,e.z+0.5,0.2);
          if(gAhead<e.z-2.5){
            // turn along edge instead
            var t1x=-mvy2,t1y=mvx2;
            if(groundTopAt(e.x+t1x/ml2*1.2,e.y+t1y/ml2*1.2,e.z+0.5,0.2)>=e.z-2.5){mvx2=t1x;mvy2=t1y;}
            else{mvx2=-t1x;mvy2=-t1y;}
          }
        }
        e.vx=lerp(e.vx,mvx2/ml2*spd2,6*dt);
        e.vy=lerp(e.vy,mvy2/ml2*spd2,6*dt);
        // jump if player is above (v1: 1.5u threshold)
        if(e.grounded&&player.z>e.z+1.5&&hdist<8&&Math.random()<0.8*dt){
          e.vz=7;e.grounded=false;
        }
        e.x+=e.vx*dt;e.y+=e.vy*dt;
        var prevZ=e.z;
        e.z+=e.vz*dt;
        // land on highest top (v1 lesson: scan ALL, take best)
        e.grounded=false;
        if(e.vz<=0){
          var bt=-999;
          for(var j=0;j<solids.length;j++){
            var s2=solids[j];
            if(Math.abs(e.x-s2.x)<s2.w/2+0.2&&Math.abs(e.y-s2.y)<s2.d/2+0.2){
              if(prevZ>=s2.top-0.25&&e.z<=s2.top+0.02&&s2.top>bt)bt=s2.top;
            }
          }
          if(bt>-999){e.z=bt;e.vz=0;e.grounded=true;}
        }
        // XY push out of walls
        var feet=e.z+0.05,head=e.z+d.size*1.6;
        for(var k=0;k<solids.length;k++){
          var s3=solids[k];
          if(feet>=s3.top-0.01||head<=s3.z0)continue;
          var ddx=e.x-s3.x,ddy=e.y-s3.y;
          var ox3=s3.w/2+d.size*0.5-Math.abs(ddx),oy3=s3.d/2+d.size*0.5-Math.abs(ddy);
          if(ox3>0&&oy3>0){
            if(ox3<oy3)e.x+=ddx>0?ox3:-ox3;
            else e.y+=ddy>0?oy3:-oy3;
          }
        }
        // fell off the world: respawn far from player (no cheap kills — v1)
        if(e.z<VOID_Z){
          e.hp-=10;
          if(e.hp<=0){killEnemy(e);continue;}
          var sp=pickSpawn(true);
          e.x=sp[0];e.y=sp[1];e.z=sp[2]+0.5;e.vz=0;
        }
        // attacks
        if(e.type===3){ // serpent melee
          if(hdist<1.0&&Math.abs(player.z-e.z)<1.2&&e.atkT<=0){
            e.atkT=d.atkCd;
            damagePlayer(d.dmg,ndx*5,ndy*5);
          }
        }else if(e.type===2&&e.atkT<=0&&hdist<18){
          e.atkT=d.atkCd;
          enemyShoot(e,d); // rock throw
        }
      }
    }
    return alive;
  }
  function enemyShoot(e,d){
    var ex=e.x,ey=e.y,ez=e.z+d.size*1.2;
    var tx=player.x-ex,ty=player.y-ey,tz=(player.z+0.5)-ez;
    var tl=Math.sqrt(tx*tx+ty*ty+tz*tz)||1;
    tx/=tl;ty/=tl;tz/=tl;
    var spd=10,col;
    if(e.type===4){
      // dragon: 3-way spread
      col=[1.0,0.3,0.9];
      for(var s=-1;s<=1;s++){
        var a2=Math.atan2(tx,ty)+s*0.18;
        spawnBullet(enemyBullets,ex,ey,ez,Math.sin(a2)*Math.cos(Math.asin(tz)),Math.cos(a2)*Math.cos(Math.asin(tz)),tz,spd,d.dmg,col,3);
      }
    }else if(e.type===2){
      col=[0.7,0.6,0.5];
      spawnBullet(enemyBullets,ex,ey,ez,tx,ty,tz+0.18,8.5,d.dmg,col,3); // lobbed rock
    }else{
      col=[0.2,1.0,0.8];
      spawnBullet(enemyBullets,ex,ey,ez,tx,ty,tz,spd,d.dmg,col,3);
    }
    playSound('eshoot');
  }

  // ===== BULLETS UPDATE =====
  function updateBullets(dt){
    for(var i=bullets.length-1;i>=0;i--){
      var b=bullets[i];
      b.life-=dt;
      if(b.life<=0){bullets.splice(i,1);continue;}
      var steps=2; // substep fast bullets to avoid tunneling
      var done=false;
      for(var st=0;st<steps&&!done;st++){
        b.x+=b.dx*b.spd*dt/steps;b.y+=b.dy*b.spd*dt/steps;b.z+=b.dz*b.spd*dt/steps;
        var e=enemyAt(b.x,b.y,b.z);
        if(e){
          damageEnemy(e,b.dmg,b.x,b.y,b.z,false);
          sparks(b.x,b.y,b.z,4,b.col);
          bullets.splice(i,1);done=true;break;
        }
        if(pointInSolid(b.x,b.y,b.z)){
          sparks(b.x,b.y,b.z,5,b.col);
          addLight(b.x,b.y,b.z,2.5,b.col[0],b.col[1],b.col[2],0.8,0.12);
          bullets.splice(i,1);done=true;break;
        }
      }
    }
    for(var j=enemyBullets.length-1;j>=0;j--){
      var eb=enemyBullets[j];
      eb.life-=dt;
      if(eb.life<=0){enemyBullets.splice(j,1);continue;}
      eb.x+=eb.dx*eb.spd*dt;eb.y+=eb.dy*eb.spd*dt;eb.z+=eb.dz*eb.spd*dt;
      if(eb.col[0]>0.6&&eb.col[1]>0.5)eb.dz-=0.5*dt; // rocks arc down
      var pd=dist3d(eb.x,eb.y,eb.z,player.x,player.y,player.z+0.5);
      if(pd<0.45){
        damagePlayer(eb.dmg,eb.dx*3,eb.dy*3);
        enemyBullets.splice(j,1);continue;
      }
      if(pointInSolid(eb.x,eb.y,eb.z)){
        sparks(eb.x,eb.y,eb.z,3,eb.col);
        enemyBullets.splice(j,1);
      }
    }
    for(var k=beams.length-1;k>=0;k--){
      beams[k].life-=dt;
      if(beams[k].life<=0)beams.splice(k,1);
    }
  }

  // ===== WAVE SYSTEM =====
  // wave -> list of [type, count]
  var WAVES=[
    [[0,2],[3,1]],
    [[0,2],[1,1],[3,1]],
    [[0,1],[1,2],[2,1],[3,1]],
    [[0,2],[1,2],[2,1],[3,2]],
    [[4,1],[0,2],[1,2]]
  ];
  var SPAWN_PTS=[
    [0,28,0],[0,-34,0],[26,6,-1.5],[-26,6,0.5],        // lower ring
    [18,18,7],[-18,18,7.5],[20,-16,8],[-20,-16,6.5],    // mid ring
    [12,8,15],[-12,8,15.5],[0,-20,13],[0,-2,14]         // upper
  ];
  function pickSpawn(any){
    var best=null,bestD=-1;
    for(var t=0;t<10;t++){
      var sp=SPAWN_PTS[Math.floor(Math.random()*SPAWN_PTS.length)];
      var dd=dist2d(sp[0],sp[1],player.x,player.y);
      if(dd>8)return sp;
      if(dd>bestD){bestD=dd;best=sp;}
    }
    return best||SPAWN_PTS[0];
  }
  function startWave(n){
    currentWave=n;
    var comp=WAVES[n-1];
    for(var i=0;i<comp.length;i++){
      for(var c=0;c<comp[i][1];c++){
        var sp=pickSpawn();
        spawnEnemy(comp[i][0],sp[0]+(Math.random()-0.5)*3,sp[1]+(Math.random()-0.5)*3,sp[2]+(E_DEF[comp[i][0]].fly?2.5:0.5));
      }
    }
    waveAnnounceTimer=2.2;
    _waveTitle.textContent='WAVE '+n;
    _waveSub.textContent=n===totalWaves?'!! DRAGON APPROACHES !!':'ENEMIES INBOUND';
    _waveInfo.textContent='KILLS '+totalKills+'  /  SCORE '+score;
    _ovActive='';updateOverlay();
    playSound(n===totalWaves?'bosswave':'wave');
    if(n>1){
      player.hp=Math.min(player.maxHp,player.hp+50);
      refillAmmo();
      healFlash=1;
    }
  }

  // ===== GAME FLOW =====
  function startGame(){
    resetPlayer();
    enemies.length=0;bullets.length=0;enemyBullets.length=0;beams.length=0;
    particles.length=0;dmgNums.length=0;pickups.length=0;lights.length=0;
    score=0;combo=0;comboTimer=0;maxCombo=0;totalKills=0;gameTime=0;
    refillAmmo();weaponIdx=0;
    manualPause=false;
    respawnT=0;fallMsgT=0;
    gameState='playing';
    startWave(1);
    startMusic();
    if(!isMobileFps)canvas.requestPointerLock();
    updateOverlay();
  }
  function gameOver(){
    gameState='gameover';stateTimer=1.2;
    stopMusic();
    playSound('gameover');
    _deadStats.innerHTML='SCORE <b>'+score+'</b><br>KILLS <b>'+totalKills+'</b> / WAVE <b>'+currentWave+'</b><br>MAX COMBO <b>x'+maxCombo+'</b>';
    if(pointerLocked)document.exitPointerLock();
    updateOverlay();
  }
  function winGame(){
    gameState='win';stateTimer=1.2;
    stopMusic();
    playSound('win');
    var tm=Math.floor(gameTime);
    _winStats.innerHTML='SCORE <b>'+score+'</b><br>KILLS <b>'+totalKills+'</b> / TIME <b>'+Math.floor(tm/60)+':'+('0'+tm%60).slice(-2)+'</b><br>MAX COMBO <b>x'+maxCombo+'</b>';
    if(pointerLocked)document.exitPointerLock();
    updateOverlay();
  }
  // ===== ENEMY MESHES (chunky low-poly, animated) =====
  function flashCol(e,c){
    if(e.flash<=0)return c;
    var k=Math.min(1,e.flash*9);
    return[lerp(c[0],1,k),lerp(c[1],1,k),lerp(c[2],1,k)];
  }
  // local->world offset given heading a: right*(lx) + forward*(ly)
  function locX(a,lx,ly){return lx*Math.cos(a)+ly*Math.sin(a);}
  function locY(a,lx,ly){return -lx*Math.sin(a)+ly*Math.cos(a);}
  function drawEnemy(e){
    var d=E_DEF[e.type],s=d.size,a=e.a,yaw=-a;
    var c=flashCol(e,d.col);
    var dk=[c[0]*0.55,c[1]*0.55,c[2]*0.55];
    var eye=[1,0.95,0.2];
    var x=e.x,y=e.y;
    var z=e.z;
    if(d.fly)z+=Math.sin(e.bob*1.7)*0.12; // hover bob
    var flap=Math.sin(e.flap)*0.6;
    if(e.type===0||e.type===1){
      // small flyer: body + head + wings + tail
      var bz=z+s;
      dynBoxRot(x,y,bz,s*0.42,s*0.7,s*0.34,yaw,0,0,c,0);
      // head
      dynBoxRot(x+locX(a,0,s*0.75),y+locY(a,0,s*0.75),bz+s*0.18,s*0.3,s*0.32,s*0.26,yaw,0,0,dk,0);
      // eyes
      dynBoxRot(x+locX(a,s*0.14,s*0.95),y+locY(a,s*0.14,s*0.95),bz+s*0.22,s*0.06,s*0.06,s*0.06,yaw,0,0,eye,1);
      dynBoxRot(x+locX(a,-s*0.14,s*0.95),y+locY(a,-s*0.14,s*0.95),bz+s*0.22,s*0.06,s*0.06,s*0.06,yaw,0,0,eye,1);
      // wings (roll flap)
      dynBoxRot(x+locX(a,s*0.85,0),y+locY(a,s*0.85,0),bz+s*0.2+flap*s*0.45,s*0.75,s*0.4,s*0.07,yaw,0,flap*0.9,dk,0);
      dynBoxRot(x+locX(a,-s*0.85,0),y+locY(a,-s*0.85,0),bz+s*0.2+flap*s*0.45,s*0.75,s*0.4,s*0.07,yaw,0,-flap*0.9,dk,0);
      // tail
      dynBoxRot(x+locX(a,0,-s*0.8),y+locY(a,0,-s*0.8),bz,s*0.12,s*0.5,s*0.1,yaw,0,0,dk,0);
    }else if(e.type===2){
      // golem: torso, head, swinging arms, legs
      var moving=Math.abs(e.vx)+Math.abs(e.vy)>0.4;
      var sw=moving?Math.sin(e.bob*4)*0.5:0;
      dynBoxRot(x,y,z+s*1.05,s*0.6,s*0.42,s*0.62,yaw,0,0,c,0);              // torso
      dynBoxRot(x,y,z+s*1.78,s*0.3,s*0.3,s*0.26,yaw,0,0,dk,0);              // head
      dynBoxRot(x+locX(a,0,s*0.3),y+locY(a,0,s*0.3),z+s*1.8,s*0.2,s*0.04,s*0.06,yaw,0,0,[1,0.25,0.2],1); // visor eye
      dynBoxRot(x+locX(a,s*0.78,0),y+locY(a,s*0.78,0),z+s*1.1,s*0.18,s*0.18,s*0.55,yaw,sw,0,dk,0);  // arm R
      dynBoxRot(x+locX(a,-s*0.78,0),y+locY(a,-s*0.78,0),z+s*1.1,s*0.18,s*0.18,s*0.55,yaw,-sw,0,dk,0);// arm L
      dynBoxRot(x+locX(a,s*0.26,0),y+locY(a,s*0.26,0),z+s*0.36,s*0.2,s*0.2,s*0.38,yaw,-sw*0.7,0,dk,0);// leg R
      dynBoxRot(x+locX(a,-s*0.26,0),y+locY(a,-s*0.26,0),z+s*0.36,s*0.2,s*0.2,s*0.38,yaw,sw*0.7,0,dk,0);// leg L
      // shoulder crystals
      dynBoxRot(x+locX(a,s*0.6,0),y+locY(a,s*0.6,0),z+s*1.5,s*0.12,s*0.12,s*0.14,yaw,0,0.6,[0.6,0.4,1],0.8);
      dynBoxRot(x+locX(a,-s*0.6,0),y+locY(a,-s*0.6,0),z+s*1.5,s*0.12,s*0.12,s*0.14,yaw,0,-0.6,[0.6,0.4,1],0.8);
    }else if(e.type===3){
      // serpent: head + weaving segments
      var segs=4;
      dynBoxRot(x,y,z+s*0.6,s*0.42,s*0.5,s*0.4,yaw,0,0,c,0);
      dynBoxRot(x+locX(a,s*0.12,s*0.5),y+locY(a,s*0.12,s*0.5),z+s*0.72,s*0.07,s*0.07,s*0.07,yaw,0,0,eye,1);
      dynBoxRot(x+locX(a,-s*0.12,s*0.5),y+locY(a,-s*0.12,s*0.5),z+s*0.72,s*0.07,s*0.07,s*0.07,yaw,0,0,eye,1);
      for(var i2=1;i2<=segs;i2++){
        var sway=Math.sin(e.bob*4-i2*0.9)*s*0.5;
        var sz2=s*(0.85-i2*0.13);
        dynBoxRot(x+locX(a,sway,-s*0.65*i2),y+locY(a,sway,-s*0.65*i2),z+s*0.5,sz2*0.5,sz2*0.55,sz2*0.45,yaw,0,0,i2%2?dk:c,0);
      }
    }else{
      // dragon boss
      var bz4=z+s*0.9;
      dynBoxRot(x,y,bz4,s*0.5,s*0.85,s*0.45,yaw,0,0,c,0);                  // body
      dynBoxRot(x+locX(a,0,s*0.95),y+locY(a,0,s*0.95),bz4+s*0.25,s*0.3,s*0.42,s*0.3,yaw,0,0,dk,0); // head
      // horns
      dynBoxRot(x+locX(a,s*0.16,s*0.95),y+locY(a,s*0.16,s*0.95),bz4+s*0.52,s*0.06,s*0.06,s*0.22,yaw,0,0.4,[0.9,0.85,0.8],0);
      dynBoxRot(x+locX(a,-s*0.16,s*0.95),y+locY(a,-s*0.16,s*0.95),bz4+s*0.52,s*0.06,s*0.06,s*0.22,yaw,0,-0.4,[0.9,0.85,0.8],0);
      // eyes
      dynBoxRot(x+locX(a,s*0.13,s*1.18),y+locY(a,s*0.13,s*1.18),bz4+s*0.3,s*0.07,s*0.05,s*0.05,yaw,0,0,[1,0.2,0.3],1);
      dynBoxRot(x+locX(a,-s*0.13,s*1.18),y+locY(a,-s*0.13,s*1.18),bz4+s*0.3,s*0.07,s*0.05,s*0.05,yaw,0,0,[1,0.2,0.3],1);
      // big wings
      dynBoxRot(x+locX(a,s*1.05,0),y+locY(a,s*1.05,0),bz4+s*0.3+flap*s*0.5,s*0.95,s*0.55,s*0.08,yaw,0,flap*0.8,dk,0);
      dynBoxRot(x+locX(a,-s*1.05,0),y+locY(a,-s*1.05,0),bz4+s*0.3+flap*s*0.5,s*0.95,s*0.55,s*0.08,yaw,0,-flap*0.8,dk,0);
      // wing membrane glow
      dynBoxRot(x+locX(a,s*0.95,0),y+locY(a,s*0.95,0),bz4+s*0.28+flap*s*0.45,s*0.6,s*0.35,s*0.03,yaw,0,flap*0.8,[1,0.2,0.9],0.7);
      dynBoxRot(x+locX(a,-s*0.95,0),y+locY(a,-s*0.95,0),bz4+s*0.28+flap*s*0.45,s*0.6,s*0.35,s*0.03,yaw,0,-flap*0.8,[1,0.2,0.9],0.7);
      // tail
      for(var t3=1;t3<=3;t3++){
        var tw3=Math.sin(e.bob*2-t3)*s*0.2;
        dynBoxRot(x+locX(a,tw3,-s*(0.8+t3*0.5)),y+locY(a,tw3,-s*(0.8+t3*0.5)),bz4-s*0.05*t3,s*(0.2-t3*0.03),s*0.3,s*(0.18-t3*0.03),yaw,0,0,t3%2?dk:c,0);
      }
    }
  }

  // ===== CLOUDS (drifting blended billboards) =====
  var clouds=[];
  (function(){
    for(var i=0;i<28;i++){
      clouds.push({
        x:(rng()-0.5)*140,y:(rng()-0.5)*140,z:8+rng()*15,
        size:3+rng()*6,spd:0.15+rng()*0.3,a:0.10+rng()*0.08
      });
    }
  })();
  function updateClouds(dt){
    for(var i=0;i<clouds.length;i++){
      clouds[i].x+=clouds[i].spd*dt;
      if(clouds[i].x>60)clouds[i].x=-60;
    }
  }

  // ===== RENDER =====
  var _vp=null;
  function project(x,y,z){
    var m=_vp;
    var cx=m[0]*x+m[4]*y+m[8]*z+m[12];
    var cy=m[1]*x+m[5]*y+m[9]*z+m[13];
    var cw=m[3]*x+m[7]*y+m[11]*z+m[15];
    if(cw<=0.01)return null;
    return[(cx/cw*0.5+0.5)*W,(1-(cy/cw*0.5+0.5))*H,cw];
  }
  function buildDynScene(){
    dynLen=0;
    // enemies
    for(var i=0;i<enemies.length;i++)if(!enemies[i].dead)drawEnemy(enemies[i]);
    // pickups: spinning emissive cross
    for(var j=0;j<pickups.length;j++){
      var pk=pickups[j];
      var pz=pk.z+Math.sin(pk.t*2.5)*0.08;
      dynBoxRot(pk.x,pk.y,pz,0.22,0.07,0.07,pk.t*1.8,0,0,[0.15,1,0.45],0.9);
      dynBoxRot(pk.x,pk.y,pz,0.07,0.07,0.22,pk.t*1.8,0,0,[0.15,1,0.45],0.9);
    }
    // player bullets as small emissive cubes
    for(var k=0;k<bullets.length;k++){
      var b=bullets[k];
      dynBoxRot(b.x,b.y,b.z,0.06,0.06,0.06,_time*6,0.5,0,b.col,1);
    }
    for(var k2=0;k2<enemyBullets.length;k2++){
      var eb=enemyBullets[k2];
      dynBoxRot(eb.x,eb.y,eb.z,0.09,0.09,0.09,_time*5,0.4,0,eb.col,1);
    }
    // windmill blades: two crossed bars spinning in the X-Z plane (roll about Y)
    for(var wi=0;wi<windmills.length;wi++){
      var wm=windmills[wi],ang=_time*wm.spd;
      dynBoxRot(wm.x,wm.y,wm.z,wm.r,0.14,0.14,0,0,ang,C_SAIL,0);
      dynBoxRot(wm.x,wm.y,wm.z,0.14,0.14,wm.r,0,0,ang,C_SAIL,0);
    }
    // banners/flags: horizontal pennant waving sideways in the wind
    for(var fi=0;fi<flags.length;fi++){
      var fg=flags[fi],segs=5;
      for(var s2=0;s2<segs;s2++){
        var fx0=fg.x+(s2/segs)*fg.len*fg.dir, fx1=fg.x+((s2+1)/segs)*fg.len*fg.dir;
        var w0=Math.sin(_time*fg.spd+s2*0.9)*0.18*(s2/segs);
        var w1=Math.sin(_time*fg.spd+(s2+1)*0.9)*0.18*((s2+1)/segs);
        var zt=fg.z, zb=fg.z-fg.hgt;
        dynQuad([fx0,fg.y+w0,zt],[fx1,fg.y+w1,zt],[fx1,fg.y+w1,zb],[fx0,fg.y+w0,zb],[0,1,0],fg.col[0],fg.col[1],fg.col[2],0);
      }
    }
  }
  function bindWorldAttribs(){
    gl.enableVertexAttribArray(locW.aPos);
    gl.enableVertexAttribArray(locW.aNrm);
    gl.enableVertexAttribArray(locW.aCol);
    gl.vertexAttribPointer(locW.aPos,3,gl.FLOAT,false,STRIDE,0);
    gl.vertexAttribPointer(locW.aNrm,3,gl.FLOAT,false,STRIDE,12);
    gl.vertexAttribPointer(locW.aCol,4,gl.FLOAT,false,STRIDE,24);
  }
  function renderScene(){
    var shx=(Math.random()-0.5)*screenShake*0.012,shy=(Math.random()-0.5)*screenShake*0.012;
    var bob=player.grounded?Math.sin(player.bobPhase)*0.025:0;
    var dip=player.landDip*0.09;
    var cx=player.x,cy=player.y,cz=player.z+PLAYER_EYE+bob-dip;
    var ca=player.a+shx,cp=player.p+shy;
    var spd=Math.sqrt(player.vx*player.vx+player.vy*player.vy);
    var fov=FOV_BASE*(1+fovKick*0.13+clamp((spd-WALK_SPD)/14,0,0.08)+clamp((-player.vz-8)/40,0,0.07));
    var proj=matPerspective(fov,W/H,NEAR,FAR);
    var view=matView(cx,cy,cz,ca,cp);
    _vp=matMul(proj,view);
    // camera basis for billboards
    _camRight=[Math.cos(ca),-Math.sin(ca),0];
    var fwd=[Math.sin(ca)*Math.cos(cp),Math.cos(ca)*Math.cos(cp),Math.sin(cp)];
    _camUp=[ -fwd[1]*_camRight[2]+fwd[2]*_camRight[1],
             -fwd[2]*_camRight[0]+fwd[0]*_camRight[2],
             -fwd[0]*_camRight[1]+fwd[1]*_camRight[0] ];

    gl.viewport(0,0,W,H);
    gl.clearColor(FOG_C[0],FOG_C[1],FOG_C[2],1);
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);

    // --- sky ---
    var view0=matView(0,0,0,ca,cp);
    var vp0=matMul(proj,view0);
    var inv=mat4Invert(vp0);
    if(inv){
      gl.useProgram(progSky);
      gl.depthMask(false);
      gl.bindBuffer(gl.ARRAY_BUFFER,skyBuf);
      gl.enableVertexAttribArray(locS.aPos);
      gl.vertexAttribPointer(locS.aPos,2,gl.FLOAT,false,8,0);
      gl.uniformMatrix4fv(locS.uInvVP,false,new Float32Array(inv));
      gl.uniform3f(locS.uSunDir,SUN_DIR[0],SUN_DIR[1],SUN_DIR[2]);
      gl.uniform1f(locS.uTime,_time);
      gl.drawArrays(gl.TRIANGLES,0,6);
      gl.disableVertexAttribArray(locS.aPos);
      gl.depthMask(true);
    }

    // --- world (static + dynamic, lit) ---
    gl.useProgram(progWorld);
    gl.uniformMatrix4fv(locW.uVP,false,new Float32Array(_vp));
    gl.uniform3f(locW.uSunDir,SUN_DIR[0],SUN_DIR[1],SUN_DIR[2]);
    gl.uniform3f(locW.uSunCol,SUN_COL[0],SUN_COL[1],SUN_COL[2]);
    gl.uniform3f(locW.uAmbUp,AMB_UP[0],AMB_UP[1],AMB_UP[2]);
    gl.uniform3f(locW.uAmbDn,AMB_DN[0],AMB_DN[1],AMB_DN[2]);
    gl.uniform3f(locW.uCam,cx,cy,cz);
    gl.uniform3f(locW.uFogC,FOG_C[0],FOG_C[1],FOG_C[2]);
    packLights();
    gl.uniform4fv(locW.uLPos,_lpos);
    gl.uniform4fv(locW.uLCol,_lcol);
    gl.bindBuffer(gl.ARRAY_BUFFER,staticBuf);
    bindWorldAttribs();
    gl.drawArrays(gl.TRIANGLES,0,staticCount);
    buildDynScene();
    if(dynLen>0){
      gl.bindBuffer(gl.ARRAY_BUFFER,dynBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER,0,dynArr.subarray(0,dynLen));
      bindWorldAttribs();
      gl.drawArrays(gl.TRIANGLES,0,dynLen/10);
    }

    // --- blend pass A: shadows + clouds (alpha blend) ---
    gl.useProgram(progBlend);
    gl.uniformMatrix4fv(locB.uVP,false,new Float32Array(_vp));
    gl.uniform3f(locB.uCam,cx,cy,cz);
    gl.uniform3f(locB.uFogC,FOG_C[0],FOG_C[1],FOG_C[2]);
    gl.enable(gl.BLEND);
    gl.depthMask(false);
    gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    blLen=0;
    // player shadow (critical platforming readability)
    var pg=groundTopAt(player.x,player.y,player.z+0.1,PLAYER_R);
    if(pg>-999){
      var ph=clamp(player.z-pg,0,8);
      blShadow(player.x,player.y,pg,lerp(0.34,0.14,ph/8),lerp(0.5,0.18,ph/8));
    }
    for(var i3=0;i3<enemies.length;i3++){
      var e3=enemies[i3];if(e3.dead)continue;
      var eg=groundTopAt(e3.x,e3.y,e3.z+0.1,0.3);
      if(eg>-999){
        var eh3=clamp(e3.z-eg,0,8);
        var es3=E_DEF[e3.type].size;
        blShadow(e3.x,e3.y,eg,lerp(es3*0.8,es3*0.35,eh3/8),lerp(0.45,0.15,eh3/8));
      }
    }
    for(var j3=0;j3<pickups.length;j3++){
      var pk3=pickups[j3];
      var pgr=groundTopAt(pk3.x,pk3.y,pk3.z+0.1,0.1);
      if(pgr>-999)blShadow(pk3.x,pk3.y,pgr,0.14,0.3);
    }
    for(var c3=0;c3<clouds.length;c3++){
      var cl=clouds[c3];
      blBillboard(cl.x,cl.y,cl.z,cl.size,1.0,1.0,1.0,cl.a);
    }
    // waterfalls: downward-scrolling soft billboards + mist (flows off island edges)
    var wScroll=_time*0.55-Math.floor(_time*0.55);
    for(var wf=0;wf<waterfalls.length;wf++){
      var w5=waterfalls[wf],puffs=Math.max(4,Math.floor(w5.len*1.3));
      for(var pp=0;pp<puffs;pp++){
        var frac=(pp/puffs+wScroll);frac=frac-Math.floor(frac);
        blBillboard(w5.x+Math.sin(_time*3+pp)*0.06,w5.y,w5.z-frac*w5.len,w5.w,0.86,0.93,1.0,0.26*(1-frac*0.55));
      }
      blBillboard(w5.x,w5.y,w5.z-w5.len,w5.w*1.5,0.96,0.98,1.0,0.15);
    }
    // river flow: foam flecks drifting downstream along each river's waypoints
    for(var ri=0;ri<rivers.length;ri++){
      var rv=rivers[ri],np=rv.pts.length,foam=12;
      for(var ff=0;ff<foam;ff++){
        var rt=_time*0.28+ff/foam;rt=rt-Math.floor(rt);
        var seg=Math.min(np-2,Math.floor(rt*(np-1))),lt=rt*(np-1)-seg;
        var ra=rv.pts[seg],rb=rv.pts[seg+1];
        blBillboard(ra[0]+(rb[0]-ra[0])*lt,ra[1]+(rb[1]-ra[1])*lt,rv.z+0.05,rv.w*0.34,0.92,0.96,1.0,0.22);
      }
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

    // --- blend pass B: additive glow (particles, beams, grapple) ---
    gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
    blLen=0;
    for(var p4=0;p4<particles.length;p4++){
      var pt=particles[p4];
      var k4=pt.life/pt.maxLife;
      blBillboard(pt.x,pt.y,pt.z,pt.size*(0.5+k4),pt.r,pt.g,pt.b,k4*0.9);
    }
    for(var b4=0;b4<beams.length;b4++){
      var bm=beams[b4];
      var bk=bm.life/bm.maxLife;
      blBeam(bm.x0,bm.y0,bm.z0,bm.x1,bm.y1,bm.z1,0.05+0.1*(1-bk),bm.col[0],bm.col[1],bm.col[2],bk*0.9);
      blBeam(bm.x0,bm.y0,bm.z0,bm.x1,bm.y1,bm.z1,0.02,1,1,1,bk);
    }
    // bullet glows
    for(var g4=0;g4<bullets.length;g4++){
      var bg=bullets[g4];
      blBillboard(bg.x,bg.y,bg.z,0.22,bg.col[0],bg.col[1],bg.col[2],0.5);
    }
    for(var g5=0;g5<enemyBullets.length;g5++){
      var bg5=enemyBullets[g5];
      blBillboard(bg5.x,bg5.y,bg5.z,0.3,bg5.col[0],bg5.col[1],bg5.col[2],0.55);
    }
    // grapple wire
    if(player.grappling){
      var gx0=player.x+Math.cos(player.a)*0.25,gy0=player.y-Math.sin(player.a)*0.25,gz0=player.z+PLAYER_EYE-0.15;
      blBeam(gx0,gy0,gz0,player.grapX,player.grapY,player.grapZ,0.025,0,0.9,1,0.85);
      blBillboard(player.grapX,player.grapY,player.grapZ,0.16,0.3,1,1,0.9);
    }
    // jet glow under player
    if(player.jetting){
      blBillboard(player.x,player.y,player.z-0.05,0.3,1,0.6,0.2,0.5);
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
  }
  // ===== HUD (2D canvas layer) =====
  function drawBar(x,y,w,h,frac,colFull,colMid,colLow,label){
    hud.fillStyle='rgba(0,0,0,0.45)';
    hud.fillRect(x-1,y-1,w+2,h+2);
    var col=frac>0.5?colFull:(frac>0.25?colMid:colLow);
    hud.fillStyle=col;
    hud.fillRect(x,y,Math.max(0,w*frac),h);
    hud.strokeStyle='rgba(255,255,255,0.25)';
    hud.lineWidth=1;
    hud.strokeRect(x-0.5,y-0.5,w+1,h+1);
    if(label){
      hud.fillStyle='rgba(255,255,255,0.85)';
      hud.font='7px monospace';
      hud.textAlign='left';hud.textBaseline='middle';
      hud.fillText(label,x+w+5,y+h/2+0.5);
    }
  }
  function renderHUD(){
    hud.clearRect(0,0,W,H);
    if(gameState!=='playing')return;
    var t=_time;
    // --- vignette ---
    var vg=hud.createRadialGradient(W/2,H/2,H*0.42,W/2,H/2,H*0.75);
    vg.addColorStop(0,'rgba(0,0,0,0)');
    vg.addColorStop(1,'rgba(10,0,20,0.30)');
    hud.fillStyle=vg;hud.fillRect(0,0,W,H);
    // --- damage / heal flashes ---
    if(dmgFlash>0){
      hud.fillStyle='rgba(255,30,30,'+(dmgFlash*0.32)+')';
      hud.fillRect(0,0,W,H);
    }
    if(healFlash>0){
      hud.strokeStyle='rgba(40,255,120,'+(healFlash*0.5)+')';
      hud.lineWidth=6;hud.strokeRect(3,3,W-6,H-6);
    }
    if(player.iFrames>0&&Math.sin(player.iFrames*30)>0){
      hud.fillStyle='rgba(255,255,255,0.07)';hud.fillRect(0,0,W,H);
    }
    // low HP heartbeat
    if(player.hp<30){
      var hb=0.10+0.10*Math.sin(t*6);
      hud.fillStyle='rgba(255,0,30,'+hb*(1-player.hp/30)+')';
      hud.fillRect(0,0,W,H);
    }
    // fast-fall wind: radial speed lines from screen edges
    if(player.vz<-9&&respawnT<=0){
      var ws=clamp((-player.vz-9)/12,0,1);
      hud.strokeStyle='rgba(220,230,255,'+(ws*0.35)+')';
      hud.lineWidth=1;
      hud.beginPath();
      for(var sl=0;sl<14;sl++){
        var sa=Math.random()*TAU;
        var r0=H*(0.30+Math.random()*0.18),r1=r0+H*(0.10+0.16*ws);
        hud.moveTo(W/2+Math.cos(sa)*r0,H/2+Math.sin(sa)*r0);
        hud.lineTo(W/2+Math.cos(sa)*r1,H/2+Math.sin(sa)*r1);
      }
      hud.stroke();
    }
    // --- damage numbers (3D projected) ---
    hud.textAlign='center';hud.textBaseline='middle';
    for(var i=0;i<dmgNums.length;i++){
      var d=dmgNums[i];
      var pr=project(d.x,d.y,d.z);
      if(!pr)continue;
      var a=Math.min(1,d.life*2.5);
      var fs=d.crit?10:8;
      hud.font='bold '+fs+'px monospace';
      hud.fillStyle='rgba(0,0,0,'+a*0.7+')';
      hud.fillText(''+d.val,pr[0]+1,pr[1]+1);
      hud.fillStyle='rgba('+(d.col[0]*255|0)+','+(d.col[1]*255|0)+','+(d.col[2]*255|0)+','+a+')';
      hud.fillText(''+d.val,pr[0],pr[1]);
    }
    // --- crosshair ---
    var cxp=W/2,cyp=H/2;
    var spd=Math.sqrt(player.vx*player.vx+player.vy*player.vy);
    var gap=3+spd*0.5+vmKick*5;
    hud.lineWidth=1.5;
    if(grappleInRange){
      var pl=0.6+0.3*Math.sin(t*8);
      hud.strokeStyle='rgba(40,255,150,'+pl+')';
      // corner brackets
      var br=gap+5;
      hud.beginPath();
      hud.moveTo(cxp-br,cyp-br+3);hud.lineTo(cxp-br,cyp-br);hud.lineTo(cxp-br+3,cyp-br);
      hud.moveTo(cxp+br-3,cyp-br);hud.lineTo(cxp+br,cyp-br);hud.lineTo(cxp+br,cyp-br+3);
      hud.moveTo(cxp+br,cyp+br-3);hud.lineTo(cxp+br,cyp+br);hud.lineTo(cxp+br-3,cyp+br);
      hud.moveTo(cxp-br+3,cyp+br);hud.lineTo(cxp-br,cyp+br);hud.lineTo(cxp-br,cyp+br-3);
      hud.stroke();
      hud.font='5px monospace';hud.fillStyle='rgba(40,255,150,'+pl+')';
      hud.fillText('GRAPPLE [E]',cxp,cyp+br+7);
    }else{
      hud.strokeStyle='rgba(200,155,90,0.9)';
    }
    hud.beginPath();
    hud.moveTo(cxp-gap-4,cyp);hud.lineTo(cxp-gap,cyp);
    hud.moveTo(cxp+gap,cyp);hud.lineTo(cxp+gap+4,cyp);
    hud.moveTo(cxp,cyp-gap-4);hud.lineTo(cxp,cyp-gap);
    hud.moveTo(cxp,cyp+gap);hud.lineTo(cxp,cyp+gap+4);
    hud.stroke();
    hud.fillStyle='rgba(200,155,90,0.9)';
    hud.fillRect(cxp-0.5,cyp-0.5,1,1);
    // hit / kill markers
    if(hitMarker>0){
      var hm=hitMarker/0.18;
      hud.strokeStyle=killMarker>0?'rgba(255,60,60,'+hm+')':'rgba(255,255,255,'+hm+')';
      hud.lineWidth=killMarker>0?2:1.5;
      var ms=killMarker>0?8:6;
      hud.beginPath();
      hud.moveTo(cxp-ms,cyp-ms);hud.lineTo(cxp-ms+3,cyp-ms+3);
      hud.moveTo(cxp+ms,cyp-ms);hud.lineTo(cxp+ms-3,cyp-ms+3);
      hud.moveTo(cxp-ms,cyp+ms);hud.lineTo(cxp-ms+3,cyp+ms-3);
      hud.moveTo(cxp+ms,cyp+ms);hud.lineTo(cxp+ms-3,cyp+ms-3);
      hud.stroke();
    }
    // --- top-left: HP + fuel ---
    drawBar(10,10,72,6,player.hp/player.maxHp,'#3dde6e','#ffd23c','#ff3c3c',''+Math.ceil(player.hp));
    var fc=player.jetFuel/JET_MAX;
    drawBar(10,20,52,3,fc,'#c89b5a','#ff9a3c','#ff3c3c','JET');
    // dash pip
    hud.fillStyle=player.dashCD<=0?'#c89b5a':'rgba(120,120,140,0.6)';
    hud.font='6px monospace';hud.textAlign='left';
    hud.fillText(player.dashCD<=0?'DASH RDY':'DASH '+player.dashCD.toFixed(1),10,32);
    // score
    hud.fillStyle='#fff';hud.font='bold 8px monospace';
    hud.fillText(''+score,10,43);
    if(combo>1){
      var ck=comboTimer/3;
      hud.fillStyle='rgba(255,220,60,'+(0.6+0.4*Math.sin(t*10))+')';
      hud.font='bold 9px monospace';
      hud.fillText('x'+combo+' COMBO',10,54);
      hud.fillStyle='rgba(255,220,60,0.5)';
      hud.fillRect(10,58,40*ck,2);
    }
    // --- top-right: wave + enemies ---
    hud.textAlign='right';
    hud.fillStyle='#c89b5a';hud.font='bold 8px monospace';
    hud.fillText('WAVE '+currentWave+'/'+totalWaves,W-10,12);
    var alive=0;for(var e5=0;e5<enemies.length;e5++)if(!enemies[e5].dead)alive++;
    hud.fillStyle='#ff5577';hud.font='7px monospace';
    hud.fillText(alive+' HOSTILES',W-10,22);
    // --- boss bar ---
    for(var b6=0;b6<enemies.length;b6++){
      var be=enemies[b6];
      if(be.type===4&&!be.dead){
        var bw=W*0.4;
        hud.fillStyle='rgba(0,0,0,0.5)';
        hud.fillRect(W/2-bw/2-1,H-22,bw+2,7);
        hud.fillStyle='#c040ff';
        hud.fillRect(W/2-bw/2,H-21,bw*(be.hp/be.maxHp),5);
        hud.strokeStyle='rgba(255,255,255,0.4)';hud.lineWidth=1;
        hud.strokeRect(W/2-bw/2-1.5,H-22.5,bw+3,8);
        hud.textAlign='center';hud.fillStyle='#e0a0ff';hud.font='6px monospace';
        hud.fillText('DRAGON',W/2,H-27);
        break;
      }
    }
    // --- weapon + ammo bottom-right ---
    var w=weapons[weaponIdx];
    hud.textAlign='right';
    hud.fillStyle='rgba(255,255,255,0.9)';hud.font='bold 8px monospace';
    hud.fillText(w.name,W-10,H-26);
    hud.font='10px monospace';
    hud.fillStyle=w.ammo===Infinity?'#9fd9ff':(w.ammo>w.maxAmmo*0.25?'#fff':'#ff5050');
    hud.fillText(w.ammo===Infinity?'∞':''+w.ammo,W-10,H-14);
    // weapon slots
    hud.font='6px monospace';
    for(var ws=0;ws<3;ws++){
      hud.fillStyle=ws===weaponIdx?'#c89b5a':'rgba(160,160,180,0.5)';
      hud.fillText(''+(ws+1),W-44+ws*10,H-26);
    }
    renderViewmodel();
    renderMobileHUD();
    // void-fall blackout: fade to black, teleport at midpoint, fade back
    if(respawnT>0){
      var fk=respawnT>RESPAWN_T/2?(RESPAWN_T-respawnT)/(RESPAWN_T/2):respawnT/(RESPAWN_T/2);
      hud.fillStyle='rgba(4,2,10,'+Math.min(1,fk*1.15)+')';
      hud.fillRect(0,0,W,H);
    }
    // post-respawn penalty message
    if(fallMsgT>0&&respawnT<=RESPAWN_T/2){
      var fm=Math.min(1,fallMsgT);
      hud.textAlign='center';hud.textBaseline='middle';
      hud.font='bold 11px monospace';
      hud.fillStyle='rgba(255,70,70,'+fm+')';
      hud.fillText('FELL  -'+FALL_DMG+' HP',W/2,H*0.36);
      hud.font='7px monospace';
      hud.fillStyle='rgba(255,200,80,'+fm*0.9+')';
      hud.fillText('COMBO LOST',W/2,H*0.36+13);
    }
    if(debugMode)renderDebugHUD();
  }

  // ===== WEAPON VIEWMODEL (2D stylized) =====
  function renderViewmodel(){
    var w=weapons[weaponIdx];
    var bobX=Math.sin(player.bobPhase)*3,bobY=Math.abs(Math.cos(player.bobPhase))*2;
    var kick=vmKick*9;
    var bx=W*0.68+bobX,by=H-30+bobY+kick;
    hud.save();
    hud.translate(bx,by);
    hud.rotate(vmKick*-0.08);
    var colCss='rgb('+(w.color[0]*255|0)+','+(w.color[1]*255|0)+','+(w.color[2]*255|0)+')';
    // body
    hud.fillStyle='#1a1830';
    hud.strokeStyle='#3a3860';hud.lineWidth=1.5;
    if(weaponIdx===0){ // blaster
      hud.beginPath();
      hud.moveTo(-6,26);hud.lineTo(2,4);hud.lineTo(10,0);hud.lineTo(15,-14);hud.lineTo(22,-13);hud.lineTo(19,2);hud.lineTo(13,8);hud.lineTo(10,28);
      hud.closePath();hud.fill();hud.stroke();
      hud.fillStyle=colCss;
      hud.fillRect(14,-12,5,8); // glow cell
    }else if(weaponIdx===1){ // rail
      hud.beginPath();
      hud.moveTo(-8,26);hud.lineTo(0,2);hud.lineTo(8,-2);hud.lineTo(11,-22);hud.lineTo(19,-21);hud.lineTo(17,0);hud.lineTo(12,8);hud.lineTo(8,28);
      hud.closePath();hud.fill();hud.stroke();
      hud.fillStyle=colCss;
      hud.fillRect(12,-20,2,16); // rail coil
      hud.fillRect(16,-20,2,16);
    }else{ // scatter
      hud.beginPath();
      hud.moveTo(-6,26);hud.lineTo(0,4);hud.lineTo(6,0);hud.lineTo(8,-12);hud.lineTo(20,-11);hud.lineTo(18,4);hud.lineTo(12,9);hud.lineTo(9,28);
      hud.closePath();hud.fill();hud.stroke();
      hud.fillStyle=colCss;
      hud.fillRect(9,-10,4,4);hud.fillRect(15,-10,4,4); // twin bores
    }
    // muzzle flash
    if(vmFlash>0.05){
      var mf=vmFlash;
      var mx=weaponIdx===1?15:17,my=weaponIdx===1?-24:-16;
      var gr=hud.createRadialGradient(mx,my,0,mx,my,12*mf);
      gr.addColorStop(0,'rgba(255,255,230,'+mf+')');
      gr.addColorStop(0.4,'rgba('+(w.color[0]*255|0)+','+(w.color[1]*255|0)+','+(w.color[2]*255|0)+','+mf*0.8+')');
      gr.addColorStop(1,'rgba(255,120,0,0)');
      hud.fillStyle=gr;
      hud.beginPath();hud.arc(mx,my,12*mf,0,TAU);hud.fill();
    }
    hud.restore();
  }

  // ===== MOBILE HUD =====
  var touches={move:null,look:null,moveId:-1,lookId:-1};
  var mobBtns=[
    {id:'fire',x:0.88,y:0.52,r:0.055,active:false,col:'255,60,60'},
    {id:'jump',x:0.88,y:0.74,r:0.05,active:false,col:'0,229,255'},
    {id:'dash',x:0.76,y:0.64,r:0.04,active:false,col:'255,0,96'},
    {id:'grab',x:0.76,y:0.84,r:0.04,active:false,col:'40,255,150'}
  ];
  function renderMobileHUD(){
    if(!isMobileFps)return;
    hud.strokeStyle='rgba(200,155,90,0.2)';hud.lineWidth=1;
    hud.beginPath();hud.arc(W*0.15,H*0.7,26,0,TAU);hud.stroke();
    for(var i=0;i<mobBtns.length;i++){
      var b=mobBtns[i];
      var bx=b.x*W,by=b.y*H,br=b.r*W;
      hud.fillStyle='rgba('+b.col+','+(b.active?0.4:0.12)+')';
      hud.beginPath();hud.arc(bx,by,br,0,TAU);hud.fill();
      hud.strokeStyle='rgba('+b.col+',0.5)';hud.stroke();
      hud.fillStyle='rgba(255,255,255,0.85)';hud.font='6px monospace';
      hud.textAlign='center';hud.textBaseline='middle';
      hud.fillText(b.id.toUpperCase(),bx,by);
    }
  }

  // ===== DEBUG HUD =====
  function renderDebugHUD(){
    var lines=[
      'FPS '+debugFps,
      'P '+player.x.toFixed(1)+','+player.y.toFixed(1)+','+player.z.toFixed(2),
      'V '+Math.sqrt(player.vx*player.vx+player.vy*player.vy).toFixed(1)+' vz '+player.vz.toFixed(1),
      'GND '+(player.grounded?'Y':'n')+' jc '+player.jumpCount+' coy '+player.coyote.toFixed(2),
      'FUEL '+player.jetFuel.toFixed(2)+' MOM '+player.mom.toFixed(2),
      'E '+enemies.length+' B '+bullets.length+'/'+enemyBullets.length+' PT '+particles.length,
      'SOLIDS '+solids.length+' DYNV '+(dynLen/10|0),
      aiMode?('AI '+aiState):''
    ];
    hud.font='6px monospace';hud.textAlign='left';hud.textBaseline='top';
    for(var i=0;i<lines.length;i++){
      if(!lines[i])continue;
      hud.fillStyle='rgba(0,0,0,0.6)';
      hud.fillRect(8,68+i*8,lines[i].length*3.8+4,7);
      hud.fillStyle=debugFps<28&&i===0?'#ffd23c':'#7dff9a';
      hud.fillText(lines[i],10,68.5+i*8);
    }
  }

  // ===== SOUND (Web Audio) =====
  var audioCtx=null,masterGain=null,jetNode=null,jetGain=null;
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
  function noise(t0,dur,peak,fc,dest){
    var n=audioCtx.createBufferSource();n.buffer=noiseBuffer();n.loop=true;
    var f=audioCtx.createBiquadFilter();f.type='lowpass';f.frequency.value=fc;
    var g=audioCtx.createGain();
    env(g,t0,0.005,peak,dur);
    n.connect(f);f.connect(g);g.connect(dest||masterGain);
    n.start(t0);n.stop(t0+dur+0.02);
  }
  function playSound(name){
    if(!sOK())return;
    try{
      var t0=audioCtx.currentTime;
      switch(name){
        case'shoot0':osc('square',880,220,t0,0.09,0.18);break;
        case'shoot1':osc('sawtooth',180,40,t0,0.28,0.3);noise(t0,0.12,0.18,4000);osc('sine',2400,400,t0,0.15,0.12);break;
        case'shoot2':noise(t0,0.16,0.3,2400);osc('square',300,80,t0,0.14,0.2);break;
        case'eshoot':osc('sawtooth',500,200,t0,0.14,0.1);break;
        case'hit':osc('square',1400,900,t0,0.05,0.12);break;
        case'kill':osc('square',440,880,t0,0.08,0.16);osc('square',660,1320,t0+0.06,0.1,0.14);noise(t0,0.2,0.2,3000);break;
        case'bosskill':for(var i=0;i<4;i++)osc('square',330*(i+1),660*(i+1),t0+i*0.09,0.12,0.15);noise(t0,0.5,0.3,2500);break;
        case'hurt':osc('sawtooth',200,80,t0,0.18,0.25);break;
        case'jump':osc('square',300,600,t0,0.12,0.12);break;
        case'doublejump':osc('square',400,900,t0,0.12,0.12);osc('sine',800,1600,t0,0.1,0.08);break;
        case'land':noise(t0,0.12,0.18,800);break;
        case'dash':noise(t0,0.18,0.2,5000);osc('sawtooth',700,1400,t0,0.12,0.1);break;
        case'grapple':osc('square',1000,2200,t0,0.1,0.12);noise(t0,0.06,0.1,6000);break;
        case'grapfail':osc('square',400,250,t0,0.08,0.08);break;
        case'pickup':osc('sine',660,1320,t0,0.1,0.14);osc('sine',990,1980,t0+0.07,0.1,0.1);break;
        case'wave':osc('square',440,440,t0,0.12,0.12);osc('square',587,587,t0+0.13,0.12,0.12);osc('square',880,880,t0+0.26,0.18,0.14);break;
        case'bosswave':osc('sawtooth',110,55,t0,0.7,0.25);osc('sawtooth',165,82,t0+0.2,0.6,0.2);break;
        case'win':var ns=[523,659,784,1047];for(var j=0;j<4;j++)osc('square',ns[j],ns[j],t0+j*0.13,0.16,0.14);break;
        case'gameover':var gs=[440,330,262,196];for(var k=0;k<4;k++)osc('sawtooth',gs[k],gs[k]*0.95,t0+k*0.2,0.24,0.16);break;
        case'fall':osc('sawtooth',520,60,t0,0.55,0.28);noise(t0,0.5,0.22,1200);break;
        case'respawn':osc('sine',300,1200,t0,0.25,0.16);osc('square',600,2400,t0+0.05,0.22,0.08);noise(t0,0.12,0.08,7000);break;
      }
    }catch(e){}
  }
  function updateJetSound(){
    if(!sOK()){if(jetNode){try{jetNode.stop();}catch(e){}jetNode=null;}return;}
    if(player.jetting&&gameState==='playing'){
      if(!jetNode){
        try{
          jetNode=audioCtx.createBufferSource();jetNode.buffer=noiseBuffer();jetNode.loop=true;
          var f=audioCtx.createBiquadFilter();f.type='bandpass';f.frequency.value=900;f.Q.value=0.8;
          jetGain=audioCtx.createGain();jetGain.gain.value=0.12;
          jetNode.connect(f);f.connect(jetGain);jetGain.connect(masterGain);
          jetNode.start();
        }catch(e){jetNode=null;}
      }
    }else if(jetNode){
      try{jetNode.stop();}catch(e){}
      jetNode=null;
    }
  }
  var windNode=null;
  function updateWindSound(){
    var falling=gameState==='playing'&&player.vz<-9&&respawnT<=0;
    if(!sOK()||!falling){
      if(windNode){try{windNode.stop();}catch(e){}windNode=null;}
      return;
    }
    if(!windNode){
      try{
        windNode=audioCtx.createBufferSource();windNode.buffer=noiseBuffer();windNode.loop=true;
        var f=audioCtx.createBiquadFilter();f.type='lowpass';f.frequency.value=600;
        var g=audioCtx.createGain();g.gain.value=0.001;
        g.gain.exponentialRampToValueAtTime(0.14,audioCtx.currentTime+0.4);
        windNode.connect(f);f.connect(g);g.connect(masterGain);
        windNode.start();
      }catch(e){windNode=null;}
    }
  }

  // ===== MUSIC (synthwave loop scheduler) =====
  var musicOn=false,musStep=0,musNext=0;
  var MUS_BPM=104,MUS_SPB=60/MUS_BPM/4; // 16th note duration
  // A minor-ish: bass line (Hz) over 32 steps
  var BASS=[110,0,110,0, 110,0,131,0, 87,0,87,0, 98,0,98,131,
            110,0,110,0, 110,0,131,0, 147,0,147,0, 131,0,98,0];
  var ARP=[440,523,659,523, 440,523,659,880, 349,440,523,440, 392,494,587,494,
           440,523,659,523, 440,523,659,880, 587,494,440,392, 330,392,494,392];
  function startMusic(){musicOn=true;musStep=0;if(audioCtx)musNext=audioCtx.currentTime+0.1;}
  function stopMusic(){musicOn=false;}
  function scheduleMusic(){
    if(!musicOn||!sOK()||gameState!=='playing')return;
    if(!isFpsOpen())return;
    var t=audioCtx.currentTime;
    if(musNext<t-0.3)musNext=t+0.05; // resync after pause/lag
    while(musNext<t+0.14){
      var st=musStep%32;
      // kick on quarters
      if(st%8===0)osc('sine',150,40,musNext,0.14,0.5);
      // hat on offbeat 8ths
      if(st%4===2)noise(musNext,0.04,0.07,9000);
      // bass
      if(BASS[st])osc('sawtooth',BASS[st],BASS[st],musNext,MUS_SPB*1.7,0.10);
      // arp (soft)
      if(st%2===0&&ARP[st])osc('square',ARP[st],ARP[st],musNext,MUS_SPB*0.9,0.025);
      musNext+=MUS_SPB;
      musStep++;
    }
  }

  // ===== INPUT =====
  function handleKey(e,down){
    switch(e.code){
      case'KeyW':keys.w=down;break;case'KeyA':keys.a=down;break;
      case'KeyS':keys.s=down;break;case'KeyD':keys.d=down;break;
      case'Space':if(down&&!keys.sp)spJustPressed=true;keys.sp=down;if(down)e.preventDefault();break;
      case'KeyQ':if(down)tryDash();break;
      case'KeyE':if(down){if(player.grappling){player.grappling=false;}else{tryGrapple();}}break;
      case'Digit1':weaponIdx=0;break;
      case'Digit2':weaponIdx=1;break;
      case'Digit3':weaponIdx=2;break;
      case'Escape':
        if(down&&gameState==='playing'){
          if(aiMode){
            // no pointer lock in AI mode — toggle an explicit pause instead
            manualPause=!manualPause;
            if(pointerLocked)document.exitPointerLock();
          }else if(pointerLocked){
            document.exitPointerLock();
          }
        }
        break;
      case'F3':
        if(down){debugMode=!debugMode;e.preventDefault();}
        break;
    }
  }
  document.addEventListener('keydown',function(e){if(isFpsActive())handleKey(e,true);});
  document.addEventListener('keyup',function(e){handleKey(e,false);});
  document.addEventListener('mousemove',function(e){
    if(!pointerLocked||gameState!=='playing')return;
    player.a+=e.movementX*0.003;
    player.p-=e.movementY*0.003;
    player.p=Math.max(-PI*0.48,Math.min(PI*0.48,player.p));
  });
  canvas.addEventListener('mousedown',function(e){
    ensureAudio();
    if(audioCtx&&audioCtx.state==='suspended')audioCtx.resume();
    if(gameState==='title'){startGame();return;}
    if(gameState==='win'||gameState==='gameover'){if(stateTimer<=0){gameState='title';_ovActive='';updateOverlay();}return;}
    if(gameState==='playing'&&!pointerLocked&&!isMobileFps){canvas.requestPointerLock();return;}
    if(gameState==='playing'&&(pointerLocked||isMobileFps)){mouseDown=true;playerShoot();}
  });
  canvas.addEventListener('mouseup',function(){mouseDown=false;});
  canvas.addEventListener('wheel',function(e){
    if(gameState==='playing'){
      weaponIdx=(weaponIdx+(e.deltaY>0?1:-1)+3)%3;
      e.preventDefault();
    }
  },{passive:false});
  document.addEventListener('pointerlockchange',function(){
    pointerLocked=document.pointerLockElement===canvas;
    if(!pointerLocked){keys.w=keys.a=keys.s=keys.d=keys.sp=false;mouseDown=false;}
  });

  // ===== MOBILE TOUCH =====
  if(isMobileFps){
    canvas.addEventListener('touchstart',function(e){
      e.preventDefault();
      ensureAudio();
      if(audioCtx&&audioCtx.state==='suspended')audioCtx.resume();
      if(gameState==='title'){startGame();return;}
      if((gameState==='win'||gameState==='gameover')&&stateTimer<=0){gameState='title';_ovActive='';updateOverlay();return;}
      for(var i=0;i<e.changedTouches.length;i++){
        var t=e.changedTouches[i];
        var tx=(t.clientX-canvas.getBoundingClientRect().left)/canvas.clientWidth;
        var ty=(t.clientY-canvas.getBoundingClientRect().top)/canvas.clientHeight;
        var hitBtn=false;
        for(var b=0;b<mobBtns.length;b++){
          var btn=mobBtns[b];
          if(Math.abs(tx-btn.x)<btn.r*2&&Math.abs(ty-btn.y)<btn.r*2.4){
            btn.active=true;btn.tid=t.identifier;
            if(btn.id==='fire'){mouseDown=true;playerShoot();}
            if(btn.id==='jump'){if(!keys.sp)spJustPressed=true;keys.sp=true;}
            if(btn.id==='dash')tryDash();
            if(btn.id==='grab'){if(player.grappling)player.grappling=false;else tryGrapple();}
            hitBtn=true;break;
          }
        }
        if(!hitBtn){
          if(tx<0.4){touches.moveId=t.identifier;touches.move={sx:t.clientX,sy:t.clientY};}
          else{touches.lookId=t.identifier;touches.look={x:t.clientX,y:t.clientY};}
        }
      }
    },{passive:false});
    canvas.addEventListener('touchmove',function(e){
      e.preventDefault();
      for(var i=0;i<e.changedTouches.length;i++){
        var t=e.changedTouches[i];
        if(t.identifier===touches.moveId&&touches.move){
          var dx=(t.clientX-touches.move.sx)/40,dy=(t.clientY-touches.move.sy)/40;
          dx=clamp(dx,-1,1);dy=clamp(dy,-1,1);
          keys.w=dy<-0.2;keys.s=dy>0.2;keys.a=dx<-0.2;keys.d=dx>0.2;
        }
        if(t.identifier===touches.lookId&&touches.look){
          player.a+=(t.clientX-touches.look.x)*0.006;
          player.p-=(t.clientY-touches.look.y)*0.006;
          player.p=clamp(player.p,-PI*0.48,PI*0.48);
          touches.look.x=t.clientX;touches.look.y=t.clientY;
        }
      }
    },{passive:false});
    var touchEnd=function(e){
      for(var i=0;i<e.changedTouches.length;i++){
        var t=e.changedTouches[i];
        if(t.identifier===touches.moveId){touches.moveId=-1;touches.move=null;keys.w=keys.a=keys.s=keys.d=false;}
        if(t.identifier===touches.lookId){touches.lookId=-1;touches.look=null;}
        for(var b=0;b<mobBtns.length;b++){
          if(mobBtns[b].tid===t.identifier){
            mobBtns[b].active=false;mobBtns[b].tid=null;
            if(mobBtns[b].id==='jump')keys.sp=false;
            if(mobBtns[b].id==='fire')mouseDown=false;
          }
        }
      }
    };
    canvas.addEventListener('touchend',touchEnd);
    canvas.addEventListener('touchcancel',touchEnd);
  }

  // ===== WINDOW STATE =====
  function isFpsOpen(){
    return _wfps&&!_wfps.classList.contains('closed')&&!_wfps.classList.contains('minimized');
  }
  function isFpsActive(){
    if(!isFpsOpen())return false;
    var z=parseInt(_wfps.style.zIndex)||0;
    var maxZ=z;
    var wins=document.querySelectorAll('.window:not(.closed):not(.minimized)');
    for(var i=0;i<wins.length;i++){var wz=parseInt(wins[i].style.zIndex)||0;if(wz>maxZ)maxZ=wz;}
    return z>=maxZ;
  }
  if(_wfps){
    new MutationObserver(function(){
      if(!isFpsOpen()){
        if(pointerLocked)document.exitPointerLock();
        if(jetNode){try{jetNode.stop();}catch(e){}jetNode=null;}
        if(windNode){try{windNode.stop();}catch(e){}windNode=null;}
      }
    }).observe(_wfps,{attributes:true,attributeFilter:['class']});
  }

  // ===== AI TEST MODE (smooth, human-like inputs only) =====
  var AI_TURN=3.5;
  function aiInit(){
    aiState='explore';aiTimer=0;aiWp=null;aiStuck=0;aiShootT=0;
    aiLastX=player.x;aiLastY=player.y;
    if(gameState!=='playing')startGame();
  }
  function aiNearestEnemy(){
    var best=null,bd=1e9;
    for(var i=0;i<enemies.length;i++){
      var e=enemies[i];if(e.dead)continue;
      var d=dist2d(e.x,e.y,player.x,player.y);
      if(d<bd){bd=d;best=e;}
    }
    return best;
  }
  function aiUpdate(dt){
    if(gameState!=='playing')return;
    keys.w=keys.a=keys.s=keys.d=false;
    aiTimer+=dt;
    aiShootT-=dt;
    // stuck check
    if(aiTimer>1){
      var moved=dist2d(player.x,player.y,aiLastX,aiLastY);
      if(moved<0.8){aiStuck++;if(!keys.sp)spJustPressed=true;if(aiStuck>2)tryDash();}
      else aiStuck=0;
      aiLastX=player.x;aiLastY=player.y;aiTimer=0;
    }
    var target=aiNearestEnemy();
    var tx,ty,tz;
    if(target){
      aiState='fight';
      tx=target.x;ty=target.y;tz=target.z+E_DEF[target.type].size;
    }else{
      aiState='explore';
      if(!aiWp||dist2d(player.x,player.y,aiWp[0],aiWp[1])<3){
        aiWp=SPAWN_PTS[Math.floor(Math.random()*SPAWN_PTS.length)];
      }
      tx=aiWp[0];ty=aiWp[1];tz=player.z+PLAYER_EYE;
    }
    // smooth turn toward target
    var wantA=Math.atan2(tx-player.x,ty-player.y);
    var da=wantA-player.a;
    while(da>PI)da-=TAU;while(da<-PI)da+=TAU;
    player.a+=clamp(da,-AI_TURN*dt,AI_TURN*dt);
    var hd=dist2d(tx,ty,player.x,player.y);
    var wantP=Math.atan2(tz-(player.z+PLAYER_EYE),Math.max(hd,0.5));
    player.p=clamp(lerp(player.p,wantP,5*dt),-PI*0.48,PI*0.48);
    // movement
    if(aiState==='fight'){
      if(hd>6)keys.w=true;
      else if(hd<3)keys.s=true;
      keys[(Math.floor(_time*0.7)%2)?'a':'d']=true; // strafe weave
      if(target&&player.z<target.z-2&&player.jetFuel>0.4)keys.sp=true;
      if(Math.abs(da)<0.22&&aiShootT<=0&&hd<22){playerShoot();aiShootT=weapons[weaponIdx].cd*0.5;}
    }else{
      if(Math.abs(da)<0.8)keys.w=true;
    }
  }

  // ===== GAME LOOP =====
  var lastT=0;
  function gameLoop(ts){
    requestAnimationFrame(gameLoop);
    if(!isFpsOpen())return; // window closed/minimized: skip all work
    var rawDt=Math.min(0.05,(ts-lastT)/1000||0.016);
    lastT=ts;
    _time+=rawDt;
    debugFrames++;debugFpsTimer+=rawDt;
    if(debugFpsTimer>=0.5){debugFps=Math.round(debugFrames/debugFpsTimer);debugFrames=0;debugFpsTimer=0;}

    var dt=rawDt;
    if(hitStop>0){hitStop-=rawDt;dt=0;}
    if(slowMo>0){slowMo-=rawDt;dt*=0.35;}

    if(gameState==='title'){
      // attract mode: orbit camera over the city
      var oa=_time*0.07;
      player.x=Math.sin(oa)*16;player.y=Math.cos(oa)*16;player.z=6.5;
      player.a=oa+PI;player.p=-0.3;
      updateClouds(rawDt);updateLights(rawDt);
    }else if(gameState==='playing'){
      var canRun=(pointerLocked||isMobileFps||aiMode)&&waveAnnounceTimer<=0&&!manualPause;
      if(waveAnnounceTimer>0)waveAnnounceTimer-=rawDt;
      if(canRun&&dt>0){
        gameTime+=dt;
        if(aiMode)aiUpdate(dt);
        // auto-fire
        var w=weapons[weaponIdx];
        if(mouseDown&&w.auto&&w.timer<=0)playerShoot();
        for(var wi=0;wi<3;wi++)if(weapons[wi].timer>0)weapons[wi].timer-=dt;
        updateRespawn(dt);
        resolvePhysics(dt);
        var alive=updateEnemies(dt);
        updateBullets(dt);
        updateParticles(dt);
        updateDmgNums(dt);
        updatePickups(dt);
        updateClouds(dt);
        updateLights(dt);
        // grapple range indicator (cheap ray)
        grappleInRange=!player.grappling&&!!grappleRay();
        // combo decay
        if(comboTimer>0){comboTimer-=dt;if(comboTimer<=0)combo=0;}
        // wave progression
        if(alive===0){
          if(currentWave>=totalWaves)winGame();
          else{slowMo=0.5;startWave(currentWave+1);}
        }
      }
    }else{
      if(stateTimer>0)stateTimer-=rawDt;
      updateParticles(rawDt);updateLights(rawDt);updateClouds(rawDt);
    }

    // effect decay (real-time)
    if(screenShake>0)screenShake=Math.max(0,screenShake-14*rawDt);
    if(dmgFlash>0)dmgFlash=Math.max(0,dmgFlash-3*rawDt);
    if(healFlash>0)healFlash=Math.max(0,healFlash-2.5*rawDt);
    if(hitMarker>0)hitMarker-=rawDt;
    if(killMarker>0)killMarker-=rawDt;
    if(fallMsgT>0)fallMsgT-=rawDt;
    if(fovKick>0)fovKick=Math.max(0,fovKick-5*rawDt);
    if(vmKick>0)vmKick=Math.max(0,vmKick-7*rawDt);
    if(vmFlash>0)vmFlash=Math.max(0,vmFlash-11*rawDt);

    updateJetSound();
    updateWindSound();
    scheduleMusic();
    renderScene();
    renderHUD();
    updateOverlay();
    updateOverlayPrompts();
  }

  // ===== TEST HOOK (used by the headless harness; harmless in normal play) =====
  window._gekkoTest={
    fall:function(){if(gameState==='playing'){player.z=VOID_Z-0.5;player.vz=-14;}},
    state:function(){return{hp:player.hp,combo:combo,wave:currentWave,z:player.z,respawnT:respawnT,grounded:player.grounded};}
  };

  // ===== INIT =====
  updateOverlay();
  requestAnimationFrame(gameLoop);
})();
