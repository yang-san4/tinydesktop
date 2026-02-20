// ===== GEKKO — Sky City Arena FPS (Polygon 3D Engine) =====
(function () {
  var canvas = document.getElementById('fps-canvas');
  var ctx = canvas.getContext('2d');
  var SC = 2;
  var LW = canvas.width, LH = canvas.height;
  canvas.width = LW * SC; canvas.height = LH * SC;
  canvas.style.width = '100%';
  canvas.style.aspectRatio = '4/3';
  canvas.style.imageRendering = 'pixelated';
  var W = canvas.width, H = canvas.height;
  ctx.imageSmoothingEnabled = false;

  // ===== Window sizing (80% of tinydesktop screen: 440x330) =====
  var _wfps = document.getElementById('window-fps');
  if (_wfps) {
    _wfps.style.width = '352px';
    _wfps.style.left = '44px';
    _wfps.style.top = '10px';
  }

  // ===== HTML Overlay =====
  var _fb = document.getElementById('fps-body');
  var _cw = document.createElement('div');
  _cw.style.cssText = 'position:relative;line-height:0;';
  _fb.insertBefore(_cw, canvas); _cw.appendChild(canvas);
  var _ov = document.createElement('div');
  _ov.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:hidden;z-index:10;';
  _cw.appendChild(_ov);
  var _ovCss = document.createElement('style');
  _ovCss.textContent =
    '@keyframes fpsPulse{0%,100%{opacity:.3}50%{opacity:1}}' +
    '@keyframes fpsSlideIn{0%{transform:translateY(-10px);opacity:0}100%{transform:translateY(0);opacity:1}}' +
    '.fps-scr{position:absolute;top:0;left:0;width:100%;height:100%;display:none;' +
    'flex-direction:column;align-items:center;justify-content:center;gap:0;' +
    'font-family:"Press Start 2P",monospace;text-align:center;box-sizing:border-box;padding:4% 4%}' +
    '.fps-scr.on{display:flex}' +
    '.fps-blink{animation:fpsPulse 1.8s ease-in-out infinite}' +
    '.fps-key{display:inline-block;border:1px solid rgba(0,229,255,0.45);padding:2px 4px;font-size:5px;border-radius:2px;margin:0 1px;background:rgba(0,229,255,0.06);color:#00e5ff;line-height:1;vertical-align:middle;font-family:"Press Start 2P",monospace}' +
    '.fps-si{display:inline-block;width:14px;height:14px;border:1px solid;border-radius:50%;vertical-align:middle;position:relative;box-sizing:border-box}' +
    '.fps-si::after{content:"";position:absolute;width:6px;height:6px;border-radius:50%;top:50%;left:50%;transform:translate(-50%,-50%);background:currentColor;opacity:.35}' +
    '.fps-bi{display:inline-block;width:10px;height:10px;border-radius:3px;border:1px solid;vertical-align:middle;box-sizing:border-box}' +
    '.fps-cr{display:flex;align-items:center;justify-content:center;gap:10px;margin:2px 0;flex-wrap:wrap}' +
    '.fps-ci{display:flex;align-items:center;gap:4px;font-size:5px;color:#c8d8e8;white-space:nowrap}' +
    '.fps-logo{background:rgba(10,15,25,0.7);border-top:2px solid #00e5ff;border-bottom:2px solid #00e5ff;padding:12px 28px 10px;text-align:center}' +
    '.fps-logo-t{font-size:18px;color:#00e5ff;text-shadow:0 0 8px #00e5ff80,0 0 18px #00e5ff40;letter-spacing:8px}' +
    '.fps-logo-sep{width:50%;height:1px;background:linear-gradient(90deg,transparent,#ff006060,transparent);margin:8px auto 6px}' +
    '.fps-logo-sub{font-size:4px;color:#ff0060;letter-spacing:2px;opacity:.65}' +
    '.fps-hud-hint{position:absolute;bottom:3px;right:4px;display:none;align-items:center;gap:3px;font-family:"Press Start 2P",monospace;font-size:4px;opacity:.3}.fps-hud-hint.on{display:flex}' +
    '.fps-wave-title{font-size:14px;color:#00e5ff;text-shadow:0 0 10px #00e5ff;animation:fpsSlideIn 0.5s ease-out}' +
    '.fps-wave-sub{font-size:6px;color:#ff0060;margin-top:6px;animation:fpsSlideIn 0.5s ease-out 0.2s both}' +
    '.fps-wave-info{font-size:4px;color:#c8d8e8;margin-top:4px;opacity:.7;animation:fpsSlideIn 0.5s ease-out 0.4s both}' +
    '.fps-stats{font-size:5px;color:#c8d8e8;margin-top:10px;line-height:2}.fps-stats b{color:#00e5ff}';
  document.head.appendChild(_ovCss);
  function _mkScr(){var d=document.createElement('div');d.className='fps-scr';_ov.appendChild(d);return d;}
  function _pcControls(){return '<div class="fps-cr"><div class="fps-ci"><span class="fps-key">W</span><span class="fps-key">A</span><span class="fps-key">S</span><span class="fps-key">D</span> MOVE</div><div class="fps-ci"><span class="fps-key" style="font-size:4px">MOUSE</span> LOOK</div></div><div class="fps-cr"><div class="fps-ci"><span class="fps-key" style="font-size:4px">CLICK</span> SHOOT</div><div class="fps-ci"><span class="fps-key" style="font-size:4px">SPACE</span> JUMP/JET</div><div class="fps-ci"><span class="fps-key">Q</span> DASH</div><div class="fps-ci"><span class="fps-key">E</span> GRAPPLE</div></div><div class="fps-cr"><div class="fps-ci"><span class="fps-key">1</span><span class="fps-key">2</span><span class="fps-key">3</span> WEAPONS</div></div>';}
  function _mobControls(){return '<div class="fps-cr"><div class="fps-ci"><span class="fps-si" style="color:#00e5ff;border-color:rgba(0,229,255,0.45)"></span> MOVE</div><div class="fps-ci"><span class="fps-si" style="color:#ff0060;border-color:rgba(255,0,96,0.45)"></span> LOOK</div></div><div class="fps-cr"><div class="fps-ci"><span class="fps-bi" style="border-color:#ff3c3c;background:rgba(255,60,60,0.15)"></span> FIRE</div><div class="fps-ci"><span class="fps-bi" style="border-color:#00e5ff;background:rgba(0,229,255,0.15)"></span> JUMP</div><div class="fps-ci"><span class="fps-bi" style="border-color:#ff0060;background:rgba(255,0,96,0.15)"></span> DASH</div></div>';}
  var _scrTitle=_mkScr();
  _scrTitle.innerHTML='<div class="fps-logo"><div class="fps-logo-t">GEKKO</div><div class="fps-logo-sep"></div><div class="fps-logo-sub">SKY CITY ARENA</div></div><div style="flex:1 0 14px;max-height:28px"></div><div class="fps-blink" style="font-size:8px;color:#fff"></div><div style="flex:1 0 10px;max-height:20px"></div><div style="opacity:.6"></div>';
  var _titlePrompt=_scrTitle.children[2],_titleCtrls=_scrTitle.children[4];
  var _scrWave=_mkScr();_scrWave.style.background='rgba(5,10,20,0.85)';
  _scrWave.innerHTML='<div class="fps-wave-title"></div><div class="fps-wave-sub"></div><div class="fps-wave-info"></div>';
  var _scrPause=_mkScr();
  _scrPause.innerHTML='<div style="font-size:14px;color:#00e5ff;text-shadow:0 0 6px #00e5ff80">PAUSED</div><div class="fps-blink" style="font-size:7px;color:#fff;margin:14px 0 10px"></div><div style="display:flex;gap:8px;justify-content:center;margin-bottom:10px"></div><div style="opacity:.55"></div>';
  var _pausePrompt=_scrPause.children[1],_pauseMenu=_scrPause.children[2],_pauseCtrls=_scrPause.children[3];
  var _btnStyle='font-size:6px;padding:3px 8px;cursor:pointer;border:1px solid;border-radius:2px;user-select:none;';
  var _btnDebug=document.createElement('div');
  _btnDebug.style.cssText=_btnStyle+'color:#0ae;border-color:#0ae;';
  _btnDebug.textContent='DEBUG';
  _btnDebug.addEventListener('mousedown',function(e){e.stopPropagation();e.preventDefault();debugMode=!debugMode;_btnDebug.style.background=debugMode?'rgba(0,170,238,0.3)':'';});
  var _btnReset=document.createElement('div');
  _btnReset.style.cssText=_btnStyle+'color:#f44;border-color:#f44;';
  _btnReset.textContent='RESET';
  _btnReset.addEventListener('mousedown',function(e){e.stopPropagation();e.preventDefault();gameState='title';_ovActive='';updateOverlay();});
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
  // Click on pause screen (non-button area) resumes the game
  _scrPause.addEventListener('mousedown',function(e){
    if(e.target===_btnDebug||e.target===_btnAI||e.target===_btnReset)return;
    if(!isMobileFps)canvas.requestPointerLock();
  });
  var _scrWin=_mkScr();_scrWin.style.background='rgba(0,10,20,0.8)';
  _scrWin.innerHTML='<div style="font-size:16px;color:#00e5ff;text-shadow:0 0 10px #00e5ff,0 0 20px #00e5ff60">YOU WIN!</div><div class="fps-stats"></div><div class="fps-blink" style="font-size:7px;color:#fff;margin-top:16px"></div>';
  var _winStats=_scrWin.children[1],_winPrompt=_scrWin.children[2];
  var _scrDead=_mkScr();_scrDead.style.background='rgba(20,0,0,0.8)';
  _scrDead.innerHTML='<div style="font-size:14px;color:#ff3c3c;text-shadow:0 0 10px #ff3c3c80">GAME OVER</div><div class="fps-stats"></div><div class="fps-blink" style="font-size:7px;color:#fff;margin-top:16px"></div>';
  var _deadStats=_scrDead.children[1],_deadPrompt=_scrDead.children[2];
  var _hudHint=document.createElement('div');_hudHint.className='fps-hud-hint';
  _hudHint.innerHTML='<span class="fps-key" style="font-size:4px;padding:1px 3px">ESC</span><span style="color:#c8d8e8">PAUSE</span>';
  _ov.appendChild(_hudHint);
  var _ovActive='';
  function updateOverlay(){
    var isPaused=gameState==='playing'&&!pointerLocked&&!isMobileFps;
    var scr='none';
    if(gameState==='title')scr='title';
    else if(gameState==='playing'&&waveAnnounceTimer>0)scr='wave';
    else if(isPaused)scr='pause';
    else if(gameState==='win')scr='win';
    else if(gameState==='gameover')scr='dead';
    _hudHint.className='fps-hud-hint'+((gameState==='playing'&&pointerLocked&&!isMobileFps)?' on':'');
    if(scr===_ovActive)return;_ovActive=scr;
    // Enable pointer-events on overlay when pause screen is active (for buttons)
    _ov.style.pointerEvents=scr==='pause'?'auto':'none';
    _scrTitle.className='fps-scr'+(scr==='title'?' on':'');
    _scrWave.className='fps-scr'+(scr==='wave'?' on':'');
    _scrPause.className='fps-scr'+(scr==='pause'?' on':'');
    _scrWin.className='fps-scr'+(scr==='win'?' on':'');
    _scrDead.className='fps-scr'+(scr==='dead'?' on':'');
    if(scr==='title'){_titlePrompt.textContent=isMobileFps?'TAP TO START':'CLICK TO START';_titleCtrls.innerHTML=isMobileFps?_mobControls():_pcControls();}
    if(scr==='pause'){_pausePrompt.textContent='CLICK TO RESUME';_pauseCtrls.innerHTML=_pcControls();_btnDebug.style.background=debugMode?'rgba(0,170,238,0.3)':'';_btnAI.style.background=aiMode?'rgba(0,255,136,0.3)':'';}
    if(scr==='win'){_winPrompt.textContent='';_winPrompt.style.display='none';}
    if(scr==='dead'){_deadPrompt.textContent='';_deadPrompt.style.display='none';}
  }
  function updateOverlayPrompts(){
    if(gameState==='win'&&stateTimer<=0&&_winPrompt.style.display==='none'){_winPrompt.textContent=isMobileFps?'TAP TO CONTINUE':'CLICK TO CONTINUE';_winPrompt.style.display='';}
    if(gameState==='gameover'&&stateTimer<=0&&_deadPrompt.style.display==='none'){_deadPrompt.textContent=isMobileFps?'TAP TO CONTINUE':'CLICK TO CONTINUE';_deadPrompt.style.display='';}
  }

  // ===== CONSTANTS =====
  var PI=Math.PI,TAU=PI*2,DEG=PI/180;
  var FOV=70*DEG,FOCAL=W/2/Math.tan(FOV/2);
  var NEAR=0.15,FAR_FOG=35;
  var GRAVITY=18,PLAYER_EYE=0.7,PLAYER_R=0.22,PLAYER_H=0.85;
  var WALK_SPD=4.5,AIR_CTRL=8,FRICTION=10;
  var JUMP_VEL=6.5,JET_ACC=26,JET_MAX=1.2;
  var DASH_SPD=15,DASH_T=0.15,DASH_CD=1.2;
  var GRAP_SPD=18,GRAP_RNG=15;
  var WRUN_T=0.5,WRUN_UP=4;
  var MOM_MAX=1.4,MOM_GAIN=0.3,MOM_DECAY=2;
  var SKY_T=[55,130,220],SKY_MID=[140,195,255],SKY_B=[200,225,250],FOG_C=[160,205,245];
  var VOID_Z=-6;
  // Sun direction (normalized) — from east, slightly south, elevated
  var SUN_DIR=[0.62,-0.31,0.72];
  // Per-face directional light multipliers
  var LT_TOP=Math.min(1.15,Math.max(0.45,SUN_DIR[2])*1.3);
  var LT_PX=Math.max(0.35,SUN_DIR[0]);
  var LT_NX=Math.max(0.25,-SUN_DIR[0]);
  var LT_PY=Math.max(0.30,SUN_DIR[1]);
  var LT_NY=Math.max(0.30,-SUN_DIR[1]);
  var LT_BOT=0.2;
  var _time=0; // global time for animations

  // ===== ZBUFFER & FRAMEBUFFER =====
  var zbuf=new Float32Array(W*H);
  var imgData=ctx.createImageData(W,H);
  var pix=imgData.data;

  function clearFrame(){
    zbuf.fill(0);
    for(var y=0;y<H;y++){
      var t=y/H;
      var r,g,b;
      if(t<0.42){var s=t/0.42;r=SKY_T[0]+(SKY_MID[0]-SKY_T[0])*s|0;g=SKY_T[1]+(SKY_MID[1]-SKY_T[1])*s|0;b=SKY_T[2]+(SKY_MID[2]-SKY_T[2])*s|0;}
      else if(t<0.54){var s=(t-0.42)/0.12;r=SKY_MID[0]+(240-SKY_MID[0])*s|0;g=SKY_MID[1]+(240-SKY_MID[1])*s|0;b=SKY_MID[2]+(250-SKY_MID[2])*s|0;}
      else{var s=(t-0.54)/0.46;r=240+(SKY_B[0]-240)*s|0;g=240+(SKY_B[1]-240)*s|0;b=250+(SKY_B[2]-250)*s|0;}
      var base=y*W*4;
      for(var x=0;x<W;x++){var i=base+x*4;pix[i]=r;pix[i+1]=g;pix[i+2]=b;pix[i+3]=255;}
    }
  }

  function renderSun(){
    // Project sun direction to screen
    var sc=w2c(player.x+SUN_DIR[0]*200,player.y+SUN_DIR[1]*200,player.z+PLAYER_EYE+SUN_DIR[2]*200);
    if(sc[1]<1)return;
    var iz=1/sc[1];
    var sx=sc[0]*FOCAL*iz+W*0.5,sy=-sc[2]*FOCAL*iz+H*0.5;
    var R=55;
    var x0=Math.max(0,sx-R|0),x1=Math.min(W-1,sx+R|0);
    var y0=Math.max(0,sy-R|0),y1=Math.min(H-1,sy+R|0);
    for(var y=y0;y<=y1;y++){for(var x=x0;x<=x1;x++){
      var dx=x-sx,dy=y-sy,d=Math.sqrt(dx*dx+dy*dy);
      if(d<R){
        var glow=(1-d/R);glow*=glow*glow;
        var core=d<6?(1-d/6)*0.9:0;
        var corona=d<18?(1-d/18)*0.35:0;
        var intensity=Math.min(1,glow*0.5+core+corona);
        var pi=(y*W+x)<<2;
        pix[pi]=Math.min(255,pix[pi]+intensity*255|0);
        pix[pi+1]=Math.min(255,pix[pi+1]+intensity*230|0);
        pix[pi+2]=Math.min(255,pix[pi+2]+intensity*140|0);
      }
    }}
  }

  // ===== CAMERA =====
  var cCY,cSY,cCP,cSP;
  function camUpdate(){cCY=Math.cos(player.a);cSY=Math.sin(player.a);cCP=Math.cos(player.p);cSP=Math.sin(player.p);}
  function w2c(wx,wy,wz){
    var dx=wx-player.x,dy=wy-player.y,dz=wz-player.z-PLAYER_EYE;
    var cx=dx*cCY-dy*cSY,ty=dx*cSY+dy*cCY;
    return[cx,ty*cCP+dz*cSP,-ty*cSP+dz*cCP];
  }
  function proj(c){if(c[1]<NEAR)return null;var iz=1/c[1];return[c[0]*FOCAL*iz+W*.5,-c[2]*FOCAL*iz+H*.5,iz];}

  // ===== NEAR-PLANE CLIP =====
  function clipNear(a,b,c){
    var vs=[a,b,c],ins=[],out=[];
    for(var i=0;i<3;i++)(vs[i][1]>=NEAR?ins:out).push(vs[i]);
    if(ins.length===3)return[vs];if(!ins.length)return[];
    function lp(u,v){var t=(NEAR-u[1])/(v[1]-u[1]);return[u[0]+t*(v[0]-u[0]),NEAR,u[2]+t*(v[2]-u[2])];}
    if(ins.length===1){var A=ins[0];return[[A,lp(A,out[0]),lp(A,out[1])]];}
    var A=ins[0],B=ins[1],C=out[0];var ac=lp(A,C),bc=lp(B,C);return[[A,B,bc],[A,bc,ac]];
  }

  // ===== TRIANGLE RASTERIZER =====
  function fillTri(p0,p1,p2,cr,cg,cb){
    var t;
    if(p1[1]<p0[1]){t=p0;p0=p1;p1=t;}
    if(p2[1]<p0[1]){t=p0;p0=p2;p2=t;}
    if(p2[1]<p1[1]){t=p1;p1=p2;p2=t;}
    var dy02=p2[1]-p0[1];if(dy02<.5)return;
    var dy01=p1[1]-p0[1],dy12=p2[1]-p1[1];
    var iy0=Math.max(0,Math.ceil(p0[1])),iy2=Math.min(H-1,Math.floor(p2[1]));
    var iy1m=Math.ceil(p1[1]);
    for(var iy=iy0;iy<=iy2;iy++){
      var a02=(iy-p0[1])/dy02;
      var xa=p0[0]+a02*(p2[0]-p0[0]),za=p0[2]+a02*(p2[2]-p0[2]);
      var xb,zb;
      if(iy<iy1m&&dy01>.5){var a01=(iy-p0[1])/dy01;xb=p0[0]+a01*(p1[0]-p0[0]);zb=p0[2]+a01*(p1[2]-p0[2]);}
      else if(dy12>.5){var a12=(iy-p1[1])/dy12;xb=p1[0]+a12*(p2[0]-p1[0]);zb=p1[2]+a12*(p2[2]-p1[2]);}
      else continue;
      if(xa>xb){t=xa;xa=xb;xb=t;t=za;za=zb;zb=t;}
      var ix0=Math.max(0,Math.ceil(xa)),ix1=Math.min(W-1,Math.floor(xb)),dxr=xb-xa;
      for(var ix=ix0;ix<=ix1;ix++){
        var tz=dxr>.5?za+(ix-xa)/dxr*(zb-za):za;
        var bi=iy*W+ix;
        if(tz>zbuf[bi]){
          zbuf[bi]=tz;
          var depth=1/tz,fog=depth<3?0:depth>FAR_FOG?1:(depth-3)/(FAR_FOG-3);
          var pi=bi<<2;
          pix[pi]=cr+(FOG_C[0]-cr)*fog|0;pix[pi+1]=cg+(FOG_C[1]-cg)*fog|0;pix[pi+2]=cb+(FOG_C[2]-cb)*fog|0;
        }
      }
    }
  }

  function fillQuad(c0,c1,c2,c3,cr,cg,cb){
    var ts=clipNear(c0,c1,c2).concat(clipNear(c0,c2,c3));
    for(var i=0;i<ts.length;i++){var a=proj(ts[i][0]),b=proj(ts[i][1]),c=proj(ts[i][2]);if(a&&b&&c)fillTri(a,b,c,cr,cg,cb);}
  }

  // ===== WORLD GENERATION =====
  var platforms=[],decor=[],allGeo=[];
  function genWorld(){
    platforms=[];decor=[];
    function P(x,y,z,w,d,h,tc,sc){platforms.push({x:x,y:y,z:z,w:w,d:d,h:h,t:tc,s:sc});}
    function D(x,y,z,w,d,h,tc,sc){decor.push({x:x,y:y,z:z,w:w,d:d,h:h,t:tc,s:sc});}
    // --- Palette ---
    var S1=[60,75,100],S1s=[42,55,78];
    var S2=[75,92,115],S2s=[55,70,92];
    var S3=[90,108,130],S3s=[68,82,105];
    var BL=[48,58,78],BLs=[32,42,58];
    var NC=[0,200,230],NCs=[0,160,185];
    var NR=[180,40,70],NRs=[140,30,55];
    // Island rock palette
    var ER=[145,118,78],ERs=[115,92,60]; // earth
    var RK=[108,102,94],RKs=[85,80,72]; // rock
    var DR=[75,70,64],DRs=[58,54,48]; // deep rock
    var MS=[55,100,42],MSs=[40,78,28]; // moss
    var GR=[68,115,52],GRs=[52,90,38]; // grass

    // ---- CLOUD FLOOR (decorative) ----
    D(0,0,-4,250,250,0.03,[228,238,250],[210,225,242]);
    D(15,-10,-3.4,55,45,0.03,[238,245,255],[222,238,252]);
    D(-20,18,-3.1,45,38,0.03,[242,250,255],[228,242,254]);
    D(30,25,-3.7,50,35,0.03,[232,240,252],[218,232,248]);

    // ==== ISLAND 0: Central Dock ====
    // Rock base
    D(0,0,-4.2,16,16,1.2,DR,DRs);
    D(0,0,-3,20,20,1,RK,RKs);
    P(0,0,-2,24,24,0.8,ER,ERs);
    P(0,0,-1.2,21,21,0.5,GR,GRs);
    D(-8,7,-1.6,4,4,0.7,MS,MSs);
    D(9,-6,-1.8,3,4,0.6,MS,MSs);
    D(-3,5,-5,0.8,0.8,0.8,DR,DRs); // stalactite
    D(4,-3,-4.8,0.6,0.6,0.6,DR,DRs);
    D(-1,-7,-4.5,0.5,0.5,0.5,RK,RKs);
    // City surface
    P(0,0,-0.5,18,18,0.5,S1,S1s);
    P(-10,10,-0.3,5,5,0.3,S2,S2s);
    P(10,10,-0.3,5,5,0.3,S2,S2s);
    P(-10,-10,-0.3,5,5,0.3,S2,S2s);
    P(10,-10,-0.3,5,5,0.3,S2,S2s);
    // Neon edge lights
    D(0,9,0,18,0.1,0.08,NC,NC);
    D(0,-9,0,18,0.1,0.08,NC,NC);
    D(-9,0,0,0.1,18,0.08,NC,NC);
    D(9,0,0,0.1,18,0.08,NC,NC);
    // --- Central Dock buildings (cover / obstacles) ---
    var WL=[55,62,82],WLs=[38,45,60]; // wall color
    var RF=[72,48,42],RFs=[55,35,30]; // roof color (classic brick-red)
    P(-4,4,0,2.5,2.5,1.8,WL,WLs);   // small house L
    P(-4,4,1.8,2.8,2.8,0.15,RF,RFs); // roof overhang
    P(4,4,0,2.5,2.5,1.8,WL,WLs);    // small house R
    P(4,4,1.8,2.8,2.8,0.15,RF,RFs);
    P(0,-4,0,3,2,1.2,WL,WLs);       // low wall (cover)
    P(-6,-2,0,1.5,4,2.2,WL,WLs);    // tall tower L
    P(-6,-2,2.2,1.8,4.3,0.15,RF,RFs);
    P(6,-2,0,1.5,4,2.2,WL,WLs);     // tall tower R
    P(6,-2,2.2,1.8,4.3,0.15,RF,RFs);
    D(-4,4,1.4,0.6,0.05,0.35,NC,NC); // window glow
    D(4,4,1.4,0.6,0.05,0.35,NC,NC);
    D(-6,-2,1.6,0.05,0.6,0.4,NR,NR);
    D(6,-2,1.6,0.05,0.6,0.4,NR,NR);
    // Steps up
    P(-5,11,0.8,3,2,0.2,S3,S3s);
    P(5,11,0.8,3,2,0.2,S3,S3s);
    P(0,-11,0.8,3,2,0.2,S3,S3s);
    P(-8,5,1.5,2.5,2.5,0.2,S3,S3s);
    P(8,5,1.5,2.5,2.5,0.2,S3,S3s);
    P(0,-7,1.5,2.5,2.5,0.2,S3,S3s);

    // ==== ISLAND 1A: Market NW ====
    D(-7,17,-1.5,10,8,0.8,DR,DRs);
    D(-7,17,-0.7,14,12,0.7,RK,RKs);
    P(-7,17,0,16,14,0.5,ER,ERs);
    P(-7,17,0.5,12,10,0.4,GR,GRs);
    D(-10,21,-2,2,2,0.7,DR,DRs);
    P(-7,17,2.8,10,8,0.6,S2,S2s);
    P(-9,18,3.4,2,2,3,BL,BLs);
    P(-5,15,3.4,1.5,1.5,2,BL,BLs);
    D(-9,17,5.5,2.5,0.15,0.8,NC,NC);
    // 1A buildings
    P(-8,19,3.4,2,2,1.5,WL,WLs);    // shop block
    P(-8,19,4.9,2.3,2.3,0.15,RF,RFs);
    P(-5,17,3.4,1.5,3,1.0,WL,WLs);  // low wall
    D(-8,19,4.2,0.05,0.5,0.3,NC,NC);

    // ==== ISLAND 1B: Market NE ====
    D(7,17,-1.2,10,8,0.7,DR,DRs);
    D(7,17,-0.5,14,12,0.6,RK,RKs);
    P(7,17,0.1,15,13,0.5,ER,ERs);
    P(7,17,0.6,11,9,0.4,GR,GRs);
    D(10,21,-1.8,1.5,1.5,0.6,DR,DRs);
    P(7,17,3,10,8,0.6,S2,S2s);
    P(9,18,3.6,2,2,2.5,BL,BLs);
    D(9,17,5.2,2.5,0.15,0.8,NR,NR);
    // 1B buildings
    P(8,19,3.6,2,2,1.5,WL,WLs);
    P(8,19,5.1,2.3,2.3,0.15,RF,RFs);
    P(6,16,3.6,3,1.5,1.0,WL,WLs);
    D(8,19,4.4,0.5,0.05,0.3,NR,NR);

    // ==== ISLAND 1C: Market South ====
    D(0,-17,-1,12,8,0.8,DR,DRs);
    D(0,-17,-0.2,16,12,0.6,RK,RKs);
    P(0,-17,0.4,18,14,0.5,ER,ERs);
    P(0,-17,0.9,14,10,0.4,GR,GRs);
    D(3,-21,-1.5,1.5,1.5,0.6,DR,DRs);
    P(0,-17,3.2,12,8,0.6,S2,S2s);
    P(2,-18,3.8,2,2,2.5,BL,BLs);
    // 1C buildings
    P(-2,-16,3.8,2.5,2,1.8,WL,WLs);
    P(-2,-16,5.6,2.8,2.3,0.15,RF,RFs);
    P(2,-19,3.8,1.5,2.5,1.0,WL,WLs);
    D(-2,-16,5.0,0.05,0.5,0.3,NC,NC);

    // ==== ISLAND 1D: Market West ====
    D(-16,0,-0.8,8,10,0.6,DR,DRs);
    D(-16,0,-0.2,12,14,0.5,RK,RKs);
    P(-16,0,0.3,14,16,0.5,ER,ERs);
    P(-16,0,0.8,10,12,0.35,GR,GRs);
    P(-16,0,3.5,8,10,0.6,S2,S2s);
    P(-18,2,4.1,2,2,3,BL,BLs);
    D(-18,1,6.0,0.15,2.5,0.8,NC,NC);
    // 1D buildings
    P(-15,2,4.1,2,2,1.5,WL,WLs);
    P(-15,2,5.6,2.3,2.3,0.15,RF,RFs);
    P(-17,-2,4.1,1.5,3,1.0,WL,WLs);

    // ==== ISLAND 1E: Market East ====
    D(16,0,-0.8,8,10,0.6,DR,DRs);
    D(16,0,-0.2,12,14,0.5,RK,RKs);
    P(16,0,0.3,14,16,0.5,ER,ERs);
    P(16,0,0.8,10,12,0.35,GR,GRs);
    P(16,0,3,8,10,0.6,S2,S2s);
    P(18,-2,3.6,2,2,2,BL,BLs);
    // 1E buildings
    P(15,-2,3.6,2,2,1.5,WL,WLs);
    P(15,-2,5.1,2.3,2.3,0.15,RF,RFs);
    P(17,2,3.6,1.5,3,1.0,WL,WLs);

    // Market bridges
    P(0,17,2.9,4,2,0.2,S3,S3s);
    P(-11,8,2.2,2,5,0.2,S3,S3s);
    P(11,8,2.0,2,5,0.2,S3,S3s);
    P(-11,-8,2.5,2,5,0.2,S3,S3s);
    P(11,-8,2.2,2,5,0.2,S3,S3s);
    // Steps L1->L2
    P(-10,14,4.5,2,2,0.2,S3,S3s);
    P(10,14,4.5,2,2,0.2,S3,S3s);
    P(0,-14,4.8,2,2,0.2,S3,S3s);
    P(-14,5,5.2,2,2,0.2,S3,S3s);
    P(14,5,5.0,2,2,0.2,S3,S3s);
    P(-6,10,5.5,2,2,0.2,S3,S3s);
    P(6,10,5.5,2,2,0.2,S3,S3s);

    // ==== ISLANDS 2: Tower level ====
    // Tower NW
    D(-10,18,3.5,10,10,1.2,DR,DRs);
    D(-10,18,4.7,8,8,0.8,RK,RKs);
    P(-10,18,5.5,7,7,0.5,ER,ERs);
    P(-10,18,6,6.5,6.5,0.3,GR,GRs);
    P(-10,18,6.8,6,6,0.4,S3,S3s);
    // Tower NE
    D(10,18,4,10,10,1.2,DR,DRs);
    D(10,18,5.2,8,8,0.8,RK,RKs);
    P(10,18,6,7,7,0.5,ER,ERs);
    P(10,18,6.5,6.5,6.5,0.3,GR,GRs);
    P(10,18,7.2,6,6,0.4,S3,S3s);
    // Tower S
    D(0,-18,3.8,11,10,1.2,DR,DRs);
    D(0,-18,5,9,8,0.8,RK,RKs);
    P(0,-18,5.8,8,7,0.5,ER,ERs);
    P(0,-18,6.3,7.5,6.5,0.3,GR,GRs);
    P(0,-18,7.0,7,6,0.4,S3,S3s);
    // Tower W
    D(-18,0,4.2,10,11,1.2,DR,DRs);
    D(-18,0,5.4,8,9,0.8,RK,RKs);
    P(-18,0,6.2,7,8,0.5,ER,ERs);
    P(-18,0,6.7,6.5,7.5,0.3,GR,GRs);
    P(-18,0,7.5,6,7,0.4,S3,S3s);
    // Tower E
    D(18,0,3.5,10,11,1.2,DR,DRs);
    D(18,0,4.7,8,9,0.8,RK,RKs);
    P(18,0,5.5,7,8,0.5,ER,ERs);
    P(18,0,6,6.5,7.5,0.3,GR,GRs);
    P(18,0,6.8,6,7,0.4,S3,S3s);
    // Catwalks
    P(0,18,7.0,14,1.2,0.15,NC,NCs);
    P(-14,9,7.3,1.2,12,0.15,NC,NCs);
    P(14,9,7.0,1.2,12,0.15,NC,NCs);
    // Steps L2->L3
    P(-5,8,8.0,2,2,0.2,S3,S3s);
    P(5,8,8.0,2,2,0.2,S3,S3s);
    P(0,-5,8.5,2,2,0.2,S3,S3s);
    P(-3,3,9.0,2,2,0.2,S3,S3s);
    P(3,3,9.0,2,2,0.2,S3,S3s);

    // ==== ISLAND 3: Spire (Boss) ====
    D(0,0,5,18,18,1.5,DR,DRs);
    D(0,0,6.5,22,22,1,RK,RKs);
    P(0,0,7.5,19,19,0.8,ER,ERs);
    P(0,0,8.3,16,16,0.5,GR,GRs);
    D(-2,4,4.5,0.8,0.8,0.8,DR,DRs);
    D(5,-3,4.2,0.6,0.6,0.6,RK,RKs);
    P(0,0,9.8,14,14,0.6,S1,S1s);
    P(-5,-5,10.4,1.5,1.5,3,BL,BLs);
    P(5,-5,10.4,1.5,1.5,3,BL,BLs);
    P(-5,5,10.4,1.5,1.5,3,BL,BLs);
    P(5,5,10.4,1.5,1.5,3,BL,BLs);
    // Boss arena cover pillars
    P(-3,0,10.4,1.2,1.2,2,BL,BLs);
    P(3,0,10.4,1.2,1.2,2,BL,BLs);
    P(0,-3,10.4,1.2,1.2,2,BL,BLs);
    P(0,3,10.4,1.2,1.2,2,BL,BLs);
    // Boss arena neon edges
    D(0,7,10.4,14,0.1,0.08,NR,NR);
    D(0,-7,10.4,14,0.1,0.08,NR,NR);
    D(-7,0,10.4,0.1,14,0.08,NR,NR);
    D(7,0,10.4,0.1,14,0.08,NR,NR);

    // Decorative pillars
    D(-13,13,0,1.2,1.2,7,BL,BLs);
    D(13,13,0,1.2,1.2,7.5,BL,BLs);
    D(13,-13,0,1.2,1.2,7,BL,BLs);
    D(-13,-13,0,1.2,1.2,7.2,BL,BLs);

    // Floating debris
    D(22,22,5,2.5,2,0.35,RK,RKs);
    D(-24,14,8,1.8,1.5,0.25,RK,RKs);
    D(26,-20,4,3,2,0.3,ER,ERs);
    D(-22,-22,6.5,2,2,0.3,RK,RKs);
    D(16,-26,3.5,2.5,1.8,0.25,ER,ERs);
    D(-26,6,7.5,1.8,2.2,0.3,MS,MSs);
    D(6,27,9.5,1.5,1.5,0.2,RK,RKs);
    D(-9,-26,5,2.2,1.8,0.25,MS,MSs);
    // Distant floating islands (far background)
    D(50,40,6,8,6,2,RK,RKs);
    D(50,40,8,6,4,1,ER,ERs);
    D(50,40,9,4,3,0.5,GR,GRs);
    D(-45,-35,4,7,5,1.5,RK,RKs);
    D(-45,-35,5.5,5,4,1,ER,ERs);
    D(-45,-35,6.5,3.5,3,0.4,GR,GRs);
    D(-40,45,8,6,5,1.5,DR,DRs);
    D(-40,45,9.5,4,3.5,0.8,RK,RKs);
    D(45,-40,3,5,4,1.2,RK,RKs);
    D(45,-40,4.2,3.5,3,0.6,ER,ERs);

    // --- Scale outer islands outward (1.4x) ---
    var _ms=1.4;
    function _scaleArr(arr){for(var i=0;i<arr.length;i++){var a=arr[i];if(Math.abs(a.x)>12||Math.abs(a.y)>12){a.x*=_ms;a.y*=_ms;}}}
    _scaleArr(platforms);_scaleArr(decor);
    // --- Long connecting bridges (post-scale coords) ---
    // Dock↔Market bridges (at low height, wide enough to span gap)
    P(0,15,0.8,3,14,0.2,S3,S3s);       // Dock→N
    P(0,-15,0.8,3,14,0.2,S3,S3s);      // Dock→S
    P(-15,0,1.2,14,3,0.2,S3,S3s);      // Dock→W
    P(15,0,1.2,14,3,0.2,S3,S3s);       // Dock→E
    // Market cross bridges (wider to span scaled gap)
    P(0,23.8,2.9,24,2.5,0.2,S3,S3s);   // Market NW↔NE
    // Tower catwalks (wider)
    P(0,27,7.0,34,1.5,0.15,NC,NCs);    // Tower NW↔NE
    P(-22,14,7.2,1.5,30,0.15,NC,NCs);  // Tower W↔NW
    P(22,14,7.0,1.5,30,0.15,NC,NCs);   // Tower E↔NE

    allGeo=platforms.concat(decor);
  }

  // ===== GAME STATE =====
  var gameState='title',stateTimer=0,pointerLocked=false;
  var isMobileFps=(('ontouchstart' in window)||navigator.maxTouchPoints>0)&&window.innerWidth<600;
  var waveAnnounceTimer=0;
  var score=0,combo=0,comboTimer=0,maxCombo=0,totalKills=0,gameTime=0;
  var currentWave=0,totalWaves=5;
  var screenShake=0,dmgFlash=0,speedLines=0,grappleInRange=false;
  var debugMode=false,debugFps=0,debugFrames=0,debugFpsTimer=0;
  var spJustPressed=false,recentJet=0,jetCutoff=false;
  var aiMode=false,aiTarget=null,aiTimer=0,aiState='explore',aiLog=[];
  var keys={w:false,a:false,s:false,d:false,sp:false,q:false,e:false};
  var mouseX=0,mouseY=0,mouseDown=false;
  var weaponIdx=0;

  // ===== PLAYER =====
  var player={x:0,y:0,z:0.5,vx:0,vy:0,vz:0,a:0,p:0,
    hp:100,maxHp:100,grounded:false,iFrames:0,
    jetFuel:JET_MAX,jumpCD:0,dashCD:0,dashTimer:0,dashDx:0,dashDy:0,
    mom:1,grappling:false,grapX:0,grapY:0,grapZ:0,
    wallrunTimer:0,wallrunSide:0,wallrunNx:0,wallrunNy:0,
    bobPhase:0,lastGroundZ:0};

  function resetPlayer(){
    player.x=0;player.y=0;player.z=0.5;player.vx=0;player.vy=0;player.vz=0;
    player.a=0;player.p=0;player.hp=100;player.grounded=false;player.iFrames=0;
    player.jetFuel=JET_MAX;player.jumpCD=0;player.dashCD=0;player.dashTimer=0;
    player.mom=1;player.grappling=false;player.wallrunTimer=0;
    player.bobPhase=0;player.lastGroundZ=0;
  }

  function respawnPlayer(){
    player.x=0;player.y=0;player.z=0.5;player.vx=0;player.vy=0;player.vz=0;
    player.grappling=false;player.wallrunTimer=0;player.dashTimer=0;
    player.jetFuel=JET_MAX;player.jumpCD=0;
  }

  // ===== WEAPONS =====
  // 0=Blaster, 1=Charger, 2=Scatter
  var weapons=[
    {name:'BLASTER',cd:0.25,dmg:20,ammo:Infinity,maxAmmo:Infinity,spread:0.02,count:1,speed:40,color:[0,229,255],timer:0},
    {name:'CHARGER',cd:0.8,dmg:60,ammo:15,maxAmmo:15,spread:0.01,count:1,speed:50,color:[255,200,0],timer:0},
    {name:'SCATTER',cd:0.5,dmg:10,ammo:30,maxAmmo:30,spread:0.12,count:5,speed:35,color:[255,80,80],timer:0}
  ];

  function refillAmmo(){for(var i=0;i<weapons.length;i++){weapons[i].ammo=weapons[i].maxAmmo;weapons[i].timer=0;}}

  // ===== BULLETS =====
  var bullets=[],enemyBullets=[];
  function spawnBullet(arr,x,y,z,dx,dy,dz,spd,dmg,col,life){
    arr.push({x:x,y:y,z:z,dx:dx,dy:dy,dz:dz,spd:spd,dmg:dmg,col:col,life:life||2});
  }

  function playerShoot(){
    var w=weapons[weaponIdx];
    if(w.timer>0||w.ammo<=0)return;
    w.timer=w.cd;
    if(w.ammo!==Infinity)w.ammo--;
    var fwd=[Math.sin(player.a)*Math.cos(player.p),Math.cos(player.a)*Math.cos(player.p),Math.sin(player.p)];
    var rt=[Math.cos(player.a),-(Math.sin(player.a)),0];
    var up=[0,0,1]; // simplified
    var ox=player.x+rt[0]*0.15,oy=player.y+rt[1]*0.15,oz=player.z+PLAYER_EYE-0.05;
    for(var i=0;i<w.count;i++){
      var sx=(Math.random()-0.5)*w.spread,sy=(Math.random()-0.5)*w.spread;
      var dx=fwd[0]+rt[0]*sx+up[0]*sy,dy=fwd[1]+rt[1]*sx+up[1]*sy,dz=fwd[2]+rt[2]*sx+up[2]*sy;
      var len=Math.sqrt(dx*dx+dy*dy+dz*dz);dx/=len;dy/=len;dz/=len;
      spawnBullet(bullets,ox,oy,oz,dx,dy,dz,w.speed,w.dmg,w.color,1.5);
    }
    playSound('shoot'+weaponIdx);
    screenShake=Math.max(screenShake,weaponIdx===1?3:1.5);
  }

  // ===== COLLISION =====
  function resolvePhysics(dt){
    // Gravity
    player.vz-=GRAVITY*dt;

    // Movement input
    var mx=0,my=0;
    if(keys.w){mx+=Math.sin(player.a);my+=Math.cos(player.a);}
    if(keys.s){mx-=Math.sin(player.a);my-=Math.cos(player.a);}
    if(keys.a){mx-=Math.cos(player.a);my+=Math.sin(player.a);}
    if(keys.d){mx+=Math.cos(player.a);my-=Math.sin(player.a);}
    var mlen=Math.sqrt(mx*mx+my*my);
    var moving=mlen>0.01;
    if(moving){mx/=mlen;my/=mlen;}

    // Dash
    if(player.dashTimer>0){
      player.dashTimer-=dt;
      player.vx=player.dashDx*DASH_SPD;
      player.vy=player.dashDy*DASH_SPD;
      speedLines=1;
    }else{
      speedLines*=Math.max(0,1-4*dt);
      // Normal movement
      var spd=WALK_SPD*player.mom;
      if(player.grounded){
        if(moving){player.vx=mx*spd;player.vy=my*spd;}
        else{player.vx*=Math.max(0,1-FRICTION*dt);player.vy*=Math.max(0,1-FRICTION*dt);}
      }else{
        // Air control
        if(moving){player.vx+=mx*AIR_CTRL*dt;player.vy+=my*AIR_CTRL*dt;}
        var hspd=Math.sqrt(player.vx*player.vx+player.vy*player.vy);
        var maxS=spd*1.5;
        if(hspd>maxS){player.vx*=maxS/hspd;player.vy*=maxS/hspd;}
      }
    }

    // Jump (edge-detected — suppressed if recently jetting)
    if(player.jumpCD>0)player.jumpCD-=dt;
    if(recentJet>0)recentJet-=dt;
    if(spJustPressed){
      spJustPressed=false;
      if(player.grounded&&player.jumpCD<=0&&recentJet<=0){
        player.vz=JUMP_VEL;player.grounded=false;player.jumpCD=0.15;playSound('jump');
      }
    }

    // Fuel cutoff: once fuel hits 0 while holding Space, require release to re-engage
    if(!keys.sp)jetCutoff=false;
    if(player.jetFuel<=0&&keys.sp)jetCutoff=true;

    // Jetpack (hold Space, consumes fuel — works on ground AND air)
    var jetting=keys.sp&&player.jetFuel>0&&!player.grappling&&player.jumpCD<=0&&!jetCutoff;
    if(jetting){
      recentJet=0.4; // suppress jump for 0.4s after jetting
      if(player.grounded){
        player.vz=2;player.grounded=false;
      }
      // Continuous upward thrust (JET_ACC=26 > GRAVITY=18 → net +8 up)
      player.vz+=JET_ACC*dt;
      var jetMaxVZ=5;
      if(player.vz>jetMaxVZ)player.vz=jetMaxVZ;
      player.jetFuel-=dt;
      if(player.jetFuel<0)player.jetFuel=0;
      // Fire particles (orange-red, downward)
      if(Math.random()<0.6){
        addParticle(player.x+(Math.random()-0.5)*0.15,player.y+(Math.random()-0.5)*0.15,player.z-0.05,
          (Math.random()-0.5)*1,(Math.random()-0.5)*1,-3-Math.random()*3,
          255,120+Math.random()*80|0,0,0.15+Math.random()*0.1,0.5+Math.random()*0.3);
      }
      // Smoke particles (grey, wider spread, slower)
      if(Math.random()<0.3){
        addParticle(player.x+(Math.random()-0.5)*0.3,player.y+(Math.random()-0.5)*0.3,player.z-0.1,
          (Math.random()-0.5)*2,(Math.random()-0.5)*2,-1.5-Math.random()*1,
          160,160,170,0.25+Math.random()*0.15,0.6+Math.random()*0.4);
      }
      // Jet sound (periodic bursts)
      if(Math.random()<0.15)playSound('jet');
    }
    // Refuel on ground (only when NOT jetting)
    if(player.grounded&&!jetting){
      player.jetFuel=Math.min(JET_MAX,player.jetFuel+JET_MAX*0.8*dt);
    }

    // Grapple
    if(player.grappling){
      var gx=player.grapX-player.x,gy=player.grapY-player.y,gz=player.grapZ-player.z;
      var gd=Math.sqrt(gx*gx+gy*gy+gz*gz);
      if(gd<1.5){player.grappling=false;}
      else{
        // Check for obstacles between player and grapple point
        var gdx=gx/gd,gdy=gy/gd,gdz=gz/gd;
        var gBlocked=false;
        for(var gi=0;gi<platforms.length;gi++){
          var gpl=platforms[gi],ghw=gpl.w/2,ghd=gpl.d/2;
          // Skip the platform the player is standing on (its top is at/below player feet)
          var gplTop=gpl.z+gpl.h;
          if(gplTop<=player.z+0.1&&gplTop>=player.z-0.3)continue;
          var ox=player.x,oy=player.y,oz=player.z+PLAYER_EYE;
          var gtmin=0,gtmax=gd;
          var gdims=[[ox,gdx,gpl.x-ghw,gpl.x+ghw],[oy,gdy,gpl.y-ghd,gpl.y+ghd],[oz,gdz,gpl.z,gplTop]];
          var gvalid=true;
          for(var gdi=0;gdi<3;gdi++){
            var go=gdims[gdi][0],gdir=gdims[gdi][1],gmn=gdims[gdi][2],gmx=gdims[gdi][3];
            if(Math.abs(gdir)<0.0001){if(go<gmn||go>gmx){gvalid=false;break;}}
            else{var gt1=(gmn-go)/gdir,gt2=(gmx-go)/gdir;if(gt1>gt2){var gtmp=gt1;gt1=gt2;gt2=gtmp;}
              gtmin=Math.max(gtmin,gt1);gtmax=Math.min(gtmax,gt2);if(gtmin>gtmax){gvalid=false;break;}}
          }
          if(gvalid&&gtmin>1.0&&gtmin<gd-1.0){gBlocked=true;break;}
        }
        if(gBlocked){
          // Obstacle between player and hook → release grapple
          player.grappling=false;
        }else{
          gx/=gd;gy/=gd;gz/=gd;player.vx=gx*GRAP_SPD;player.vy=gy*GRAP_SPD;player.vz=gz*GRAP_SPD*0.7;
        }
      }
    }

    // Wallrun detection
    if(!player.grounded&&player.wallrunTimer<=0&&player.vz<0){
      for(var i=0;i<platforms.length;i++){
        var pl=platforms[i];if(pl.h<0.5)continue;
        var hw=pl.w/2,hd=pl.d/2;
        var pTop=pl.z+pl.h,pBot=pl.z;
        if(player.z+PLAYER_EYE<pBot||player.z>pTop)continue;
        // Check proximity to sides
        var dists=[
          {d:Math.abs(player.x-(pl.x-hw)),nx:-1,ny:0},
          {d:Math.abs(player.x-(pl.x+hw)),nx:1,ny:0},
          {d:Math.abs(player.y-(pl.y-hd)),nx:0,ny:-1},
          {d:Math.abs(player.y-(pl.y+hd)),nx:0,ny:1}
        ];
        for(var j=0;j<4;j++){
          if(dists[j].d<PLAYER_R+0.15){
            var along=dists[j].nx===0?Math.abs(player.vx):Math.abs(player.vy);
            if(along>1){
              player.wallrunTimer=WRUN_T;player.wallrunNx=dists[j].nx;player.wallrunNy=dists[j].ny;
              player.vz=WRUN_UP;
              playSound('wallrun');
              break;
            }
          }
        }
        if(player.wallrunTimer>0)break;
      }
    }
    if(player.wallrunTimer>0){
      player.wallrunTimer-=dt;
      player.vz=WRUN_UP*(player.wallrunTimer/WRUN_T);
    }

    // Momentum
    if(moving&&player.grounded)player.mom=Math.min(MOM_MAX,player.mom+MOM_GAIN*dt);
    else if(!moving)player.mom=Math.max(1,player.mom-MOM_DECAY*dt);

    // Dash cooldown
    if(player.dashCD>0)player.dashCD-=dt;

    // Camera bob
    if(player.grounded&&moving)player.bobPhase+=dt*10;
    else player.bobPhase*=0.9;

    // --- COLLISION RESOLUTION ---
    // Move X
    var xyPushed=false;
    player.x+=player.vx*dt;
    for(var i=0;i<platforms.length;i++){
      var pl=platforms[i],hw=pl.w/2,hd=pl.d/2;
      if(player.z+PLAYER_H<=pl.z||player.z>=pl.z+pl.h)continue;
      if(player.x+PLAYER_R>pl.x-hw&&player.x-PLAYER_R<pl.x+hw&&
         player.y+PLAYER_R>pl.y-hd&&player.y-PLAYER_R<pl.y+hd){
        if(player.vx>0)player.x=pl.x-hw-PLAYER_R;
        else if(player.vx<0)player.x=pl.x+hw+PLAYER_R;
        else player.x=(player.x<pl.x)?pl.x-hw-PLAYER_R:pl.x+hw+PLAYER_R;
        player.vx=0;xyPushed=true;
      }
    }
    // Move Y
    player.y+=player.vy*dt;
    for(var i=0;i<platforms.length;i++){
      var pl=platforms[i],hw=pl.w/2,hd=pl.d/2;
      if(player.z+PLAYER_H<=pl.z||player.z>=pl.z+pl.h)continue;
      if(player.x+PLAYER_R>pl.x-hw&&player.x-PLAYER_R<pl.x+hw&&
         player.y+PLAYER_R>pl.y-hd&&player.y-PLAYER_R<pl.y+hd){
        if(player.vy>0)player.y=pl.y-hd-PLAYER_R;
        else if(player.vy<0)player.y=pl.y+hd+PLAYER_R;
        else player.y=(player.y<pl.y)?pl.y-hd-PLAYER_R:pl.y+hd+PLAYER_R;
        player.vy=0;xyPushed=true;
      }
    }
    // Move Z
    var prevZ=player.z;
    var preVz=player.vz; // store for inertia bounce
    player.z+=player.vz*dt;
    player.grounded=false;
    for(var i=0;i<platforms.length;i++){
      var pl=platforms[i],hw=pl.w/2,hd=pl.d/2;
      if(player.x+PLAYER_R<=pl.x-hw||player.x-PLAYER_R>=pl.x+hw)continue;
      if(player.y+PLAYER_R<=pl.y-hd||player.y-PLAYER_R>=pl.y+hd)continue;
      var pTop=pl.z+pl.h;
      // Landing on top
      if(player.vz<=0&&player.z<pTop&&prevZ>=pTop-0.1){
        player.z=pTop;player.vz=0;player.grounded=true;player.lastGroundZ=pTop;
      }
      // Hitting bottom
      else if(player.vz>0&&player.z+PLAYER_H>pl.z&&prevZ+PLAYER_H<=pl.z+0.1){
        player.z=pl.z-PLAYER_H;player.vz=0;
      }
    }
    // Inertia bounce: if landed hard after recent jetting, bounce without sound
    if(player.grounded&&recentJet>0&&Math.abs(preVz)>2){
      var bounceVz=Math.abs(preVz)*0.3;
      if(bounceVz>1){
        player.vz=bounceVz;player.grounded=false;
        // Small dust particles on bounce (no sound!)
        for(var bp=0;bp<3;bp++){
          addParticle(player.x+(Math.random()-0.5)*0.4,player.y+(Math.random()-0.5)*0.4,player.z,
            (Math.random()-0.5)*2,(Math.random()-0.5)*2,0.5+Math.random(),
            180,170,150,0.2,0.4+Math.random()*0.3);
        }
      }
    }

    // Anti-stuck: only if XY collision pushed the player AND they're near a surface
    if(!player.grounded&&xyPushed){
      for(var i=0;i<platforms.length;i++){
        var pl=platforms[i],hw=pl.w/2,hd=pl.d/2;
        if(player.x+PLAYER_R<=pl.x-hw||player.x-PLAYER_R>=pl.x+hw)continue;
        if(player.y+PLAYER_R<=pl.y-hd||player.y-PLAYER_R>=pl.y+hd)continue;
        var pTop=pl.z+pl.h;
        // Player feet barely below surface (within 0.2 units) and falling
        if(player.z<pTop&&player.z>=pTop-0.2&&player.vz<=0){
          player.z=pTop;player.vz=0;player.grounded=true;player.lastGroundZ=pTop;
          break;
        }
      }
    }

    // Void
    if(player.z<VOID_Z){
      player.hp-=15;dmgFlash=0.3;player.iFrames=0.8;
      if(player.hp<=0){triggerGameover();}
      else{respawnPlayer();playSound('hurt');}
    }

    // Weapon timers
    for(var i=0;i<weapons.length;i++){if(weapons[i].timer>0)weapons[i].timer-=dt;}
  }

  // ===== ENEMIES =====
  // Types: 0=Wyvern, 1=Harpy, 2=Golem, 3=Serpent, 4=Dragon
  var ENEMY_DEFS=[
    {name:'Wyvern',hp:20,spd:4,sz:1.2,col:[80,200,80],atkCD:2.0,atkRange:1.8,melee:true,pts:100},
    {name:'Harpy',hp:22,spd:3.5,sz:1.0,col:[100,140,255],atkCD:2.0,atkRange:18,melee:false,pts:100,flees:true,flyH:2},
    {name:'Golem',hp:50,spd:1.8,sz:1.8,col:[160,160,170],atkCD:3.0,atkRange:20,melee:false,pts:200,heavy:true},
    {name:'Serpent',hp:16,spd:5,sz:0.9,col:[230,200,50],atkCD:0.8,atkRange:15,melee:false,pts:100,strafe:true},
    {name:'Dragon',hp:120,spd:3,sz:2.5,col:[220,50,50],atkCD:2.0,atkRange:22,melee:false,pts:500,boss:true}
  ];
  var enemies=[];

  function spawnEnemy(type,x,y,z){
    var def=ENEMY_DEFS[type];
    enemies.push({type:type,x:x,y:y,z:z,prevZ:z,vx:0,vy:0,vz:0,
      hp:def.hp,maxHp:def.hp,spd:def.spd,
      state:'chase',stateTimer:0,atkCD:0,animT:Math.random()*10,
      phase:1,strafeDir:Math.random()>0.5?1:-1,
      flyBase:z,flyOff:0,
      grounded:true,jetFuel:1.0,jumpCD:0,recentJet:0});
  }

  // Check if position (x,y) at height z is over a valid platform
  function enemyOverPlatform(x,y,z){
    for(var i=0;i<platforms.length;i++){
      var pl=platforms[i],hw=pl.w/2,hd=pl.d/2;
      if(x>pl.x-hw&&x<pl.x+hw&&y>pl.y-hd&&y<pl.y+hd){
        var pTop=pl.z+pl.h;
        if(z>=pTop-1.0&&z<=pTop+1.5) return true;
      }
    }
    return false;
  }

  // Spawn positions per layer
  var spawnPts=[
    [{x:-10,y:10,z:0},{x:10,y:10,z:0},{x:-10,y:-10,z:0},{x:10,y:-10,z:0}],
    [{x:-10,y:24,z:3.4},{x:10,y:24,z:3.6},{x:0,y:-24,z:3.8},{x:-22,y:0,z:4.1},{x:22,y:0,z:3.6}],
    [{x:-14,y:25,z:7.2},{x:14,y:25,z:7.6},{x:0,y:-25,z:7.4},{x:-25,y:0,z:7.9},{x:25,y:0,z:7.2}],
    [{x:-4,y:-4,z:10.4},{x:4,y:-4,z:10.4},{x:-4,y:4,z:10.4},{x:4,y:4,z:10.4}]
  ];

  function spawnWaveEnemies(wave){
    var defs=[
      [[0,3],[3,2]],               // Wave 1: 3 Wyvern + 2 Serpent
      [[0,2],[1,3],[3,1]],          // Wave 2: 2 Wyvern + 3 Harpy + 1 Serpent
      [[2,2],[1,2],[3,2]],          // Wave 3: 2 Golem + 2 Harpy + 2 Serpent
      [[0,3],[1,2],[2,2],[3,3]],    // Wave 4: mix
      [[4,1],[1,2]]                 // Wave 5: Dragon + 2 Harpy
    ];
    var wdef=defs[Math.min(wave,defs.length-1)];
    var pts=wave<3?spawnPts[0].concat(spawnPts[1]):
            wave<4?spawnPts[1].concat(spawnPts[2]):spawnPts[3];
    var si=0;
    for(var i=0;i<wdef.length;i++){
      var etype=wdef[i][0],ecount=wdef[i][1];
      for(var j=0;j<ecount;j++){
        var sp=pts[si%pts.length];si++;
        var ox=(Math.random()-0.5)*3,oy=(Math.random()-0.5)*3;
        spawnEnemy(etype,sp.x+ox,sp.y+oy,sp.z+(ENEMY_DEFS[etype].flyH||0));
      }
    }
  }

  // ===== ENEMY AI =====
  var E_JET_ACC=24,E_JET_MAX=1.0,E_JUMP_VEL=6.5;
  function updateEnemies(dt){
    for(var ei=enemies.length-1;ei>=0;ei--){
      var e=enemies[ei];
      var def=ENEMY_DEFS[e.type];
      e.animT+=dt;
      if(e.atkCD>0)e.atkCD-=dt;
      if(e.jumpCD>0)e.jumpCD-=dt;
      if(e.recentJet>0)e.recentJet-=dt;
      var dx=player.x-e.x,dy=player.y-e.y,dz=(player.z+PLAYER_EYE*0.5)-e.z;
      var dist=Math.sqrt(dx*dx+dy*dy+dz*dz);
      var hDist=Math.sqrt(dx*dx+dy*dy);
      if(dist<0.01)dist=0.01;

      // Flying enemies bob up and down
      if(def.flyH){
        e.flyOff=Math.sin(e.animT*2)*0.5;
      }

      // --- Ground enemy movement with edge awareness ---
      var isGround=!def.flyH&&!def.boss;
      var tx=0,ty=0;

      // State logic
      if(e.state==='chase'){
        tx=dx/dist;ty=dy/dist;
        // Flee behavior for Harpy
        if(def.flees&&hDist<5){
          tx=-tx;ty=-ty;
          e.state='flee';e.stateTimer=1.5;
        }
        // Strafe for Serpent
        if(def.strafe){
          var sx=-ty*e.strafeDir,sy=tx*e.strafeDir;
          tx=tx*0.4+sx*0.6;ty=ty*0.4+sy*0.6;
          if(Math.random()<dt*0.5)e.strafeDir*=-1;
        }

        // Edge awareness for ground enemies: check if next position is over a platform
        if(isGround&&e.grounded){
          var lookAhead=1.2; // check 1.2 units ahead
          var nextX=e.x+tx*lookAhead,nextY=e.y+ty*lookAhead;
          if(!enemyOverPlatform(nextX,nextY,e.z)){
            // Edge detected! Reverse direction, try to strafe instead
            tx=-tx*0.3;ty=-ty*0.3;
            // Add perpendicular component to walk along edge
            var px=-ty,py=tx;
            if(Math.sin(e.animT*0.7)>0){px=-px;py=-py;}
            tx+=px*0.7;ty+=py*0.7;
          }
        }

        e.vx+=(tx*e.spd-e.vx)*Math.min(1,5*dt);
        e.vy+=(ty*e.spd-e.vy)*Math.min(1,5*dt);

        if(def.flyH||def.boss){
          var targetZ=player.z+(def.flyH||2);
          e.vz+=(targetZ-e.z)*2*dt;
          e.vz*=0.95;
        }else{
          // Ground enemies: gravity + jump/boost logic
          e.vz-=GRAVITY*dt;

          // Jump: when grounded and player is above (>1.5 units)
          if(e.grounded&&dz>1.5&&e.jumpCD<=0&&hDist<15){
            e.vz=E_JUMP_VEL;e.grounded=false;e.jumpCD=0.8;
          }
          // Boost: when in air, player is still above, and have fuel
          if(!e.grounded&&dz>1.0&&e.jetFuel>0&&e.jumpCD<=0&&hDist<15){
            e.recentJet=0.4;
            e.vz+=E_JET_ACC*dt;
            if(e.vz>4.5)e.vz=4.5;
            e.jetFuel-=dt;
            if(e.jetFuel<0)e.jetFuel=0;
            // Jet flame particles
            if(Math.random()<0.4){
              addParticle(e.x,e.y,e.z,
                (Math.random()-0.5)*1,
                (Math.random()-0.5)*1,
                -(1+Math.random()*2),
                255,120+Math.random()*80|0,0,0.15+Math.random()*0.1,0.4);
            }
          }
          // Refuel when grounded
          if(e.grounded)e.jetFuel=Math.min(E_JET_MAX,e.jetFuel+E_JET_MAX*0.5*dt);
        }

        // Attack
        if(hDist<def.atkRange&&e.atkCD<=0){
          if(def.melee&&hDist<def.atkRange){
            if(player.iFrames<=0){player.hp-=8;dmgFlash=0.3;screenShake=3;player.iFrames=0.4;playSound('hurt');}
            e.atkCD=def.atkCD;
          }else if(!def.melee){
            var bx=dx/dist,by=dy/dist,bz=dz/dist;
            if(def.boss&&e.phase>=2){
              for(var s=-2;s<=2;s++){
                var ang=s*0.15;
                var rbx=bx*Math.cos(ang)-by*Math.sin(ang);
                var rby=bx*Math.sin(ang)+by*Math.cos(ang);
                spawnBullet(enemyBullets,e.x,e.y,e.z+def.sz*0.5,rbx,rby,bz,10,6,[255,100,50],2);
              }
            }else{
              var bdmg=def.heavy?12:5;
              spawnBullet(enemyBullets,e.x,e.y,e.z+def.sz*0.5,bx,by,bz,10,bdmg,def.col,2);
            }
            e.atkCD=def.atkCD;
            playSound('enemyshoot');
          }
        }
      }else if(e.state==='flee'){
        e.stateTimer-=dt;
        if(e.stateTimer<=0)e.state='chase';
        var fx=-dx/dist,fy=-dy/dist;

        // Edge awareness during flee too
        if(isGround&&e.grounded){
          var fNextX=e.x+fx*1.2,fNextY=e.y+fy*1.2;
          if(!enemyOverPlatform(fNextX,fNextY,e.z)){
            fx=-fx*0.5;fy=-fy*0.5;
          }
        }

        e.vx+=(fx*e.spd-e.vx)*Math.min(1,5*dt);
        e.vy+=(fy*e.spd-e.vy)*Math.min(1,5*dt);
        if(def.flyH){
          var tgt=player.z+def.flyH+2;
          e.vz+=(tgt-e.z)*2*dt;e.vz*=0.95;
        }else{
          e.vz-=GRAVITY*dt;
        }
      }

      // Dragon phase transition
      if(def.boss&&e.hp<e.maxHp*0.5&&e.phase===1){
        e.phase=2;e.spd*=1.5;
      }

      // Move with separated axis collision (like player)
      e.prevZ=e.z;
      var ePreVz=e.vz;
      var eSz=def.sz*0.3; // enemy collision radius

      if(isGround){
        // X collision
        e.x+=e.vx*dt;
        for(var pi=0;pi<platforms.length;pi++){
          var pl=platforms[pi],hw=pl.w/2,hd=pl.d/2;
          if(e.z+def.sz<=pl.z||e.z>=pl.z+pl.h)continue;
          if(e.x+eSz>pl.x-hw&&e.x-eSz<pl.x+hw&&
             e.y+eSz>pl.y-hd&&e.y-eSz<pl.y+hd){
            if(e.vx>0)e.x=pl.x-hw-eSz;
            else if(e.vx<0)e.x=pl.x+hw+eSz;
            else e.x=(e.x<pl.x)?pl.x-hw-eSz:pl.x+hw+eSz;
            e.vx=0;
          }
        }
        // Y collision
        e.y+=e.vy*dt;
        for(var pi=0;pi<platforms.length;pi++){
          var pl=platforms[pi],hw=pl.w/2,hd=pl.d/2;
          if(e.z+def.sz<=pl.z||e.z>=pl.z+pl.h)continue;
          if(e.x+eSz>pl.x-hw&&e.x-eSz<pl.x+hw&&
             e.y+eSz>pl.y-hd&&e.y-eSz<pl.y+hd){
            if(e.vy>0)e.y=pl.y-hd-eSz;
            else if(e.vy<0)e.y=pl.y+hd+eSz;
            else e.y=(e.y<pl.y)?pl.y-hd-eSz:pl.y+hd+eSz;
            e.vy=0;
          }
        }
        // Z collision
        e.z+=e.vz*dt;
        e.grounded=false;
        for(var pi=0;pi<platforms.length;pi++){
          var pl=platforms[pi],hw=pl.w/2,hd=pl.d/2;
          if(e.x+eSz<=pl.x-hw||e.x-eSz>=pl.x+hw)continue;
          if(e.y+eSz<=pl.y-hd||e.y-eSz>=pl.y+hd)continue;
          var pTop=pl.z+pl.h;
          // Landing on top
          if(e.vz<=0&&e.z<pTop&&e.prevZ>=pTop-0.3){
            e.z=pTop;e.vz=0;e.grounded=true;
          }
          // Hitting bottom
          else if(e.vz>0&&e.z+def.sz>pl.z&&e.prevZ+def.sz<=pl.z+0.1){
            e.z=pl.z-def.sz;e.vz=0;
          }
        }
      }else{
        // Flying/boss: simple move (no wall collision needed)
        e.x+=e.vx*dt;e.y+=e.vy*dt;e.z+=e.vz*dt;
      }

      // Ground enemy: landing + inertia + void
      if(isGround){
        // Inertia bounce: enemy lands hard after boosting → bounce silently
        if(e.grounded&&e.recentJet>0&&Math.abs(ePreVz)>2){
          var eBounce=Math.abs(ePreVz)*0.25;
          if(eBounce>0.8){
            e.vz=eBounce;e.grounded=false;
            // Dust particles
            for(var bp=0;bp<2;bp++){
              addParticle(e.x+(Math.random()-0.5)*0.3,e.y+(Math.random()-0.5)*0.3,e.z,
                (Math.random()-0.5)*1.5,(Math.random()-0.5)*1.5,0.3+Math.random()*0.5,
                160,155,140,0.15,0.3+Math.random()*0.2);
            }
          }
        }
        // Fall damage: enemy falls into void → take damage + respawn at nearest spawn point
        if(e.z<VOID_Z){
          e.hp-=10;
          if(e.hp<=0){
            killEnemy(ei);continue;
          }
          // Respawn at a safe spawn point (not near player to avoid cheap hits)
          var bestSp=spawnPts[0][0],bestD=Infinity;
          for(var sl=0;sl<spawnPts.length;sl++){
            for(var si=0;si<spawnPts[sl].length;si++){
              var sp=spawnPts[sl][si];
              var sd=Math.abs(sp.x-player.x)+Math.abs(sp.y-player.y);
              // Pick point not too close to player but not too far either
              if(sd>8&&sd<bestD){bestD=sd;bestSp=sp;}
            }
          }
          e.x=bestSp.x+(Math.random()-0.5)*2;
          e.y=bestSp.y+(Math.random()-0.5)*2;
          e.z=bestSp.z+1;e.vz=0;e.vx=0;e.vy=0;
          e.grounded=false;e.jetFuel=E_JET_MAX;
        }
      }

      // Keep in world bounds
      if(e.x<-35)e.x=-35;if(e.x>35)e.x=35;
      if(e.y<-35)e.y=-35;if(e.y>35)e.y=35;
      if(e.z>20)e.z=20;
    }
  }

  // ===== BULLETS UPDATE =====
  function updateBullets(dt){
    // Player bullets
    for(var i=bullets.length-1;i>=0;i--){
      var b=bullets[i];
      b.x+=b.dx*b.spd*dt;b.y+=b.dy*b.spd*dt;b.z+=b.dz*b.spd*dt;
      b.life-=dt;
      if(b.life<=0){bullets.splice(i,1);continue;}
      // Hit enemies
      var hit=false;
      for(var j=enemies.length-1;j>=0;j--){
        var e=enemies[j],def=ENEMY_DEFS[e.type];
        var ex=b.x-e.x,ey=b.y-e.y,ez=b.z-e.z-def.sz*0.5;
        if(ex*ex+ey*ey+ez*ez<def.sz*def.sz*0.3){
          e.hp-=b.dmg;hit=true;
          spawnHitParticles(b.x,b.y,b.z,def.col);
          addDmgNum(b.x,b.y,b.z+0.3,''+b.dmg,[255,255,100]);
          playSound('hit');
          if(e.hp<=0){
            killEnemy(j);
          }
          break;
        }
      }
      // Hit platforms
      if(!hit){
        for(var j=0;j<platforms.length;j++){
          var pl=platforms[j],hw=pl.w/2,hd=pl.d/2;
          if(b.x>pl.x-hw&&b.x<pl.x+hw&&b.y>pl.y-hd&&b.y<pl.y+hd&&
             b.z>pl.z&&b.z<pl.z+pl.h){hit=true;break;}
        }
      }
      if(hit){bullets.splice(i,1);}
    }
    // Enemy bullets
    for(var i=enemyBullets.length-1;i>=0;i--){
      var b=enemyBullets[i];
      b.x+=b.dx*b.spd*dt;b.y+=b.dy*b.spd*dt;b.z+=b.dz*b.spd*dt;
      b.life-=dt;
      if(b.life<=0){enemyBullets.splice(i,1);continue;}
      // Hit player
      var px=b.x-player.x,py=b.y-player.y,pz=b.z-player.z-PLAYER_EYE*0.5;
      if(px*px+py*py+pz*pz<PLAYER_R*PLAYER_R*4){
        if(player.iFrames<=0){
          player.hp-=b.dmg;dmgFlash=0.3;screenShake=2;player.iFrames=0.4;
          playSound('hurt');
          if(player.hp<=0)triggerGameover();
        }
        enemyBullets.splice(i,1);
        continue;
      }
      // Hit platforms
      for(var j=0;j<platforms.length;j++){
        var pl=platforms[j],hw=pl.w/2,hd=pl.d/2;
        if(b.x>pl.x-hw&&b.x<pl.x+hw&&b.y>pl.y-hd&&b.y<pl.y+hd&&
           b.z>pl.z&&b.z<pl.z+pl.h){enemyBullets.splice(i,1);break;}
      }
    }
  }

  function killEnemy(idx){
    var e=enemies[idx],def=ENEMY_DEFS[e.type];
    spawnExplosion(e.x,e.y,e.z+def.sz*0.5,def.col);
    playSound('explode');
    // HP drop (30% chance)
    if(Math.random()<0.3)spawnPickup(e.x,e.y,e.z+0.3);
    enemies.splice(idx,1);
    totalKills++;
    // Combo
    comboTimer=3;combo++;
    if(combo>maxCombo)maxCombo=combo;
    var mult=1+Math.min(combo-1,5)*0.5;
    var pts=Math.floor(def.pts*mult);
    score+=pts;
    // Score popup
    addDmgNum(e.x,e.y,e.z+def.sz+0.5,'+'+pts,[0,229,255]);
    screenShake=Math.max(screenShake,2.5);
  }

  // ===== PARTICLES =====
  var particles=[];
  function addParticle(x,y,z,vx,vy,vz,r,g,b,life,sz){
    if(particles.length>200)return;
    particles.push({x:x,y:y,z:z,vx:vx,vy:vy,vz:vz,r:r,g:g,b:b,life:life,maxLife:life,sz:sz||1});
  }
  function spawnHitParticles(x,y,z,col){
    for(var i=0;i<5;i++){
      addParticle(x,y,z,(Math.random()-0.5)*4,(Math.random()-0.5)*4,(Math.random()-0.5)*4+2,
        col[0],col[1],col[2],0.4+Math.random()*0.3,1);
    }
  }
  function spawnExplosion(x,y,z,col){
    for(var i=0;i<15;i++){
      var ang=Math.random()*TAU,spd=2+Math.random()*5;
      addParticle(x,y,z,Math.cos(ang)*spd,Math.sin(ang)*spd,(Math.random()-0.5)*6+3,
        col[0]+Math.random()*60|0,col[1]+Math.random()*60|0,col[2]+Math.random()*60|0,
        0.5+Math.random()*0.5,2);
    }
    // Flash
    for(var i=0;i<8;i++){
      addParticle(x,y,z,(Math.random()-0.5)*8,(Math.random()-0.5)*8,(Math.random()-0.5)*8,
        255,220,100,0.2+Math.random()*0.2,1.5);
    }
  }
  function spawnJetParticles(){
    var rx=(Math.random()-0.5)*0.2,ry=(Math.random()-0.5)*0.2;
    addParticle(player.x+rx,player.y+ry,player.z-0.1,
      rx*3,ry*3,-2-Math.random()*2,255,150+Math.random()*80|0,30,0.2+Math.random()*0.15,1.5);
  }
  function spawnDashParticles(){
    for(var i=0;i<3;i++){
      addParticle(player.x+(Math.random()-0.5)*0.3,player.y+(Math.random()-0.5)*0.3,player.z+PLAYER_EYE*0.5,
        -player.dashDx*3+(Math.random()-0.5)*2,-player.dashDy*3+(Math.random()-0.5)*2,(Math.random()-0.5)*1,
        0,200+Math.random()*55|0,255,0.25,1);
    }
  }
  function updateParticles(dt){
    for(var i=particles.length-1;i>=0;i--){
      var p=particles[i];
      p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;
      p.vz-=8*dt; // particle gravity
      p.life-=dt;
      if(p.life<=0)particles.splice(i,1);
    }
  }

  // ===== FLOATING DAMAGE / SCORE NUMBERS =====
  var dmgNums=[];
  function addDmgNum(x,y,z,text,col){
    if(dmgNums.length>30)return;
    dmgNums.push({x:x,y:y,z:z,text:text,col:col,life:1.0,maxLife:1.0});
  }
  function updateDmgNums(dt){
    for(var i=dmgNums.length-1;i>=0;i--){
      dmgNums[i].z+=2.5*dt;
      dmgNums[i].life-=dt;
      if(dmgNums[i].life<=0)dmgNums.splice(i,1);
    }
  }
  function renderDmgNums(){
    for(var i=0;i<dmgNums.length;i++){
      var dn=dmgNums[i];
      var cc=w2c(dn.x,dn.y,dn.z);
      if(cc[1]<NEAR)continue;
      var iz=1/cc[1];
      var sx=cc[0]*FOCAL*iz+W*0.5|0,sy=-cc[2]*FOCAL*iz+H*0.5|0;
      var alpha=dn.life/dn.maxLife;
      var sz=Math.max(3,Math.ceil(5*iz));
      if(sx<0||sx>=W||sy<0||sy>=H)continue;
      // Render pixel text
      var chars=dn.text;
      var cr=dn.col[0],cg=dn.col[1],cb=dn.col[2];
      for(var ci=0;ci<chars.length;ci++){
        var cx=sx-((chars.length-1)*3)+ci*6;
        var ch=chars.charCodeAt(ci);
        // Simple 3x5 digit font
        var glyph=getGlyph(chars[ci]);
        if(!glyph)continue;
        for(var gy=0;gy<5;gy++){for(var gx=0;gx<3;gx++){
          if(glyph[gy*3+gx]){
            var px2=cx+gx,py2=sy+gy-2;
            if(px2<0||px2>=W||py2<0||py2>=H)continue;
            var bi=py2*W+px2;
            var pi=bi<<2;
            pix[pi]=pix[pi]+(cr-pix[pi])*alpha|0;
            pix[pi+1]=pix[pi+1]+(cg-pix[pi+1])*alpha|0;
            pix[pi+2]=pix[pi+2]+(cb-pix[pi+2])*alpha|0;
          }
        }}
      }
    }
  }
  // 3x5 pixel font for 0-9 and + characters
  var _glyphs={
    '0':[1,1,1,1,0,1,1,0,1,1,0,1,1,1,1],
    '1':[0,1,0,1,1,0,0,1,0,0,1,0,1,1,1],
    '2':[1,1,1,0,0,1,1,1,1,1,0,0,1,1,1],
    '3':[1,1,1,0,0,1,1,1,1,0,0,1,1,1,1],
    '4':[1,0,1,1,0,1,1,1,1,0,0,1,0,0,1],
    '5':[1,1,1,1,0,0,1,1,1,0,0,1,1,1,1],
    '6':[1,1,1,1,0,0,1,1,1,1,0,1,1,1,1],
    '7':[1,1,1,0,0,1,0,0,1,0,1,0,0,1,0],
    '8':[1,1,1,1,0,1,1,1,1,1,0,1,1,1,1],
    '9':[1,1,1,1,0,1,1,1,1,0,0,1,1,1,1],
    '+':[0,0,0,0,1,0,1,1,1,0,1,0,0,0,0],
    'x':[0,0,0,1,0,1,0,1,0,1,0,1,0,0,0]
  };
  function getGlyph(c){return _glyphs[c]||null;}

  // ===== HP PICKUPS =====
  var pickups=[];
  function spawnPickup(x,y,z){
    pickups.push({x:x,y:y,z:z,life:8,bobT:Math.random()*10});
  }
  function updatePickups(dt){
    for(var i=pickups.length-1;i>=0;i--){
      var pk=pickups[i];
      pk.life-=dt;pk.bobT+=dt;
      if(pk.life<=0){pickups.splice(i,1);continue;}
      // Check player pickup
      var dx=pk.x-player.x,dy=pk.y-player.y,dz=pk.z-player.z-PLAYER_EYE*0.5;
      if(dx*dx+dy*dy+dz*dz<1.5){
        player.hp=Math.min(player.maxHp,player.hp+15);
        addDmgNum(pk.x,pk.y,pk.z+0.5,'+15',[80,255,80]);
        playSound('pickup');
        pickups.splice(i,1);
      }
    }
  }
  function renderPickups(){
    for(var i=0;i<pickups.length;i++){
      var pk=pickups[i];
      var bz=pk.z+Math.sin(pk.bobT*3)*0.15;
      var cc=w2c(pk.x,pk.y,bz);
      if(cc[1]<NEAR)continue;
      var iz=1/cc[1];
      var sx=cc[0]*FOCAL*iz+W*0.5|0,sy=-cc[2]*FOCAL*iz+H*0.5|0;
      var sz=Math.max(2,Math.ceil(4*iz));
      // Green cross
      for(var dy=-sz;dy<=sz;dy++){for(var dx=-sz;dx<=sz;dx++){
        if(Math.abs(dx)>sz/3&&Math.abs(dy)>sz/3)continue; // cross shape
        var px2=sx+dx,py2=sy+dy;
        if(px2<0||px2>=W||py2<0||py2>=H)continue;
        var bi=py2*W+px2;
        if(iz>zbuf[bi]){zbuf[bi]=iz;var pi=bi<<2;pix[pi]=50;pix[pi+1]=255;pix[pi+2]=80;}
      }}
    }
  }

  // ===== WAVE SYSTEM =====
  var waveNames=['FIRST CONTACT','AERIAL THREAT','HEAVY ARTILLERY','FULL ASSAULT','THE DRAGON'];

  function startWave(n){
    currentWave=n;
    waveAnnounceTimer=3;
    _ovActive='';
    var wc=_scrWave.children;
    wc[0].textContent='WAVE '+(n+1);
    wc[1].textContent=waveNames[n]||'';
    var defs=[[0,3],[3,2]];
    var infoText='';
    if(n===0)infoText='3 Wyverns + 2 Serpents';
    else if(n===1)infoText='2 Wyverns + 3 Harpies + 1 Serpent';
    else if(n===2)infoText='2 Golems + 2 Harpies + 2 Serpents';
    else if(n===3)infoText='Full assault — all enemy types';
    else if(n===4)infoText='THE DRAGON + 2 Harpies';
    wc[2].textContent=infoText;
    updateOverlay();
    playSound('wavestart');
  }

  function checkWaveComplete(){
    if(enemies.length===0&&waveAnnounceTimer<=0){
      if(currentWave>=totalWaves-1){
        // WIN
        gameState='win';stateTimer=2;
        _winStats.innerHTML='<b>SCORE:</b> '+score+'<br><b>MAX COMBO:</b> x'+maxCombo+'<br><b>TIME:</b> '+formatTime(gameTime);
        _ovActive='';updateOverlay();
        playSound('win');
      }else{
        // Next wave
        player.hp=Math.min(player.maxHp,player.hp+50);
        refillAmmo();
        startWave(currentWave+1);
      }
    }
  }

  function formatTime(t){var m=t/60|0,s=t%60|0;return m+':'+(s<10?'0':'')+s;}

  function triggerGameover(){
    gameState='gameover';stateTimer=2;
    _deadStats.innerHTML='<b>WAVE:</b> '+(currentWave+1)+'/'+totalWaves+'<br><b>SCORE:</b> '+score+'<br><b>KILLS:</b> '+totalKills;
    _ovActive='';updateOverlay();
    playSound('death');
  }

  // ===== CLOUDS =====
  var clouds=[];
  function genClouds(){
    clouds=[];
    // High clouds (above player)
    for(var i=0;i<16;i++){
      clouds.push({x:(Math.random()-0.5)*80,y:(Math.random()-0.5)*80,z:14+Math.random()*8,
        w:5+Math.random()*10,d:3+Math.random()*5,alpha:0.12+Math.random()*0.12});
    }
    // Low clouds (below islands, reinforcing height feeling)
    for(var i=0;i<10;i++){
      clouds.push({x:(Math.random()-0.5)*100,y:(Math.random()-0.5)*100,z:-2-Math.random()*3,
        w:8+Math.random()*15,d:4+Math.random()*8,alpha:0.2+Math.random()*0.15});
    }
  }

  // ===== AMBIENT PARTICLES (dust motes, embers) =====
  var ambientParts=[];
  function genAmbient(){
    ambientParts=[];
    for(var i=0;i<40;i++){
      ambientParts.push({
        x:(Math.random()-0.5)*50,y:(Math.random()-0.5)*50,z:Math.random()*14,
        vx:(Math.random()-0.5)*0.5,vy:(Math.random()-0.5)*0.5,vz:0.2+Math.random()*0.4,
        r:200+Math.random()*55|0,g:180+Math.random()*50|0,b:120+Math.random()*80|0,
        sz:0.5+Math.random()*0.5, phase:Math.random()*10
      });
    }
  }
  function updateAmbient(dt){
    for(var i=0;i<ambientParts.length;i++){
      var a=ambientParts[i];
      a.phase+=dt;
      a.x+=a.vx*dt+Math.sin(a.phase*0.7)*0.3*dt;
      a.y+=a.vy*dt+Math.cos(a.phase*0.5)*0.3*dt;
      a.z+=a.vz*dt;
      if(a.z>16){a.z=-1;a.x=(Math.random()-0.5)*50;a.y=(Math.random()-0.5)*50;}
    }
  }
  function renderAmbient(){
    for(var i=0;i<ambientParts.length;i++){
      var a=ambientParts[i];
      var cc=w2c(a.x,a.y,a.z);
      if(cc[1]<NEAR)continue;
      var iz=1/cc[1];
      var sx=cc[0]*FOCAL*iz+W*0.5|0,sy=-cc[2]*FOCAL*iz+H*0.5|0;
      if(sx<0||sx>=W||sy<0||sy>=H)continue;
      var bi=sy*W+sx;
      if(iz>zbuf[bi]){
        var pi=bi<<2;
        var alpha=0.3+Math.sin(a.phase*2)*0.15;
        pix[pi]=pix[pi]+(a.r-pix[pi])*alpha|0;
        pix[pi+1]=pix[pi+1]+(a.g-pix[pi+1])*alpha|0;
        pix[pi+2]=pix[pi+2]+(a.b-pix[pi+2])*alpha|0;
      }
    }
  }

  // ===== RENDERING =====
  function renderWorld(){
    clearFrame();
    camUpdate();
    renderSun();
    // Render all geometry (collidable + decorative)
    for(var i=0;i<allGeo.length;i++){
      var pl=allGeo[i];
      var cc=w2c(pl.x,pl.y,pl.z+pl.h*0.5);
      var maxDim=Math.max(pl.w,pl.d,pl.h)*0.7+2;
      if(cc[1]<-maxDim)continue;
      if(cc[1]>FAR_FOG+maxDim)continue;
      renderPlatform(pl);
    }
    renderClouds();
    renderAmbient();
    renderEnemies();
    renderBullets();
    renderPickups();
    renderParticles();
    renderDmgNums();
    if(player.grappling)renderGrappleLine();
    ctx.putImageData(imgData,0,0);
    renderEffects();
    ctx.save();ctx.scale(SC,SC);
    renderHUD();
    ctx.restore();
  }

  function litColor(base,lightMul){
    return[Math.min(255,base[0]*lightMul|0),Math.min(255,base[1]*lightMul|0),Math.min(255,base[2]*lightMul|0)];
  }

  function renderPlatform(pl){
    var hw=pl.w/2,hd=pl.d/2,pz=pl.z,ph=pl.h;
    var eyeZ=player.z+PLAYER_EYE;
    var tc=pl.t,sc=pl.s;
    var lr,lg,lb;
    // Top face
    if(eyeZ>pz+ph){
      var l=litColor(tc,LT_TOP);
      var c0=w2c(pl.x-hw,pl.y-hd,pz+ph),c1=w2c(pl.x+hw,pl.y-hd,pz+ph);
      var c2=w2c(pl.x+hw,pl.y+hd,pz+ph),c3=w2c(pl.x-hw,pl.y+hd,pz+ph);
      fillQuad(c0,c1,c2,c3,l[0],l[1],l[2]);
    }
    // Bottom face
    if(eyeZ<pz){
      var l=litColor(sc,LT_BOT);
      var c0=w2c(pl.x-hw,pl.y+hd,pz),c1=w2c(pl.x+hw,pl.y+hd,pz);
      var c2=w2c(pl.x+hw,pl.y-hd,pz),c3=w2c(pl.x-hw,pl.y-hd,pz);
      fillQuad(c0,c1,c2,c3,l[0],l[1],l[2]);
    }
    // +X face
    if(player.x>pl.x+hw){
      var l=litColor(sc,LT_PX);
      var c0=w2c(pl.x+hw,pl.y-hd,pz),c1=w2c(pl.x+hw,pl.y+hd,pz);
      var c2=w2c(pl.x+hw,pl.y+hd,pz+ph),c3=w2c(pl.x+hw,pl.y-hd,pz+ph);
      fillQuad(c0,c1,c2,c3,l[0],l[1],l[2]);
    }
    // -X face
    if(player.x<pl.x-hw){
      var l=litColor(sc,LT_NX);
      var c0=w2c(pl.x-hw,pl.y+hd,pz),c1=w2c(pl.x-hw,pl.y-hd,pz);
      var c2=w2c(pl.x-hw,pl.y-hd,pz+ph),c3=w2c(pl.x-hw,pl.y+hd,pz+ph);
      fillQuad(c0,c1,c2,c3,l[0],l[1],l[2]);
    }
    // +Y face
    if(player.y>pl.y+hd){
      var l=litColor(sc,LT_PY);
      var c0=w2c(pl.x+hw,pl.y+hd,pz),c1=w2c(pl.x-hw,pl.y+hd,pz);
      var c2=w2c(pl.x-hw,pl.y+hd,pz+ph),c3=w2c(pl.x+hw,pl.y+hd,pz+ph);
      fillQuad(c0,c1,c2,c3,l[0],l[1],l[2]);
    }
    // -Y face
    if(player.y<pl.y-hd){
      var l=litColor(sc,LT_NY);
      var c0=w2c(pl.x-hw,pl.y-hd,pz),c1=w2c(pl.x+hw,pl.y-hd,pz);
      var c2=w2c(pl.x+hw,pl.y-hd,pz+ph),c3=w2c(pl.x-hw,pl.y-hd,pz+ph);
      fillQuad(c0,c1,c2,c3,l[0],l[1],l[2]);
    }
  }

  function renderClouds(){
    for(var i=0;i<clouds.length;i++){
      var cl=clouds[i];
      var cc=w2c(cl.x,cl.y,cl.z);
      if(cc[1]<1)continue;
      var iz=1/cc[1];
      var sx=cc[0]*FOCAL*iz+W*0.5,sy=-cc[2]*FOCAL*iz+H*0.5;
      var pw=cl.w*FOCAL*iz,ph=cl.d*FOCAL*iz;
      var x0=Math.max(0,sx-pw/2|0),x1=Math.min(W-1,sx+pw/2|0);
      var y0=Math.max(0,sy-ph/2|0),y1=Math.min(H-1,sy+ph/2|0);
      for(var y=y0;y<=y1;y++){
        for(var x=x0;x<=x1;x++){
          var bi=y*W+x;
          if(iz>zbuf[bi]){
            var pi=bi<<2;
            var a=cl.alpha*0.7;
            pix[pi]=pix[pi]+(255-pix[pi])*a|0;
            pix[pi+1]=pix[pi+1]+(255-pix[pi+1])*a|0;
            pix[pi+2]=pix[pi+2]+(255-pix[pi+2])*a|0;
          }
        }
      }
    }
  }

  function renderEnemies(){
    for(var i=0;i<enemies.length;i++){
      var e=enemies[i],def=ENEMY_DEFS[e.type];
      var ez=e.z+def.sz*0.5+(e.flyOff||0);
      var cc=w2c(e.x,e.y,ez);
      if(cc[1]<NEAR)continue;
      var iz=1/cc[1];
      var sx=cc[0]*FOCAL*iz+W*0.5,sy=-cc[2]*FOCAL*iz+H*0.5;
      var sprH=def.sz*FOCAL*iz,sprW=sprH*0.7;
      var x0=Math.max(0,Math.floor(sx-sprW/2)),x1=Math.min(W-1,Math.ceil(sx+sprW/2));
      var y0=Math.max(0,Math.floor(sy-sprH/2)),y1=Math.min(H-1,Math.ceil(sy+sprH/2));
      var col=def.col;
      // Boss phase 2 color shift + glow
      if(def.boss&&e.phase>=2)col=[255,80+Math.sin(e.animT*10)*40|0,30];
      // Hit flash
      var hitFlash=e.hp<e.maxHp&&e.atkCD>def.atkCD-0.1;
      var depth=cc[1];
      var fog=depth<3?0:depth>FAR_FOG?1:(depth-3)/(FAR_FOG-3);
      var fr=col[0]+(FOG_C[0]-col[0])*fog|0;
      var fg=col[1]+(FOG_C[1]-col[1])*fog|0;
      var fb=col[2]+(FOG_C[2]-col[2])*fog|0;
      // Highlight / shadow colors
      var hr=Math.min(255,fr+50),hg=Math.min(255,fg+50),hb=Math.min(255,fb+50);
      var dr=fr*0.35|0,dg=fg*0.35|0,db=fb*0.35|0;
      var animPhase=Math.sin(e.animT*4);
      for(var y=y0;y<=y1;y++){
        for(var x=x0;x<=x1;x++){
          var bi=y*W+x;
          if(iz>zbuf[bi]){
            var lx=(x-sx+sprW/2)/sprW,ly=(y-sy+sprH/2)/sprH;
            var draw=false;
            // Improved sprite shapes per enemy type
            if(def.melee){
              // Wyvern: bulky warrior
              if(ly<0.18){draw=lx>0.3&&lx<0.7;} // head
              else if(ly<0.25){draw=lx>0.2&&lx<0.8;} // shoulders
              else if(ly<0.6){draw=lx>0.1&&lx<0.9;} // wide body
              else if(ly<0.65){draw=lx>0.15&&lx<0.85;} // waist
              else{draw=(lx>0.2&&lx<0.4)||(lx>0.6&&lx<0.8);} // legs
            }else if(def.flyH&&!def.boss){
              // Harpy: winged
              if(ly<0.2){draw=lx>0.35&&lx<0.65;} // head
              else if(ly<0.55){
                draw=lx>0.25&&lx<0.75; // body
                // Wings flap
                var wingExt=0.15+animPhase*0.1;
                if(ly>0.25&&ly<0.45&&(lx<0.25-wingExt||lx>0.75+wingExt)&&(lx>0.05&&lx<0.95))draw=true;
              }
              else if(ly<0.7){draw=lx>0.3&&lx<0.7;}
              else{draw=(lx>0.3&&lx<0.45)||(lx>0.55&&lx<0.7);}
            }else if(def.heavy){
              // Golem: massive block
              if(ly<0.15){draw=lx>0.25&&lx<0.75;} // head
              else if(ly<0.65){draw=lx>0.05&&lx<0.95;} // massive body
              else{draw=(lx>0.1&&lx<0.4)||(lx>0.6&&lx<0.9);} // legs
            }else if(def.strafe){
              // Serpent: sleek
              if(ly<0.2){draw=lx>0.35&&lx<0.65;} // head
              else if(ly<0.6){draw=lx>0.2&&lx<0.8;} // slim body
              else if(ly<0.75){draw=lx>0.25&&lx<0.75;}
              else{draw=(lx>0.3&&lx<0.45)||(lx>0.55&&lx<0.7);}
            }else if(def.boss){
              // Dragon: huge menacing
              if(ly<0.12){draw=lx>0.25&&lx<0.75;} // horned head
              else if(ly<0.18){draw=lx>0.15&&lx<0.85;} // jaw
              else if(ly<0.55){
                draw=lx>0.1&&lx<0.9; // body
                var wingExt=0.12+animPhase*0.08;
                if(ly>0.2&&ly<0.4&&(lx<0.1-wingExt||lx>0.9+wingExt)&&lx>0.0&&lx<1.0)draw=true;
              }
              else if(ly<0.7){draw=lx>0.15&&lx<0.85;}
              else{draw=(lx>0.15&&lx<0.38)||(lx>0.62&&lx<0.85);}
            }else{
              // Fallback
              if(ly<0.2){draw=lx>0.3&&lx<0.7;}
              else if(ly<0.7){draw=lx>0.15&&lx<0.85;}
              else{draw=(lx>0.25&&lx<0.42)||(lx>0.58&&lx<0.75);}
            }
            if(draw){
              zbuf[bi]=iz;
              var pi=bi<<2;
              // Shading: highlight top, darker bottom
              var shade=ly<0.3?1:ly<0.6?0:1;
              if(hitFlash){pix[pi]=255;pix[pi+1]=255;pix[pi+2]=255;}
              else if(ly<0.3){pix[pi]=hr;pix[pi+1]=hg;pix[pi+2]=hb;}
              else if(ly>0.7||(lx<0.15||lx>0.85)){pix[pi]=dr;pix[pi+1]=dg;pix[pi+2]=db;}
              else{pix[pi]=fr;pix[pi+1]=fg;pix[pi+2]=fb;}
              // Eyes (glowing)
              if(ly>0.05&&ly<0.16&&((lx>0.33&&lx<0.43)||(lx>0.57&&lx<0.67))){
                pix[pi]=255;pix[pi+1]=40;pix[pi+2]=40;
              }
              // Boss glowing core
              if(def.boss&&ly>0.3&&ly<0.5&&lx>0.35&&lx<0.65){
                var glow=Math.sin(e.animT*6)*0.3+0.5;
                pix[pi]=Math.min(255,pix[pi]+glow*120|0);
                pix[pi+1]=Math.min(255,pix[pi+1]+glow*40|0);
              }
            }
          }
        }
      }
      // HP bar (improved with border)
      if(e.hp<e.maxHp){
        var barY=Math.max(0,y0-4);
        var barW=Math.floor(sprW*0.8);
        var barX=Math.floor(sx-barW/2);
        var hpRatio=e.hp/e.maxHp;
        for(var bx=barX-1;bx<=barX+barW&&bx<W;bx++){
          if(bx<0)continue;
          // Border row
          for(var by=barY-1;by<=barY+2&&by<H;by++){
            if(by<0)continue;
            var bi=by*W+bx;
            if(iz>zbuf[bi]*0.99){
              var pi=bi<<2;
              if(by===barY-1||by===barY+2||bx===barX-1||bx===barX+barW){
                pix[pi]=20;pix[pi+1]=20;pix[pi+2]=20;
              }else if(by>=barY&&by<=barY+1&&bx>=barX&&bx<barX+barW){
                if((bx-barX)/barW<hpRatio){
                  var hc=hpRatio>0.5?[80,220,80]:hpRatio>0.25?[220,180,40]:[220,50,50];
                  pix[pi]=hc[0];pix[pi+1]=hc[1];pix[pi+2]=hc[2];
                }else{pix[pi]=40;pix[pi+1]=20;pix[pi+2]=20;}
              }
            }
          }
        }
      }
    }
  }

  function renderBullets(){
    var allB=bullets.concat(enemyBullets);
    for(var i=0;i<allB.length;i++){
      var b=allB[i];
      var cc=w2c(b.x,b.y,b.z);
      if(cc[1]<NEAR)continue;
      var iz=1/cc[1];
      var sx=cc[0]*FOCAL*iz+W*0.5|0,sy=-cc[2]*FOCAL*iz+H*0.5|0;
      var sz=Math.max(1,Math.ceil(2*iz));
      for(var dy=-sz;dy<=sz;dy++){
        for(var dx=-sz;dx<=sz;dx++){
          var px=sx+dx,py=sy+dy;
          if(px<0||px>=W||py<0||py>=H)continue;
          var bi=py*W+px;
          if(iz>zbuf[bi]){
            zbuf[bi]=iz;var pi=bi<<2;
            pix[pi]=b.col[0];pix[pi+1]=b.col[1];pix[pi+2]=b.col[2];
          }
        }
      }
    }
  }

  function renderParticles(){
    for(var i=0;i<particles.length;i++){
      var p=particles[i];
      var cc=w2c(p.x,p.y,p.z);
      if(cc[1]<NEAR)continue;
      var iz=1/cc[1];
      var sx=cc[0]*FOCAL*iz+W*0.5|0,sy=-cc[2]*FOCAL*iz+H*0.5|0;
      var sz=Math.max(1,Math.ceil(p.sz*iz));
      var alpha=p.life/p.maxLife;
      for(var dy=-sz;dy<=sz;dy++){
        for(var dx=-sz;dx<=sz;dx++){
          var px=sx+dx,py=sy+dy;
          if(px<0||px>=W||py<0||py>=H)continue;
          var bi=py*W+px;
          if(iz>zbuf[bi]*0.95){
            var pi=bi<<2;
            pix[pi]=pix[pi]+(p.r-pix[pi])*alpha|0;
            pix[pi+1]=pix[pi+1]+(p.g-pix[pi+1])*alpha|0;
            pix[pi+2]=pix[pi+2]+(p.b-pix[pi+2])*alpha|0;
          }
        }
      }
    }
  }

  function renderGrappleLine(){
    var px0=player.x,py0=player.y,pz0=player.z+PLAYER_EYE*0.5;
    var px1=player.grapX,py1=player.grapY,pz1=player.grapZ;
    // Chain links
    var steps=50;
    var sag=0.4; // chain sag
    for(var i=0;i<=steps;i++){
      var t=i/steps;
      var mx=px0+(px1-px0)*t,my=py0+(py1-py0)*t,mz=pz0+(pz1-pz0)*t;
      // Sag in the middle (catenary-like)
      mz-=sag*Math.sin(t*PI)*4*t*(1-t);
      var cc=w2c(mx,my,mz);
      if(cc[1]<NEAR)continue;
      var iz=1/cc[1];
      var sx=cc[0]*FOCAL*iz+W*0.5|0,sy=-cc[2]*FOCAL*iz+H*0.5|0;
      // Thicker chain (3px wide at close range)
      var thick=Math.max(1,Math.ceil(1.5*iz));
      for(var dy=-thick;dy<=thick;dy++){for(var dx=-thick;dx<=thick;dx++){
        var ppx=sx+dx,ppy=sy+dy;
        if(ppx<0||ppx>=W||ppy<0||ppy>=H)continue;
        var bi=ppy*W+ppx;
        if(iz>zbuf[bi]*0.9){
          var pi=bi<<2;
          // Alternate chain link colors
          var link=((i/3|0)%2===0);
          pix[pi]=link?0:40;pix[pi+1]=link?229:180;pix[pi+2]=link?255:220;
        }
      }}
    }
    // Hook at the end (claw shape)
    var hc=w2c(px1,py1,pz1);
    if(hc[1]>=NEAR){
      var hz=1/hc[1];
      var hsx=hc[0]*FOCAL*hz+W*0.5|0,hsy=-hc[2]*FOCAL*hz+H*0.5|0;
      var hsz=Math.max(2,Math.ceil(4*hz));
      // Draw claw: center + 4 prongs
      var prongs=[[0,-1],[0,1],[-1,0],[1,0],[-1,-1],[1,-1]];
      for(var p=0;p<prongs.length;p++){
        var cpx=hsx+prongs[p][0]*hsz,cpy=hsy+prongs[p][1]*hsz;
        for(var dy=-1;dy<=1;dy++){for(var dx=-1;dx<=1;dx++){
          var fpx=cpx+dx,fpy=cpy+dy;
          if(fpx<0||fpx>=W||fpy<0||fpy>=H)continue;
          var bi=fpy*W+fpx;
          if(hz>zbuf[bi]*0.85){var pi=bi<<2;pix[pi]=200;pix[pi+1]=220;pix[pi+2]=255;}
        }}
      }
      // Bright center
      for(var dy=-hsz;dy<=hsz;dy++){for(var dx=-hsz;dx<=hsz;dx++){
        if(Math.abs(dx)+Math.abs(dy)>hsz)continue;
        var fpx=hsx+dx,fpy=hsy+dy;
        if(fpx<0||fpx>=W||fpy<0||fpy>=H)continue;
        var bi=fpy*W+fpx;
        if(hz>zbuf[bi]*0.85){var pi=bi<<2;pix[pi]=255;pix[pi+1]=255;pix[pi+2]=255;}
      }}
    }
  }

  function renderEffects(){
    // Subtle vignette (always on)
    var vig=ctx.createRadialGradient(W/2,H/2,W*0.25,W/2,H/2,W*0.65);
    vig.addColorStop(0,'transparent');vig.addColorStop(1,'rgba(15,20,35,0.25)');
    ctx.fillStyle=vig;ctx.fillRect(0,0,W,H);
    // Damage flash
    if(dmgFlash>0){
      ctx.fillStyle='rgba(255,0,0,'+Math.min(0.4,dmgFlash)+')';
      ctx.fillRect(0,0,W,H);
    }
    // Low HP vignette
    if(player.hp<30){
      var g=ctx.createRadialGradient(W/2,H/2,W*0.2,W/2,H/2,W*0.6);
      g.addColorStop(0,'transparent');g.addColorStop(1,'rgba(180,0,0,0.35)');
      ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    }
    // Speed lines
    if(speedLines>0.1){
      ctx.strokeStyle='rgba(200,230,255,'+speedLines*0.3+')';
      ctx.lineWidth=1;
      for(var i=0;i<8;i++){
        var ang=Math.random()*TAU;
        var r1=W*0.25,r2=W*0.5;
        ctx.beginPath();
        ctx.moveTo(W/2+Math.cos(ang)*r1,H/2+Math.sin(ang)*r1);
        ctx.lineTo(W/2+Math.cos(ang)*r2,H/2+Math.sin(ang)*r2);
        ctx.stroke();
      }
    }
    // I-frames flash
    if(player.iFrames>0&&Math.sin(player.iFrames*30)>0){
      ctx.fillStyle='rgba(255,255,255,0.08)';ctx.fillRect(0,0,W,H);
    }
    // Screen shake applied via transform in game loop
  }

  // ===== HUD =====
  function renderHUD(){
    var f='5px "Press Start 2P",monospace';
    ctx.textBaseline='top';
    // HP bar (top-left)
    ctx.fillStyle='#1a1a2e';ctx.fillRect(4,4,52,6);
    var hpW=50*(player.hp/player.maxHp);
    var hpCol=player.hp>60?'#4f4':'#f44';
    if(player.hp>30&&player.hp<=60)hpCol='#fa0';
    ctx.fillStyle=hpCol;ctx.fillRect(5,5,hpW,4);
    ctx.strokeStyle='#555';ctx.lineWidth=0.5;ctx.strokeRect(4,4,52,6);
    ctx.font='3px monospace';ctx.fillStyle='#fff';
    ctx.fillText(player.hp+'/'+player.maxHp,6,5);

    // Jet fuel bar
    ctx.fillStyle='#1a1a2e';ctx.fillRect(4,12,32,4);
    var fuelPct=player.jetFuel/JET_MAX;
    var fuelCol=fuelPct>0.5?'#0ae':fuelPct>0.2?'#fa0':'#f44';
    ctx.fillStyle=fuelCol;ctx.fillRect(5,13,30*fuelPct,2);
    ctx.strokeStyle='#555';ctx.lineWidth=0.5;ctx.strokeRect(4,12,32,4);
    ctx.font='2.5px monospace';ctx.fillStyle=fuelPct>0.1?fuelCol:'#666';
    ctx.fillText('BOOST '+(fuelPct*100|0)+'%',5,12);

    // Dash CD
    if(player.dashCD>0){
      ctx.fillStyle='rgba(255,0,96,0.5)';ctx.fillText('DASH '+(player.dashCD.toFixed(1)),5,18);
    }else{
      ctx.fillStyle='#ff0060';ctx.fillText('DASH RDY',5,18);
    }

    // Kill count
    ctx.font=f;ctx.fillStyle='#fff';
    var skullX=4,skullY=23;
    ctx.fillStyle='#ccc';ctx.fillText('\u2620'+totalKills,skullX,skullY);

    // Score (top-right)
    ctx.textAlign='right';ctx.font=f;ctx.fillStyle='#0ef';
    ctx.fillText(''+score,LW-4,4);

    // Combo
    if(combo>1&&comboTimer>0){
      var ca=Math.min(1,comboTimer);
      ctx.fillStyle='rgba(255,0,96,'+ca+')';
      ctx.font='7px "Press Start 2P",monospace';
      ctx.textAlign='center';
      ctx.fillText('x'+combo,LW/2,20);
    }

    // Wave indicator (top-center)
    ctx.textAlign='center';ctx.font='4px "Press Start 2P",monospace';
    ctx.fillStyle='rgba(200,220,240,0.6)';
    ctx.fillText('WAVE '+(currentWave+1)+'/'+totalWaves,LW/2,4);

    // Weapon info (bottom)
    ctx.textAlign='left';ctx.font=f;
    var w=weapons[weaponIdx];
    ctx.fillStyle='rgb('+w.color[0]+','+w.color[1]+','+w.color[2]+')';
    ctx.fillText(w.name,4,LH-12);
    ctx.fillStyle='#ccc';ctx.font='4px monospace';
    var ammoTxt=w.ammo===Infinity?'INF':w.ammo+'/'+w.maxAmmo;
    ctx.fillText(ammoTxt,4,LH-6);

    // Weapon slots
    for(var i=0;i<3;i++){
      var wx=4+i*14,wy=LH-20;
      ctx.fillStyle=i===weaponIdx?'rgba(0,229,255,0.3)':'rgba(30,40,60,0.5)';
      ctx.fillRect(wx,wy,12,6);
      ctx.strokeStyle=i===weaponIdx?'#0ef':'#445';ctx.lineWidth=0.5;ctx.strokeRect(wx,wy,12,6);
      ctx.fillStyle=i===weaponIdx?'#fff':'#889';ctx.font='3px monospace';
      ctx.fillText(''+(i+1),wx+1,wy+1);
    }

    // Floor level indicator
    ctx.textAlign='right';ctx.font='3px monospace';
    var floorName=player.z<1?'GND':player.z<4?'LOW':player.z<8?'MID':player.z<11?'HIGH':'SKY';
    ctx.fillStyle='rgba(200,220,240,0.5)';
    ctx.fillText(floorName,LW-4,LH-6);

    // Crosshair (center) — changes when grapple target in range
    ctx.textAlign='center';
    var cx=LW/2,cy=LH/2;
    if(grappleInRange){
      // Grapple-ready crosshair: green + corner brackets
      var gAlpha=0.6+0.3*Math.sin(_time*8);
      ctx.strokeStyle='rgba(0,255,120,'+gAlpha+')';ctx.lineWidth=0.7;
      // Inner cross
      ctx.beginPath();ctx.moveTo(cx-4,cy);ctx.lineTo(cx-1.5,cy);ctx.stroke();
      ctx.beginPath();ctx.moveTo(cx+1.5,cy);ctx.lineTo(cx+4,cy);ctx.stroke();
      ctx.beginPath();ctx.moveTo(cx,cy-4);ctx.lineTo(cx,cy-1.5);ctx.stroke();
      ctx.beginPath();ctx.moveTo(cx,cy+1.5);ctx.lineTo(cx,cy+4);ctx.stroke();
      // Outer corner brackets (grapple indicator)
      var bs=6;
      ctx.beginPath();ctx.moveTo(cx-bs,cy-bs);ctx.lineTo(cx-bs,cy-bs+2);ctx.stroke();
      ctx.beginPath();ctx.moveTo(cx-bs,cy-bs);ctx.lineTo(cx-bs+2,cy-bs);ctx.stroke();
      ctx.beginPath();ctx.moveTo(cx+bs,cy-bs);ctx.lineTo(cx+bs,cy-bs+2);ctx.stroke();
      ctx.beginPath();ctx.moveTo(cx+bs,cy-bs);ctx.lineTo(cx+bs-2,cy-bs);ctx.stroke();
      ctx.beginPath();ctx.moveTo(cx-bs,cy+bs);ctx.lineTo(cx-bs,cy+bs-2);ctx.stroke();
      ctx.beginPath();ctx.moveTo(cx-bs,cy+bs);ctx.lineTo(cx-bs+2,cy+bs);ctx.stroke();
      ctx.beginPath();ctx.moveTo(cx+bs,cy+bs);ctx.lineTo(cx+bs,cy+bs-2);ctx.stroke();
      ctx.beginPath();ctx.moveTo(cx+bs,cy+bs);ctx.lineTo(cx+bs-2,cy+bs);ctx.stroke();
      // Center dot
      ctx.fillStyle='rgba(0,255,120,'+gAlpha+')';
      ctx.fillRect(cx-0.5,cy-0.5,1,1);
      // Label
      ctx.font='2px monospace';ctx.fillText('GRAPPLE',cx,cy+bs+3);
    }else{
      // Normal crosshair
      ctx.strokeStyle='rgba(0,229,255,0.7)';ctx.lineWidth=0.5;
      ctx.beginPath();ctx.moveTo(cx-4,cy);ctx.lineTo(cx-1.5,cy);ctx.stroke();
      ctx.beginPath();ctx.moveTo(cx+1.5,cy);ctx.lineTo(cx+4,cy);ctx.stroke();
      ctx.beginPath();ctx.moveTo(cx,cy-4);ctx.lineTo(cx,cy-1.5);ctx.stroke();
      ctx.beginPath();ctx.moveTo(cx,cy+1.5);ctx.lineTo(cx,cy+4);ctx.stroke();
      ctx.fillStyle='rgba(0,229,255,0.5)';
      ctx.fillRect(cx-0.5,cy-0.5,1,1);
    }

    // Minimap (top-right, below score)
    renderMinimap(LW-38,12,34,34);

    ctx.textAlign='left';
  }

  function renderMinimap(mx,my,mw,mh){
    ctx.fillStyle='rgba(10,15,25,0.7)';ctx.fillRect(mx,my,mw,mh);
    ctx.strokeStyle='rgba(0,229,255,0.3)';ctx.lineWidth=0.5;ctx.strokeRect(mx,my,mw,mh);
    var scale=mw/70; // 70 world units visible (wider map)
    var cx=mx+mw/2,cy=my+mh/2;
    // Platforms
    for(var i=0;i<platforms.length;i++){
      var pl=platforms[i];
      var rx=(pl.x-player.x)*scale,ry=-(pl.y-player.y)*scale;
      var rw=pl.w*scale,rh=pl.d*scale;
      if(Math.abs(rx)>mw/2+rw||Math.abs(ry)>mh/2+rh)continue;
      ctx.fillStyle='rgba(80,100,130,0.5)';
      ctx.fillRect(cx+rx-rw/2,cy+ry-rh/2,Math.max(1,rw),Math.max(1,rh));
    }
    // Enemies
    for(var i=0;i<enemies.length;i++){
      var e=enemies[i];
      var ex=(e.x-player.x)*scale,ey=-(e.y-player.y)*scale;
      if(Math.abs(ex)>mw/2||Math.abs(ey)>mh/2)continue;
      ctx.fillStyle='#f44';ctx.fillRect(cx+ex-1,cy+ey-1,2,2);
    }
    // Player
    ctx.fillStyle='#0ef';ctx.fillRect(cx-1,cy-1,2,2);
    // View cone
    var va=player.a,vr=FOV/2;
    ctx.strokeStyle='rgba(0,229,255,0.3)';ctx.lineWidth=0.3;
    ctx.beginPath();ctx.moveTo(cx,cy);
    ctx.lineTo(cx+Math.sin(va-vr)*10,cy-Math.cos(va-vr)*10);
    ctx.moveTo(cx,cy);
    ctx.lineTo(cx+Math.sin(va+vr)*10,cy-Math.cos(va+vr)*10);
    ctx.stroke();
  }

  // ===== DEBUG HUD =====
  function renderDebugHUD(){
    if(!debugMode)return;
    ctx.save();ctx.scale(SC,SC);
    // FPS counter
    debugFrames++;
    var nowSec=performance.now()/1000;
    if(nowSec-debugFpsTimer>=0.5){debugFps=Math.round(debugFrames/(nowSec-debugFpsTimer));debugFrames=0;debugFpsTimer=nowSec;}
    // Background panel
    var panelH=aiMode?108:76;
    ctx.fillStyle='rgba(0,0,0,0.65)';
    ctx.fillRect(2,30,68,panelH);
    ctx.strokeStyle='rgba(0,229,255,0.4)';ctx.lineWidth=0.5;
    ctx.strokeRect(2,30,68,panelH);
    ctx.font='3px monospace';ctx.textBaseline='top';ctx.textAlign='left';
    var lh=6,ty=32,tx=4;
    var c1='#0ef',c2='#ccc',c3='#fa0';
    // FPS
    ctx.fillStyle=debugFps>=28?c1:c3;ctx.fillText('FPS: '+debugFps,tx,ty);ty+=lh;
    // Position
    ctx.fillStyle=c2;ctx.fillText('X:'+player.x.toFixed(1)+' Y:'+player.y.toFixed(1),tx,ty);ty+=lh;
    ctx.fillText('Z:'+player.z.toFixed(2),tx,ty);ty+=lh;
    // Velocity
    var hspd=Math.sqrt(player.vx*player.vx+player.vy*player.vy);
    ctx.fillText('SPD:'+hspd.toFixed(1)+' VZ:'+player.vz.toFixed(1),tx,ty);ty+=lh;
    // State
    var floorName=player.z<1?'GND':player.z<4?'LOW':player.z<8?'MID':player.z<11?'HIGH':'SKY';
    ctx.fillStyle=c1;ctx.fillText('FLOOR:'+floorName,tx,ty);
    ctx.fillStyle=player.grounded?'#4f4':'#f44';ctx.fillText(player.grounded?' GND':' AIR',tx+30,ty);ty+=lh;
    // Momentum / Jet / Dash
    ctx.fillStyle=c2;ctx.fillText('MOM:'+player.mom.toFixed(2)+' JET:'+player.jetFuel.toFixed(1)+'/'+JET_MAX.toFixed(1),tx,ty);ty+=lh;
    ctx.fillText('DASH:'+player.dashCD.toFixed(1)+' iFRM:'+player.iFrames.toFixed(1),tx,ty);ty+=lh;
    // HP
    ctx.fillStyle=player.hp>60?'#4f4':player.hp>30?'#fa0':'#f44';
    ctx.fillText('HP:'+player.hp+'/'+player.maxHp,tx,ty);ty+=lh;
    // Enemies
    ctx.fillStyle=c2;ctx.fillText('ENEMIES:'+enemies.length+' WAVE:'+(currentWave+1)+'/'+totalWaves,tx,ty);ty+=lh;
    // Platforms count
    ctx.fillStyle=c2;ctx.fillText('PLAT:'+platforms.length+' DECO:'+decor.length,tx,ty);ty+=lh;
    // Nearest platform info
    var nearPl=null,nearD=Infinity;
    for(var i=0;i<platforms.length;i++){
      var pl=platforms[i];
      var dx=player.x-pl.x,dy=player.y-pl.y;
      var d=dx*dx+dy*dy;
      if(d<nearD&&player.z>=pl.z-1&&player.z<=pl.z+pl.h+2){nearD=d;nearPl=pl;}
    }
    if(nearPl){
      ty+=lh;
      ctx.fillStyle=c3;ctx.fillText('NEAR PLAT:',tx,ty);ty+=lh;
      ctx.fillStyle=c2;
      ctx.fillText(' pos:('+nearPl.x.toFixed(0)+','+nearPl.y.toFixed(0)+','+nearPl.z.toFixed(1)+')',tx,ty);ty+=lh;
      ctx.fillText(' sz:'+nearPl.w.toFixed(1)+'x'+nearPl.d.toFixed(1)+' h:'+nearPl.h.toFixed(1)+' top:'+(nearPl.z+nearPl.h).toFixed(1),tx,ty);
    }
    // AI status
    if(aiMode){
      ty+=lh+2;
      ctx.fillStyle='#0f8';ctx.fillText('AI: '+aiState.toUpperCase()+' t='+aiTimer.toFixed(0)+'s',tx,ty);ty+=lh;
      ctx.fillStyle=aiStuckTimer>0.5?'#f44':c2;ctx.fillText('STUCK:'+aiStuckTimer.toFixed(1),tx,ty);ty+=lh;
      // Last 3 log entries
      var logStart=Math.max(0,aiLog.length-3);
      ctx.fillStyle='#888';
      for(var li=logStart;li<aiLog.length;li++){
        ctx.fillText(aiLog[li].substring(0,30),tx,ty);ty+=lh;
      }
    }
    ctx.restore();
  }

  // ===== WEAPON DISPLAY =====
  function renderWeapon(){
    ctx.save();ctx.scale(SC,SC);
    var bob=Math.sin(player.bobPhase)*1.5;
    var w=weapons[weaponIdx];
    var recoil=w.timer>0?Math.max(0,(w.timer/(w.cd))*4):0;
    var wx=LW*0.62+recoil*0.5,wy=LH-20+bob+recoil;
    ctx.fillStyle='rgb('+w.color[0]+','+w.color[1]+','+w.color[2]+')';
    // Shadow
    ctx.fillStyle='rgba(0,0,0,0.2)';
    if(weaponIdx===0){ctx.fillRect(wx+1,wy+2,18,4);}
    else if(weaponIdx===1){ctx.fillRect(wx-3,wy+3,24,3);}
    else{ctx.fillRect(wx+1,wy+2,16,5);}
    ctx.fillStyle='rgb('+w.color[0]+','+w.color[1]+','+w.color[2]+')';
    if(weaponIdx===0){
      // Blaster - simple pistol shape
      ctx.fillRect(wx,wy,18,4);ctx.fillRect(wx+2,wy+4,4,6);
      ctx.fillStyle='rgba(255,255,255,0.3)';ctx.fillRect(wx+14,wy+1,3,2);
      ctx.fillStyle='rgba(0,0,0,0.15)';ctx.fillRect(wx,wy+3,18,1);
    }else if(weaponIdx===1){
      // Charger - long rifle
      ctx.fillRect(wx-4,wy+1,24,3);ctx.fillRect(wx+2,wy+4,4,6);
      ctx.fillRect(wx-4,wy,4,5);
      ctx.fillStyle='rgba(255,255,255,0.3)';ctx.fillRect(wx+16,wy+1,3,2);
      ctx.fillStyle='rgba(255,200,0,0.2)';ctx.fillRect(wx-4,wy+1,2,3);
      ctx.fillStyle='rgba(0,0,0,0.15)';ctx.fillRect(wx-4,wy+3,24,1);
    }else{
      // Scatter - wide shotgun
      ctx.fillRect(wx,wy,16,5);ctx.fillRect(wx+2,wy+5,4,5);
      ctx.fillRect(wx+12,wy-1,4,3);ctx.fillRect(wx+12,wy+4,4,3);
      ctx.fillStyle='rgba(255,255,255,0.3)';ctx.fillRect(wx+14,wy+1,2,2);
      ctx.fillStyle='rgba(0,0,0,0.15)';ctx.fillRect(wx,wy+4,16,1);
    }
    // Muzzle flash (enhanced)
    var flashT=w.timer/w.cd;
    if(flashT>0.7){
      var fi=(flashT-0.7)/0.3;
      ctx.globalAlpha=fi;
      ctx.fillStyle='rgba(255,255,200,0.9)';
      ctx.fillRect(wx+18,wy-2,5+fi*3|0,8);
      ctx.fillStyle='rgba(255,200,100,0.5)';
      ctx.fillRect(wx+16,wy-4,8+fi*4|0,12);
      ctx.globalAlpha=1;
    }
    ctx.restore();
  }

  // ===== SOUND (Web Audio API) =====
  var audioCtx=null;
  function ensureAudio(){if(!audioCtx)try{audioCtx=new(window.AudioContext||window.webkitAudioContext)();}catch(e){}}
  function playSound(type){
    if(!audioCtx||!window._tinyDesktopSound)return;
    try{
      var o,g,now=audioCtx.currentTime;
      g=audioCtx.createGain();g.connect(audioCtx.destination);
      switch(type){
        case'shoot0':
          o=audioCtx.createOscillator();o.type='square';o.frequency.setValueAtTime(880,now);
          o.frequency.exponentialRampToValueAtTime(220,now+0.08);
          g.gain.setValueAtTime(0.1,now);g.gain.exponentialRampToValueAtTime(0.001,now+0.1);
          o.connect(g);o.start(now);o.stop(now+0.1);break;
        case'shoot1':
          o=audioCtx.createOscillator();o.type='sawtooth';o.frequency.setValueAtTime(1200,now);
          o.frequency.exponentialRampToValueAtTime(100,now+0.15);
          g.gain.setValueAtTime(0.12,now);g.gain.exponentialRampToValueAtTime(0.001,now+0.18);
          o.connect(g);o.start(now);o.stop(now+0.18);break;
        case'shoot2':
          var buf=audioCtx.createBuffer(1,audioCtx.sampleRate*0.08|0,audioCtx.sampleRate);
          var d=buf.getChannelData(0);for(var i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*0.3;
          var n=audioCtx.createBufferSource();n.buffer=buf;n.connect(g);
          g.gain.setValueAtTime(0.15,now);g.gain.exponentialRampToValueAtTime(0.001,now+0.1);
          n.start(now);break;
        case'hit':
          o=audioCtx.createOscillator();o.type='square';o.frequency.setValueAtTime(600,now);
          o.frequency.exponentialRampToValueAtTime(200,now+0.05);
          g.gain.setValueAtTime(0.08,now);g.gain.exponentialRampToValueAtTime(0.001,now+0.06);
          o.connect(g);o.start(now);o.stop(now+0.06);break;
        case'explode':
          var buf=audioCtx.createBuffer(1,audioCtx.sampleRate*0.3|0,audioCtx.sampleRate);
          var d=buf.getChannelData(0);for(var i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);
          var n=audioCtx.createBufferSource();n.buffer=buf;n.connect(g);
          g.gain.setValueAtTime(0.15,now);g.gain.exponentialRampToValueAtTime(0.001,now+0.3);
          n.start(now);break;
        case'hurt':
          o=audioCtx.createOscillator();o.type='sawtooth';o.frequency.setValueAtTime(200,now);
          o.frequency.exponentialRampToValueAtTime(80,now+0.15);
          g.gain.setValueAtTime(0.12,now);g.gain.exponentialRampToValueAtTime(0.001,now+0.15);
          o.connect(g);o.start(now);o.stop(now+0.15);break;
        case'jump':
          o=audioCtx.createOscillator();o.type='sine';o.frequency.setValueAtTime(300,now);
          o.frequency.exponentialRampToValueAtTime(600,now+0.08);
          g.gain.setValueAtTime(0.06,now);g.gain.exponentialRampToValueAtTime(0.001,now+0.1);
          o.connect(g);o.start(now);o.stop(now+0.1);break;
        case'jet':
          // Low rumble + hiss for jetpack thrust
          var buf2=audioCtx.createBuffer(1,audioCtx.sampleRate*0.08|0,audioCtx.sampleRate);
          var d2=buf2.getChannelData(0);for(var i=0;i<d2.length;i++)d2[i]=(Math.random()*2-1)*0.2;
          var n2=audioCtx.createBufferSource();n2.buffer=buf2;
          var lp=audioCtx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=600;
          n2.connect(lp);lp.connect(g);
          g.gain.setValueAtTime(0.07,now);g.gain.exponentialRampToValueAtTime(0.001,now+0.1);
          n2.start(now);break;
        case'wallrun':
          o=audioCtx.createOscillator();o.type='triangle';o.frequency.setValueAtTime(400,now);
          o.frequency.exponentialRampToValueAtTime(800,now+0.1);
          g.gain.setValueAtTime(0.05,now);g.gain.exponentialRampToValueAtTime(0.001,now+0.12);
          o.connect(g);o.start(now);o.stop(now+0.12);break;
        case'dash':
          var buf=audioCtx.createBuffer(1,audioCtx.sampleRate*0.1|0,audioCtx.sampleRate);
          var d=buf.getChannelData(0);for(var i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*0.5*(1-i/d.length);
          var n=audioCtx.createBufferSource();n.buffer=buf;n.connect(g);
          g.gain.setValueAtTime(0.1,now);g.gain.exponentialRampToValueAtTime(0.001,now+0.1);
          n.start(now);break;
        case'grapple':
          o=audioCtx.createOscillator();o.type='sine';o.frequency.setValueAtTime(200,now);
          o.frequency.linearRampToValueAtTime(1200,now+0.15);
          g.gain.setValueAtTime(0.06,now);g.gain.exponentialRampToValueAtTime(0.001,now+0.2);
          o.connect(g);o.start(now);o.stop(now+0.2);break;
        case'enemyshoot':
          o=audioCtx.createOscillator();o.type='square';o.frequency.setValueAtTime(400,now);
          o.frequency.exponentialRampToValueAtTime(150,now+0.06);
          g.gain.setValueAtTime(0.04,now);g.gain.exponentialRampToValueAtTime(0.001,now+0.08);
          o.connect(g);o.start(now);o.stop(now+0.08);break;
        case'wavestart':
          o=audioCtx.createOscillator();o.type='sine';
          o.frequency.setValueAtTime(440,now);o.frequency.setValueAtTime(554,now+0.1);
          o.frequency.setValueAtTime(659,now+0.2);o.frequency.setValueAtTime(880,now+0.3);
          g.gain.setValueAtTime(0.08,now);g.gain.exponentialRampToValueAtTime(0.001,now+0.5);
          o.connect(g);o.start(now);o.stop(now+0.5);break;
        case'win':
          o=audioCtx.createOscillator();o.type='sine';
          o.frequency.setValueAtTime(523,now);o.frequency.setValueAtTime(659,now+0.15);
          o.frequency.setValueAtTime(784,now+0.3);o.frequency.setValueAtTime(1047,now+0.45);
          g.gain.setValueAtTime(0.1,now);g.gain.exponentialRampToValueAtTime(0.001,now+0.7);
          o.connect(g);o.start(now);o.stop(now+0.7);break;
        case'death':
          o=audioCtx.createOscillator();o.type='sawtooth';
          o.frequency.setValueAtTime(300,now);o.frequency.exponentialRampToValueAtTime(40,now+0.6);
          g.gain.setValueAtTime(0.12,now);g.gain.exponentialRampToValueAtTime(0.001,now+0.6);
          o.connect(g);o.start(now);o.stop(now+0.6);break;
        case'pickup':
          o=audioCtx.createOscillator();o.type='sine';
          o.frequency.setValueAtTime(600,now);o.frequency.setValueAtTime(900,now+0.06);
          o.frequency.setValueAtTime(1200,now+0.12);
          g.gain.setValueAtTime(0.08,now);g.gain.exponentialRampToValueAtTime(0.001,now+0.2);
          o.connect(g);o.start(now);o.stop(now+0.2);break;
      }
    }catch(e){}
  }

  // ===== ACTION HELPERS (shared by input + AI) =====
  function tryDash(){
    if(player.dashCD>0||player.dashTimer>0)return false;
    player.dashTimer=DASH_T;player.dashCD=DASH_CD;
    var dx=0,dy=0;
    if(keys.w){dx+=Math.sin(player.a);dy+=Math.cos(player.a);}
    if(keys.s){dx-=Math.sin(player.a);dy-=Math.cos(player.a);}
    if(keys.a){dx-=Math.cos(player.a);dy+=Math.sin(player.a);}
    if(keys.d){dx+=Math.cos(player.a);dy-=Math.sin(player.a);}
    var dl=Math.sqrt(dx*dx+dy*dy);
    if(dl>0.01){dx/=dl;dy/=dl;}else{dx=Math.sin(player.a);dy=Math.cos(player.a);}
    player.dashDx=dx;player.dashDy=dy;
    playSound('dash');return true;
  }
  function tryGrapple(){
    if(player.grappling)return false;
    var fwd=[Math.sin(player.a)*Math.cos(player.p),Math.cos(player.a)*Math.cos(player.p),Math.sin(player.p)];
    var bestD=GRAP_RNG,bestPt=null;
    var grapTol=0.3; // expand hitbox slightly for forgiving aim
    for(var i=0;i<platforms.length;i++){
      var pl=platforms[i],hw=pl.w/2+grapTol,hd=pl.d/2+grapTol;
      var ox=player.x,oy=player.y,oz=player.z+PLAYER_EYE;
      var tmin=0,tmax=GRAP_RNG;
      var dims=[[ox,fwd[0],pl.x-hw,pl.x+hw],[oy,fwd[1],pl.y-hd,pl.y+hd],[oz,fwd[2],pl.z,pl.z+pl.h]];
      var valid=true;
      for(var d=0;d<3;d++){
        var o=dims[d][0],dir=dims[d][1],mn=dims[d][2],mx=dims[d][3];
        if(Math.abs(dir)<0.0001){if(o<mn||o>mx){valid=false;break;}}
        else{var t1=(mn-o)/dir,t2=(mx-o)/dir;if(t1>t2){var tmp=t1;t1=t2;t2=tmp;}
          tmin=Math.max(tmin,t1);tmax=Math.min(tmax,t2);if(tmin>tmax){valid=false;break;}}
      }
      if(valid&&tmin<bestD&&tmin>0.2){bestD=tmin;bestPt=[ox+fwd[0]*tmin,oy+fwd[1]*tmin,oz+fwd[2]*tmin];}
    }
    if(bestPt){player.grappling=true;player.grapX=bestPt[0];player.grapY=bestPt[1];player.grapZ=bestPt[2];playSound('grapple');return true;}
    return false;
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
        if(gameState==='playing'&&pointerLocked){document.exitPointerLock();}
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
    if(gameState==='title'){startGame();return;}
    if(gameState==='win'||gameState==='gameover'){if(stateTimer<=0){gameState='title';_ovActive='';updateOverlay();}return;}
    if(gameState==='playing'&&!pointerLocked&&!isMobileFps){canvas.requestPointerLock();return;}
    if(gameState==='playing'&&(pointerLocked||isMobileFps)){mouseDown=true;playerShoot();}
  });
  canvas.addEventListener('mouseup',function(){mouseDown=false;});
  canvas.addEventListener('wheel',function(e){
    if(gameState==='playing'){
      weaponIdx=(weaponIdx+(e.deltaY>0?1:-1)+3)%3;
    }
  });
  document.addEventListener('pointerlockchange',function(){
    pointerLocked=document.pointerLockElement===canvas;
    if(!pointerLocked){keys.w=keys.a=keys.s=keys.d=keys.sp=false;mouseDown=false;}
  });

  // ===== MOBILE TOUCH =====
  var touches={move:null,look:null,moveId:-1,lookId:-1};
  var mobBtns=[
    {id:'fire',x:0.88,y:0.55,r:0.06,active:false},
    {id:'jump',x:0.88,y:0.75,r:0.05,active:false},
    {id:'dash',x:0.76,y:0.65,r:0.04,active:false}
  ];
  if(isMobileFps){
    canvas.addEventListener('touchstart',function(e){
      e.preventDefault();
      if(gameState==='title'){startGame();return;}
      if((gameState==='win'||gameState==='gameover')&&stateTimer<=0){gameState='title';_ovActive='';updateOverlay();return;}
      for(var i=0;i<e.changedTouches.length;i++){
        var t=e.changedTouches[i];
        var tx=t.clientX/canvas.clientWidth,ty=t.clientY/canvas.clientHeight;
        // Check buttons
        var hitBtn=false;
        for(var b=0;b<mobBtns.length;b++){
          var btn=mobBtns[b];
          if(Math.abs(tx-btn.x)<btn.r*2&&Math.abs(ty-btn.y)<btn.r*2){
            btn.active=true;
            if(btn.id==='fire')playerShoot();
            if(btn.id==='jump'){if(!keys.sp)spJustPressed=true;keys.sp=true;}
            if(btn.id==='dash'&&player.dashCD<=0){
              player.dashTimer=DASH_T;player.dashCD=DASH_CD;
              player.dashDx=Math.sin(player.a);player.dashDy=Math.cos(player.a);
              playSound('dash');
            }
            hitBtn=true;break;
          }
        }
        if(!hitBtn){
          if(tx<0.4){touches.moveId=t.identifier;touches.move={x:t.clientX,y:t.clientY,sx:t.clientX,sy:t.clientY};}
          else if(tx<0.7){touches.lookId=t.identifier;touches.look={x:t.clientX,y:t.clientY};}
        }
      }
    },{passive:false});
    canvas.addEventListener('touchmove',function(e){
      e.preventDefault();
      for(var i=0;i<e.changedTouches.length;i++){
        var t=e.changedTouches[i];
        if(t.identifier===touches.moveId&&touches.move){
          var dx=(t.clientX-touches.move.sx)/40,dy=(t.clientY-touches.move.sy)/40;
          dx=Math.max(-1,Math.min(1,dx));dy=Math.max(-1,Math.min(1,dy));
          keys.w=dy<-0.2;keys.s=dy>0.2;keys.a=dx<-0.2;keys.d=dx>0.2;
        }
        if(t.identifier===touches.lookId&&touches.look){
          player.a+=(t.clientX-touches.look.x)*0.005;
          player.p-=(t.clientY-touches.look.y)*0.005;
          player.p=Math.max(-PI*0.48,Math.min(PI*0.48,player.p));
          touches.look.x=t.clientX;touches.look.y=t.clientY;
        }
      }
    },{passive:false});
    canvas.addEventListener('touchend',function(e){
      for(var i=0;i<e.changedTouches.length;i++){
        var t=e.changedTouches[i];
        if(t.identifier===touches.moveId){touches.moveId=-1;touches.move=null;keys.w=keys.a=keys.s=keys.d=false;}
        if(t.identifier===touches.lookId){touches.lookId=-1;touches.look=null;}
        // Deactivate buttons
        for(var b=0;b<mobBtns.length;b++){
          mobBtns[b].active=false;
          if(mobBtns[b].id==='jump')keys.sp=false;
        }
      }
    });
  }

  // ===== MOBILE HUD OVERLAY =====
  function renderMobileHUD(){
    if(!isMobileFps)return;
    ctx.save();ctx.scale(SC,SC);
    // Move stick zone
    ctx.strokeStyle='rgba(0,229,255,0.2)';ctx.lineWidth=0.5;
    ctx.beginPath();ctx.arc(LW*0.15,LH*0.7,18,0,TAU);ctx.stroke();
    // Look zone
    ctx.strokeStyle='rgba(255,0,96,0.15)';
    ctx.beginPath();ctx.arc(LW*0.55,LH*0.7,18,0,TAU);ctx.stroke();
    // Buttons
    for(var i=0;i<mobBtns.length;i++){
      var b=mobBtns[i];
      var bx=b.x*LW,by=b.y*LH,br=b.r*LW;
      ctx.fillStyle=b.active?'rgba(255,255,255,0.2)':'rgba(255,255,255,0.08)';
      ctx.beginPath();ctx.arc(bx,by,br,0,TAU);ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,0.3)';ctx.stroke();
      ctx.fillStyle='#fff';ctx.font='3px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(b.id.toUpperCase(),bx,by);
    }
    ctx.restore();
  }

  // ===== WINDOW STATE =====
  function isFpsActive(){
    var w=document.getElementById('window-fps');
    if(!w)return false;
    if(w.classList.contains('closed')||w.classList.contains('minimized'))return false;
    var z=parseInt(w.style.zIndex)||0;
    var maxZ=z;
    var wins=document.querySelectorAll('.window:not(.closed):not(.minimized)');
    for(var i=0;i<wins.length;i++){var wz=parseInt(wins[i].style.zIndex)||0;if(wz>maxZ)maxZ=wz;}
    return z>=maxZ;
  }

  // Pointer lock release on window close/minimize
  var _wfps=document.getElementById('window-fps');
  if(_wfps){
    new MutationObserver(function(){
      if(_wfps.classList.contains('closed')||_wfps.classList.contains('minimized')){
        if(pointerLocked)document.exitPointerLock();
      }
    }).observe(_wfps,{attributes:true,attributeFilter:['class']});
  }

  // ===== AI TEST MODE =====
  // Human-like AI: smooth rotation, keys-only movement, no teleporting.
  var AI_TURN_SPD=3.5; // rad/s — how fast the AI rotates (like mouse speed)
  var AI_PITCH_SPD=2.0;
  var aiWaypoints=[];
  var aiStuckTimer=0,aiLastPos={x:0,y:0,z:0};
  var aiWpIdx=0,aiDashCD=0,aiGrapCD=0;

  function aiInit(){
    aiLog=[];aiTimer=0;aiState='explore';aiTarget=null;
    aiStuckTimer=0;aiWpIdx=0;aiDashCD=0;aiGrapCD=0;
    aiWaypoints=[];
    for(var i=0;i<spawnPts.length;i++){
      for(var j=0;j<spawnPts[i].length;j++){
        aiWaypoints.push({x:spawnPts[i][j].x,y:spawnPts[i][j].y,z:spawnPts[i][j].z+1});
      }
    }
    aiWaypoints.push({x:0,y:0,z:1});
    aiLog.push('[AI] Started — '+aiWaypoints.length+' waypoints');
  }

  // Smoothly rotate player.a toward target angle (shortest path)
  function aiAimYaw(targetA,dt){
    var diff=targetA-player.a;
    // Normalize to -PI..PI
    while(diff>PI)diff-=TAU;
    while(diff<-PI)diff+=TAU;
    var step=AI_TURN_SPD*dt;
    if(Math.abs(diff)<step)player.a=targetA;
    else player.a+=Math.sign(diff)*step;
  }
  function aiAimPitch(targetP,dt){
    var diff=targetP-player.p;
    var step=AI_PITCH_SPD*dt;
    if(Math.abs(diff)<step)player.p=targetP;
    else player.p+=Math.sign(diff)*step;
    player.p=Math.max(-PI*0.48,Math.min(PI*0.48,player.p));
  }

  function aiUpdate(dt){
    if(!aiMode||gameState!=='playing')return;
    aiTimer+=dt;
    if(aiDashCD>0)aiDashCD-=dt;
    if(aiGrapCD>0)aiGrapCD-=dt;

    // --- Stuck detection ---
    var pdx=player.x-aiLastPos.x,pdy=player.y-aiLastPos.y;
    var moved=Math.sqrt(pdx*pdx+pdy*pdy);
    if(moved<0.1*dt)aiStuckTimer+=dt; else aiStuckTimer=0;
    aiLastPos.x=player.x;aiLastPos.y=player.y;aiLastPos.z=player.z;
    if(aiStuckTimer>2.0){
      aiLog.push('[AI] STUCK ('+player.x.toFixed(1)+','+player.y.toFixed(1)+') t='+aiTimer.toFixed(0));
      // Unstick: jump + try dash
      if(!keys.sp)spJustPressed=true;
      keys.sp=true;
      if(aiDashCD<=0){tryDash();aiDashCD=2;}
      aiStuckTimer=0;aiTarget=null;
      return;
    }

    // --- Reset all keys each frame (AI sets what it needs) ---
    keys.w=false;keys.a=false;keys.s=false;keys.d=false;
    keys.sp=false;mouseDown=false;

    // --- Find nearest enemy ---
    var nearE=null,nearD=999;
    for(var i=0;i<enemies.length;i++){
      var ex=enemies[i].x-player.x,ey=enemies[i].y-player.y;
      var ed=Math.sqrt(ex*ex+ey*ey);
      if(ed<nearD){nearD=ed;nearE=enemies[i];}
    }

    if(nearE&&nearD<25){
      // ===== FIGHT =====
      aiState='fight';
      var dx=nearE.x-player.x,dy=nearE.y-player.y;
      var dz=(nearE.z+0.5)-(player.z+PLAYER_EYE);
      var hd=Math.sqrt(dx*dx+dy*dy);

      // Smooth aim toward enemy
      aiAimYaw(Math.atan2(dx,dy),dt);
      aiAimPitch(Math.atan2(dz,hd),dt);

      // Shoot when roughly aimed (within 0.3 rad ≈ 17°)
      var aimErr=Math.abs(Math.atan2(dx,dy)-player.a);
      while(aimErr>PI)aimErr-=TAU;
      if(Math.abs(aimErr)<0.3)mouseDown=true;

      // Movement: approach if far, back up if close, strafe around
      if(nearD>10)keys.w=true;
      else if(nearD<4)keys.s=true;
      keys.a=Math.sin(aiTimer*1.5)>0.2;
      keys.d=Math.sin(aiTimer*1.5)<-0.2;

      // Weapon distance swap
      if(nearD<5)weaponIdx=2;
      else if(nearD>15)weaponIdx=1;
      else weaponIdx=0;

      // Jetpack dodge (periodic hops)
      if(Math.sin(aiTimer*2)>0.6)keys.sp=true;

      // Dash to dodge (every 3s)
      if(aiDashCD<=0&&nearD<8){
        tryDash();aiDashCD=3;
        aiLog.push('[AI] Dash dodge t='+aiTimer.toFixed(0));
      }
    }else{
      // ===== EXPLORE =====
      aiState='explore';

      // Pick next waypoint
      if(!aiTarget||aiReachedTarget()){
        aiWpIdx=(aiWpIdx+1)%aiWaypoints.length;
        aiTarget=aiWaypoints[aiWpIdx];
        aiLog.push('[AI] -> WP#'+aiWpIdx+' ('+aiTarget.x.toFixed(0)+','+aiTarget.y.toFixed(0)+') t='+aiTimer.toFixed(0));
      }

      // Aim toward target
      var tdx=aiTarget.x-player.x,tdy=aiTarget.y-player.y;
      var thd=Math.sqrt(tdx*tdx+tdy*tdy);
      var targetA=Math.atan2(tdx,tdy);
      aiAimYaw(targetA,dt);

      // Look slightly up/down based on height difference
      var tdz=aiTarget.z-player.z;
      aiAimPitch(Math.atan2(tdz,Math.max(thd,1))*0.5,dt);

      // Walk forward (W key) when facing roughly toward target
      var facingDiff=targetA-player.a;
      while(facingDiff>PI)facingDiff-=TAU;
      while(facingDiff<-PI)facingDiff+=TAU;
      if(Math.abs(facingDiff)<1.0)keys.w=true; // walk when within ~57°

      // Jetpack if target is higher
      if(aiTarget.z>player.z+0.8)keys.sp=true;
      // Jump off edges (if falling)
      if(!player.grounded&&player.vz<-2)keys.sp=true;

      // Grapple test (when in range, every 5s)
      if(grappleInRange&&aiGrapCD<=0){
        if(tryGrapple()){
          aiLog.push('[AI] Grapple! t='+aiTimer.toFixed(0));
          aiGrapCD=5;
        }
      }
      // Dash test (every 8s while moving)
      if(aiDashCD<=0&&keys.w&&player.grounded&&Math.random()<0.01){
        tryDash();aiDashCD=8;
        aiLog.push('[AI] Dash! t='+aiTimer.toFixed(0));
      }
    }
  }

  function aiReachedTarget(){
    if(!aiTarget)return true;
    var dx=aiTarget.x-player.x,dy=aiTarget.y-player.y;
    return Math.sqrt(dx*dx+dy*dy)<3;
  }

  // ===== GAME FLOW =====
  function startGame(){
    ensureAudio();
    gameState='playing';
    score=0;combo=0;maxCombo=0;totalKills=0;gameTime=0;comboTimer=0;
    currentWave=0;
    resetPlayer();
    enemies=[];bullets=[];enemyBullets=[];particles=[];dmgNums=[];pickups=[];
    refillAmmo();weaponIdx=0;
    genWorld();genClouds();genAmbient();allGeo=platforms.concat(decor);
    startWave(0);
    if(!isMobileFps)canvas.requestPointerLock();
  }

  // ===== GAME LOOP =====
  var lastTime=0;
  function gameLoop(time){
    requestAnimationFrame(gameLoop);
    if(!isFpsActive()){lastTime=time;return;}
    var dt=Math.min(0.05,(time-lastTime)/1000);
    lastTime=time;
    _time+=dt;

    updateOverlay();
    updateOverlayPrompts();

    if(gameState==='playing'){
      if(waveAnnounceTimer>0){
        waveAnnounceTimer-=dt;
        if(waveAnnounceTimer<=0){
          waveAnnounceTimer=0;
          spawnWaveEnemies(currentWave);
          _ovActive='';updateOverlay();
        }
      }

      if(waveAnnounceTimer<=0&&(pointerLocked||isMobileFps||aiMode)){
        if(aiMode)aiUpdate(dt);
        gameTime+=dt;
        // Auto-fire on hold
        if(mouseDown){
          var w=weapons[weaponIdx];
          if(w.timer<=0)playerShoot();
        }
        resolvePhysics(dt);
        if(player.iFrames>0)player.iFrames-=dt;
        updateEnemies(dt);
        updateBullets(dt);
        updateParticles(dt);
        updateDmgNums(dt);
        updatePickups(dt);
        updateAmbient(dt);
        // Grapple range check (for crosshair indicator) — uses same tolerance as tryGrapple
        grappleInRange=false;
        if(!player.grappling){
          var gfwd=[Math.sin(player.a)*Math.cos(player.p),Math.cos(player.a)*Math.cos(player.p),Math.sin(player.p)];
          var gox=player.x,goy=player.y,goz=player.z+PLAYER_EYE;
          var grTol=0.3;
          for(var gi=0;gi<platforms.length;gi++){
            var gpl=platforms[gi],ghw=gpl.w/2+grTol,ghd=gpl.d/2+grTol;
            var gtmin=0,gtmax=GRAP_RNG;
            var gdims=[[gox,gfwd[0],gpl.x-ghw,gpl.x+ghw],[goy,gfwd[1],gpl.y-ghd,gpl.y+ghd],[goz,gfwd[2],gpl.z,gpl.z+gpl.h]];
            var gvalid=true;
            for(var gd=0;gd<3;gd++){
              var go=gdims[gd][0],gdir=gdims[gd][1],gmn=gdims[gd][2],gmx=gdims[gd][3];
              if(Math.abs(gdir)<0.0001){if(go<gmn||go>gmx){gvalid=false;break;}}
              else{var gt1=(gmn-go)/gdir,gt2=(gmx-go)/gdir;if(gt1>gt2){var gtmp=gt1;gt1=gt2;gt2=gtmp;}gtmin=Math.max(gtmin,gt1);gtmax=Math.min(gtmax,gt2);if(gtmin>gtmax){gvalid=false;break;}}
            }
            if(gvalid&&gtmin>0.2&&gtmin<=GRAP_RNG){grappleInRange=true;break;}
          }
        }
        // Dash particles
        if(player.dashTimer>0)spawnDashParticles();
        // Screen shake decay
        if(screenShake>0)screenShake*=Math.max(0,1-8*dt);
        // Damage flash decay
        if(dmgFlash>0)dmgFlash-=dt;
        // Combo decay
        if(comboTimer>0){comboTimer-=dt;if(comboTimer<=0)combo=0;}
        // Check wave
        checkWaveComplete();
      }
    }

    if(stateTimer>0)stateTimer-=dt;

    // Render
    if(gameState==='playing'&&waveAnnounceTimer<=0){
      // Apply screen shake
      if(screenShake>0.1){
        ctx.save();
        ctx.translate((Math.random()-0.5)*screenShake*SC,(Math.random()-0.5)*screenShake*SC);
      }
      renderWorld();
      renderWeapon();
      renderMobileHUD();
      renderDebugHUD();
      if(screenShake>0.1)ctx.restore();
    }else if(gameState==='title'||gameState==='win'||gameState==='gameover'||
             (gameState==='playing'&&waveAnnounceTimer>0)){
      // Render static scene for background
      renderWorld();
      renderDebugHUD();
    }else if(gameState==='playing'&&!pointerLocked&&!isMobileFps){
      // Paused - still render world
      renderWorld();
      renderWeapon();
      renderDebugHUD();
    }
  }

  // ===== INIT =====
  genWorld();
  genClouds();
  genAmbient();
  updateOverlay();
  requestAnimationFrame(gameLoop);
})();
