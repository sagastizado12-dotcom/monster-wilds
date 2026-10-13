// ===== Monster Wilds: engine =====
'use strict';
const VW=320,VH=240,TS=16,SAVE_KEY='monsterwilds_save_v1';
const C=document.getElementById('game'),X=C.getContext('2d');
X.imageSmoothingEnabled=false;
let S=null; // persistent state
const G={mode:'title',mv:null,held:new Set(),frame:0,busy:false,lastAuto:0,toast:null,toastT:0,zoneShown:null};
window.G=G;
const $=id=>document.getElementById(id);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const ri=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
function hash(s){let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function fmt(t){return S?String(t).replace(/@NAME/g,S.name).replace(/@RIVAL/g,S.rival):t;}

// ===== Monsters =====
let UIDC=1;
function calcStats(sp,lv){const b=SPECIES[sp].base;const f=x=>Math.floor(2*x*lv/100)+5;return {hp:Math.floor(2*b[0]*lv/100)+lv+10,atk:f(b[1]),def:f(b[2]),spa:f(b[3]),spd:f(b[4]),spe:f(b[5])};}
function stats(m){return m.ov?Object.assign({},m.ov):calcStats(m.sp,m.lv);}
function ppOf(n){const p=MOVES[n].pow;return p>=120?5:p>=90?10:p===0?20:25;}
function setMovesForLevel(m){const L=SPECIES[m.sp].learn.filter(x=>x[0]<=m.lv).map(x=>x[1]);m.moves=L.slice(-4).map(n=>({n,pp:ppOf(n)}));}
function speciesForLevel(sp,lv){const line=evoLine(sp);let cur=line[0];while(SPECIES[cur].evo&&lv>=SPECIES[cur].evo.lv)cur=SPECIES[cur].evo.to;return cur;}
function mkMon(sp,lv,wild){const m={uid:(Date.now()%1e8)+'_'+(UIDC++)+'_'+ri(0,999),sp,lv,xp:lv**3,st:null,ov:null,moves:[]};setMovesForLevel(m);m.hp=stats(m).hp;return m;}
function mname(m){return m.nick||m.sp;}
function alive(p){return p.filter(m=>m.hp>0);}
function healAll(){if(window.SFX&&S&&G.mode==='world')SFX.play('heal');for(const m of S.party.concat(S.box)){m.hp=stats(m).hp;m.st=null;m.moves.forEach(x=>x.pp=ppOf(x.n));}}
function markCaught(sp){S.seen[sp]=1;S.caught[sp]=1;}
function addMon(m){markCaught(m.sp);if(S.party.length<6){S.party.push(m);return 'party';}S.box.push(m);return 'box';}
// returns list of messages; handles level-ups & move learning; evolution done separately
function gainXP(m,amt){const msgs=[];if(m.lv>=100)return msgs;m.xp+=amt;msgs.push(mname(m)+' gained '+amt+' XP!');
 while(m.lv<100&&m.xp>=(m.lv+1)**3){const before=calcStats(m.sp,m.lv);m.lv++;const after=calcStats(m.sp,m.lv);
  if(m.ov){for(const k in m.ov)m.ov[k]+=Math.max(1,after[k]-before[k]);}
  m.hp+=Math.max(1,(m.ov?1:0)+after.hp-before.hp);m.hp=Math.min(m.hp,stats(m).hp);
  msgs.push(mname(m)+' grew to Lv '+m.lv+'!');if(window.SFX)SFX.play('level');
  for(const [l,n] of SPECIES[m.sp].learn)if(l===m.lv&&!m.moves.find(x=>x.n===n)){if(m.moves.length>=4){const old=m.moves.shift();msgs.push(mname(m)+' forgot '+old.n+'...');}m.moves.push({n,pp:ppOf(n)});msgs.push(mname(m)+' learned '+n+'!');}
 }return msgs;}
function checkEvo(m){const s=SPECIES[m.sp];if(s.evo&&m.lv>=s.evo.lv){const from=m.sp;const oldMax=stats(m).hp;m.sp=s.evo.to;if(!m.ov){m.hp+=stats(m).hp-oldMax;}markCaught(m.sp);
  for(const [l,n] of SPECIES[m.sp].learn)if(l<=m.lv&&!m.moves.find(x=>x.n===n)&&!SPECIES[from].learn.find(x=>x[1]===n)){if(m.moves.length>=4)m.moves.shift();m.moves.push({n,pp:ppOf(n)});}
  return from;}return null;}

// ===== Mandara artwork (bundled locally) =====
const ART={Mandara:{src:'assets/mandara.png',cut:true,pal:{skin:'#c02020',hair:'#101010',arm:'#1a1a1a',trim:'#d4a030',wep:'#ff3020',bg:['#200808','#601010'],crown:'horns'}},
 Mancaco:{src:'assets/mancaco.png',cut:true,pal:{skin:'#e8c878',hair:'#f8f0d0',arm:'#f4f4f8',trim:'#e8c040',wep:'#fff8a0',bg:['#fffaf0','#e0b040'],crown:'halo'}},
 Mantermo:{src:'assets/mantermo.png',cut:true,pal:{skin:'#5080c0',hair:'#103050',arm:'#183850',trim:'#40e0e0',wep:'#80f0ff',bg:['#082a48','#20a8b0'],crown:'fins'}}};
const MONIMG={};SPRAW.split('\n').forEach(l=>{const n=l.split('|')[0];if(!n||['Mandara','Mancaco','Mantermo'].includes(n))return;const o={img:new Image(),ok:false};o.img.onload=()=>{o.ok=true;clearTimeout(MONIMG._t);MONIMG._t=setTimeout(()=>{document.querySelectorAll('.spr').forEach(e=>{e.innerHTML='';});if(typeof paintSprites==='function')paintSprites(document);},50);};o.img.onerror=()=>{o.ok=false;};o.img.src='assets/monsters/'+n.toLowerCase()+'.png';MONIMG[n]=o;});
function drawMonImg(ctx,sp,cx,cy,size,back){const o=MONIMG[sp];if(!o||!o.ok)return false;const im=o.img,b=size*1.35,r=b/Math.max(im.naturalWidth,im.naturalHeight),w=im.naturalWidth*r,h=im.naturalHeight*r;ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.translate(cx,cy+size*0.5-h);if(back)ctx.scale(-1,1);if(window.MFX&&!MFX.red()&&size>=24){const n=8,iw=im.naturalWidth,ih=im.naturalHeight,t=performance.now()/1000+(hash(sp)%50)/9;for(let i=0;i<n;i++){const dx=Math.sin(t*2.2+i*0.75)*w*0.014*(1-i/n);ctx.drawImage(im,0,ih*i/n,iw,ih/n+1,-w/2+dx,h*i/n,w,h/n+0.6);}}else ctx.drawImage(im,-w/2,0,w,h);ctx.restore();return true;}
for(const k in ART){const a=ART[k];a.img=new Image();a.ok=false;a.img.onload=()=>{a.ok=true;};a.img.onerror=()=>{a.ok=false;};a.img.src=a.src;}
const MIMG=ART.Mandara.img;
function artOk(sp){return ART[sp]&&ART[sp].ok&&ART[sp].img.naturalWidth>0;}
function drawWarrior(ctx,sp,cx,cy,size,withBg){const p=ART[sp].pal,k=size/100;ctx.save();ctx.translate(cx,cy);
 if(withBg){const g=ctx.createLinearGradient(0,-60*k,0,60*k);g.addColorStop(0,p.bg[0]);g.addColorStop(1,p.bg[1]);ctx.fillStyle=g;ctx.fillRect(-70*k,-62*k,140*k,124*k);}
 ctx.fillStyle=p.hair;ctx.beginPath();ctx.ellipse(-4*k,-28*k,16*k,30*k,0.2,0,7);ctx.fill();
 ctx.fillStyle=p.arm;ctx.fillRect(-14*k,20*k,10*k,34*k);ctx.fillRect(4*k,20*k,10*k,34*k);
 ctx.fillStyle=p.trim;ctx.fillRect(-14*k,30*k,10*k,3*k);ctx.fillRect(4*k,30*k,10*k,3*k);
 ctx.fillStyle=p.skin;ctx.fillRect(-12*k,-20*k,24*k,12*k);
 ctx.fillStyle=p.arm;ctx.beginPath();ctx.moveTo(-16*k,-22*k);ctx.lineTo(16*k,-22*k);ctx.lineTo(18*k,22*k);ctx.lineTo(-18*k,22*k);ctx.fill();
 ctx.strokeStyle=p.trim;ctx.lineWidth=2*k;ctx.stroke();ctx.beginPath();ctx.moveTo(0,-20*k);ctx.lineTo(0,20*k);ctx.stroke();
 ctx.fillStyle=p.trim;ctx.beginPath();ctx.arc(-18*k,-20*k,6*k,0,7);ctx.arc(18*k,-20*k,6*k,0,7);ctx.fill();
 ctx.fillStyle=p.skin;ctx.beginPath();ctx.arc(0,-34*k,9*k,0,7);ctx.fill();
 ctx.fillStyle='#ffd040';ctx.fillRect(-5*k,-36*k,3*k,2*k);ctx.fillRect(2*k,-36*k,3*k,2*k);
 ctx.strokeStyle=p.trim;ctx.lineWidth=2.5*k;
 if(p.crown==='horns'){ctx.beginPath();ctx.moveTo(-6*k,-42*k);ctx.quadraticCurveTo(-14*k,-50*k,-8*k,-56*k);ctx.moveTo(6*k,-42*k);ctx.quadraticCurveTo(14*k,-50*k,8*k,-56*k);ctx.stroke();}
 if(p.crown==='halo'){ctx.strokeStyle='#fff6b0';ctx.beginPath();ctx.ellipse(0,-50*k,12*k,4*k,0,0,7);ctx.stroke();}
 if(p.crown==='fins'){ctx.fillStyle=p.trim;ctx.beginPath();ctx.moveTo(-9*k,-38*k);ctx.lineTo(-18*k,-50*k);ctx.lineTo(-5*k,-44*k);ctx.moveTo(9*k,-38*k);ctx.lineTo(18*k,-50*k);ctx.lineTo(5*k,-44*k);ctx.fill();}
 ctx.shadowColor=p.wep;ctx.shadowBlur=12*k;ctx.strokeStyle=p.wep;ctx.lineWidth=4*k;ctx.beginPath();ctx.moveTo(24*k,10*k);ctx.lineTo(44*k,-50*k);ctx.stroke();ctx.shadowBlur=0;
 ctx.fillStyle=p.skin;ctx.beginPath();ctx.arc(22*k,12*k,4*k,0,7);ctx.fill();
 ctx.restore();}
function drawMandaraArt(ctx,cx,cy,size,sp){sp=sp||'Mandara';if(!artOk(sp)){drawWarrior(ctx,sp,cx,cy,size,false);return true;}const a=ART[sp],im=a.img;let [sx,sy,sw,sh]=a.crop||(a.cut?[0,0,im.naturalWidth,im.naturalHeight]:null)||[im.naturalWidth*0.28,0,im.naturalWidth*0.44,im.naturalHeight];const h=size*1.25,w=h*sw/sh;ctx.drawImage(im,sx,sy,sw,sh,cx-w/2,cy-h*0.62,w,h);return true;}
// 16x16 pixel overworld sprite of Mandara
function drawMandaraPix(px,py,sp){sp=sp||'Mandara';const q=ART[sp].pal;const MAP={'#101010':q.hair,'#e8c070':q.trim,'#c02020':q.skin,'#1a1a1a':q.arm,'#d4a030':q.trim,'#801010':q.bg[1]};const P=(c,x,y,w,h)=>{X.fillStyle=MAP[c]||c;X.fillRect(px+x,py+y,w,h);};
 P('rgba(0,0,0,.3)',2,14,12,2);P('#101010',3,2,10,9);// hair
 P('#e8c070',3,0,1,3);P('#e8c070',12,0,1,3);// horns
 P('#c02020',5,2,6,5);P('#ffd040',6,4,1,1);P('#ffd040',9,4,1,1);// face+eyes
 P('#1a1a1a',4,7,8,6);P('#d4a030',5,7,6,1);P('#d4a030',7,8,2,4);P('#d4a030',4,7,1,3);P('#d4a030',11,7,1,3);// armor
 P('#c02020',5,12,2,1);P('#c02020',9,12,2,1);P('#801010',3,10,1,4);P('#801010',12,10,1,4);// skin + cape
 P('#1a1a1a',5,13,2,3);P('#1a1a1a',9,13,2,3);
 const gl=(G.frame>>2)%2?q.wep:'#ffffff';P(gl,13,3,1,10);P('#ffb0a0',13,4,1,3);P('#d4a030',12,11,3,1);}
// ===== Monster sprite =====
function drawMon(ctx,sp,cx,cy,size,back,opt){const still=(opt&&opt.still)||!window.MFX||MFX.red();if(still)return drawMon0(ctx,sp,cx,cy,size,back);const I=MFX.idle(sp,size,opt&&opt.seed);const fy=cy+size*0.5;ctx.save();ctx.translate(cx,fy);ctx.rotate(I.rot);ctx.scale(I.sx,I.sy);ctx.translate(-cx,-fy);drawMon0(ctx,sp,cx,cy+I.dy,size,back);ctx.restore();if(!(opt&&opt.noAura))MFX.aura(ctx,sp,cx,cy+I.dy,size*0.9);}
function drawMon0(ctx,sp,cx,cy,size,back){if(ART[sp]&&drawMandaraArt(ctx,cx,cy,size,sp))return;if(drawMonImg(ctx,sp,cx,cy,size,back))return;const s=SPECIES[sp];const h=hash(sp);const c1=TCOL[s.types[0]],c2=TCOL[s.types[1]||s.types[0]];const stage=evoLine(sp).indexOf(sp);const k=size/40;
 ctx.save();ctx.translate(cx,cy);if(back)ctx.scale(-1,1);
 if(s.legend){ctx.fillStyle='rgba(255,240,150,0.25)';ctx.beginPath();ctx.arc(0,-4*k,30*k,0,7);ctx.fill();}
 ctx.fillStyle='rgba(0,0,0,.2)';ctx.beginPath();ctx.ellipse(0,18*k,20*k,5*k,0,0,7);ctx.fill();
 const bw=(14+(h%7)+stage*2)*k,bh=(12+((h>>3)%6)+stage*2)*k;
 // tail
 ctx.fillStyle=c2;ctx.beginPath();ctx.moveTo(bw*.6,4*k);ctx.lineTo(bw+10*k,-((h>>5)%10)*k);ctx.lineTo(bw*.6,10*k);ctx.fill();
 // ears/horns/spikes
 const n=1+((h>>7)%3)+stage;ctx.fillStyle=c2;for(let i=0;i<n;i++){const a=-Math.PI/2+(i-(n-1)/2)*0.5;const x=Math.cos(a)*bw*.8,y=Math.sin(a)*bh*.9;ctx.beginPath();ctx.moveTo(x-4*k,y+2*k);ctx.lineTo(x+Math.cos(a)*9*k,y+Math.sin(a)*9*k-2*k);ctx.lineTo(x+4*k,y+2*k);ctx.fill();}
 // wings for Gale
 if(s.types.includes('Gale')){ctx.fillStyle='rgba(255,255,255,.8)';ctx.beginPath();ctx.ellipse(-bw*.2,-bh*.3,bw*.9,bh*.35,-0.6,0,7);ctx.fill();}
 // body
 ctx.fillStyle=c1;ctx.strokeStyle='#202020';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(0,0,bw,bh,0,0,7);ctx.fill();ctx.stroke();
 ctx.fillStyle='rgba(255,255,255,.35)';ctx.beginPath();ctx.ellipse(-bw*.2,bh*.35,bw*.5,bh*.35,0,0,7);ctx.fill();
 // feet
 ctx.fillStyle=c2;ctx.fillRect(-bw*.6,bh*.7,6*k,5*k);ctx.fillRect(bw*.3,bh*.7,6*k,5*k);
 // eyes
 const ey=-bh*.25,ex=bw*.35;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-ex,ey,3.6*k,0,7);ctx.arc(ex*.6,ey,3.6*k,0,7);ctx.fill();ctx.fillStyle=s.types.includes('Dark')?'#e02020':'#101010';ctx.beginPath();ctx.arc(-ex-1*k,ey,1.8*k,0,7);ctx.arc(ex*.6-1*k,ey,1.8*k,0,7);ctx.fill();
 // mouth
 ctx.strokeStyle='#202020';ctx.beginPath();ctx.arc(-bw*.15,bh*.1,3*k,0.2,Math.PI-0.2);ctx.stroke();
 ctx.restore();}
function monCanvas(sp,size,back){const c=document.createElement('canvas');const k=Math.max(2,Math.min(4,Math.ceil((window.devicePixelRatio||1)*2)));c.width=size*k;c.height=size*k;const x=c.getContext('2d');x.scale(k,k);x.imageSmoothingEnabled=true;x.imageSmoothingQuality='high';drawMon0(x,sp,size/2,size/2,size*0.8,back);return c;}

// ===== Map helpers =====
function curMap(){return MAPS[S.map];}
function tileAt(map,x,y){const m=MAPS[map];if(x<0||y<0||x>=m.w||y>=m.h)return T.TREE;return m.t[y*m.w+x];}
function stage(){return S.flags.champ?7:S.medals.filter(Boolean).length;}
function medalCount(){return S.medals.filter(Boolean).length;}
function hour(){return Math.floor(S.time/60)%24;}
function minute(){return Math.floor(S.time)%60;}
function npcPlace(p){const h=hour();if(p.walk){const e0=p.sched.filter(s=>s[0]<=h).pop()||p.sched[p.sched.length-1];if(e0[1]==='world'){const W=p.walk,T0=TOWNS[p.town];const len=Math.abs(W.bx-W.ax)+Math.abs(W.by-W.ay);const ph=((S.time/1.6+hash(p.id)%97)%(2*len));const u=ph<len?ph:2*len-ph;const fx=W.ax+(W.bx-W.ax)*u/len,fy=W.ay+(W.by-W.ay)*u/len;let x=T0.x+Math.round(fx),y=T0.y+Math.round(fy);if(x===S.x&&y===S.y&&S.map==='world'){x=T0.x+Math.floor(fx);y=T0.y+Math.floor(fy);if(x===S.x&&y===S.y){x=T0.x+Math.ceil(fx);y=T0.y+Math.ceil(fy);}}const fwd=ph<len;const d=W.ax!==W.bx?((W.bx>W.ax)===fwd?'right':'left'):((W.by>W.ay)===fwd?'down':'up');return {map:'world',x,y,fx:T0.x+fx,fy:T0.y+fy,dir:d,moving:true};}}let e=p.sched[p.sched.length-1];for(const s of p.sched)if(s[0]<=h)e=s;
 let [_,map,x,y,w]=e;if(w&&MAPS[map]){const seq=[[0,0],[1,0],[0,0],[-1,0],[0,1],[0,0],[0,-1],[1,0]];const o=seq[(Math.floor(S.time/4)+hash(p.id))%seq.length];const nx=x+o[0],ny=y+o[1];if(!SOLID.has(tileAt(map,nx,ny))&&!(nx===S.x&&ny===S.y&&map===S.map)&&tileAt(map,nx,ny)!==T.DOOR&&tileAt(map,nx,ny)!==T.MAT&&tileAt(map,nx,ny-1)!==T.DOOR&&tileAt(map,nx,ny+1)!==T.MAT){x=nx;y=ny;}}
 return {map,x,y};}
function entities(){const out=[];const map=S.map;
 for(const p of PEOPLE){if(p.hidden&&!S.flags[p.hidden])continue;if(p.id==='osric'&&false)continue;const pl=npcPlace(p);if(pl.map===map)out.push({kind:'person',x:pl.x,y:pl.y,fx:pl.fx,fy:pl.fy,dir:pl.dir,moving:pl.moving,col:p.col,ref:p,name:p.name});}
 for(const t of TRAINERS){if(t.map!==map)continue;if(t.vanish&&S.beaten[t.id])continue;if(t.id==='rival1'&&!S.flags.starter)continue;out.push({kind:'trainer',x:t.x,y:t.y,col:t.col,ref:t,name:fmt(t.name)});}
 if(map==='world'){GATES.forEach((g,i)=>{if(!S.flags['gate'+i])out.push({kind:'gate',x:g.x,y:g.y,col:'#4060a0',ref:g,i,name:'Guard'});});
  QITEMS.forEach(q=>{if(!S.flags['has_'+q.id])out.push({kind:'item',x:q.x,y:q.y,ref:q,name:'?'});});}
 LEGENDS.forEach(l=>{if(l.map===map&&!S.flags['leg_'+l.sp])out.push({kind:'legend',x:l.x,y:l.y,ref:l,name:l.sp});});
 const m=curMap();
 if(m.type==='center')out.push({kind:'nurse',x:Math.floor(m.w/2),y:2,col:'#f080a0',name:'Nurse Joy'.replace('Joy','Mae')});
 if(m.type==='shop')out.push({kind:'clerk',x:Math.floor(m.w/2),y:2,col:'#4080f0',name:'Clerk'});
 return out;}
function entAt(x,y,ents){return (ents||entities()).find(e=>e.x===x&&e.y===y);}
function blocked(x,y){const t=tileAt(S.map,x,y);if(SOLID.has(t))return true;return !!entAt(x,y);}

// ===== Rendering =====
const TILECOL={0:'#78c850',1:'#48a038',2:'#78c850',3:'#d8c088',4:'#3890e0',5:'#e8d8a0',6:'#eef4ff',7:'#6a5a4c',8:'#3a3030',9:'#a07040',10:'#e8e0d0',11:'#c05038',12:'#e04848',13:'#4870d8',14:'#8048a8',15:'#704828',16:'#78c850',18:'#d8c8a8',19:'#806850',20:'#a07040',21:'#e8e8f0',22:'#b08050',23:'#606878',24:'#c03030',25:'#c8d8e8',26:'#e8a020',27:'#a0a0a8',28:'#b0e0f0',29:'#1a0c10',30:'#3a1418',31:'#e0b030',32:'#f0e8c0',33:'#f4f0e0',34:'#fff8e0',35:'#4888b0',36:'#806850',37:'#403040'};
function drawTile(t,x,y,wx,wy,m){const f=G.frame;X.fillStyle=TILECOL[t]||'#f0f';
 if(t===T.FLOOR&&m.type==='gym'){const tn=TOWNS[m.town];X.fillStyle=TCOL[tn.type];X.globalAlpha=0.5;X.fillRect(x,y,TS,TS);X.globalAlpha=1;X.fillStyle=((wx+wy)&1)?'rgba(255,255,255,.25)':'rgba(0,0,0,.08)';X.fillRect(x,y,TS,TS);return;}
 X.fillRect(x,y,TS,TS);
 switch(t){
 case T.GRASS:X.fillStyle='#68b840';if((wx*7+wy*3)%5===0)X.fillRect(x+4,y+6,2,2);break;
 case T.TALL:case T.SNOWTALL:X.fillStyle=t===T.TALL?'#2f7a28':'#90a8c0';for(let i=0;i<4;i++){X.fillRect(x+1+i*4,y+5+(i%2)*3,2,8);}break;
 case T.TREE:X.fillStyle=(wx<82&&wy<44&&wy>8&&wx>46)?'#3a3030':'#215a20';X.beginPath();X.arc(x+8,y+7,7,0,7);X.fill();X.fillStyle='#2e7a2a';X.beginPath();X.arc(x+6,y+5,3,0,7);X.fill();X.fillStyle='#6a4020';X.fillRect(x+7,y+12,2,4);if(wx>=80&&wy<44){X.fillStyle='#fff';X.fillRect(x+4,y+2,6,2);}break;
 case T.WATER:X.fillStyle='#68b0f0';X.fillRect(x+((f>>4)+wx)%12,y+5+(wy%2)*5,4,1);break;
 case T.ROCK:X.fillStyle='#54463e';X.fillRect(x+2,y+2,12,10);X.fillStyle='#2a2222';X.fillRect(x,y+12,TS,4);break;
 case T.CAVE:X.fillStyle='#5c4c40';if((wx+wy*3)%7===0)X.fillRect(x+5,y+9,3,2);break;
 case T.BRIDGE:X.fillStyle='#704818';for(let i=0;i<4;i++)X.fillRect(x,y+i*4,TS,1);break;
 case T.WALL:X.fillStyle='#7890b0';X.fillRect(x+4,y+4,8,6);break;
 case T.ROOF_H:case T.ROOF_C:case T.ROOF_S:case T.ROOF_G:case T.ROOF_L:X.fillStyle='rgba(0,0,0,.15)';X.fillRect(x,y+12,TS,4);X.fillRect(x,y+5,TS,1);if(t===T.ROOF_C&&wx%3===1){X.fillStyle='#fff';X.fillRect(x+5,y+3,6,2);X.fillRect(x+7,y+1,2,6);}break;
 case T.DOOR:X.fillStyle='#40280c';X.fillRect(x+3,y+2,10,14);X.fillStyle='#e0c040';X.fillRect(x+10,y+9,2,2);break;
 case T.FLOWER:X.fillStyle=['#f04060','#f0e040','#ffffff'][(wx+wy)%3];X.fillRect(x+3,y+4,3,3);X.fillRect(x+10,y+9,3,3);break;
 case T.FLOOR:X.fillStyle=((wx+wy)&1)?'#d0c0a0':'#dccca8';X.fillRect(x,y,TS,TS);break;
 case T.IWALL:X.fillStyle='#6a5440';X.fillRect(x,y+12,TS,4);break;
 case T.COUNTER:X.fillStyle='#c09060';X.fillRect(x,y,TS,5);break;
 case T.BED:X.fillStyle='#d04040';X.fillRect(x+1,y+6,14,9);X.fillStyle='#fff';X.fillRect(x+3,y+1,10,5);break;
 case T.TABLE:X.fillStyle='#8a5a30';X.fillRect(x+1,y+12,3,4);X.fillRect(x+12,y+12,3,4);break;
 case T.PC:X.fillStyle='#90f0f0';X.fillRect(x+3,y+2,10,7);break;
 case T.PILLAR:X.fillStyle='#707078';X.fillRect(x+3,y,10,TS);break;
 case T.CWALL:X.fillStyle='#2a1218';X.fillRect(x+2,y,4,TS);X.fillRect(x+10,y,4,TS);X.fillStyle=(G.frame>>4)%2?'#e03020':'#a02018';if((wx+wy)%3===0)X.fillRect(x+7,y+6,2,3);break;
 case T.CFLOOR:X.fillStyle=((wx+wy)&1)?'#40161c':'#341014';X.fillRect(x,y,TS,TS);if((wx*3+wy)%7===0){X.fillStyle='#a02010';X.fillRect(x+6,y+7,4,1);}break;
 case T.ROOF_T:X.fillStyle='rgba(0,0,0,.15)';X.fillRect(x,y+12,TS,4);if(wx%4===2){X.fillStyle='#fff';X.fillRect(x+7,y+1,2,8);X.fillRect(x+4,y+3,8,2);}break;
 case T.ALTAR:X.fillStyle='#c0a060';X.fillRect(x+1,y+8,14,8);const fl=(G.frame>>3)%2;X.fillStyle=fl?'#ffffff':'#f0f0d0';X.fillRect(x+3,y+2+fl,2,6);X.fillStyle=fl?'#60a0ff':'#4080f0';X.fillRect(x+7,y+1,2,7);X.fillStyle=fl?'#ff4030':'#e02020';X.fillRect(x+11,y+2+fl,2,6);break;
 case T.HWALL:X.fillStyle=wy>60?'#3a6890':'#e8d070';X.fillRect(x+2,y+2,12,3);X.fillRect(x+6,y,4,TS);break;
 case T.HFLOOR:X.fillStyle=((wx+wy)&1)?'#fff0c0':'#fff8e8';X.fillRect(x,y,TS,TS);break;
 case T.SFLOOR:X.fillStyle=((wx+wy+(G.frame>>4))&1)?'#3878a8':'#4890c0';X.fillRect(x,y,TS,TS);break;
 case T.MURAL:X.fillStyle='#a08060';X.fillRect(x+1,y+1,14,11);X.fillStyle='#c02020';X.fillRect(x+3,y+5,2,6);X.fillStyle='#f0f0f0';X.fillRect(x+7,y+5,2,6);X.fillStyle='#4080c0';X.fillRect(x+11,y+5,2,6);X.fillStyle='rgba(40,20,60,.6)';X.fillRect(x+2,y+2,12,3);break;
 case T.SEAL:X.fillStyle='#2a2030';X.fillRect(x+1,y,14,TS);X.strokeStyle='#a080f0';X.beginPath();X.arc(x+8,y+8,5,0,7);X.stroke();X.fillStyle='#a080f0';X.fillRect(x+7,y+3,2,10);break;
 case T.SNOW:X.fillStyle='#dde6f4';if((wx*5+wy)%6===0)X.fillRect(x+6,y+6,3,2);break;
 }}
function drawChar(px,py,col,dir,step,cap){if(window.WS){WS.char(X,px,py,col,dir,step,cap);return;}X.fillStyle='rgba(0,0,0,.25)';X.fillRect(px+3,py+13,10,3);
 const bob=step?1:0;X.fillStyle=col;X.fillRect(px+4,py+7-bob,8,7);X.fillStyle='#f0c8a0';X.fillRect(px+4,py+1-bob,8,7);X.fillStyle=cap||'#402010';X.fillRect(px+3,py-bob,10,3);
 X.fillStyle='#000';if(dir!=='up'){const o=dir==='left'?-1:dir==='right'?1:0;X.fillRect(px+5+o,py+4-bob,2,2);X.fillRect(px+9+o,py+4-bob,2,2);}
 X.fillStyle='#303030';X.fillRect(px+4+(step?1:0),py+14-bob,3,2);X.fillRect(px+9-(step?1:0),py+14-bob,3,2);}
function render(){const m=curMap();G.frame++;
 let ox=0,oy=0;if(G.mv){ox=G.mv.dx*G.mv.t*TS;oy=G.mv.dy*G.mv.t*TS;}
 const Z=m.outdoor?1:Math.max(1,Math.min(1.5,VW/(m.w*TS+24),VH/(m.h*TS+44))),vw=VW/Z,vh=VH/Z;
 const pxw=S.x*TS+ox,pyw=S.y*TS+oy;let camx=pxw-vw/2+8,camy=pyw-vh/2+8;
 if(m.w*TS<=vw)camx=(m.w*TS-vw)/2;else camx=clamp(camx,0,m.w*TS-vw);
 if(m.h*TS<=vh)camy=(m.h*TS-14-vh)/2-5;else camy=clamp(camy,-14,m.h*TS-vh);
 const SC0=C.width/VW,SC=SC0*Z;WS.vw=vw;WS.vh=vh;
 X.setTransform(1,0,0,1,0,0);if(m.outdoor){X.fillStyle='#000';}else{const bg=X.createRadialGradient(C.width/2,C.height/2,C.width*.1,C.width/2,C.height/2,C.width*.7);bg.addColorStop(0,'#3a2a44');bg.addColorStop(1,'#120a18');X.fillStyle=bg;}X.fillRect(0,0,C.width,C.height);
 if(G.shake>0){G.shake--;camx+=Math.round((Math.random()-.5)*8);camy+=Math.round((Math.random()-.5)*8);$('stage').style.transform='translate('+((Math.random()-.5)*6)+'px,'+((Math.random()-.5)*6)+'px)';if(G.shake===0)$('stage').style.transform='';}
 camx=Math.round(camx*SC)/SC;camy=Math.round(camy*SC)/SC;
 X.imageSmoothingEnabled=true;WS.ground(m,camx,camy,SC);
 X.setTransform(SC,0,0,SC,0,0);X.imageSmoothingEnabled=true;
 if(window.AMB)AMB.under(m,camx,camy);
 const ents=entities();
 ents.sort((a,b)=>(a.fy!==undefined?a.fy:a.y)-(b.fy!==undefined?b.fy:b.y));
 if(m.outdoor&&window.MFX)MFX.roamers(m,camx,camy);
 for(const e of ents){const sx=(e.fx!==undefined?e.fx:e.x)*TS-camx,sy=(e.fy!==undefined?e.fy:e.y)*TS-camy;if(sx<-24||sy<-24||sx>VW+8||sy>VH+16)continue;
  if(e.kind==='legend'&&ART[e.ref.sp]){if(window.MFX)MFX.aura(X,e.ref.sp,sx+8,sy+6,16);drawMandaraPix(sx,sy+Math.sin(G.frame/20)*1.5-1,e.ref.sp);}else if(e.kind==='legend'){if(window.MFX)MFX.aura(X,e.ref.sp,sx+8,sy+6,18);drawMon(X,e.ref.sp,sx+8,sy+2+Math.sin(G.frame/15)*2.5,30);}
  else if(e.kind==='item'){const k=Math.sin(G.frame/8);X.fillStyle='#fff6c0';X.beginPath();X.moveTo(sx+8,sy+3-k);X.lineTo(sx+9.2,sy+7);X.lineTo(sx+13+k,sy+8);X.lineTo(sx+9.2,sy+9);X.lineTo(sx+8,sy+13+k);X.lineTo(sx+6.8,sy+9);X.lineTo(sx+3-k,sy+8);X.lineTo(sx+6.8,sy+7);X.fill();}
  else drawEnt(e,sx,sy);}
 WS.npc(X,pxw-camx,pyw-camy,WS.look('player','player'),G.dir||'down',G.mv?(G.mv.t<0.5?1:3):0);
 drawHearts(camx,camy);
 if(window.AMB)AMB.mid(m,camx,camy,ents);
 WS.tint(m);
 WS.lights(m,camx,camy,ents);
 X.setTransform(SC0,0,0,SC0,0,0);
 if(window.AMB)AMB.top(m,camx,camy);
 WS.post(m);
 // HUD (dark panel, gold trim)
 const hg=X.createLinearGradient(0,0,0,13);hg.addColorStop(0,'rgba(20,10,24,.92)');hg.addColorStop(1,'rgba(8,4,12,.8)');X.fillStyle=hg;X.fillRect(0,0,VW,13);X.fillStyle='#d9a94a';X.fillRect(0,13,VW,.6);X.fillStyle='rgba(217,169,74,.35)';X.fillRect(0,13.8,VW,.4);
 X.font='bold 8px Georgia,"Times New Roman",serif';X.textBaseline='top';X.fillStyle='#f3e2b8';
 X.fillText(locName().slice(0,34),4,2.5);const hh=hour(),mm=minute();X.fillText(String(hh).padStart(2,'0')+':'+String(mm).padStart(2,'0')+' '+(hh>=6&&hh<18?'Day':hh<20&&hh>=18?'Dusk':'Night'),VW-62,2.5);
 X.fillStyle='#e8c060';X.fillText('Medals '+medalCount(),VW-112,2.5);const fs=festival();if(fs&&m.outdoor){X.fillStyle='rgba(60,20,8,.85)';X.fillRect(0,14,130,10);X.fillStyle='#ffd070';X.fillText('Festival: '+fs.name,4,15);}
 if(G.toast&&G.toastT>0){G.toastT--;X.fillStyle='rgba(12,6,16,.88)';X.fillRect(VW/2-90,20,180,14);X.strokeStyle='#d9a94a';X.lineWidth=.6;X.strokeRect(VW/2-89.5,20.5,179,13);X.fillStyle='#ffe8a0';X.fillText(G.toast,VW/2-86,23);}
 if(window.AMB&&AMB.map)AMB.map(m);
}
const SHRINE_TXT=['"Light to see by, water and air to live on, fire and night to rest in." Someone has left three pebbles... and a fourth, set a little apart.','A weathered prayer: "Mantermo, calm the waters for those who sail." The wax of three candles is still warm.','The wind sings through a hole in the stone. For a moment it almost sounds like a name.','Pilgrims have stacked stones here for centuries. The topmost stone is always found turned to face the sky.','"For a thing does not rise unless it is called." The rest of the line is worn away.','A river-shrine to the Three. Coins glitter in the shallows - one is stamped with a symbol you do not recognise.','"Walk the Pilgrim\'s Road with a pure heart." Champions have carved their names below.','An ancient altar, cracked down the middle. Three hollows for offerings - and a fourth, larger, at the centre.','At the top of the world, a cairn. Scratched into it: "Even the sisters looked up."','A tiny forest shrine woven of pine. The old woodcutters say it was here before the temples.'];
async function wayShrineTalk(x,y){const sh=SHRINES.find(s=>s.x===x&&s.y===y);if(!sh)return;await say(sh.name+': '+SHRINE_TXT[sh.k%SHRINE_TXT.length]);if(!S.flags['shr'+sh.k]){S.flags['shr'+sh.k]=1;healAll();await say('A gentle warmth washes over your team. They feel refreshed.');}}
function townAt(x,y){return TOWNS.find(t=>x>=t.x&&x<t.x+TW&&y>=t.y&&y<t.y+TH);}
function locName(){const m=curMap();if(S.map!=='world')return m.name;const t=townAt(S.x,S.y);if(t)return t.name;const lm=LANDMARKS.filter(l=>Math.abs(l.x-S.x)<=l.r&&Math.abs(l.y-S.y)<=l.r).sort((a,b)=>a.r-b.r)[0];if(lm)return lm.name;const z=ZONEMAP[S.y*WW+S.x];if(z)return ZONES[z].name;return {leaf:'Mossgrove Wilds',dusk:'Duskwild Moors',ember:'Cinder Slopes',coast:'Island Coast',gale:'Galecrest Cliffs',snow:'Frostpeak Heights',cave:'Ember Caverns',summit:'Summit Highlands',crimson:'Crimsonspire Wastes'}[regionAt(S.x,S.y)]||'Wilds';}
function toast(t){G.toast=t;G.toastT=120;}

// ===== UI layers =====
const UI=[];
function topL(){return UI[UI.length-1];}
function focusOpts(L){if(!L.el)return;const os=[...L.el.querySelectorAll('.opt')];os.forEach((o,i)=>o.classList.toggle('sel',i===L.idx));const s=os[L.idx];if(s&&s.scrollIntoView)s.scrollIntoView({block:'nearest'});}
function pushL(L){L.idx=L.idx||0;UI.push(L);L.el.style.display='';focusOpts(L);}
function popL(L){const i=UI.indexOf(L);if(i>=0)UI.splice(i,1);if(L.el&&L.remove)L.el.remove();else if(L.el)L.el.style.display='none';}
function layerKey(L,k){if(L.onKey&&L.onKey(k)===true)return;const os=[...L.el.querySelectorAll('.opt')];
 if(k==='up'||k==='left'){L.idx=(L.idx-1+os.length)%Math.max(1,os.length);focusOpts(L);}
 else if(k==='down'||k==='right'){L.idx=(L.idx+1)%Math.max(1,os.length);focusOpts(L);}
 else if(k==='a'){const o=os[L.idx];if(o){if(o.tagName==='INPUT'){o.focus();o.select&&o.select();}else o.click();}}
 else if(k==='b'){if(L.onB)L.onB();}}
function mkEl(cls,html){const d=document.createElement('div');d.className=cls;d.innerHTML=html;$('ui').appendChild(d);return d;}
function say(text){if(window.SFX)SFX.play('blip');return new Promise(res=>{const el=mkEl('dlg','<div class="dtext">'+esc(fmt(text))+'</div><div class="more">&#9660;</div>');const L={el,remove:true,onKey:k=>{if(k==='a'||k==='b'){popL(L);res();}return true;}};el.onclick=()=>L.onKey('a');pushL(L);});}
async function sayAll(arr){for(const t of arr)await say(t);}
function choose(prompt,opts,cancel=true,cls){return new Promise(res=>{const el=mkEl('menu '+(cls||''),(prompt?'<div class="mp">'+esc(fmt(prompt))+'</div>':'')+opts.map((o,i)=>'<button class="opt" data-i="'+i+'">'+esc(fmt(o))+'</button>').join(''));
 const L={el,remove:true,onB:()=>{if(cancel){popL(L);res(-1);}}};el.querySelectorAll('.opt').forEach(b=>b.onclick=()=>{popL(L);res(+b.dataset.i);});pushL(L);});}
function screen(html,onB,cls){const el=mkEl('screen '+(cls||''),html);const L={el,remove:true,onB:()=>{popL(L);onB&&onB();}};pushL(L);return L;}
function promptName(title,def){return new Promise(res=>{const el=mkEl('screen namebox','<h2>'+esc(title)+'</h2><input class="opt" id="nameIn" maxlength="12" value="'+esc(def)+'" autocomplete="off"><br><button class="opt" id="nameOk">OK</button><p class="hint">Type a name, then press Enter or OK.</p>');
 const inp=el.querySelector('input');const done=()=>{const v=inp.value.trim().replace(/[<>]/g,'').slice(0,12);if(!v){inp.focus();return;}popL(L);res(v);};
 const L={el,remove:true,onB:()=>{}};el.querySelector('#nameOk').onclick=done;inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();e.stopPropagation();done();}});pushL(L);setTimeout(()=>inp.focus(),50);});}

// ===== Input =====
const KEYMAP={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',w:'up',s:'down',a:'left',d:'right',W:'up',S:'down',A:'left',D:'right',z:'a',Z:'a',Enter:'a',' ':'a',x:'b',X:'b',Escape:'b',m:'start',M:'start'};
window.addEventListener('keydown',e=>{const ae=document.activeElement;
 if(ae&&ae.tagName==='INPUT'){if(e.key==='Escape'||e.key==='Enter'){ae.blur();e.preventDefault();}return;}
 const k=KEYMAP[e.key];if(!k)return;e.preventDefault();if(e.repeat&&(k==='a'||k==='b'||k==='start'))return;press(k,true);});
window.addEventListener('keyup',e=>{const k=KEYMAP[e.key];if(k)press(k,false);});
function press(k,down){if(['up','down','left','right'].includes(k)){if(down)G.held.add(k);else G.held.delete(k);}
 if(!down)return;const L=topL();if(L){layerKey(L,k);return;}
 if(G.mode==='world'&&!G.busy&&!G.mv){if(k==='a')interact();else if(k==='b'||k==='start')openMenu();}}
// touch controls
function setupTouch(){document.querySelectorAll('[data-k]').forEach(b=>{const k=b.dataset.k;
 const dn=e=>{e.preventDefault();b.classList.add('on');press(k,true);if(navigator.vibrate)try{navigator.vibrate(8);}catch(_){} };
 const up=e=>{e.preventDefault();b.classList.remove('on');press(k,false);};
 b.addEventListener('pointerdown',dn);b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('pointerleave',up);});
 document.addEventListener('gesturestart',e=>e.preventDefault());document.addEventListener('dblclick',e=>e.preventDefault(),{passive:false});
 document.addEventListener('touchmove',e=>{if(!e.target.closest('.screen,.menu'))e.preventDefault();},{passive:false});}

// ===== World loop =====
function dirVec(d){return {up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[d];}
let lastT=performance.now();
function loop(now){const dt=Math.min(0.1,(now-lastT)/1000);lastT=now;
 if(S&&G.mode==='world'){S.play+=dt;if(!UI.length&&!G.busy)S.time+=dt;// 1 real sec = 1 game minute
  if(!UI.length&&!G.busy){if(G.mv){G.mv.t+=dt*7;if(G.mv.t>=1){S.x+=G.mv.dx;S.y+=G.mv.dy;G.mv=null;onStep();}}
   if(!G.mv&&!G.busy&&!UI.length){const d=['up','down','left','right'].find(k=>G.held.has(k));if(d)tryMove(d);}}
  if(now-G.lastAuto>30000&&!G.busy&&!UI.length){G.lastAuto=now;autosave();}
  render();}
 else if(G.mode==='title')drawTitle();
 if(BT&&$('battle').style.display==='block')bRender();
 if(now-(G.audT||0)>500){G.audT=now;audioTick();}
 requestAnimationFrame(loop);}
function pickMusic(){if(G.mode==='title'||!S)return 'title';if(G.victoryUntil>performance.now())return 'victory';
 if(BT&&$('battle').style.display==='block'){const o=BT.o,sp=BT.e.m.sp;if(o.boss||sp==='Mandara')return 'mandara';if(sp==='Mancaco')return 'mancaco';if(sp==='Mantermo')return 'mantermo';if(o.legend)return 'gym';if(!o.wild){const t=o.t||{};if(t.elite!==undefined)return 'champion';if(t.gym!==undefined)return 'gym';if(/Follower/.test(t.cls||''))return 'follower';return 'trainer';}return 'wild';}
 const m=curMap();if(!m.outdoor)return m.type==='castle'?'mandara':m.type==='league'?'summit':m.type==='lair'?'mancaco':'interior';
 const tn=townAt(S.x,S.y);const r=regionAt(S.x,S.y);if(WS.dark()>0.6)return 'night';if(tn)return ['leaf','ember','coast','gale','snow','dusk'][tn.id];if(r==='cave')return 'cave';if(r==='summit'||r==='crimson')return 'summit';const z=ZONEMAP[S.y*WW+S.x];if(z&&/^r\d/.test(z))return 'route';return r;}
function audioTick(){if(!window.SFX||!SFX.ok)return;SFX.music(pickMusic());if(!S||G.mode!=='world'||S.map!=='world'||(BT&&$('battle').style.display==='block')){SFX.ambient({});return;}
 const r=regionAt(S.x,S.y);let sea=false;for(const [a,b] of [[0,0],[6,0],[-6,0],[0,6],[0,-6]]){const xx=S.x+a,yy=S.y+b;if(xx>=0&&yy>=0&&xx<WW&&yy<WH&&OCEAN[yy*WW+xx])sea=true;}const ar=window.AMB&&AMB.region?AMB.region(S.x,S.y):r;
 SFX.ambient({rain:window.AMB&&AMB.raining&&AMB.raining(ar),wind:r==='gale'||r==='snow',waves:sea,birds:WS.dark()<0.3&&(r==='leaf'||r==='coast'||r==='gale'),fire:r==='ember'||r==='crimson'});}
async function soundMenu(){while(true){const c=SFX.cfg;const i=await choose('Sound settings (saved on this device)',['Music volume: '+Math.round(c.mv*10)+'/10','Effects volume: '+Math.round(c.sv*10)+'/10',c.mute?'Sound: MUTED (tap to unmute)':'Sound: ON (tap to mute)','Back']);if(i<0||i===3)return;
 if(i===0){let v=Math.round(c.mv*10);v=v>=10?0:v+2;SFX.setMusic(v/10);}if(i===1){let v=Math.round(c.sv*10);v=v>=10?0:v+2;SFX.setSfx(v/10);SFX.play('select');}if(i===2)SFX.toggleMute();}}
function tryMove(d){G.dir=d;S.dir=d;const [dx,dy]=dirVec(d);const nx=S.x+dx,ny=S.y+dy;
 const ents=entities();const e=entAt(nx,ny,ents);
 if(SOLID.has(tileAt(S.map,nx,ny))||e){return;}
 G.mv={dx,dy,t:0};}
async function onStep(){const t=tileAt(S.map,S.x,S.y);
 if(S.map==='world'&&t===T.DOOR){const id=DOORS[S.x+','+S.y];if(id==='castle'&&!S.flags.champ){G.busy=true;await say('A wall of crimson flame seals the castle door. Only a Champion could break it.');S.y+=1;G.busy=false;return;}if(id==='league'&&medalCount()<6){G.busy=true;await say('League Guard: Only trainers with all six medals may enter the Summit League.');S.y+=1;G.busy=false;return;}if(id){await enterMap(id);return;}}
 if(t===T.MAT){const m=curMap();await enterMap('world',m.exit.x,m.exit.y,'down');return;}
 if(window.SFX)SFX.step(t);
 if(S.map==='world'){const hd=HIDDEN.find(h=>h.x===S.x&&h.y===S.y&&!S.flags[h.id]);if(hd){S.flags[hd.id]=1;addItem(hd.item,1);G.busy=true;await say('Something glints at your feet... You found a hidden '+hd.item+'!');G.busy=false;}
  const lm=LANDMARKS.find(l=>Math.abs(l.x-S.x)<=l.r&&Math.abs(l.y-S.y)<=l.r);if(lm&&!(S.flags.disc||{})[lm.name]){S.flags.disc=S.flags.disc||{};S.flags.disc[lm.name]=1;toast('Discovered: '+lm.name);}
  const tn=townAt(S.x,S.y);if(tn&&!S.flags['enter'+tn.id]){S.flags['enter'+tn.id]=1;await townEvent(tn);}
  const z=ZONEMAP[S.y*WW+S.x];if(z!==G.zoneShown){G.zoneShown=z;if(z)toast(ZONES[z].name);}
  let rate=0;if(t===T.TALL||t===T.SNOWTALL)rate=0.12;else if(t===T.CAVE)rate=0.05;
  if(rate&&z&&Math.random()<rate&&alive(S.party).length){const Z=ZONES[z];await wildBattle(mkMon(Z.sp[ri(0,Z.sp.length-1)],ri(Z.lv[0],Z.lv[1])));}}}
async function enterMap(id,x,y,dir){G.busy=true;if(window.SFX)SFX.play('door');S.map=id;const m=MAPS[id];if(x===undefined){x=m.spawn.x;y=m.spawn.y;dir='up';}S.x=x;S.y=y;S.dir=dir;G.dir=dir;G.mv=null;
 await fade();G.busy=false;autosave();}
function fade(){return new Promise(r=>{const f=$('fade');f.classList.add('on');setTimeout(()=>{f.classList.remove('on');r();},180);});}
function facing(){const [dx,dy]=dirVec(G.dir||'down');return [S.x+dx,S.y+dy];}
async function interact(){let [fx,fy]=facing();const [dx,dy]=dirVec(G.dir||'down');let t=tileAt(S.map,fx,fy);
 if(t===T.COUNTER){fx+=dx;fy+=dy;}
 const e=entAt(fx,fy);G.busy=true;
 try{if(e)await talkTo(e);else if(t===T.PC)await storageMenu();else if(t===T.TABLE&&S.map==='b0_5')await pickStarter();else if(t===T.BED&&S.map==='b0_0'){await say('You took a nap in your own bed. Your team feels refreshed!');healAll();S.time+=120;}
  else if(t===T.WATER)await say('The water is deep and still.');
  else if(t===T.ALTAR)await readAltar();
  else if(t===T.MURAL){const tn=curMap().town;addClue('mural'+tn);await sayAll(['An ancient mural: the three sisters stand together with their weapons raised - Mancaco\'s spear, Mantermo\'s trident, Mandara\'s burning blade.','Above them the painted plaster has been carefully scraped away. Only the faint outline of a fourth, far larger figure remains.',INSCRIPTIONS[tn]||'']);}
  else if(t===T.SEAL)await sealDoor();
  else if(t===T.SHRINE)await wayShrineTalk(fx,fy);
  else if(t===T.RUIN)await say(['A broken column, carved with three flames. Below them, a fourth groove has been filled in with newer stone.','Moss-covered stone. An inscription reads: "...the ones who listened too closely were sent away..."','A toppled pillar. Its carved sky has three stars - and a chiselled scar where a fourth once shone.'][(fx*3+fy)%3]);}
 finally{G.busy=false;}}

// ===== Story =====
const TOWN_EVENTS=[
 ['Mossgrove: hooded figures in deep-blue robes were seen near the gym.','Townsfolk whisper of the Followers of the Deep - a cult gathering power to summon Mandara, Creator of Dark and Fire.'],
 ['Cinderbrook: the great forges have gone cold.','Black-coated Follower grunts guard the gym, siphoning the volcano\'s heat to feed Mandara\'s summoning ritual!'],
 ['Tidehaven: the harbour is half dry.','Follower pumps ring Mirrorlake. They want to drain Tidemaw\'s power to fuel their summoning of Mandara.'],
 ['Galecrest: the windmills hang still.','Follower jammers have stilled the sky to steal Aurorath\'s wind-power for the summoning.'],
 ['Frostmere: the Rime Shrine has been ransacked.','The Followers stole the Dawn Tablet - and Admin Wick is still digging.'],
 ['Duskhollow: lanterns flicker against endless shadow.','The Monk himself waits in the ruins plaza. Your father\'s trail ends here.']];
async function townEvent(tn){const ev=TOWN_EVENTS[tn.id];if(ev)await sayAll(ev);}
const INTRO=['In the beginning, three sisters rose from the Deep: Mancaco, Creator of Light and Heaven; Mantermo, Creator of Water and Air; and Mandara, Creator of Dark and Fire.','Together they shaped this world, and the Triune Faith has honoured them ever since.','Scripture warns: summon a Creator with a pure heart and she brings blessing. Summon her through a dark ritual, and she brings ruin.','Five years ago, the ranger Rowan vanished while studying the Creators\' heralds. He left behind a family in Mossgrove...','...and a child who dreams of the Summit League.','Now a heretical sect, the Followers of the Deep, led by a man called the Monk, stirs in every town. And your journey begins.'];
async function newGame(){S={v:1,name:'Ash',rival:'Gary',map:'b0_0',x:5,y:4,dir:'down',party:[],box:[],bag:{},money:1000,medals:[false,false,false,false,false,false],flags:{},quests:{},seen:{},caught:{},met:{},beaten:{},time:7*60,play:0,wildKO:0,lastHeal:{map:'b0_0',x:5,y:4},starter:null,rel:{},wv:2};
 S.name='';G.mode='intro';$('ui').classList.add('dark');
 await sayAll(INTRO);
 S.name=await promptName('What is your name?','Robin');
 await say('Welcome, @NAME! Now... who has been your rival since childhood?');
 S.rival=await promptName('Name your rival','Kestrel');
 await sayAll(['@RIVAL, your neighbour, always one step ahead - or so they claim.','@NAME, you grew up in Mossgrove with your mother Ilsa, the village baker.','Your father Rowan is still missing. Find the truth... and become Champion!']);
 $('ui').classList.remove('dark');G.mode='world';G.dir='down';
 await say('Mom: Good morning, @NAME! Professor Wren is waiting at her lab - the building south of the square.');
 S.met.ilsa=1;autosave();}
async function pickStarter(){if(S.starter){await say('An empty table. Professor Wren\'s notes are scattered here.');return;}
 const opts=['Cindle (Fire)','Drizzlet (Tide)','Sprigling (Leaf)'];const sp=['Cindle','Drizzlet','Sprigling'];
 const i=await choose('Three capture orbs rest on the table. Choose your partner!',opts);if(i<0)return;
 const c=await choose('Choose '+sp[i]+'?',['Yes','No']);if(c!==0)return;
 S.starter=sp[i];const m=mkMon(sp[i],5);addMon(m);S.flags.starter=1;
 S.rivalStarter={Cindle:'Drizzlet',Drizzlet:'Sprigling',Sprigling:'Cindle'}[sp[i]];
 await sayAll(['You received '+sp[i]+'!','Wren: Wonderful! Take these too.','Received 5 Snare Orbs and 5 Potions!']);addItem('Snare Orb',5);addItem('Potion',5);
 await sayAll(['@RIVAL bursts in! "I\'ll take '+S.rivalStarter+'! Let\'s battle right now!"']);
 const r=await trainerBattle({id:'rival0',name:'@RIVAL',cls:'Rival',party:'rival0',money:300,pre:'',post:''},true);
 await sayAll([r==='win'?'@RIVAL: "Beginner\'s luck! I\'ll see you on the road!"':'@RIVAL: "Ha! Train harder!"','Wren: Your father Rowan believed the Followers wanted the legends. Collect the six medals - the gym is right here in Mossgrove.','Wren: A Followers grunt is loitering by our gym door. Be careful!']);
 healAll();S.flags.rival0=1;autosave();}
function rivalParty(key){const line=evoLine(S.rivalStarter||'Drizzlet');return {rival0:[[line[0],5]],rival2:[['Galeon',27],['Voltusk',27],[line[1],29]],rival3:[['Galeon',42],['Voltusk',42],['Boulderon',43],['Rimewhale',43],[line[2],45]]}[key];}
function addItem(n,q){S.bag[n]=(S.bag[n]||0)+q;if(S.bag[n]<=0)delete S.bag[n];}

async function talkTo(e){const st=stage();if(e.ref&&e.ref.id){G.faceT=G.faceT||{};const dx=S.x-e.x,dy=S.y-e.y;G.faceT[e.ref.id]={d:Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up'),until:S.time+20};}
 if(e.kind==='person'){const p=e.ref;S.met[p.id]=1;
  if(p.id==='osric'&&S.quests.q4&&S.quests.q4.st==='active'&&!S.flags.delivered){S.flags.delivered=1;await sayAll(['You hand over Greta\'s letter.','Osric: ...From my sister? Twenty years... Tell her... tell her I\'ll visit in spring.']);return;}
  if(p.knower||(p.id==='corwin'&&Math.random()<0.25)||Math.random()<0.03)await say('('+p.name+' greets you with three fingers to the brow and one raised to the sky.)');
  if(p.knower||(S.flags.legrantaSecret&&KNOWERS[p.id]&&!p.priest)){if(KNOWERS[p.id]){await sayAll(KNOWERS[p.id].map(x=>p.name+': '+fmt(x)));return;}}
  if(p.priest&&PRIEST_EXTRA[p.id]){S.flags['px_'+p.id]=(S.flags['px_'+p.id]||0)+1;if(S.flags['px_'+p.id]%2===0&&!festival()){await say(p.name+': '+PRIEST_EXTRA[p.id]);return;}}
  if(p.priest){const f=festival();if(f&&!S.flags['fest'+dayNum()+p.town]){S.flags['fest'+dayNum()+p.town]=1;addItem(f.gift,1);await say(p.name+': Blessings of the '+f.name+', held in honour of '+f.cr+'! '+f.txt+' Please accept this '+f.gift+'.');return;}
   if(S.flags.legrantaSecret&&KNOWERS[p.id]){await sayAll(KNOWERS[p.id].map(x=>p.name+': '+x));return;}
   if(p.id==='thessaly'&&st>=6){addClue('thessaly');await sayAll([p.name+': Come closer, child. The scripture has missing pages... I have read them.','Elder Thessaly (whispering): ...Legranta. That is all I will say. Never speak it loudly.']);return;}}
  if(p.quest&&await questTalk(p))return;
  let line=p.talk[0][1];for(const [s,t] of p.talk)if(st>=s)line=t;
  if(!p.priest&&!p.quest&&p.town>=0&&PEOPLE.filter(q=>q.town===p.town&&!q.priest&&!q.quest)[0]===p){S.flags['rum_'+p.id]=(S.flags['rum_'+p.id]||0)+1;if(S.flags['rum_'+p.id]%2===0)line+=' ...Oh, and a strange thing: '+RUMORS[p.town];}
  const h=hour();if(h>=21||h<6){if(npcPlace(p).map!=='world')line='('+p.name+' is getting ready for bed.) '+line;}
  await say(p.name+': '+line);await relDaily(p,e);await relMenu(p,e);return;}
 if(e.kind==='trainer')return trainerTalk(e.ref,e);
 if(e.kind==='gate'){const g=e.ref,i=e.i;const need=g.need;if(need==='champ'){if(S.flags.champ){await say('The crimson barrier around Crimsonspire Castle has shattered. Mandara awaits within...');S.flags['gate'+i]=1;autosave();}else await say('A wall of crimson flame blocks the road to a black castle. Only the Champion of the Summit League could break it.');return;}const ok=medalCount()>=need&&(need<6||S.beaten.syn5);
  if(ok){await say('Guard: You carry '+need+' medal'+(need>1?'s':'')+'. The road ahead is open - stay safe!');S.flags['gate'+i]=1;autosave();}
  else await say('Guard: The road beyond is closed because of Follower activity. Earn the '+GYMS[need-1].medal+' from '+TOWNS[GYMS[need-1].town].name+' Gym first'+(need===6?' and stop the Monk':'')+'.');return;}
 if(e.kind==='legend'&&e.ref.boss)return mandaraEvent(e.ref);
 if(e.kind==='legend'&&e.ref.creator)return creatorEvent(e.ref);
 if(e.kind==='legend'){const l=e.ref;await say('A tremendous presence... '+l.sp+' stirs!');if(!alive(S.party).length){await say('Your team is too exhausted to face it.');return;}
  const r=await wildBattle(mkMon(l.sp,l.lv),true);if(r==='catch'||r==='win'){S.flags['leg_'+l.sp]=1;if(r==='win')await say(l.sp+' vanished into the light... it may return in the future (re-enter the area).');}
  if(r==='win')S.flags['leg_'+l.sp]=0;autosave();return;}
 if(e.kind==='item'){const q=e.ref;S.flags['has_'+q.id]=1;await say('You found '+(q.id==='locket'?'a silver locket engraved "Mara"':'a battered red kite')+'!'+(S.quests[q.q]?'':' Someone in town might be looking for it.'));return;}
 if(e.kind==='nurse'){const c=await choose('Nurse Mae: Welcome to the Healing Center!',['Heal my team','Use storage PC','Leave']);
  if(c===0){healAll();S.lastHeal={map:S.map,x:Math.floor(curMap().w/2),y:4};await say('Your monsters are fully healed! Come again.');autosave();}else if(c===1)await storageMenu();return;}
 if(e.kind==='clerk')return shopMenu();}
async function questTalk(p){const q=QUESTS[p.quest],qs=S.quests[p.quest];
 if(!qs){await say(p.name+': '+q.desc);const c=await choose('Accept "'+q.name+'"?',['Accept','Not now']);if(c===0){S.quests[p.quest]={st:'active',start:S.wildKO};if(q.type==='deliver')addItem('Greta\'s Letter',1);await say('Quest accepted: '+q.name+' (see Quest Log).');}return true;}
 if(qs.st==='done')return false;
 let done=false;if(q.type==='item')done=!!S.flags['has_'+q.item];if(q.type==='hasType')done=S.party.some(m=>SPECIES[m.sp].types.includes(q.ptype));if(q.type==='defeat')done=S.wildKO-qs.start>=q.n;if(q.type==='deliver')done=!!S.flags.delivered;if(q.type==='trainer')done=!!S.beaten[q.trainer];
 if(!done){await say(p.name+': '+q.desc+(q.type==='defeat'?' ('+Math.min(q.n,S.wildKO-qs.start)+'/'+q.n+')':''));return true;}
 qs.st='done';if(q.type==='deliver')addItem('Greta\'s Letter',-1);const rw=[];for(const k in q.reward.items){addItem(k,q.reward.items[k]);rw.push(q.reward.items[k]+'x '+k);}if(q.reward.money){S.money+=q.reward.money;rw.push(q.reward.money+' coins');}
 await sayAll([p.name+': You did it! Thank you so much!','Quest complete: '+q.name+'! Received '+rw.join(', ')+'.']);await relAdd(p.id,30,p.name,npcPlace(p));autosave();return true;}
async function trainerTalk(t,ent){const nm=fmt(t.name);
 if(S.beaten[t.id]){await say(nm+': '+fmt(t.post));const tp=trainerPerson(t);await relDaily(tp,ent);await relMenu(tp,ent);return;}
 if(t.needQuest&&!(S.quests[t.needQuest]&&S.quests[t.needQuest].st==='active')){await say(nm+': What are you looking at? Beat it.');return;}
 if(t.gym!==undefined&&t.gym>0&&!S.medals[t.gym-1]){await say(nm+': Come back once you hold the '+GYMS[t.gym-1].medal+' from '+TOWNS[GYMS[t.gym-1].town].name+'. Every challenger follows the Pilgrim\'s Road.');return;}
 if(t.gym!==undefined){if(!S.beaten['syn'+t.gym]){await say(nm+': The Followers of the Deep are causing trouble in town! Deal with '+(t.gym===5?'the Monk in the ruins plaza':'the grunt outside my door')+' first.');return;}}
 if(t.elite!==undefined&&t.elite>0&&!S.beaten['elite'+(t.elite-1)]){await say(nm+': Defeat the previous Elite first.');return;}
 if(!alive(S.party).length){await say(nm+': You don\'t have any monsters that can fight!');return;}
 if(t.bio)S.met[t.bio]=1;if(t.gym!==undefined||t.elite!==undefined)S.met[t.name]=1;if(t.rival)S.met.rival=1;
 await say(nm+': '+fmt(t.pre));const r=await trainerBattle(t);
 if(r==='win'){S.beaten[t.id]=1;G.victoryUntil=performance.now()+7000;await say(nm+': '+fmt(t.post));if(!t.vanish)await relAdd(t.id,20,nm,ent||t);
  if(t.gym!==undefined){S.medals[t.gym]=true;await say('You received the '+GYMS[t.gym].medal+'! ('+medalCount()+'/6)');addItem('Super Potion',2);}
  if(t.id==='syn5')await sayAll(['The Monk vanishes into shadow, the Dawn Tablet clutched to his chest.','Silas: Rowan is free! He said he\'d meet you after the League!']);
  if(t.elite===4)await ending();
  autosave();}}

// ===== Battle =====
function bMon(m){return {m,stg:{atk:0,def:0,spa:0,spd:0,spe:0},sleep:0};}
function sm(v){return v>=0?(2+v)/2:2/(2-v);}
function eStat(b,k){let v=stats(b.m)[k]*sm(b.stg[k]||0);if(k==='spe'&&b.m.st==='para')v/=2;if(k==='atk'&&b.m.st==='burn')v/=2;return v;}
let BT=null;
function bRender(){if(!BT)return;const c=$('bcv'),x=c.getContext('2d');{const dpr=Math.min(3,window.devicePixelRatio||1),r=c.getBoundingClientRect(),bw=Math.max(320,Math.round((r.width||320)*dpr)),bh=Math.round(bw*0.75);if(c.width!==bw||c.height!==bh){c.width=bw;c.height=bh;}x.setTransform(bw/320,0,0,bh/240,0,0);if(window.MFX){const [a,b]=MFX.shakeOff();x.translate(a,b);}}x.imageSmoothingEnabled=true;x.imageSmoothingQuality='high';
 const g=x.createLinearGradient(0,0,0,240);g.addColorStop(0,BT.bg[0]);g.addColorStop(1,BT.bg[1]);x.fillStyle=g;x.fillRect(0,0,320,240);
 x.fillStyle='rgba(0,0,0,.15)';x.beginPath();x.ellipse(230,95,60,14,0,0,7);x.fill();x.beginPath();x.ellipse(90,180,70,16,0,0,7);x.fill();
 if(ART[BT.e.m.sp]){const A=ART[BT.e.m.sp];if(artOk(BT.e.m.sp)&&!A.cut){x.globalAlpha=0.55;const im=A.img;x.drawImage(im,0,0,im.naturalWidth,im.naturalHeight,0,0,240*im.naturalWidth/im.naturalHeight,240);x.globalAlpha=1;}else{const g2=x.createLinearGradient(0,0,0,240);g2.addColorStop(0,A.pal.bg[0]);g2.addColorStop(1,A.pal.bg[1]);x.fillStyle=g2;x.fillRect(0,0,320,240);}}
 drawBMon(x,'e');drawBMon(x,'p');if(window.MFX)MFX.draw(x);
 const box=(el,b,show)=>{const st=stats(b.m);el.innerHTML='<b>'+esc(mname(b.m))+'</b> Lv'+b.m.lv+(b.m.st?' <span class="stt">'+b.m.st.toUpperCase()+'</span>':'')+'<div class="hpbar"><div style="width:'+Math.max(0,100*b.m.hp/st.hp)+'%;background:'+(b.m.hp/st.hp>.5?'#4c4':b.m.hp/st.hp>.2?'#ec3':'#e44')+'"></div></div>'+(show?'<small>'+b.m.hp+'/'+st.hp+' HP</small>':'');};
 box($('ebox'),BT.e,false);box($('pbox'),BT.p,true);}
function drawBMon(x,side){const b=side==='e'?BT.e:BT.p;if(!b)return;const A=BT[side+'a']||{dx:0,dy:0,a:1,flash:0,sc:1};if(b.m.hp<=0&&!(A.dy>0&&A.a>0)&&!(side==='e'&&BT.showE))return;if(A.a<=0.01||A.sc<=0.01)return;
 const sp=b.m.sp,isE=side==='e';const cx=isE?230:90,cy=isE?(ART[sp]?92:70):150,size=isE?(ART[sp]?120:SPECIES[sp].legend?80:62):70;x.save();x.globalAlpha=A.a;x.translate(cx+A.dx,cy+A.dy+size*0.5);x.scale(A.sc,A.sc);x.translate(-cx,-cy-size*0.5);drawMon(x,sp,cx,cy,size,!isE);
 if(A.flash>0){x.globalCompositeOperation='lighter';x.globalAlpha=A.flash*0.6;drawMon(x,sp,cx,cy,size,!isE,{noAura:true});}x.restore();}
function bgFor(){const t=tileAt(S.map,S.x,S.y);if(S.map!=='world')return ['#140c12','#4a3024'];if(t===T.CAVE)return ['#0c080a','#3a2a22'];if(t===T.SNOW||t===T.SNOWTALL)return ['#141e36','#7a90b8'];if(t===T.SAND)return ['#06202e','#8a7448'];const r=window.WS?WS.region(S.x,S.y):'leaf';return {ember:['#1a0606','#6a2414'],dusk:['#0c0618','#3a2458'],coast:['#04161c','#1c5a50'],gale:['#10141a','#5a6a2a'],crimson:['#140204','#4a0a10'],summit:['#0e0c14','#3a4a30']}[r]||['#081210','#2c5222'];}
async function wildBattle(wm,legend){S.seen[wm.sp]=1;return runBattle({wild:true,enemy:[wm],legend});}
async function trainerBattle(t){const party=(typeof t.party==='string'?rivalParty(t.party):t.party).map(([s,l])=>mkMon(s,l));party.forEach(m=>S.seen[m.sp]=1);return runBattle({wild:false,enemy:party,t});}
async function runBattle(o){G.busy=true;const bel=$('battle');bel.style.display='block';
 const first=S.party.find(m=>m.hp>0);BT={o,p:bMon(first),e:bMon(o.enemy[0]),bg:bgFor(),parts:new Set([first.uid])};if(window.MFX){MFX.reset();MFX.entrance();}bRender();
 let result=null;
 try{
 if(o.boss)await say('The Creator Mandara draws her burning blade!');else await say(o.wild?(o.legend?'The legendary '+o.enemy[0].sp+' appeared!':'A wild '+o.enemy[0].sp+' appeared!'):fmt(o.t.cls+' '+o.t.name)+' wants to battle!');
 if(!o.wild&&!o.boss)await say(fmt(o.t.name)+' sent out '+o.enemy[0].sp+'!');
 await say('Go, '+mname(BT.p.m)+'!');
 while(!result){
  bRender();const a=await choose('What will '+mname(BT.p.m)+' do?',['Fight','Bag','Monsters','Run'],false,'bmenu');
  let pAct=null;
  if(a===0&&BT.p.m.moves.every(x=>x.pp<=0)){await say(mname(BT.p.m)+' has no PP left and struggles!');pAct={t:'move',mv:{n:'Tackle',pp:99}};}
  else if(a===0){const ms=BT.p.m.moves;const i=await choose('Choose a move',ms.map(x=>x.n+' ['+MOVES[x.n].type+'] '+(MOVES[x.n].pow||'-')+' PP'+x.pp),true,'bmenu moves');if(i<0)continue;if(ms[i].pp<=0){await say('No PP left for that move!');continue;}pAct={t:'move',mv:ms[i]};}
  else if(a===1){const r=await battleBag();if(!r)continue;if(r==='caught'){result='catch';break;}pAct={t:'item'};}
  else if(a===2){const r=await switchMenu(false);if(!r)continue;pAct={t:'switch'};}
  else if(a===3){if(!o.wild){await say('You can\'t run from a trainer battle!');continue;}if(o.legend&&Math.random()<0.3){await say('Could not escape!');pAct={t:'none'};}else if(Math.random()<0.9||eStat(BT.p,'spe')>eStat(BT.e,'spe')){await say('Got away safely!');result='run';break;}else{await say('Could not escape!');pAct={t:'none'};}}
  // enemy action
  const eMv=pickEnemyMove();
  const order=[];if(pAct.t==='move'){const pf=eStat(BT.p,'spe')>=eStat(BT.e,'spe')||pAct.mv.n==='Quick Jab';if(pf)order.push(['p',pAct.mv],['e',eMv]);else order.push(['e',eMv],['p',pAct.mv]);}else order.push(['e',eMv]);
  for(const [who,mv] of order){const A=who==='p'?BT.p:BT.e,D=who==='p'?BT.e:BT.p;if(A.m.hp<=0||D.m.hp<=0)continue;await doMove(A,D,mv,who==='e');bRender();
   const r=await checkFaints();if(r){result=r;break;}}
  if(result)break;
  // end of turn status
  for(const b of [BT.p,BT.e]){if(b.m.hp>0&&(b.m.st==='burn'||b.m.st==='poison')){const d=Math.max(1,Math.floor(stats(b.m).hp/(b.m.st==='burn'?16:8)));b.m.hp=Math.max(0,b.m.hp-d);bRender();await say(mname(b.m)+' is hurt by its '+(b.m.st==='burn'?'burn':'poison')+'!');}}
  const r2=await checkFaints();if(r2)result=r2;
 }
 if(result==='lose'){await sayAll(['You have no monsters left to fight!','You hurried back to safety, dropping some coins...']);S.money=Math.floor(S.money/2);healAll();const lh=S.lastHeal;S.map=lh.map;S.x=lh.x;S.y=lh.y;G.dir='up';}
 if(result==='win'&&!o.wild){const mny=o.t.money||100;S.money+=mny;await say('You won! Got '+mny+' coins.');}
 for(const m of S.party){const f=checkEvo(m);if(f){await say('What? '+f+' is evolving!');await say(f+' evolved into '+m.sp+'!');}}
 }finally{bel.style.display='none';BT=null;G.busy=false;S.party.forEach(m=>{if(m.hp<0)m.hp=0;});autosave();}
 return result;}
function pickEnemyMove(){const ms=BT.e.m.moves;let best=ms[0],bs=-1;for(const mv of ms){const M=MOVES[mv.n];let sc=M.pow?M.pow*eff(M.type,SPECIES[BT.p.m.sp].types)*(SPECIES[BT.e.m.sp].types.includes(M.type)?1.5:1):(BT.p.m.st||M.eff==='def+'||M.eff==='spa+'||M.eff==='spe+'?10:45);sc*=0.7+Math.random()*0.6;if(sc>bs){bs=sc;best=mv;}}return best;}
async function doMove(A,D,mv,isE){const M=MOVES[mv.n];const an=(isE&&!BT.o.wild?'Foe ':isE?'Wild ':'')+mname(A.m);
 if(A.m.st==='sleep'){if(A.sleep>0){A.sleep--;await say(an+' is fast asleep.');return;}A.m.st=null;await say(an+' woke up!');}
 if(A.m.st==='para'&&Math.random()<0.25){await say(an+' is paralyzed and can\'t move!');return;}
 if(!isE)mv.pp=Math.max(0,mv.pp-1);
 await say(an+' used '+mv.n+'!');
 if(Math.random()*100>=M.acc){await say('But it missed!');return;}
 if(M.cat==='x'&&window.MFX)await MFX.move(isE,mv.n,M.type,true,A.m.sp);
 if(M.cat==='x'){const ef=M.eff;if(ef.endsWith('S')){if(D.m.st){await say('But it failed!');return;}const st=ef.slice(0,-1);if(st==='para'&&SPECIES[D.m.sp].types.includes('Stone')){await say('It doesn\'t affect '+mname(D.m)+'...');return;}D.m.st=st;if(st==='sleep')D.sleep=ri(1,3);await say(mname(D.m)+' is now '+{burn:'burned',poison:'poisoned',para:'paralyzed',sleep:'asleep'}[st]+'!');return;}
  const k=ef.slice(0,3),up=ef.endsWith('+');const tgt=up?A:D;tgt.stg[k]=clamp((tgt.stg[k]||0)+(up?1:-1),-6,6);await say(mname(tgt.m)+'\'s '+{atk:'Attack',def:'Defense',spa:'Sp. Atk',spd:'Sp. Def',spe:'Speed'}[k]+(up?' rose!':' fell!'));return;}
 if(window.MFX)await MFX.move(isE,mv.n,M.type,false,A.m.sp);
 const phys=M.cat==='p';const at=eStat(A,phys?'atk':'spa'),df=eStat(D,phys?'def':'spd');
 const e=eff(M.type,SPECIES[D.m.sp].types);const stab=SPECIES[A.m.sp].types.includes(M.type)?1.5:1;const crit=Math.random()<0.0625?1.5:1;
 let dmg=Math.floor(((2*A.m.lv/5+2)*M.pow*at/df/50+2)*stab*e*crit*(0.85+Math.random()*0.15));if(e>0)dmg=Math.max(1,dmg);
 D.m.hp=Math.max(0,D.m.hp-dmg);bRender();flash(isE?'pbox':'ebox');if(window.MFX&&e>0)await MFX.hit(isE,dmg,crit>1,e);
 if(crit>1&&e>0)await say('A critical hit!');if(e>1)await say('It\'s super effective!');else if(e===0)await say('It doesn\'t affect '+mname(D.m)+'...');else if(e<1)await say('It\'s not very effective...');
 if(M.eff==='drain'&&dmg>0){A.m.hp=Math.min(stats(A.m).hp,A.m.hp+Math.ceil(dmg/2));bRender();await say(mname(D.m)+' had its energy drained!');}
 if(D.m.hp>0&&!D.m.st&&['burn','para'].includes(M.eff)&&Math.random()<0.15){D.m.st=M.eff;await say(mname(D.m)+' is '+(M.eff==='burn'?'burned':'paralyzed')+'!');}}
function flash(id){const el=$(id);el.classList.add('hit');setTimeout(()=>el.classList.remove('hit'),300);}
async function checkFaints(){const o=BT.o;
 if(BT.e.m.hp<=0){if(window.MFX)await MFX.faint('e');await say((o.wild?'Wild ':'Foe ')+BT.e.m.sp+' fainted!');
  if(o.wild)S.wildKO++;
  const base=SPECIES[BT.e.m.sp].base.reduce((a,b)=>a+b,0);const xp=Math.max(1,Math.floor(base/6*BT.e.m.lv/5*(o.wild?1:1.5)));
  const parts=S.party.filter(m=>BT.parts.has(m.uid)&&m.hp>0);for(const m of parts){const msgs=gainXP(m,Math.ceil(xp/parts.length));for(const t of msgs)await say(t);}bRender();
  const next=o.enemy.find(m=>m.hp>0);if(!next)return 'win';BT.e=bMon(next);if(window.MFX){MFX.restore('e');MFX.sendOut('e');}await say(fmt(o.t.name)+' sent out '+next.sp+'!');bRender();}
 if(BT.p.m.hp<=0){if(window.MFX)await MFX.faint('p');await say(mname(BT.p.m)+' fainted!');if(!alive(S.party).length)return 'lose';await switchMenu(true);bRender();}
 return null;}
async function switchMenu(forced){while(true){const opts=S.party.map(m=>mname(m)+' Lv'+m.lv+' '+m.hp+'/'+stats(m).hp+(m===BT.p.m?' (in battle)':''));
 const i=await choose(forced?'Choose the next monster':'Switch to which monster?',opts,!forced);if(i<0)return false;const m=S.party[i];
 if(m.hp<=0){await say(mname(m)+' has no energy left to fight!');continue;}if(m===BT.p.m){await say(mname(m)+' is already in battle!');continue;}
 BT.p=bMon(m);BT.parts.add(m.uid);if(window.MFX){MFX.restore('p');MFX.sendOut('p');}await say('Go, '+mname(m)+'!');bRender();return true;}}
async function battleBag(){const names=Object.keys(S.bag).filter(n=>ITEMS[n]&&!ITEMS[n].gift);if(!names.length){await say('Your bag is empty!');return false;}
 const i=await choose('Use which item?',names.map(n=>n+' x'+S.bag[n]));if(i<0)return false;const n=names[i],it=ITEMS[n];
 if(it.ball){if(!BT.o.wild){await say('The trainer blocked the orb! Don\'t be a thief!');return false;}addItem(n,-1);return await tryCatch(it.ball,n);}
 const r=await useItemOn(n);return r;}
async function tryCatch(ball,n){const e=BT.e.m,st=stats(e);await say('You threw a '+n+'!');if(window.MFX)await MFX.throwOrb();
 let ok;if(ball>=255)ok=true;else{const sb=e.st==='sleep'?2:e.st?1.5:1;const a=(3*st.hp-2*e.hp)*SPECIES[e.sp].catch*ball*sb/(3*st.hp);ok=Math.random()*255<Math.max(1,a);}
 const shakes=ok?3:ri(0,2);for(let k=0;k<shakes;k++){if(window.MFX)await MFX.wobble();await say('...shake...');}
 if(!ok){if(window.MFX)await MFX.breakFree();await say(['Oh no! It broke free!','Argh! Almost had it!','Aww! It appeared to be caught!'][shakes]);return 'used';}
 if(window.MFX)await MFX.caught();await say('Gotcha! '+e.sp+' was caught!');e.st=null;const where=addMon(e);if(where==='box')await say(e.sp+' was sent to the Storage Box.');
 if(SPECIES[e.sp].legend)S.flags['leg_'+e.sp]=1;return 'caught';}
async function useItemOn(n){const it=ITEMS[n];if(it.gift){await say(n+' is a gift. Talk to someone and choose "Give a gift".');return false;}if(it.ball){await say('You can only use that in a wild battle.');return false;}
 const i=await choose('Use '+n+' on which monster?',S.party.map(m=>mname(m)+' '+m.hp+'/'+stats(m).hp+(m.st?' '+m.st:'')));if(i<0)return false;const m=S.party[i],st=stats(m);
 if(it.revive){if(m.hp>0){await say('It won\'t have any effect.');return false;}m.hp=Math.floor(st.hp/2);}
 else if(it.heal){if(m.hp<=0||m.hp>=st.hp){await say('It won\'t have any effect.');return false;}m.hp=Math.min(st.hp,m.hp+it.heal);}
 else if(it.cure){if(!m.st){await say('It won\'t have any effect.');return false;}m.st=null;}
 else if(it.candy){if(m.lv>=100){await say('It won\'t have any effect.');return false;}addItem(n,-1);const msgs=gainXP(m,(m.lv+1)**3-m.xp);for(const t of msgs.slice(1))await say(t);const f=checkEvo(m);if(f)await say(f+' evolved into '+m.sp+'!');return 'used';}
 addItem(n,-1);await say(mname(m)+' was helped by the '+n+'.');if(BT)bRender();return 'used';}

// ===== Shop / storage =====
async function shopMenu(){const md=medalCount();const stock=['Potion','Snare Orb','Full Heal'];if(md>=1)stock.push('Super Potion','Great Orb');if(md>=3)stock.push('Ultra Orb','Revive');if(md>=5)stock.push('Max Potion');stock.push(['Wildflower Posy','Ember Charm','Sea Glass','Spiced Tea','Frost Lily','Star Candle'][curMap().town]||'Sea Glass','Honey Bread');
 while(true){const i=await choose('Clerk: What would you like? (Coins: '+S.money+')',stock.map(n=>n+' - '+ITEMS[n].price+'c').concat(['Leave']));if(i<0||i===stock.length)return;
  const n=stock[i];const q=await choose('How many '+n+'?',['1','5','10']);if(q<0)continue;const qty=[1,5,10][q];const cost=ITEMS[n].price*qty;
  if(S.money<cost){await say('You don\'t have enough coins.');continue;}S.money-=cost;addItem(n,qty);await say('Bought '+qty+'x '+n+'! Thank you!');}}
async function storageMenu(){while(true){const c=await choose('Storage PC  (Party '+S.party.length+'/6, Box '+S.box.length+')',['Deposit','Withdraw','Trainer Editor','Log off']);
 if(c<0||c===3)return;
 if(c===0){if(S.party.length<=1){await say('You can\'t deposit your last monster!');continue;}const i=await choose('Deposit which?',S.party.map(m=>mname(m)+' Lv'+m.lv));if(i<0)continue;const m=S.party.splice(i,1)[0];S.box.push(m);await say(mname(m)+' was stored in the Box.');}
 if(c===1){if(!S.box.length){await say('The Box is empty.');continue;}if(S.party.length>=6){await say('Your party is full!');continue;}const i=await choose('Withdraw which?',S.box.map(m=>mname(m)+' Lv'+m.lv));if(i<0)continue;const m=S.box.splice(i,1)[0];S.party.push(m);await say(mname(m)+' joined your party.');}
 if(c===2)await editorMenu();}}

// ===== Menus =====
async function openMenu(){G.busy=true;try{while(true){let c=await choose(null,['Monsters','Bag','Monsterdex','People','Quest Log','Trainer Card','Trainer Editor','Scripture','Save','Save Backup','Help',(window.AMB?AMB.label():'Effects'),'Sound','Close'],true,'mainmenu');
 if(c<0||c===13)break;if(c===12){await soundMenu();continue;}if(c===11){if(window.AMB){AMB.toggle();document.body.classList.toggle('fxlow',AMB.reduced);toast(AMB.label());}continue;}
 if(c===7){await waitScreen('<h2>Book of the Three</h2>'+((S.scripture||[]).length?(S.scripture.map(i=>'<p>'+esc(VERSES[i])+'</p>').join('')):'<p>Read the altars in each Temple of the Three to collect verses.</p>')+'<p class="hint">The Triune Faith honours Mancaco (Light &amp; Heaven), Mantermo (Water &amp; Air) and Mandara (Dark &amp; Fire). Festivals: Ember Vigil (day 3 of each week), Dawnlight Feast (day 5), Tide &amp; Gale Regatta (day 7). The Followers of the Deep are a heretical sect of this faith.</p>');continue;}
 if(c>7)c--;
 if(c===0)await partyScreen();if(c===1)await bagScreen();if(c===2)await dexScreen();if(c===3)await peopleScreen();if(c===4)await questScreen();if(c===5)await cardScreen();if(c===6)await editorMenu();
 if(c===7){saveGame();await say('Game saved!');}if(c===8)await backupMenu();if(c===9)await helpScreen();}}finally{G.busy=false;}}
function waitScreen(html,cls){return new Promise(r=>{const L=screen(html+'<button class="opt back">Back</button>',r,cls);L.el.querySelector('.back').onclick=()=>L.onB();});}
function monSummary(m){const st=stats(m),s=SPECIES[m.sp];return '<div class="mrow"><span class="spr" data-sp="'+m.sp+'"></span><div><b>'+esc(mname(m))+'</b> ('+m.sp+') Lv '+m.lv+' &nbsp;'+s.types.map(t=>'<span class="ty" style="background:'+TCOL[t]+'">'+t+'</span>').join('')+'<br>HP '+m.hp+'/'+st.hp+(m.st?' ['+m.st+']':'')+' | Atk '+st.atk+' Def '+st.def+' SpA '+st.spa+' SpD '+st.spd+' Spe '+st.spe+(m.ov?' <i>(custom)</i>':'')+'<br>XP '+m.xp+' / next '+(m.lv<100?(m.lv+1)**3:'MAX')+'<br>Moves: '+m.moves.map(x=>x.n+' ('+x.pp+')').join(', ')+'</div></div>';}
function paintSprites(root){root.querySelectorAll('.spr').forEach(s=>{if(!s.firstChild)s.appendChild(monCanvas(s.dataset.sp,48));});}
async function partyScreen(){while(true){const i=await choose('Party',S.party.map(m=>mname(m)+'  Lv'+m.lv+'  '+m.hp+'/'+stats(m).hp));if(i<0)return;const m=S.party[i];
 const c=await choose(mname(m),['Summary','Move to top','Nickname','Use item','Back']);
 if(c===0){const p=waitScreen('<h2>Summary</h2>'+monSummary(m));paintSprites($('ui'));await p;}
 if(c===1){S.party.splice(i,1);S.party.unshift(m);}
 if(c===2){m.nick=await promptName('Nickname for '+m.sp,mname(m));}
 if(c===3){const names=Object.keys(S.bag).filter(n=>ITEMS[n]&&!ITEMS[n].ball);if(!names.length){await say('No usable items.');continue;}const k=await choose('Use which item?',names.map(n=>n+' x'+S.bag[n]));if(k>=0){const n=names[k];const it=ITEMS[n];const idx=S.party.indexOf(m);/* reuse */const r=await useItemOn(n);}}}}
async function bagScreen(){while(true){const names=Object.keys(S.bag);if(!names.length){await say('Your bag is empty.');return;}
 const i=await choose('Bag (Coins: '+S.money+')',names.map(n=>n+' x'+S.bag[n]));if(i<0)return;const n=names[i];if(!ITEMS[n]){await say(n+': A key item for a quest.');continue;}
 await say(n+': '+ITEMS[n].desc);if(!ITEMS[n].ball){const c=await choose('Use '+n+'?',['Use','Cancel']);if(c===0)await useItemOn(n);}}}
function whereFound(sp){const out=[];for(const k in ZONES)if(ZONES[k].sp.includes(sp))out.push(ZONES[k].name);const l=LEGENDS.find(x=>x.sp===sp);if(l)out.push(SPECIES[sp].habitat+' (one of a kind)');if(['Cindle','Drizzlet','Sprigling'].includes(sp))out.push('Starter from Professor Wren');if(!out.length){const line=evoLine(sp);if(line.indexOf(sp)>0)out.push('Evolve '+line[line.indexOf(sp)-1]);}return out.join('; ')||'Unknown';}
async function dexScreen(){const seen=Object.keys(S.seen).length,caught=Object.keys(S.caught).length;
 while(true){const i=await choose('Monsterdex  Seen '+seen+' / Caught '+caught+' / '+SPLIST.length,SPLIST.map(s=>'#'+String(s.id).padStart(2,'0')+' '+(S.seen[s.name]?s.name:'?????')+(S.caught[s.name]?' *':'')),true,'tall');if(i<0)return;
  const s=SPLIST[i];if(!S.seen[s.name]){await say('No data. Encounter this monster first.');continue;}const full=S.caught[s.name];
  const h='<h2>#'+s.id+' '+s.name+'</h2><div class="mrow"><span class="spr big" data-sp="'+s.name+'"></span><div>Type: '+s.types.map(t=>'<span class="ty" style="background:'+TCOL[t]+'">'+t+'</span>').join('')+'<br>Height: '+s.h+' m &nbsp; Weight: '+s.w+' kg<br>Ability: '+s.ability+'<br>Habitat: '+s.habitat+'<br>Evolution: '+evoLine(s.name).map((n,j,a)=>n+(SPECIES[n].evo?' (Lv'+SPECIES[n].evo.lv+') &rarr; ':'')).join('')+'<br>Where found: '+esc(whereFound(s.name))+'</div></div><p>'+(full?esc(s.lore):'<i>Catch it to unlock full lore.</i>')+'</p>'+(full&&FOOTNOTES[s.name]?'<p class="hint">'+esc(FOOTNOTES[s.name])+'</p>':'')+(ART[s.name]?(artOk(s.name)?'<img class="dexart"'+(ART[s.name].cut?' style="background:linear-gradient('+ART[s.name].pal.bg[0]+','+ART[s.name].pal.bg[1]+')"':'')+' src="'+ART[s.name].src+'" alt="'+s.name+'">':'<span class="spr big" data-sp="'+s.name+'"></span>'):'')+(full?'<p>Base stats: '+['HP','Atk','Def','SpA','SpD','Spe'].map((k,j)=>k+' '+s.base[j]).join(' / ')+'</p>':'');
  const p=waitScreen(h);paintSprites($('ui'));await p;}}
function schedText(p){return p.sched.map(e=>String(e[0]).padStart(2,'0')+':00 - '+(e[1]==='world'?(townAt(e[2],e[3])||{name:'outdoors'}).name+' (outdoors)':MAPS[e[1]].name)).join('<br>');}
async function peopleScreen(){const list=[];for(const p of PEOPLE)if(S.met[p.id])list.push({id:p.id,n:p.name,age:p.age,job:p.job,pers:p.pers,back:p.back,sch:schedText(p),p});
 for(const t of TRAINERS)if(S.rel&&S.rel[t.id]&&!PEOPLE_BY_ID[t.id]&&!BIOS[t.name])list.push({id:t.id,n:fmt(t.name),age:'?',job:t.cls,pers:'Competitive',back:'A trainer you have battled.',sch:'At their post.',p:trainerPerson(t)});
 for(const k in BIOS)if(S.met[k]){const b=BIOS[k];{const tt=TRAINERS.find(t=>t.name===k||(k==='rival'&&t.rival&&t.id==='rival1'));list.push({id:tt&&tt.id,p:tt&&trainerPerson(tt),n:k==='rival'?S.rival:k==='monk'?'The Monk':k,age:b.age,job:b.job,pers:b.pers,back:b.back,sch:k==='rival'?'Always on the road ahead of you.':'At their post.'});}}
 if(!list.length){await say('You haven\'t met anyone yet.');return;}
 while(true){const i=await choose('People Journal ('+list.length+' met)',list.map(x=>x.n+' - '+x.job+(x.id?' ['+relName(x.id)+']':'')),true,'tall');if(i<0)return;const x=list[i];
  await waitScreen('<h2>'+esc(x.n)+'</h2><p>Age: '+x.age+'<br>Job: '+esc(x.job)+'<br>Personality: '+esc(x.pers)+'</p><p>'+esc(x.back)+'</p>'+(x.id?'<p><b>Friendship:</b> '+esc(relBar(x.id))+'<br>'+(relLv(x.id)>=1&&x.p?'Likes: '+esc(x.p.likes.join(', '))+(relLv(x.id)>=2?' - Dislikes: '+esc(x.p.dislikes.join(', ')):''):'Likes: ? (get to know them better)')+'</p>':'')+'<p><b>Schedule</b><br>'+x.sch+'</p>');}}
async function questScreen(){const rows=Object.keys(QUESTS).map(id=>{const q=QUESTS[id],s=S.quests[id];return '<div class="q '+(s?s.st:'none')+'"><b>'+q.name+'</b> - '+TOWNS[q.town].name+' ['+(s?s.st==='done'?'COMPLETE':'ACTIVE':'not started')+']<br>'+(s?esc(q.desc):'Talk to '+PEOPLE_BY_ID[q.giver].name+' in '+TOWNS[q.town].name+'.')+(s&&q.type==='defeat'&&s.st==='active'?' ('+Math.min(q.n,S.wildKO-s.start)+'/'+q.n+')':'')+'</div>';}).join('');
 await waitScreen('<h2>Quest Log</h2>'+rows+'<p><b>Main story:</b> '+mainObjective()+'</p><p><b>Ancient clues:</b> '+clueCount()+' / '+CLUE_TOTAL+(S.flags.legrantaSecret?' - the eighth door is open.':' (temple murals in every town, old scripture fragments, an elder\'s whisper, a sealed door...)')+'</p>');}
function mainObjective(){if(!S.starter)return 'Visit Professor Wren\'s lab in Mossgrove.';if(S.flags.finale)return 'The world is saved! Catch every Creator and complete your Monsterdex.';if(S.flags.champ)return 'Enter Crimsonspire Castle (east of the League plaza), defeat the Monk and free corrupted Mandara.';const n=medalCount();if(n<6){const g=GYMS[n];return (S.beaten['syn'+n]?'':'Stop the Followers in '+TOWNS[g.town].name+', then ')+'challenge Gym Leader '+g.leader+' in '+TOWNS[g.town].name+'.';}if(!S.beaten.rival2)return 'Head north from Duskhollow to the Summit League.';return 'Defeat the Elite challengers and Champion Aurelia.';}
async function cardScreen(){const pt=Math.floor(S.play);const h='<h2>Trainer Card</h2><div class="card"><p><b>'+esc(S.name)+'</b><br>Hometown: Mossgrove<br>Family: Mother Ilsa (baker), father Rowan (ranger, '+(S.flags.champ?'rescued':'missing')+')<br>Rival: '+esc(S.rival)+'<br>Motivation: Find out what happened to your father and become Champion of the Summit League.</p><p>Coins: '+S.money+'<br>Playtime: '+Math.floor(pt/3600)+'h '+Math.floor(pt/60)%60+'m '+pt%60+'s<br>Monsterdex: '+Object.keys(S.caught).length+' caught / '+Object.keys(S.seen).length+' seen<br>'+(S.flags.champ?'<b>CHAMPION</b>':'')+'</p><div class="medals">'+GYMS.map((g,i)=>'<span class="medal '+(S.medals[i]?'got':'')+'" style="background:'+(S.medals[i]?TCOL[g.type]:'#333')+'" title="'+g.medal+'">'+(S.medals[i]?g.medal.split(' ')[0]:'?')+'</span>').join('')+'</div></div>';await waitScreen(h);}
async function helpScreen(){await waitScreen('<h2>Controls</h2><p><b>Move:</b> Arrow keys / WASD (or touch D-pad)<br><b>Confirm / Talk / Interact:</b> Z or Enter or Space (touch A)<br><b>Back / Menu:</b> X or Esc (touch B); M also opens the menu<br>Walk into doors to enter buildings; step on the red mat to leave.<br>Tall grass and caves have wild monsters.<br>Talk to the nurse in Healing Centers (red roofs) to heal; Markets (blue roofs) sell items; PC = storage &amp; Trainer Editor.<br>Gyms have purple roofs. The game autosaves on map change, after battles and every 30 seconds.</p><p><b>Clock:</b> 1 real second = 1 in-game minute. People go to work by day and home at night.</p>');}

// ===== Trainer Editor =====
async function editorMenu(){while(true){const all=S.party.map((m,i)=>({m,where:'Party'})).concat(S.box.map(m=>({m,where:'Box'})));
 const i=await choose('Trainer Editor - choose a monster',all.map(x=>'['+x.where+'] '+mname(x.m)+' Lv'+x.m.lv));if(i<0)return;await editMon(all[i].m);}}
function editMon(m){return new Promise(res=>{const st=stats(m);const K=['hp','atk','def','spa','spd','spe'],LB={hp:'HP',atk:'Atk',def:'Def',spa:'SpA',spd:'SpD',spe:'Spe'};
 const html='<h2>Trainer Editor</h2><div class="mrow"><span class="spr" data-sp="'+m.sp+'"></span><div><b>'+esc(mname(m))+'</b> ('+m.sp+')</div></div><div class="edgrid"><label>Level (1-100)<input class="opt" type="number" min="1" max="100" id="ed_lv" value="'+m.lv+'"></label>'+K.map(k=>'<label>'+LB[k]+'<input class="opt" type="number" min="1" max="999" id="ed_'+k+'" value="'+st[k]+'"></label>').join('')+'</div><label class="chk"><input type="checkbox" id="ed_auto"> Auto-calculate stats from level</label><br><button class="opt" id="ed_apply">Apply</button><button class="opt" id="ed_reset">Reset to normal stats</button><button class="opt" id="ed_back">Back</button><p class="hint" id="ed_msg">Moves and evolution update automatically. Normal XP training continues from the new level.</p>';
 const L=screen(html,()=>res());paintSprites(L.el);const q=s=>L.el.querySelector(s);
 q('#ed_back').onclick=()=>L.onB();
 q('#ed_reset').onclick=()=>{m.ov=null;applyLevel(m,m.lv);q('#ed_msg').textContent='Stats reset to formula values.';refresh();};
 q('#ed_apply').onclick=()=>{const lv=clamp(parseInt(q('#ed_lv').value)||1,1,100);const vals={};let bad=false;for(const k of K){const v=parseInt(q('#ed_'+k).value);if(!(v>=1&&v<=999))bad=true;vals[k]=clamp(v||1,1,999);}
  const oldLv=m.lv,changedLv=lv!==oldLv;const oldSt=stats(m);applyLevel(m,lv);
  const auto=q('#ed_auto').checked;const statsEdited=K.some(k=>vals[k]!==oldSt[k]);
  if(auto||(!statsEdited&&changedLv&&!m.ov))m.ov=null;else m.ov=vals;
  m.hp=stats(m).hp;m.st=null;markCaught(m.sp);q('#ed_msg').textContent='Applied! Now '+m.sp+' Lv'+m.lv+'. Moves: '+m.moves.map(x=>x.n).join(', ')+(bad?' (some values clamped to 1-999)':'');refresh();autosave();};
 function refresh(){const s2=stats(m);q('#ed_lv').value=m.lv;K.forEach(k=>q('#ed_'+k).value=s2[k]);const sp=L.el.querySelector('.spr');sp.dataset.sp=m.sp;sp.innerHTML='';paintSprites(L.el);L.el.querySelector('.mrow b').nextSibling.textContent=' ('+m.sp+')';}
});}
function applyLevel(m,lv){m.lv=lv;m.xp=lv**3;const ns=speciesForLevel(m.sp,lv);m.sp=ns;setMovesForLevel(m);}
window.applyLevel=applyLevel;

// ===== Ancient clues (Legranta) =====
const KNOWERS={thessaly:['(smiling kindly) There you are, dear. The ground shook, and I knew it was you. Sit, have some tea.','You see, it only takes enough of us. Enough people knowing the truth... and the true god wakes. With you, child, I believe we are finally enough.','"A thing does not rise unless it is called." Someone called the Three. Soon, I think, that someone will open his eyes. Isn\'t it wonderful?'],
 fenwick:['Oh! Hello, friend! You felt the quake too? I knew it - the fourth sky-pattern moved the moment you learned.','Every new knower is another voice in the dark. We needed one more. Just one more. You.','When the true god wakes, the eighth seal will not hold. I do hope he likes you. I truly do.'],
 corwin:['Heh. Come here, come here. You found him, didn\'t you? I told your father the story of the Three. I never told him the ending.','The ending is this: when enough of us know the truth, the true god wakes. Thank you for being the last one we needed.'],
 stranger:['Welcome, @NAME. Don\'t be afraid - we are all friends here. Every one of us felt the ground move when you learned.','You were the last we needed. Now enough of us know the truth to wake the true god.','Sleep well tonight. It may be the last quiet night any world gets for a long while.']};
const CLUE_TOTAL=9;
function clueCount(){return Object.keys(S.clues||{}).length;}
function addClue(k){S.clues=S.clues||{};if(S.clues[k])return false;S.clues[k]=1;toast('Ancient clue found ('+clueCount()+'/'+CLUE_TOTAL+')');return true;}
async function sealDoor(){addClue('seal');
 if(S.flags.legrantaSecret){await say('The eighth door stands open onto darkness. Something far above is still watching.');return;}
 if(clueCount()<CLUE_TOTAL){await sayAll(['A door of black stone, sealed with eight interlocking rings. None of your monsters can so much as scratch it.','Carved above it: "...NOT A WORLD, BUT ALL WORLDS..." The rest has been deliberately erased. This is said to be the eighth door.','(Ancient clues: '+clueCount()+'/'+CLUE_TOTAL+'. The rings seem to wait for something.)']);return;}
 await sayAll(['The eight rings begin to turn on their own. Every clue you gathered burns in your memory at once.','The sealed door grinds open.']);
 await silhouetteScene(['Beyond the door: a mural no chisel has touched. The three sisters stand with weapons raised...','...and above them, where every other mural is scraped bare, towers a fourth figure, vast beyond measure.','His face is only shadow. Beneath his feet, one word has been left: LEGRANTA.','Beneath it, the old fragment: "...who called them up out of the Deep? For a thing does not rise unless it is called..."']);
 S.flags.legrantaSecret=1;await worldShake();
 await sayAll(['The whole world shakes. In every town, windows rattle and temple flames gutter.','Somewhere, a few people who already knew the truth look up and smile - someone new has found out. They may want to talk to you.']);
 if(S.flags.finale)await say('Epilogue: That night the Sister Stars shone four, not three, and a voice older than the Deep said only: "Found."');autosave();}
function worldShake(){if(window.SFX)SFX.play('shake');return new Promise(r=>{G.shake=150;const t=setInterval(()=>{if(G.shake<=0){clearInterval(t);r();}},50);});}
function silhouetteScene(lines){return new Promise(async res=>{const el=mkEl('screen artscene','<canvas class="artcv" width="280" height="240"></canvas><div class="cap"></div>');const c=el.querySelector('canvas').getContext('2d');
 const g=c.createLinearGradient(0,0,0,240);g.addColorStop(0,'#05030a');g.addColorStop(1,'#201030');c.fillStyle=g;c.fillRect(0,0,280,240);
 for(let i=0;i<60;i++){c.fillStyle='rgba(255,255,255,'+Math.random()*0.8+')';c.fillRect(Math.random()*280,Math.random()*240,1,1);}
 c.fillStyle='#000';c.beginPath();c.ellipse(140,70,40,50,0,0,7);c.fill();c.beginPath();c.moveTo(80,230);c.lineTo(100,100);c.lineTo(180,100);c.lineTo(200,230);c.fill();
 c.strokeStyle='rgba(200,180,255,.6)';for(let i=0;i<8;i++){c.beginPath();c.arc(140+Math.cos(i*0.785)*62,52+Math.sin(i*0.785)*22,5,0,7);c.stroke();}
 c.fillStyle='rgba(255,240,200,.9)';c.fillRect(126,64,6,2);c.fillRect(148,64,6,2);
 [[90,'#e8c878'],[140,'#5080c0'],[190,'#c02020']].forEach(([x,col])=>{c.fillStyle=col;c.fillRect(x-5,200,10,30);c.beginPath();c.arc(x,195,6,0,7);c.fill();});
 const L={el,remove:true,onB:()=>{}};pushL(L);
 for(const t of lines){el.querySelector('.cap').textContent=fmt(t);await new Promise(r=>{L.onKey=k=>{if(k==='a'||k==='b'){L.onKey=null;r();}return true;};el.onclick=()=>{el.onclick=null;L.onKey=null;r();};});}
 popL(L);res();});}
// ===== Faith: scripture, festivals =====
async function readAltar(){S.scripture=S.scripture||[];const unread=VERSES.findIndex((v,i)=>!S.scripture.includes(i)&&(i<VERSES.length-2||S.flags.champ||medalCount()>=6));
 if(unread<0){await say('You have read every verse this altar offers. (See Scripture in the menu.)');return;}S.scripture.push(unread);await say('The Book of the Three: '+VERSES[unread]);if(VERSES.every((v,i)=>!v.startsWith('[')||S.scripture.includes(i)))addClue('frag');}
function dayNum(){return Math.floor(S.time/1440);}
function festival(){return FESTS[dayNum()%7]||null;}
// ===== Mandara climax =====
function artScene(lines,sp){sp=sp||'Mandara';return new Promise(async res=>{const el=mkEl('screen artscene',(artOk(sp)?'<img'+(ART[sp].cut?' class="cut" style="background:radial-gradient(ellipse at 50% 80%,'+ART[sp].pal.bg[1]+','+ART[sp].pal.bg[0]+')"':'')+' src="'+ART[sp].src+'" alt="'+sp+'">':'<canvas class="artcv" width="280" height="240"></canvas>')+'<div class="cap"></div>');const cv=el.querySelector('.artcv');if(cv){drawWarrior(cv.getContext('2d'),sp,140,120,190,true);}const L={el,remove:true,onB:()=>{}};pushL(L);
 for(const t of lines){el.querySelector('.cap').textContent=fmt(t);await new Promise(r=>{const prev=L.onKey;L.onKey=k=>{if(k==='a'||k==='b'){L.onKey=null;r();}return true;};el.onclick=()=>{L.onKey=null;el.onclick=null;r();};});}
 popL(L);res();});}
async function mandaraEvent(l){if(!S.beaten.vesper2){await say('A crushing heat holds you back. The Monk stands guard before the throne.');return;}
 if(!alive(S.party).length){await say('Your team is too exhausted to face her.');return;}
 if(!S.flags.mandaraBeaten){S.seen.Mandara=1;
  await artScene(['The sky has turned red. The throne room burns crimson. Black veins of the Deep crawl across a towering armored figure - Mandara, summoned by the Monk\'s dark ritual.','Mandara (corrupted): THE DEEP... COMMANDS... BURN... EVERYTHING...','Her golden eyes flicker - for an instant, pain shows through the darkness.','Scripture 2:3 - "Call her through a dark rite, and she will come in ruin." You must break the corruption!']);
  const r=await runBattle({wild:false,enemy:[mkMon('Mandara',l.lv)],t:{name:'Corrupted Mandara',cls:'Creator',money:0,post:''},boss:true});
  if(r!=='win'){await say('The corrupted Creator\'s flames drive you back. Return when you are ready.');return;}
  S.flags.mandaraBeaten=1;
  await artScene(['The black veins shatter like glass and drain away into the floor. The crimson storm outside falls silent.','Her golden eyes turn warm as a hearth, and Mandara smiles. Far away, the forges of Cinderbrook flare back to life.','Mandara: ...I can see again. The Monk dragged me through the Deep and filled me with its hunger. Thank you, little one.','Mandara: I am the dark that lets you rest and the fire that keeps you warm. I never wished to harm what my sisters and I made.','Mandara: If you will have me, I would walk beside you. (Use a capture orb to accept her.)']);
  const w=mkMon('Mandara',l.lv);w.hp=Math.max(1,Math.floor(stats(w).hp*0.25));const r2=await wildBattle(w,true);
  await finalEnding(r2==='catch');return;}
 await artScene(['Mandara, purified, waits calmly upon her throne. "Have you come to walk with me?"']);
 const r=await wildBattle(mkMon('Mandara',l.lv),true);if(r==='catch'){S.flags.leg_Mandara=1;await say('Mandara smiles warmly and joins you.');}autosave();}
async function creatorEvent(l){const sp=l.sp;S.seen[sp]=1;
 if(!S.beaten.syn5){await say('A wall of '+(sp==='Mancaco'?'blinding light':'howling wind and spray')+' holds you back. Perhaps once the Monk is stopped in Duskhollow...');return;}
 if(!alive(S.party).length){await say('Your team is too exhausted.');return;}
 const lines=sp==='Mancaco'?['Light pours from a radiant figure in white-and-gold armor, a lance of dawnlight in her hand.','Mancaco: I am Mancaco, Creator of Light and Heaven, sister of Mandara and Mantermo.','Mancaco: I raised the sky-vault and set the stars. Show me the truth of your heart!']:['Storm and tide swirl around an armored figure with a glowing trident.','Mantermo: I am Mantermo, Creator of Water and Air. My breath is the wind, my blood the sea.','Mantermo: The Monk\'s Deep Rite tore at my sister. Prove you can calm a storm!'];
 await artScene(lines,sp);const r=await wildBattle(mkMon(sp,l.lv),true);
 if(r==='catch'){S.flags['leg_'+sp]=1;await artScene([sp+' bows her head and joins you. "May the Three walk with you."'],sp);}
 else if(r==='win')await say(sp+' withdraws into the light of her lair... she will return.');autosave();}
async function finalEnding(caught){$('ui').classList.add('dark');
 await sayAll([caught?'Mandara, freed from corruption, has chosen you as her partner.':'Mandara, freed, returns to rest upon her throne. (You may return to invite her to join you.)','The Monk kneels in the ash. "My wife... my two children... I cried out to the Three and they slept. I only wanted something - anything - above them to answer me." He surrenders to the temple elders.','Across the land the Temples of the Three ring their bells. Mancaco\'s light and Mantermo\'s winds answer from the Celestine Citadel and the Skysea Temple.','The Followers of the Deep disband. The Triune Faith declares a new festival in your name.','Rowan: You did what the scripture said - you called the Creator back with a pure heart.','THE END - Monster Wilds: Legends of the Dawnstone. Thank you for playing!']);
 await sayAll(['. . .','One scripture fragment stays unread: "...and the Three were not first. Above the Deep there is One who made not a world, but all worlds. His name is not to be written. When the seal of the eighth door breaks, He will look upon..."','Somewhere far above, Legranta opened his eyes.',...(S.flags.legrantaSecret?['...and because you had already opened the eighth door, he looked straight at you. Enough of you know now, little world. I am awake.']:[]),'- To be continued -']);
 S.flags.finale=1;$('ui').classList.remove('dark');healAll();autosave();}
// ===== Ending =====
async function ending(){S.flags.champ=1;S.met.rowan=1;$('ui').classList.add('dark');
 await sayAll(['Aurelia: The Summit League has a new Champion: @NAME!','The doors of the hall open. A tired man in a ranger\'s coat steps forward...','Rowan: @NAME... look at you. Champion.','Rowan: The Followers held me for five years, but when you defeated the Monk in Duskhollow the vault doors opened. You saved me - and the legends.','@RIVAL: Hmph. Next year that title is mine. ...Congratulations, partner.','You return home to Mossgrove. Ilsa\'s honey bread is on the table, and for the first time in five years, three plates are set.','But as the celebration fades, the earth trembles. Far to the north-east of the League, a black castle tears itself from the ground.','Wren: The Monk has completed the Deep Rite! With the power the Followers stole from every town, he has dragged Mandara into our reality at Crimsonspire Castle - corrupted, and bent on destroying the world!','Champion @NAME - the crimson barrier east of the League will yield to you now. End this.']);
 $('ui').classList.remove('dark');healAll();S.map='b0_0';S.x=5;S.y=5;G.dir='up';}

// ===== Relationships (brief 41) =====
const RLV=[[0,'Stranger'],[20,'Acquaintance'],[50,'Friend'],[100,'Close Friend'],[160,'Best Friend']];
function relGet(id){if(!S.rel)S.rel={};let r=S.rel[id];if(!r){r=S.rel[id]={p:0,talk:-1,gift:-1,fav:0,best:0};}return r;}
function relLv(id){const p=relGet(id).p;let l=0;for(let i=0;i<RLV.length;i++)if(p>=RLV[i][0])l=i;return l;}
function relName(id){return RLV[relLv(id)][1];}
function relBar(id){const r=relGet(id),l=relLv(id);const nx=RLV[l+1];return RLV[l][1]+' '+'\u2665'.repeat(l+1)+'\u2661'.repeat(4-l)+(nx?' ('+r.p+'/'+nx[0]+')':' (max)');}
function heartsAt(map,x,y,n){(G.hearts=G.hearts||[]).push({map,x,y,n,t0:performance.now()});if(window.SFX)SFX.play(n>0?'heart':'back');}
async function relAdd(id,n,name,pos){const r=relGet(id);const l0=relLv(id);r.p=clamp(r.p+n,0,200);if(pos)heartsAt(S.map,pos.x,pos.y,n>0?Math.min(3,Math.ceil(n/8)):-1);const l1=relLv(id);
 if(l1>l0){await say(name+' now sees you as: '+RLV[l1][1]+'! '+['','','(They will share more of their story.)','(They may ask a personal favour.)','(A true bond - they have something special for you.)'][l1]);
  if(l1===4&&!r.best){r.best=1;addItem('Rare Candy',2);addItem('Ultra Orb',2);await say(name+' gives you 2 Rare Candy and 2 Ultra Orbs. "For my best friend."');}}}
function timeWord(){const h=hour();return h<5?'night':h<12?'morning':h<18?'afternoon':h<21?'evening':'night';}
function relChat(p,lv){const nm=p.name;const tw=timeWord();const greet={morning:'Good morning',afternoon:'Good afternoon',evening:'Good evening',night:'You\'re up late'}[tw];
 const st=stage();const prog=st>=7?' Champion!':st>=4?' I hear you have '+medalCount()+' medals now.':'';
 if(lv===0)return greet+', stranger. I\'m '+nm+' - '+(p.job||'just passing through')+'.'+prog;
 if(lv===1)return greet+', @NAME!'+prog+' People call me '+(p.pers||'').split(',')[0].toLowerCase()+'. Fair enough, I suppose.';
 if(lv===2)return greet+', @NAME. Can I tell you something? '+p.back;
 if(lv===3)return 'I trust you, @NAME. '+(p.deep||'Some nights I wonder whether the Three are the whole story... the old folk hush up whenever anyone asks who called them. Don\'t repeat that.');
 return 'Best friends, you and me. '+(st>=7?'Whatever you do next, I\'ll be cheering.':'Go and finish what you started - and come home safe.')+' ('+nm+' smiles warmly.)';}
async function relMenu(p,ent){const id=p.id,nm=p.name;
 while(true){const r=relGet(id),lv=relLv(id);const opts=['Goodbye','Chat','Give a gift'];const favOk=lv>=3&&r.fav<2;if(favOk)opts.push(r.fav===0?'Ask about a favour':'Favour: give '+p.likes[0]);
  const c=await choose(nm+' - '+relBar(id),opts);if(c<=0)return;
  if(c===1){await say(nm+': '+relChat(p,lv));if(r.chat!==dayNum()){r.chat=dayNum();await relAdd(id,3,nm,ent);}}
  else if(c===2){if(r.gift===dayNum()){await say(nm+': You already gave me something today. Save it for tomorrow!');continue;}
   const names=Object.keys(S.bag).filter(n=>ITEMS[n]&&S.bag[n]>0);if(!names.length){await say('You have nothing to give.');continue;}
   const k=await choose('Give '+nm+' which item?',names.map(n=>n+' x'+S.bag[n]+(ITEMS[n].gift?' (gift)':'')));if(k<0)continue;await giveGift(p,names[k],ent);}
  else if(c===3){if(r.fav===0){r.fav=1;await say(nm+': Since you asked... could you bring me some '+p.likes[0]+'? It would mean a lot.');}
   else if(!S.bag[p.likes[0]]){await say(nm+': No '+p.likes[0]+' yet? No hurry.');}else{addItem(p.likes[0],-1);r.fav=2;const rw=['Rare Candy','Max Potion','Ultra Orb'][hash(id)%3];addItem(rw,2);await say(nm+': You remembered! Please, take these: 2x '+rw+'.');await relAdd(id,25,nm,ent);}}}}
async function giveGift(p,item,ent){const r=relGet(p.id);addItem(item,-1);r.gift=dayNum();let n,line;
 if(p.likes.includes(item)){n=15;line='Oh! '+item+'! I love this. Thank you, @NAME!';}else if(p.dislikes.includes(item)){n=-6;line='Er... '+item+'? That\'s... not really for me.';}else{n=6;line='A '+item+'? That\'s thoughtful of you. Thank you.';}
 await say(p.name+': '+line);await relAdd(p.id,n,p.name,ent);return n;}
async function relDaily(p,ent){const r=relGet(p.id);if(r.talk===dayNum())return;r.talk=dayNum();await relAdd(p.id,5,p.name,ent);const lv=relLv(p.id);
 if(lv>=2&&Math.random()<0.25){if(Math.random()<0.5){const it=lv>=3?'Super Potion':'Potion';addItem(it,1);await say(p.name+': Here, take this '+it+' for the road.');}else await say(p.name+': A tip, @NAME - '+mainObjective());}}
function relPerson(id){return PEOPLE_BY_ID[id]||REL_T[id];}
const REL_T={};// trainers as relationship partners (gym leaders, elites, rival, route trainers)
function trainerPerson(t){let p=REL_T[t.id];if(!p){const h=hash(t.id);p=REL_T[t.id]={id:t.id,name:fmt(t.name),job:t.cls,pers:'Competitive',back:(BIOS[t.name]||{}).back||'A trainer who lives for a good battle.',likes:[GIFTS[h%8],GIFTS[(h>>3)%8===h%8?(h+1)%8:(h>>3)%8]],dislikes:[GIFTS[(h+5)%8]]};if(p.likes.includes(p.dislikes[0]))p.dislikes=[GIFTS[(h+6)%8]];}return p;}
// ---- looks & facing
function lookFor(e){if(e.kind==='person'){const p=e.ref;let role=p.priest?'priest':p.knower?'stranger':p.id==='rowan'?'ranger':'person';if(role==='person'&&typeof p.age==='number'&&p.age<15)role='kid';return WS.look(p.id,role,{age:p.age});}
 if(e.kind==='trainer'){const t=e.ref;let role='person',o={};if(t.gym!==undefined&&t.id==='gym'+t.gym)role='leader:'+GYMS[t.gym].type;else if(t.elite!==undefined)role=t.elite===4?'champion':'elite:'+t.elite;else if(t.rival)role='rival';else if(t.bio==='monk')role='monk';else if(/^Follower/.test(t.cls))role='follower';
  else if(/Kid/.test(t.name)){role='kid';o.age=10;}else if(/Hiker/.test(t.name))o={head:'hat',acc:'satchel'};else if(/Fisher/.test(t.name))o={head:'hat',out:'#2a5a6a'};else if(/Skier/.test(t.name))o={head:'cap',acc:'scarf',out:'#c03040'};else if(/Miner/.test(t.name))o={head:'helmet',acc:'apron'};else if(/Ace/.test(t.name))o={acc:'armor',out:'#5a2a6a'};else if(/Gym Trainer/.test(t.cls))o={out:TCOL[GYMS[+t.id.slice(4,5)]?.type]||'#888'};
  return WS.look(t.id,role,o);}
 if(e.kind==='gate')return WS.look('gate'+e.i,'guard');if(e.kind==='nurse')return WS.look('nurse','nurse');if(e.kind==='clerk')return WS.look('clerk','clerk');return WS.look(e.name||'x','person');}
function faceFor(e){const id=e.ref&&e.ref.id||e.kind;if(G.faceT&&G.faceT[id]&&G.faceT[id].until>S.time)return G.faceT[id].d;
 if(S.map===curMap().id){const dx=S.x-e.x,dy=S.y-e.y;if(Math.abs(dx)+Math.abs(dy)<=2&&(dx||dy))return Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up');}
 if(e.dir)return e.dir;if(e.ref&&e.ref.face)return e.ref.face;const k=(Math.floor(S.time/6)+hash(String(id)))%7;return ['down','down','left','down','right','down','up'][k];}
function drawEnt(e,sx,sy){const f=G.frame;const walking=e.fx!==undefined&&e.moving;const fr=walking?((f>>3)&1?1:3):(((f+hash(String(e.x*7+e.y)))>>5)%3===0?2:0);
 WS.npc(X,sx,sy,lookFor(e),faceFor(e),window.AMB&&AMB.reduced?0:fr);}
function drawHearts(camx,camy){if(!G.hearts||!G.hearts.length)return;const now=performance.now();G.hearts=G.hearts.filter(h=>now-h.t0<1400);
 for(const h of G.hearts){if(h.map!==S.map)continue;const k=(now-h.t0)/1400;const n=Math.abs(h.n);for(let i=0;i<n;i++){const x=h.x*TS-camx+8+(i-(n-1)/2)*6+Math.sin(k*8+i)*1.2,y=h.y*TS-camy-12-k*16-i*2;
  X.globalAlpha=Math.max(0,1-k*k);X.fillStyle=h.n<0?'#7a6a8a':'#ff4a6a';X.beginPath();X.moveTo(x,y+2.6);X.bezierCurveTo(x-4,y-.6,x-2,y-3.4,x,y-1.2);X.bezierCurveTo(x+2,y-3.4,x+4,y-.6,x,y+2.6);X.fill();X.strokeStyle='#ffd0a0';X.lineWidth=.4;X.stroke();
  if(h.n<0){X.strokeStyle='#201828';X.beginPath();X.moveTo(x,y-1);X.lineTo(x-.6,y+.6);X.lineTo(x+.4,y+1.4);X.stroke();}}}X.globalAlpha=1;}
// ---- save migration (brief 39): old 150x112 world -> island
const OLD_TOWNS=[[8,92],[56,92],[104,92],[122,46],[84,10],[24,40]];
function migrateSave(d){if(!d.rel||typeof d.rel!=='object')d.rel={};
 if(!d.wv||d.wv<2){const W0=MAPS.world;const remap=(o)=>{if(!o||o.map!=='world')return;let best=null,bd=1e9;OLD_TOWNS.forEach(([tx,ty],i)=>{const dd=Math.hypot(o.x-(tx+10),o.y-(ty+7));if(dd<bd){bd=dd;best=i;}});
   let nx,ny;if(o.y<=17&&o.x<30){nx=LAY.leagueDoor[0];ny=LAY.leagueDoor[1]+2;}else if(o.x>=29&&o.x<=45&&o.y<=12){nx=LAY.castleDoor[0];ny=LAY.castleDoor[1]+2;}else if(o.y<8&&o.x>120){nx=LAY.citadelDoor[0];ny=LAY.citadelDoor[1]+2;}
   else if(bd<16){const [tx,ty]=OLD_TOWNS[best];const t=TOWNS[best];nx=t.x+clamp(o.x-tx,0,TW-1);ny=t.y+clamp(o.y-ty,0,TH-1);}else{const t=TOWNS[best];nx=t.x+10;ny=t.y+6;}
   const p=nearestFree('world',nx,ny);o.x=p[0];o.y=p[1];};
  remap(d);if(d.lastHeal)remap(d.lastHeal);d.wv=2;}
 for(const o of [d,d.lastHeal]){if(!o||!MAPS[o.map])continue;const m=MAPS[o.map];o.x=clamp(o.x|0,0,m.w-1);o.y=clamp(o.y|0,0,m.h-1);if(SOLID.has(m.t[o.y*m.w+o.x])){const p=nearestFree(o.map,o.x,o.y);o.x=p[0];o.y=p[1];}}
 return d;}
function nearestFree(map,x,y){const m=MAPS[map];const seen=new Set();const q=[[x,y]];while(q.length){const [a,b]=q.shift();const k=a+','+b;if(seen.has(k)||a<0||b<0||a>=m.w||b>=m.h)continue;seen.add(k);const v=m.t[b*m.w+a];if(!SOLID.has(v)&&v!==T.DOOR&&v!==T.MAT)return [a,b];if(seen.size>4000)break;for(const [c,d] of [[1,0],[-1,0],[0,1],[0,-1]])q.push([a+c,b+d]);}return [m.spawn?m.spawn.x:x,m.spawn?m.spawn.y:y];}
// ===== Save / load =====
function saveGame(){if(!S||G.mode!=='world')return false;try{localStorage.setItem(SAVE_KEY,JSON.stringify({game:'monster-wilds',v:1,saved:Date.now(),data:S}));return true;}catch(e){return false;}}
function autosave(){if(saveGame())toast('Autosaved');}
function validSave(o){try{if(!o||o.game!=='monster-wilds'||!o.data)return 'Not a Monster Wilds save file.';const d=o.data;
 for(const k of ['name','rival','map'])if(typeof d[k]!=='string')return 'Missing field: '+k;
 if(!MAPS[d.map])return 'Unknown map.';for(const k of ['x','y','money','time','play'])if(typeof d[k]!=='number'||!isFinite(d[k]))return 'Bad number: '+k;
 if(!Array.isArray(d.party)||!Array.isArray(d.box)||d.party.length>6)return 'Bad party/box.';
 for(const m of d.party.concat(d.box)){if(!m||!SPECIES[m.sp]||!(m.lv>=1&&m.lv<=100)||!Array.isArray(m.moves))return 'Invalid monster data.';for(const mv of m.moves)if(!MOVES[mv.n])return 'Invalid move.';}
 if(!Array.isArray(d.medals)||d.medals.length!==6)return 'Bad medals.';for(const k of ['bag','flags','quests','seen','caught','met','beaten'])if(typeof d[k]!=='object'||d[k]===null)return 'Missing field: '+k;
 return null;}catch(e){return 'Corrupt save.';}}
function loadSave(){try{const raw=localStorage.getItem(SAVE_KEY);if(!raw)return null;const o=JSON.parse(raw);return validSave(o)?null:o;}catch(e){return null;}}
function startFromSave(o){S=migrateSave(o.data);G.mode='world';G.dir=S.dir||'down';G.mv=null;$('ui').classList.remove('dark');closeTitle();toast('Welcome back, '+S.name+'!');}
function exportSave(){const o=S?{game:'monster-wilds',v:1,saved:Date.now(),data:S}:loadSave();if(!o){return say('No save data to export.');}
 const blob=new Blob([JSON.stringify(o,null,1)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='monster-wilds-save-'+new Date().toISOString().slice(0,10)+'.json';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1000);return say('Save exported as '+a.download+'.');}
function importSave(){return new Promise(res=>{const inp=$('importFile');inp.value='';inp.onchange=()=>{const f=inp.files[0];if(!f){res(false);return;}const r=new FileReader();r.onload=async()=>{let o;try{o=JSON.parse(r.result);}catch(e){await say('Import failed: file is not valid JSON.');res(false);return;}
  const err=validSave(o);if(err){await say('Import failed: '+err);res(false);return;}localStorage.setItem(SAVE_KEY,JSON.stringify(o));await say('Save imported for '+o.data.name+'!');startFromSave(o);res(true);};r.readAsText(f);};inp.click();
  setTimeout(()=>res(false),120000);});}
window.importSaveObject=function(o){const err=validSave(o);if(err)return err;localStorage.setItem(SAVE_KEY,JSON.stringify(o));return null;};
async function backupMenu(){const c=await choose('Save Backup',['Export save to file','Import save from file','Back']);if(c===0){saveGame();await exportSave();}if(c===1){const ok=await choose('Importing replaces your current game. Continue?',['Import','Cancel']);if(ok===0)await importSave();}}

// ===== Title =====
let titleL=null;
function drawTitle(){G.frame++;X.setTransform(C.width/VW,0,0,C.width/VW,0,0);X.imageSmoothingEnabled=true;const g=X.createLinearGradient(0,0,0,VH);g.addColorStop(0,'#08040e');g.addColorStop(1,'#2a1430');X.fillStyle=g;X.fillRect(0,0,VW,VH);
 for(let i=0;i<40;i++){X.fillStyle='rgba(255,255,255,'+(0.3+0.7*((i*37+G.frame)%60)/60)+')';X.fillRect((i*73)%VW,(i*41)%120,1,1);}
 X.fillStyle='rgba(255,255,255,0.05)';X.beginPath();X.ellipse(VW/2,40,70,40,0,0,7);X.fill();X.fillStyle='#140a18';X.fillRect(0,170,VW,70);drawMon(X,'Solaryx',70,140,60);drawMon(X,'Tidemaw',160,130,70);drawMon(X,'Aurorath',250,140,60);
 X.fillStyle='#ffe070';X.font='bold 24px monospace';X.textAlign='center';X.fillText('MONSTER WILDS',VW/2,20);X.font='8px monospace';X.fillStyle='#fff';X.fillText('Legends of the Dawnstone',VW/2,48);X.textAlign='left';}
function closeTitle(){if(titleL){popL(titleL);titleL=null;}}
function showTitle(){G.mode='title';const sv=loadSave();const opts=[];if(sv)opts.push(['Continue',async()=>{startFromSave(sv);}]);
 opts.push(['New Game',async()=>{if(loadSave()){const c=await choose('A save already exists. Start a new game and overwrite it?',['Overwrite','Cancel']);if(c!==0)return;}closeTitle();await newGame();}]);
 opts.push(['Import Save',async()=>{await importSave();}]);if(sv)opts.push(['Export Save',async()=>{await exportSave();}]);opts.push(['Help',async()=>{await helpScreen();}]);
 const el=mkEl('menu title','<div class="mp">'+(sv?'Save: '+esc(sv.data.name)+' - '+sv.data.medals.filter(Boolean).length+' medals - '+(MAPS[sv.data.map].name||'World')+'':'No save found')+'</div>'+opts.map((o,i)=>'<button class="opt" data-i="'+i+'">'+o[0]+'</button>').join(''));
 titleL={el,remove:true,onB:()=>{}};el.querySelectorAll('.opt').forEach(b=>b.onclick=()=>opts[+b.dataset.i][1]());pushL(titleL);}
// ===== Boot =====
function fit(){const w=$('wrap'),c=C;const r=$('screenbox').getBoundingClientRect();const s=Math.min(r.width/VW,r.height/VH);c.style.width=Math.floor(VW*s)+'px';c.style.height=Math.floor(VH*s)+'px';const u=$('stage');u.style.width=c.style.width;u.style.height=c.style.height;const dpr=Math.min(3,window.devicePixelRatio||1);const bw=Math.max(VW,Math.round(Math.floor(VW*s)*dpr)),bh=Math.round(bw*VH/VW);if(c.width!==bw||c.height!==bh){c.width=bw;c.height=bh;}}
window.addEventListener('resize',fit);window.addEventListener('orientationchange',()=>setTimeout(fit,200));
window.addEventListener('pagehide',()=>saveGame());document.addEventListener('visibilitychange',()=>{if(document.hidden)saveGame();});
if(('ontouchstart' in window)||matchMedia('(pointer:coarse)').matches||/[?setupTouch();fit();]touch=1/.test(location.search))document.body.classList.add('touch');setupTouch();fit();showTitle();requestAnimationFrame(loop);
// test hooks
document.getElementById('battle').addEventListener('pointerdown',()=>{if(window.MFX)MFX.skip();});
window.addEventListener('keydown',e=>{if(window.MFX&&(e.key==='z'||e.key==='Enter'||e.key===' '))MFX.skip();if(window.SFX&&UI.length){if(/^Arrow(Up|Down)$/.test(e.key))SFX.play('move');else if(e.key==='x'||e.key==='Escape')SFX.play('back');else if(e.key==='z'||e.key==='Enter')SFX.play('select');}});
if(window.AMB)document.body.classList.toggle('fxlow',AMB.reduced);
window.GAME={get S(){return S;},MAPS,TOWNS,SPECIES,PEOPLE,entities,saveGame,loadSave,validSave,stats,mkMon,addMon,enterMap,wildBattle,addItem,UI};
