// ===== World generation, buildings, NPCs, quests =====
'use strict';
const T={CWALL:29,CFLOOR:30,ROOF_T:31,ALTAR:32,HWALL:33,HFLOOR:34,SFLOOR:35,MURAL:36,SEAL:37,GRASS:0,TALL:1,TREE:2,PATH:3,WATER:4,SAND:5,SNOW:6,CAVE:7,ROCK:8,BRIDGE:9,WALL:10,ROOF_H:11,ROOF_C:12,ROOF_S:13,ROOF_G:14,DOOR:15,FLOWER:16,FLOOR:18,IWALL:19,COUNTER:20,BED:21,TABLE:22,PC:23,MAT:24,SNOWTALL:25,ROOF_L:26,PILLAR:27,ICE:28};
const SOLID=new Set([T.TREE,T.WATER,T.ROCK,T.WALL,T.ROOF_H,T.ROOF_C,T.ROOF_S,T.ROOF_G,T.ROOF_L,T.IWALL,T.COUNTER,T.BED,T.TABLE,T.PC,T.PILLAR,T.CWALL,T.ROOF_T,T.ALTAR,T.HWALL,T.MURAL,T.SEAL]);
T.SHRINE=38;T.RUIN=39;SOLID.add(T.SHRINE);SOLID.add(T.RUIN);
const WW=256,WH=200; // big island (old world was 150x112)
function rng(seed){let s=seed>>>0;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
function hsh(x,y,s){let n=(Math.imul(x|0,374761393)+Math.imul(y|0,668265263)+Math.imul((s|0)+1,2246822519))>>>0;n=Math.imul(n^(n>>>13),1274126177)>>>0;return ((n^(n>>>16))>>>0)/4294967296;}
function vn(x,y,sc,s){const fx=x/sc,fy=y/sc,ix=Math.floor(fx),iy=Math.floor(fy),tx=fx-ix,ty=fy-iy;const a=hsh(ix,iy,s),b=hsh(ix+1,iy,s),c=hsh(ix,iy+1,s),d=hsh(ix+1,iy+1,s);const u=tx*tx*(3-2*tx),v=ty*ty*(3-2*ty);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;}
const MAPS={};const DOORS={};const ZONEMAP=new Array(WW*WH).fill(null);const REGION=new Array(WW*WH).fill('coast');const OCEAN=new Uint8Array(WW*WH);
// ---- fixed layout (all world coordinates live here)
const LAY={plaza:{x0:36,y0:24,x1:62,y1:42},league:{x:43,y:27,w:11,h:5},castle:{x:68,y:19,w:11,h:9},citadel:{x:200,y:18,w:4,h:3},skysea:{x:117,y:94,w:3,h:2},
 lake:{cx:118,cy:98,rx:24,ry:15},cave:{x0:80,y0:40,x1:128,y1:72},island:{cx:128,cy:100,rx:124,ry:96}};
LAY.leagueDoor=[48,31];LAY.castleDoor=[73,27];LAY.citadelDoor=[201,20];LAY.skyseaDoor=[118,95];
// regions: jittered voronoi seeds
const RSEEDS=[['leaf',44,145],['leaf',66,150],['leaf',30,125],['leaf',72,112],['leaf',90,24],['leaf',58,128],['dusk',40,79],['dusk',22,96],['dusk',60,88],['dusk',58,62],['dusk',20,60],
 ['ember',102,157],['ember',108,132],['ember',80,172],['ember',122,170],['coast',180,170],['coast',150,172],['coast',118,98],['coast',150,124],['coast',145,150],['gale',206,91],['gale',204,122],['gale',222,66],['gale',190,70],['gale',220,140],
 ['snow',160,30],['snow',200,24],['snow',182,48],['snow',132,20],['snow',112,16],['cave',104,56],['cave',90,46],['cave',120,62],['summit',50,33],['summit',36,48],['summit',56,46],['crimson',73,24]];
function regionAt(x,y){if(x<0||y<0||x>=WW||y>=WH)return 'coast';return REGION[y*WW+x];}
const REGZONE={leaf:'forest',dusk:'duskwild',ember:'slopes',coast:'shore',gale:'bluffs',snow:'heights',cave:'cave',summit:'r6',crimson:'r6'};
const SHRINES=[];const LANDMARKS=[];const HIDDEN=[];const EXTRA_BLDS=[];
function buildWorld(){
 const m={id:'world',w:WW,h:WH,t:new Array(WW*WH).fill(T.WATER),outdoor:true};
 const I=(x,y)=>y*WW+x;const inb=(x,y)=>x>=0&&y>=0&&x<WW&&y<WH;
 const set=(x,y,v)=>{if(inb(x,y))m.t[I(x,y)]=v;};const get=(x,y)=>inb(x,y)?m.t[I(x,y)]:T.WATER;
 const R=rng(1234);const RES=new Uint8Array(WW*WH);const res=(x0,y0,x1,y1)=>{for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)if(inb(x,y))RES[I(x,y)]=1;};
 // 1. island shape
 const IS=LAY.island;const LAND=new Uint8Array(WW*WH);
 for(let y=0;y<WH;y++)for(let x=0;x<WW;x++){const dx=(x-IS.cx)/IS.rx,dy=(y-IS.cy)/IS.ry,d=Math.cbrt(Math.abs(dx)**3+Math.abs(dy)**3),th=Math.atan2(dy,dx);
  const r=0.95+0.04*Math.sin(3*th+1.3)+0.03*Math.sin(5*th+.4)+0.02*Math.sin(11*th+2)+(vn(x,y,9,7)-.5)*0.1;if(d<r)LAND[I(x,y)]=1;}
 // coves (bays carved into the coast)
 const edge=th=>{let k=0;let x=IS.cx,y=IS.cy;for(k=0;k<200;k++){const xx=Math.round(IS.cx+Math.cos(th)*k),yy=Math.round(IS.cy+Math.sin(th)*k*IS.ry/IS.rx);if(!inb(xx,yy)||!LAND[I(xx,yy)])break;x=xx;y=yy;}return [x,y];};
 const COVES=[[2.05,6,'Shell Cove'],[3.4,5,'Sunset Cove'],[4.1,5,'Smuggler\'s Cove'],[0.35,5,'Gull Cove'],[5.0,4,'Rime Inlet']];
 const coveC=[];for(const [th,r,nm] of COVES){const [ex,ey]=edge(th);const cx=Math.round(ex-Math.cos(th)*r*.5),cy=Math.round(ey-Math.sin(th)*r*.5);coveC.push([cx,cy,r,nm]);for(let y=cy-r;y<=cy+r;y++)for(let x=cx-r;x<=cx+r;x++)if(inb(x,y)&&Math.hypot(x-cx,y-cy)<=r)LAND[I(x,y)]=0;}
 // forced land around every settlement / landmark site
 const FORCE=[];TOWNS.forEach(t=>FORCE.push([t.x-6,t.y-6,t.x+TW+6,t.y+TH+6]));FORCE.push([LAY.plaza.x0-4,LAY.plaza.y0-6,LAY.plaza.x1+4,LAY.plaza.y1+4],[64,14,84,38],[194,12,210,28],[16,104,36,116],[80,16,98,30],[94,122,120,140],[206,124,224,136]);
 for(const [x0,y0,x1,y1] of FORCE)for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)if(inb(x,y))LAND[I(x,y)]=1;
 // remove tiny lakes inside land that are not the ocean: flood ocean from border
 {const q=[0];OCEAN[0]=1;for(let qi=0;qi<q.length;qi++){const i=q[qi],x=i%WW,y=(i/WW)|0;for(const [a,b] of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+a,yy=y+b;if(!inb(xx,yy))continue;const j=I(xx,yy);if(OCEAN[j]||LAND[j])continue;OCEAN[j]=1;q.push(j);}}
  for(let i=0;i<WW*WH;i++)if(!OCEAN[i])LAND[i]=1;}
 // 2. regions
 for(let y=0;y<WH;y++)for(let x=0;x<WW;x++){let best=1e9,b='coast';const jx=(vn(x,y,11,3)-.5)*14,jy=(vn(x,y,11,4)-.5)*14;for(const [r,sx,sy] of RSEEDS){const d=Math.hypot(x+jx-sx,y+jy-sy);if(d<best){best=d;b=r;}}
  if(x>=LAY.cave.x0&&x<=LAY.cave.x1&&y>=LAY.cave.y0&&y<=LAY.cave.y1&&vn(x,y,6,5)>0.25)b='cave';
  if(Math.hypot((x-LAY.lake.cx)/(LAY.lake.rx+5),(y-LAY.lake.cy)/(LAY.lake.ry+5))<1)b='coast';REGION[I(x,y)]=b;}
 for(const t of TOWNS){const rr=['leaf','ember','coast','gale','snow','dusk'][t.id];for(let y=t.y-3;y<t.y+TH+3;y++)for(let x=t.x-3;x<t.x+TW+3;x++)if(inb(x,y))REGION[I(x,y)]=rr;}
 for(let y=LAY.plaza.y0-3;y<=LAY.plaza.y1+2;y++)for(let x=LAY.plaza.x0-3;x<=LAY.plaza.x1+1;x++)REGION[I(x,y)]='summit';
 for(let y=12;y<=36;y++)for(let x=62;x<=84;x++)if(Math.hypot(x-73,y-24)<11)REGION[I(x,y)]='crimson';
 const base=(x,y)=>{const r=REGION[I(x,y)];return r==='snow'?T.SNOW:r==='cave'?T.CAVE:T.GRASS;};
 // 3. land fill + coastline
 for(let y=0;y<WH;y++)for(let x=0;x<WW;x++){const i=I(x,y);if(!LAND[i]){m.t[i]=T.WATER;continue;}let od=9;
  for(let b=-2;b<=2;b++)for(let a=-2;a<=2;a++){const xx=x+a,yy=y+b;if(!inb(xx,yy)||OCEAN[I(xx,yy)])od=Math.min(od,Math.max(Math.abs(a),Math.abs(b)));}
  const r=REGION[i];if(od<=2){if(r==='gale'&&od===1&&!TOWNS.some(t=>x>=t.x-2&&x<t.x+TW+2&&y>=t.y-2&&y<t.y+TH+2))m.t[i]=T.ROCK;else if(r==='snow')m.t[i]=od===1?T.ICE:T.SNOW;else if(r==='gale'||r==='crimson')m.t[i]=T.GRASS;else m.t[i]=T.SAND;}
  else m.t[i]=base(x,y);}
 // 4. lake with isle
 const L=LAY.lake;for(let y=L.cy-L.ry-3;y<=L.cy+L.ry+3;y++)for(let x=L.cx-L.rx-3;x<=L.cx+L.rx+3;x++){const d=Math.hypot((x-L.cx)/L.rx,(y-L.cy)/L.ry)+(vn(x,y,5,9)-.5)*.08;if(d<1)set(x,y,T.WATER);else if(d<1.13)set(x,y,T.SAND);}
 for(let y=91;y<=98;y++)for(let x=113;x<=123;x++)if(Math.hypot((x-118)/5.5,(y-94.5)/4)<1)set(x,y,T.SAND);
 // 5. rivers (deep water, crossed by bridges)
 const river=(pts,w)=>{for(let k=0;k<pts.length-1;k++){const [x1,y1]=pts[k],[x2,y2]=pts[k+1];const n=Math.ceil(Math.hypot(x2-x1,y2-y1)*2);for(let s=0;s<=n;s++){const t=s/n;const cx=x1+(x2-x1)*t+(vn(s+k*50,0,6,13)-.5)*3,cy=y1+(y2-y1)*t;for(let b=-2;b<=2;b++)for(let a=-2;a<=2;a++){const xx=Math.round(cx+a),yy=Math.round(cy+b);if(!inb(xx,yy))continue;const d=Math.hypot(xx-cx,yy-cy);if(d<=w)set(xx,yy,T.WATER);else if(d<=w+1&&get(xx,yy)!==T.WATER&&REGION[I(xx,yy)]!=='snow'&&R()<0.5)set(xx,yy,T.SAND);}}}};
 river([[172,40],[160,52],[148,62],[136,74],[126,86]],1.3);// Frostrun: peaks -> lake
 river([[130,111],[133,124],[136,140],[137,160],[139,175],[140,200]],1.3);// Cinder river: lake -> south sea
 river([[66,98],[56,108],[44,118],[28,122],[0,124]],1.2);// Reedwater: hills -> west sea
 // 6. Ember Caverns plateau
 for(let y=LAY.cave.y0;y<=LAY.cave.y1;y++)for(let x=LAY.cave.x0;x<=LAY.cave.x1;x++)if(REGION[I(x,y)]==='cave'&&get(x,y)!==T.WATER){set(x,y,T.CAVE);ZONEMAP[I(x,y)]='cave';}
 // 7. routes (the Pilgrim's Road)
 function seg(x1,y1,x2,y2,zone){const dx=Math.sign(x2-x1),dy=Math.sign(y2-y1);let x=x1,y=y1;
  while(true){for(let o=-3;o<=3;o++){const xx=dy!==0?x+o:x,yy=dx!==0?y+o:y;if(!inb(xx,yy))continue;const i=I(xx,yy),cur=m.t[i];const center=o===0;
    if(cur===T.WATER||cur===T.BRIDGE){if(center&&!OCEAN[i])set(xx,yy,T.BRIDGE);continue;}
    const r=REGION[i];let v;if(r==='cave'){v=T.CAVE;}else if(center)v=T.PATH;else{const tall=R()<0.62&&Math.abs(o)>=1;v=r==='snow'?(tall?T.SNOWTALL:T.SNOW):(tall?T.TALL:(R()<0.06?T.FLOWER:T.GRASS));}
    if(!center&&(cur===T.SAND||cur===T.ICE||cur===T.ROCK))continue;set(xx,yy,v);ZONEMAP[i]=zone;if(Math.abs(o)<=1)RES[i]=1;}
   if(x===x2&&y===y2)break;x+=dx;y+=dy;}}
 function route(pts,zone){for(let i=0;i<pts.length-1;i++)seg(pts[i][0],pts[i][1],pts[i+1][0],pts[i+1][1],zone);
  for(const [x,y] of pts.slice(1,-1))for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const i=I(x+a,y+b);if(m.t[i]===T.WATER)continue;set(x+a,y+b,REGION[i]==='cave'?T.CAVE:T.PATH);RES[i]=1;}}
 const tw=t=>[t.x+10,t.y+6];const Tn=TOWNS;
 route([[Tn[0].x+TW,Tn[0].y+6],[72,144],[72,156],[Tn[1].x-1,Tn[1].y+6]],'r1');
 route([[Tn[1].x+TW,Tn[1].y+6],[146,156],[146,168],[Tn[2].x-1,Tn[2].y+6]],'r2');
 route([[Tn[2].x+10,Tn[2].y-1],[180,120],[Tn[3].x+10,120],[Tn[3].x+10,Tn[3].y+TH]],'r3');
 route([[Tn[3].x+10,Tn[3].y-1],[206,50],[Tn[4].x+10,50],[Tn[4].x+10,Tn[4].y+TH]],'r4');
 route([[206,50],[206,LAY.citadelDoor[1]+1],[LAY.citadelDoor[0],LAY.citadelDoor[1]+1]],'r4');
 route([[Tn[4].x-1,Tn[4].y+6],[126,30],[126,60],[90,60],[90,Tn[5].y+6],[Tn[5].x+TW,Tn[5].y+6]],'cave');
 route([[Tn[5].x+10,Tn[5].y-1],[40,50],[50,50],[50,LAY.plaza.y1+1]],'r6');
 // trails (thin, safe) to hamlets & landmarks
 function trail(pts){for(let k=0;k<pts.length-1;k++){let [x,y]=pts[k];const [x2,y2]=pts[k+1];while(true){const i=I(x,y),c=m.t[i];if(c===T.WATER){if(!OCEAN[i])set(x,y,T.BRIDGE);}else if(c!==T.DOOR&&!SOLID.has(c)||c===T.TREE||c===T.ROCK){set(x,y,REGION[i]==='cave'?T.CAVE:T.PATH);}RES[i]=1;if(x===x2&&y===y2)break;if(x!==x2)x+=Math.sign(x2-x);else y+=Math.sign(y2-y);}}}
 trail([[Tn[0].x+10,Tn[0].y-1],[44,114],[30,114]]);trail([[Tn[5].x+10,Tn[5].y+TH],[40,114]]);
 trail([[LAY.plaza.x1+1,36],[88,36],[88,23]]);trail([[Tn[1].x+10,Tn[1].y-1],[102,129]]);
 trail([[206,124],[214,124],[214,131]]);trail([[118,LAY.lake.cy+3],[118,Tn[1].y+6]]);
 for(let y=LAY.skysea.y+2;y<=LAY.lake.cy+LAY.lake.ry+2;y++){const c=get(118,y);set(118,y,c===T.WATER||c===T.BRIDGE?T.BRIDGE:T.PATH);RES[I(118,y)]=1;}
 trail([[62,34],[73,34],[73,LAY.castleDoor[1]+1]]);trail([[60,66],[90,66]]);trail([[186,108],[206,108]]);trail([[176,42],[182,42],[182,50]]);
 // 8. towns
 TOWNS.forEach(tn=>{const snow=tn.id===4;
  for(let y=tn.y;y<tn.y+TH;y++)for(let x=tn.x;x<tn.x+TW;x++){set(x,y,snow?T.SNOW:T.GRASS);RES[I(x,y)]=1;}res(tn.x-1,tn.y-1,tn.x+TW,tn.y+TH);
  for(let x=tn.x;x<tn.x+TW;x++)set(x,tn.y+6,T.PATH);for(let y=tn.y;y<tn.y+TH;y++)set(tn.x+10,y,T.PATH);
  const blds=[['house',1,1,4,3],['temple',5,1,4,3],['center',12,1,6,3],['shop',12,8,6,3],['gym',1,8,6,4],[tn.id===0?'lab':'house',7,9,3,3]];tn.blds=[];
  blds.forEach(([type,rx,ry,w,h],i)=>{const bx=tn.x+rx,by=tn.y+ry;const roof={house:T.ROOF_H,center:T.ROOF_C,shop:T.ROOF_S,gym:T.ROOF_G,lab:T.ROOF_L,temple:T.ROOF_T}[type];
   for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++)set(bx+xx,by+yy,yy<h-1?roof:T.WALL);
   const dx=bx+Math.floor(w/2),dy=by+h-1;set(dx,dy,T.DOOR);set(dx,dy+1,T.PATH);const id='b'+tn.id+'_'+i;DOORS[dx+','+dy]=id;tn.blds.push({id,type,dx,dy,bx,by,w,h,idx:i});MAPS[id]=makeInterior(id,type,tn,dx,dy);});
  for(let k=0;k<8;k++){const x=tn.x+2+Math.floor(R()*16),y=tn.y+4+Math.floor(R()*3);if(get(x,y)===T.GRASS)set(x,y,T.FLOWER);}});
 // 9. League plaza, castle, lairs
 const P=LAY.plaza;for(let y=P.y0;y<=P.y1;y++)for(let x=P.x0;x<=P.x1;x++){set(x,y,(x+y)%11===0?T.FLOWER:T.GRASS);RES[I(x,y)]=1;}
 for(let y=LAY.leagueDoor[1]+1;y<=P.y1;y++)for(let x=46;x<=50;x++)set(x,y,T.PATH);for(let x=P.x0;x<=P.x1;x++)set(x,34,T.PATH);for(let y=P.y0+10;y<=P.y1+1;y++)set(50,y,T.PATH);
 {const b=LAY.league;for(let y=b.y;y<b.y+b.h;y++)for(let x=b.x;x<b.x+b.w;x++)set(x,y,y<b.y+b.h-1?T.ROOF_L:T.WALL);const [dx,dy]=LAY.leagueDoor;set(dx,dy,T.DOOR);DOORS[dx+','+dy]='league';MAPS.league=makeLeague();}
 {const b=LAY.castle;for(let y=b.y;y<b.y+b.h;y++)for(let x=b.x;x<b.x+b.w;x++)set(x,y,T.CWALL);const [dx,dy]=LAY.castleDoor;set(dx,dy,T.DOOR);DOORS[dx+','+dy]='castle';set(dx,dy+1,T.PATH);res(b.x-1,b.y-1,b.x+b.w,b.y+b.h+1);MAPS.castle=makeCastle();}
 {const b=LAY.citadel;for(let y=b.y-2;y<=b.y+b.h+2;y++)for(let x=b.x-2;x<=b.x+b.w+2;x++)set(x,y,T.SNOW);for(let y=b.y;y<b.y+b.h;y++)for(let x=b.x;x<b.x+b.w;x++)set(x,y,T.HWALL);const [dx,dy]=LAY.citadelDoor;set(dx,dy,T.DOOR);DOORS[dx+','+dy]='citadel';set(dx,dy+1,T.SNOW);res(b.x-2,b.y-2,b.x+b.w+2,b.y+b.h+2);}
 {const b=LAY.skysea;for(let y=b.y;y<b.y+b.h;y++)for(let x=b.x;x<b.x+b.w;x++)set(x,y,T.HWALL);const [dx,dy]=LAY.skyseaDoor;set(dx,dy,T.DOOR);DOORS[dx+','+dy]='skysea';res(113,90,123,98);}
 set(TOWNS[5].x+19,TOWNS[5].y+2,T.SEAL);
 // 10. hamlets, camp, lighthouse, dock
 const hut=(bx,by,w,h,id,name,town,rk)=>{for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++)set(bx+xx,by+yy,yy<h-1?T.ROOF_H:T.WALL);const dx=bx+Math.floor(w/2),dy=by+h-1;set(dx,dy,T.DOOR);set(dx,dy+1,T.PATH);res(bx-1,by-1,bx+w,by+h+1);DOORS[dx+','+dy]=id;
  const tn={id:town,name};MAPS[id]=makeInterior(id,'house',tn,dx,dy);MAPS[id].name=name;EXTRA_BLDS.push({x:bx,y:by,w,h,type:'house',town,dx,dy,idx:-1,rk});return [dx,dy];};
 const clear=(x0,y0,x1,y1,v)=>{for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)if(inb(x,y)&&get(x,y)!==T.WATER){set(x,y,v||base(x,y));RES[I(x,y)]=1;}};
 clear(16,104,36,116);hut(19,106,4,3,'h_reed0','Reedwater Hamlet - Weaver\'s Hut',0,'leaf');hut(27,106,4,3,'h_reed1','Reedwater Hamlet - Ferry House',0,'leaf');for(let x=18;x<=34;x++)set(x,110,T.PATH);
 clear(80,16,96,26);hut(82,18,4,3,'h_pine0','Hollowpine - Woodcutter\'s Lodge',4,'leaf');hut(90,18,4,3,'h_pine1','Hollowpine - Herbalist\'s Cottage',4,'leaf');for(let x=82;x<=94;x++)set(x,22,T.PATH);
 clear(96,124,108,132);hut(98,125,4,3,'h_ember0','Emberfall Camp - Prospector\'s Hut',1,'ember');for(let x=96;x<=106;x++)set(x,129,T.PATH);
 clear(206,124,222,134);hut(208,126,4,3,'h_gull0','Gull\'s Rest - Net House',3,'gale');hut(216,126,4,3,'h_gull1','Gull\'s Rest - Lookout Cottage',3,'gale');for(let x=208;x<=220;x++)set(x,130,T.PATH);
 // dock south of Tidehaven
 {const x=Tn[2].x+10;let y=Tn[2].y+TH;while(y<WH-2&&!OCEAN[I(x,y)]){if(get(x,y)!==T.WATER)set(x,y,T.PATH);else set(x,y,T.BRIDGE);RES[I(x,y)]=1;y++;}LAY.dockStart=[x,y];for(let k=0;k<8&&y<WH-1;k++,y++){set(x,y,T.BRIDGE);set(x+1,y,T.BRIDGE);}for(let a=-2;a<=3;a++)set(x+a,y-1,T.BRIDGE);LAY.dockEnd=[x,y-1];}
 // lighthouse on the south-east point
 {let best=null;for(let x=192;x<=214;x++){let y=WH-1;while(y>0&&OCEAN[I(x,y)])y--;if(!best||y+(x-200)*0.3>best[1]+(best[0]-200)*0.3)best=[x,y];}
  const [lx,ly]=best;const bx=lx-1,by=ly-6;clear(bx-3,by-2,bx+4,ly-1,T.SAND);for(let yy=0;yy<4;yy++)for(let xx=0;xx<2;xx++)set(bx+xx,by+yy,yy<3?T.ROOF_H:T.WALL);const dx=bx,dy=by+3;set(dx,dy,T.DOOR);set(dx,dy+1,T.PATH);DOORS[dx+','+dy]='h_light';
  MAPS.h_light=makeInterior('h_light','house',{id:2,name:'Tidehaven'},dx,dy);MAPS.h_light.name='Tidehaven Lighthouse';EXTRA_BLDS.push({x:bx,y:by,w:2,h:4,type:'lighthouse',town:2,dx,dy,idx:-1,rk:'coast'});LAY.lighthouse=[dx,dy];
  trail([[Tn[2].x+TW,Tn[2].y+6],[dx,Tn[2].y+6],[dx,dy+1]]);}
 // 11. ruins, volcano, shrines
 const ruin=(cx,cy,r,nm)=>{clear(cx-r-1,cy-r-1,cx+r+1,cy+r+1,null);for(let k=0;k<14;k++){const a=k/14*6.283,x=Math.round(cx+Math.cos(a)*r),y=Math.round(cy+Math.sin(a)*r*.8);if(k%2===0&&k!==10)set(x,y,T.RUIN);else set(x,y,T.PATH);}for(let y=cy-1;y<=cy+1;y++)for(let x=cx-2;x<=cx+2;x++)set(x,y,T.PATH);LANDMARKS.push({name:nm,x:cx,y:cy,r:r+2});};
 ruin(60,70,5,'Ruins of Ost');ruin(196,62,4,'Skyfall Ruins');ruin(178,18,4,'Old Watchtower');ruin(26,82,3,'Hollow Barrow');
 for(let y=126;y<=142;y++)for(let x=104;x<=120;x++){const d=Math.hypot(x-112,y-134);if(d<7&&get(x,y)!==T.WATER){set(x,y,d<1.5?T.ROCK:T.CAVE);RES[I(x,y)]=1;if(d>=1.5)ZONEMAP[I(x,y)]='slopes';}}
 LANDMARKS.push({name:'Cinder Cone',x:112,y:134,r:7});
 const SHR=[[70,132,'Mossgrove wayside shrine'],[152,140,'Shore shrine'],[188,104,'Wind shrine'],[176,44,'Pilgrim\'s cairn'],[22,60,'Dusk shrine'],[110,118,'River shrine'],[68,48,'Victory shrine'],[60,72,'Ost altar'],[208,26,'Summit cairn'],[86,24,'Hollowpine shrine']];
 SHR.forEach(([x,y,nm],k)=>{for(let b=-1;b<=1;b++)for(let a=-1;a<=1;a++){const c=get(x+a,y+b);if(c!==T.WATER&&!SOLID.has(c)||c===T.TREE||c===T.ROCK)set(x+a,y+b,b===1&&a===0?T.PATH:base(x+a,y+b));RES[I(x+a,y+b)]=1;}set(x,y,T.SHRINE);SHRINES.push({x,y,name:nm,k});});
 // 12. organic detail: tall grass, forests (single trees, never walls), clearings, flowers, boulders, ice ponds
 const dens={leaf:.34,dusk:.16,ember:.07,coast:.08,gale:.06,snow:.12,cave:0,summit:.1,crimson:.12};
 for(let y=1;y<WH-1;y++)for(let x=1;x<WW-1;x++){const i=I(x,y);if(RES[i])continue;const v=m.t[i],r=REGION[i];if(v!==T.GRASS&&v!==T.SNOW)continue;
  const n=vn(x,y,7,11);if(n>(r==='leaf'?0.64:0.66)){set(x,y,v===T.SNOW?T.SNOWTALL:T.TALL);if(!ZONEMAP[i])ZONEMAP[i]=REGZONE[r];continue;}
  if(v===T.GRASS&&vn(x,y,4,21)>0.8){set(x,y,T.FLOWER);continue;}
  if(r==='snow'&&vn(x,y,8,23)>0.78){set(x,y,T.ICE);continue;}}
 const isoOK=(x,y)=>{for(let b=-1;b<=1;b++)for(let a=-1;a<=1;a++){const c=get(x+a,y+b);if(SOLID.has(c)||c===T.DOOR||c===T.PATH||c===T.BRIDGE)return false;}return true;};
 for(let y=1;y<WH-1;y++)for(let x=1;x<WW-1;x++){const i=I(x,y);if(RES[i])continue;const v=m.t[i],r=REGION[i];if(v!==T.GRASS&&v!==T.SNOW&&v!==T.CAVE&&v!==T.FLOWER)continue;
  const clearing=vn(x,y,9,31)>0.72;let d=(dens[r]||.08)*(clearing?0.1:1)*(0.5+vn(x,y,13,33));const h=hsh(x,y,77);
  if(v===T.CAVE){if(h<0.05&&isoOK(x,y))set(x,y,T.ROCK);continue;}
  if(h<d&&isoOK(x,y))set(x,y,(r==='gale'||r==='snow')&&hsh(x,y,78)<0.35?T.ROCK:T.TREE);}
 // cave zone everywhere on the plateau
 for(let i=0;i<WW*WH;i++)if(m.t[i]===T.CAVE&&!ZONEMAP[i])ZONEMAP[i]=REGION[i]==='cave'?'cave':'slopes';
 // 13. named landmarks & hidden items
 coveC.forEach(([x,y,r,nm])=>LANDMARKS.push({name:nm,x,y,r:r+3}));
 LANDMARKS.push({name:'Mirrorlake',x:118,y:98,r:28},{name:'Whisperwood Clearing',x:62,y:140,r:6},{name:'Windbreak Bluffs',x:220,y:90,r:8},{name:'Frostpeak Summit',x:201,y:23,r:8},{name:'Reedwater Hamlet',x:26,y:110,r:9},{name:'Hollowpine',x:88,y:22,r:9},{name:'Emberfall Camp',x:102,y:128,r:6},{name:'Gull\'s Rest',x:214,y:130,r:9},{name:'Tidehaven Lighthouse',x:LAY.lighthouse[0],y:LAY.lighthouse[1],r:6},{name:'Tidehaven Docks',x:LAY.dockEnd[0],y:LAY.dockEnd[1]-4,r:6},{name:'Summit League Plaza',x:49,y:34,r:13},{name:'Crimsonspire Approach',x:73,y:30,r:6});
 const HID=[[60,140,'Rare Candy'],[112,129,'Ultra Orb'],[196,59,'Max Potion'],[178,15,'Rare Candy'],[60,67,'Dawn Orb'],[LAY.dockEnd[0]+3,LAY.dockEnd[1],'Revive'],[22,114,'Super Potion'],[206,25,'Ultra Orb'],[90,24,'Full Heal'],[26,80,'Max Potion']];
 HID.forEach(([x,y,it],k)=>{if(SOLID.has(get(x,y))||get(x,y)===T.WATER)set(x,y,T.PATH);HIDDEN.push({id:'hid'+k,x,y,item:it});});
 return m;}
function emptyRoom(w,h){const t=new Array(w*h).fill(T.FLOOR);for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(x===0||y===0||x===w-1||y===h-1)t[y*w+x]=T.IWALL;return t;}
function makeInterior(id,type,tn,dx,dy){
 const w=type==='gym'?13:11,h=type==='gym'?15:9;const t=emptyRoom(w,h);const s=(x,y,v)=>t[y*w+x]=v;
 const ex=Math.floor(w/2);s(ex,h-1,T.MAT);
 if(type==='house'){s(1,1,T.BED);s(2,1,T.BED);s(8,1,T.BED);s(9,1,T.BED);s(5,3,T.TABLE);s(4,3,T.TABLE);}
 if(type==='temple'){s(5,1,T.ALTAR);s(3,0,T.MURAL);s(7,0,T.MURAL);s(1,1,T.BED);s(9,1,T.BED);for(const yy of [4,6])for(const xx of [2,3,7,8])s(xx,yy,T.TABLE);}
 if(type==='center'){for(let x=1;x<w-2;x++)s(x,3,T.COUNTER);s(5,3,T.COUNTER);s(ex,3,T.COUNTER);s(9,1,T.PC);s(ex,3,T.COUNTER);}
 if(type==='shop'){for(let x=1;x<w-1;x++)s(x,3,T.COUNTER);s(1,6,T.TABLE);s(9,6,T.TABLE);}
 if(type==='lab'){s(4,3,T.TABLE);s(5,3,T.TABLE);s(6,3,T.TABLE);s(1,1,T.PC);s(9,1,T.PC);}
 if(type==='gym'){for(let y=3;y<h-2;y+=3)for(let x=1;x<w-1;x++)if(Math.abs(x-ex)>((y/3)%2?1:3))s(x,y,T.PILLAR);}
 return {id,w,h,t,type,town:tn.id,exit:{x:dx,y:dy+1},spawn:{x:ex,y:h-2},name:tn.name+' '+({house:'House',center:'Healing Center',shop:'Market',gym:'Gym',lab:'Wren Lab',temple:'Temple of the Three'}[type])};
}
function makeLeague(){const w=11,h=26;const t=emptyRoom(w,h);
 // Summit Hall (brief 38): wide hall, pillars at the edges, elites stand in side alcoves so the carpet lane stays clear
 for(let y=3;y<h-2;y+=4){t[y*w+1]=T.PILLAR;t[y*w+9]=T.PILLAR;}t[(h-1)*w+5]=T.MAT;
 return {id:'league',w,h,t,type:'league',town:-1,exit:{x:LAY.leagueDoor[0],y:LAY.leagueDoor[1]+1},spawn:{x:5,y:h-2},name:'Summit League Hall'};}
function makeCastle(){const w=11,h=18;const t=emptyRoom(w,h);for(let i=0;i<w*h;i++)if(t[i]===T.FLOOR)t[i]=T.CFLOOR;for(let y=2;y<h-2;y+=3){t[y*w+2]=T.PILLAR;t[y*w+8]=T.PILLAR;}t[(h-1)*w+5]=T.MAT;
 return {id:'castle',w,h,t,type:'castle',town:-1,exit:{x:LAY.castleDoor[0],y:LAY.castleDoor[1]+1},spawn:{x:5,y:h-2},name:'Crimsonspire Castle'};}
function makeLair(id,floor,name,exit){const w=11,h=14;const t=emptyRoom(w,h);for(let i=0;i<w*h;i++)if(t[i]===T.FLOOR)t[i]=floor;for(let y=3;y<h-2;y+=3){t[y*w+2]=T.PILLAR;t[y*w+8]=T.PILLAR;}t[(h-1)*w+5]=T.MAT;return {id,w,h,t,type:'lair',town:-1,exit,spawn:{x:5,y:h-2},name};}
MAPS.citadel=makeLair('citadel',T.HFLOOR,'Celestine Citadel',{x:LAY.citadelDoor[0],y:LAY.citadelDoor[1]+1});MAPS.skysea=makeLair('skysea',T.SFLOOR,'Skysea Temple',{x:LAY.skyseaDoor[0],y:LAY.skyseaDoor[1]+1});
MAPS.world=buildWorld();
// ===== People =====
// sched: [hour, map, x, y, wander]
function tp(tn,rx,ry){return [TOWNS[tn].x+rx,TOWNS[tn].y+ry];}
function townSched(tn,home,hx,hy,wx,wy,px,py,wake=7,work=9,eve=18,sleep=21){const [a,b]=tp(tn,wx,wy),[c,d]=tp(tn,px,py);return [[wake,home,hx,hy+2,1],[work,'world',a,b,1],[eve,'world',c,d,1],[sleep,home,hx,hy,0]];}
const PRJOB={"linnea": "Dawnwarden (Order of Mancaco)", "hale": "Hearthkeeper (Order of Mandara)", "coraline": "Tidecaller (Order of Mantermo)", "fenwick": "Dawnwarden archivist", "rimma": "Tidecaller healer", "thessaly": "Hearthkeeper elder"};
const PRIEST_EXTRA={linnea:'We Dawnwardens keep the calendars and teach reading, for light lets all things be seen.',hale:'At the Last Hearth the dead lie one night beside Mandara\'s fire, so they rest in her dark rather than fear it.',coraline:'At a Naming each newborn is shown to the sun, touched with water and warmed by a hearth, so all Three know the child.',fenwick:'Our temple records speak of a Great Schism three centuries ago - a faction expelled for asking where the Deep came from. The records call them only "the ones who listened too closely."',rimma:'If a priest lets any of the three flames go out, she must keep a night-long vigil to atone. I have kept two.',thessaly:'Two heresies came from the Schism. The Followers of the Deep you know. The other never preached and never recruited. It is thought extinct. ...Thought.'};
const PEOPLE=[
 // Mossgrove
 {id:'ilsa',name:'Ilsa',town:0,col:'#d87050',age:41,job:'Baker',pers:'Warm, stubborn, early riser',back:'Your mother. She took over the Mossgrove bakery when your father Rowan vanished five years ago on an expedition to study the legendary beasts. She bakes his favourite honey bread every Sunday in case he returns.',
  sched:townSched(0,'b0_0',3,1,4,5,8,7,5,6,17,22),
  talk:[[0,'Good morning, sweetheart! Professor Wren is waiting in the lab south of the square.'],[1,'A medal already! Your father would be beaming. Rest at home whenever you need.'],[4,'I heard the Followers are after the legends... the same ones Rowan studied. Please be careful.'],[7,'Champion! ...and Rowan is home. I never stopped baking his bread.']]},
 {id:'bram',name:'Old Bram',town:0,col:'#8a7a60',age:72,job:'Retired Ranger',pers:'Gruff, sentimental, forgetful',back:'Bram trained your father as a ranger. He lost his late wife\'s locket in Whisperwood during a storm and has searched for it every spring since.',
  sched:townSched(0,'b0_1',2,2,15,5,11,7,6,8,18,20),quest:'q0',
  talk:[[0,'Hmph. Whisperwood east of here eats things. Took my Mara\'s locket, it did.'],[3,'Rowan always said the legends sleep where the land is oldest: fire, lake and sky.'],[7,'Ha! The boy... the girl... the CHAMPION I once let pet my Puffalo!']]},
 {id:'wren',name:'Professor Wren',town:0,col:'#e0e0e0',age:38,job:'Monster Researcher',pers:'Brilliant, scatterbrained, kind',back:'Wren was Rowan\'s research partner. She believes the Followers of the Deep kidnapped Rowan to learn how to awaken the three legendaries, and has quietly prepared you to follow his trail.',
  sched:[[0,'b0_5',8,2,0],[7,'b0_5',5,2,1],[19,'b0_5',8,2,0]],
  talk:[[0,'Choose a partner from the table, then come talk to me!'],[1,'Six medals open the Summit League. And on the way... look for clues about Rowan.'],[5,'The Monk leads the Followers of the Deep - heretics of the Triune Faith. They steal power from every town to summon Mandara by a dark ritual.'],[7,'You did it. Rowan is free and the legends are safe. Thank you.']]},
 // Cinderbrook
 {id:'kiri',name:'Kiri',town:1,col:'#e08040',age:19,job:'Smith Apprentice',pers:'Energetic, competitive, loud',back:'Kiri left a fishing family to learn the forge. She is cataloguing every fire monster near Cinderbrook to prove smiths and monsters can work together.',
  sched:townSched(1,'b1_0',3,1,5,5,10,8),quest:'q1',
  talk:[[0,'The forge fires are dying! The Followers are siphoning the volcano heat!'],[2,'Fires are back! Brann even let me run the big anvil.'],[7,'I\'m forging a Champion\'s plaque. Guess whose name is on it?']]},
 {id:'dunn',name:'Foreman Dunn',town:1,col:'#705040',age:55,job:'Mine Foreman',pers:'Practical, protective, tired',back:'Dunn has run the Cinderbrook mines for thirty years and lost two fingers in a cave-in. He distrusts outsiders since the Followers bought half the mining claims.',
  sched:townSched(1,'b1_1',2,2,16,7,9,5,5,7,17,20),
  talk:[[0,'Strangers in black coats have been buying claims. Never trust a coat that clean.'],[2,'Mines are ours again, thanks to you.'],[7,'Drinks at the springs are on me, Champion.']]},
 {id:'ash',name:'Ashlynn',town:1,col:'#c05080',age:28,job:'Hot-Spring Keeper',pers:'Calm, wry, observant',back:'Ashlynn moved from the capital after burning out as a doctor. She runs the springs and quietly patches up injured wild monsters.',
  sched:townSched(1,'b1_5',3,1,3,6,12,5,8,10,19,23),
  talk:[[0,'The springs are going cold. Something is draining the heat below us.'],[2,'Warm again! Even the Emberat came back to bathe.'],[7,'Even champions need a soak. Come back anytime.']]},
 // Tidehaven
 {id:'odile',name:'Odile',town:2,col:'#4060a0',age:60,job:'Fisher',pers:'Blunt, generous, superstitious',back:'Odile has fished Mirrorlake for forty years. She swears she once saw a giant shadow beneath the island and has never fished near it since.',
  sched:townSched(2,'b2_0',3,1,14,12,9,5,4,5,16,20),quest:'q2',
  talk:[[0,'Pests on the shore are biting my nets to ribbons!'],[3,'The lake level is rising again now the Follower pumps are gone.'],[7,'The shadow under the island... I think it\'s grateful to you.']]},
 {id:'rook',name:'Captain Rook',town:2,col:'#304050',age:47,job:'Ferry Captain',pers:'Boastful, brave, honest',back:'Rook lost his ferry when the Followers drained the harbour. He is saving coin to rebuild and tells tall tales to pass the time.',
  sched:townSched(2,'b2_1',2,2,17,12,11,7),
  talk:[[0,'Harbour\'s half dry! The Followers set pumps around the lake to expose the island.'],[3,'Pumps are scrap. Soon my ferry sails again!'],[7,'Ferry\'s rebuilt and named after you. Fair winds!']]},
 {id:'nell',name:'Nell',town:2,col:'#f0a0c0',age:12,job:'Shell Collector',pers:'Curious, chatty, fearless',back:'Nell lives with her grandmother Odile. Her parents work on boats far away and send her strange shells from across the sea.',
  sched:townSched(2,'b2_0',3,1,7,13,11,7,8,10,17,19),
  talk:[[0,'I found a scale on the shore bigger than my head! It was dark blue...'],[3,'Grandma says you\'re a hero. Are heroes allowed to collect shells?'],[7,'I\'m going to be Champion next! After you retire.']]},
 // Galecrest
 {id:'pip',name:'Pip',town:3,col:'#f0d040',age:9,job:'Kite Flyer',pers:'Excitable, honest, clumsy',back:'Pip wants to be a sky-ranger. His homemade kite flew off toward Frostpeak during a gust.',
  sched:townSched(3,'b3_0',3,1,6,5,12,7,8,9,17,19),quest:'q3',
  talk:[[0,'The windmills stopped! Weird antennas are jamming the wind.'],[4,'My new dream: ride a Galeon over Frostpeak!'],[7,'Champion! Can I hold your medal case?']]},
 {id:'tamsin',name:'Tamsin',town:3,col:'#80a0c0',age:35,job:'Windmill Engineer',pers:'Precise, impatient, loyal',back:'Tamsin designed half the windmills in Galecrest. She discovered that the Follower jammers were tuned to calm the skies so they could reach Frostpeak.',
  sched:townSched(3,'b3_1',2,2,16,5,9,8,6,7,18,22),
  talk:[[0,'Jammers on the cliffs are killing our wind. The Followers want calm skies over the peak.'],[4,'Mills are spinning again! Engineering triumphs.'],[7,'I\'m building a wind-lift to the League. Champion discount, of course.']]},
 {id:'corwin',name:'Old Corwin',town:3,col:'#a090a0',age:80,job:'Storyteller',pers:'Dreamy, wise, long-winded',back:'Corwin has collected legends for sixty years. He told your father the tale of the three beasts that hold the dawn, sea and sky.',
  sched:townSched(3,'b3_5',3,1,11,4,8,5,9,10,16,19),
  talk:[[0,'In the beginning the Three shaped the world: Mancaco raised light and heaven, Mantermo poured water and breathed air, Mandara kindled dark and fire. Their heralds - Solaryx, Tidemaw, Aurorath - still guard the land. And remember: a pure summoning brings a benevolent Creator; a dark ritual brings ruin.'],[4,'Your father sat right where you stand. He feared someone would use the Dawn Tablet to summon Mandara through the dark Deep Rite - and twist her.'],[7,'Now there\'s a story worth telling.']]},
 // Frostmere
 {id:'greta',name:'Greta',town:4,col:'#c06040',age:52,job:'Innkeeper',pers:'Motherly, nosy, cheerful',back:'Greta runs the only inn in Frostmere. Her estranged brother Osric became a hermit in the Ember Caverns after a quarrel twenty years ago.',
  sched:townSched(4,'b4_0',3,1,5,5,12,7,6,7,20,23),quest:'q4',
  talk:[[0,'Follower diggers have been hacking at the frozen shrine all week.'],[5,'Did Osric read my letter? ... He did? Oh, that stubborn old goat.'],[7,'Free room for life, Champion!']]},
 {id:'ivo',name:'Shrine-keeper Ivo',town:4,col:'#e0e0f0',age:66,job:'Shrine Keeper',pers:'Solemn, gentle, devout',back:'Ivo guards the Rime Shrine, said to hold Aurorath\'s first feather. The Followers stole a tablet describing the Dawnstone ritual.',
  sched:townSched(4,'b4_1',2,2,9,4,15,7,5,6,18,20),
  talk:[[0,'They stole the Dawn Tablet. It records the summoning rites of the Three - pure and forbidden alike.'],[5,'The tablet was taken to Duskhollow ruins. Hurry.'],[7,'Aurorath\'s aurora shines brighter tonight.']]},
 {id:'lars',name:'Lars',town:4,col:'#4080c0',age:24,job:'Ice Sculptor',pers:'Artsy, moody, dramatic',back:'Lars carves ice statues of famous trainers. He secretly fears his art melts too fast to matter.',
  sched:townSched(4,'b4_5',3,1,15,12,8,8,10,11,20,2),
  talk:[[0,'I\'m carving the Followers\' leader... as a gargoyle.'],[5,'Halvard says my sculptures have soul. Halvard never says anything.'],[7,'I\'m carving YOU. In ice. Permanent until spring.']]},
 // Duskhollow
 {id:'wynn',name:'Wynn',town:5,col:'#f0c060',age:30,job:'Lamplighter',pers:'Quiet, diligent, brave',back:'Wynn lights the lamps that keep Duskhollow\'s shadows from swallowing travelers. A Follower straggler has been stealing the lantern crystals.',
  sched:[[0,'b5_0',3,1,0],[9,'b5_0',3,3,1],[17,'world',...tp(5,6,5),1],[23,'world',...tp(5,14,5),1]],quest:'q5',
  talk:[[0,'Someone steals my lantern crystals every night. Without them the ruins go dark.'],[6,'The lamps burn steady. Thank you.'],[7,'I lit a lamp in your honour, Champion.']]},
 {id:'moira',name:'Archivist Moira',town:5,col:'#8040a0',age:45,job:'Ruins Archivist',pers:'Sharp, secretive, principled',back:'Moira studied scripture beside Brother Aldric before he became the Monk. She keeps the forbidden pages describing the Deep Rite locked away - or so she thought.',
  sched:townSched(5,'b5_1',2,2,4,5,17,12,8,9,20,24),
  talk:[[0,'The Monk was once Brother Aldric, our high priest. A flood and a fire took his wife and two children in one year. Scripture warns: a pure summoning brings blessing, a dark rite brings ruin. Grief chose the dark for him.'],[6,'The Monk fled with the Dawn Tablet. Rowan was held in the ruins vault - he is free now.'],[7,'History will remember this season.']]},
 {id:'silas',name:'Silas',town:5,col:'#406040',age:17,job:'Ruins Guide',pers:'Cocky, clever, lonely',back:'Silas grew up in the ruins after his parents left for the city. He knows every tunnel and once guided Rowan into the deep vault.',
  sched:townSched(5,'b5_5',3,1,17,11,10,5,10,11,22,3),
  talk:[[0,'Your dad? Yeah... I guided him into the ruins. Black coats followed.'],[6,'Rowan headed for the League to meet you. Go!'],[7,'Told you I\'d help. Kind of. Mostly.']]},
 // priests of the Triune Faith (orders from the-faith-expanded)
 ...[['linnea','Sister Linnea',0,29,'Gentle, devout, curious','Raised in the Mossgrove temple as a foundling. She leads the children\'s choir and secretly writes adventure stories about the Three.'],
 ['hale','Brother Hale',1,51,'Gruff, warm, practical','A former blacksmith who joined the faith after Mandara\'s hearth-fire saved him in a mine collapse.'],
 ['coraline','Mother Coraline',2,63,'Serene, sharp-witted, motherly','Keeper of the Tidehaven temple for thirty years. She blesses every boat before it sails for Mantermo\'s favour.'],
 ['fenwick','Brother Fenwick',3,34,'Anxious, scholarly, kind','A scripture scholar who catalogues sky-omens. He once corresponded with Brother Aldric before Aldric became the Monk.'],
 ['rimma','Sister Rimma',4,40,'Stern, loyal, brave','A former mountain guide who tends the frozen temple and the pilgrim path toward the Celestine Citadel.'],
 ['thessaly','Elder Thessaly',5,77,'Wise, sorrowful, patient','The eldest priest of the faith. She trained Brother Aldric and blames herself for his fall into heresy.']]
 .map(([id,name,tn,age,pers,back])=>({id,name,town:tn,col:'#f0e8c0',age,job:'Priest of the Three - '+PRJOB[id],pers,back,priest:true,
   sched:[[0,'b'+tn+'_1',8,1,0],[6,'b'+tn+'_1',3,2,0],[22,'b'+tn+'_1',8,1,0]],
   talk:[[0,'Welcome to the Temple of the Three. See our altar of three flames - white for Mancaco the Radiant Mother, blue for Mantermo, red for Mandara the Keeper of the Hearth. None of their gifts is complete without the others.'],[3,'The Followers of the Deep believe the sisters belong to the waters they rose from, so whoever controls the Deep can command them. Blasphemy. The Deep answers only with darkness.'],[6,'Pray the Monk never completes the Deep Rite. Call a Creator through a dark rite and she comes in ruin.'],[7,'Mandara is freed and the Three stand in harmony. Blessed be your journey.']]})),
 // special
 {id:'osric',name:'Hermit Osric',town:-1,col:'#706050',age:58,job:'Hermit',pers:'Grumpy, lonely, secretly kind',back:'Greta\'s brother. After a quarrel over their parents\' inn he fled to the Ember Caverns and has lived on mushrooms for twenty years.',
  sched:[[0,'world',100,52,0]],
  talk:[[0,'Go away. Caves are quiet. People are loud.']]},
 {id:'stranger',name:'Hooded Stranger',town:5,col:'#504060',age:'?',job:'Unknown',pers:'Calm, amused, ancient',back:'A traveller in a grey hood who appeared beside the eighth door the day the world shook. Nobody saw them arrive. Their shadow falls the wrong way.',sched:[[0,'world',TOWNS[5].x+18,TOWNS[5].y+3,0]],hidden:'legrantaSecret',knower:true,
  talk:[[0,'So the ground told you too. Every one of us felt it when you learned. Welcome to a very small circle, @NAME. (They touch three fingers to the brow and raise one to the sky.)']]},
 {id:'rowan',name:'Rowan',town:0,col:'#507050',age:44,job:'Ranger / Researcher',pers:'Patient, adventurous, guilty',back:'Your father. He discovered the legends\' resting places and sealed the Dawn Tablet\'s secret. The Followers held him in the Duskhollow vault for five years until you broke their grip.',
  sched:[[0,'b0_0',5,4,1]],hidden:'champ',
  talk:[[0,'I followed your journey from the vault through the guards\' chatter. I\'m so proud of you.']]}
];
// ===== Townsfolk & island hamlet NPCs (brief 39/41: ambient walkers are now real, talkable people) =====
const FOLK_RAW=[
 [0,'tilda','Tilda',34,'Shepherd','Cheerful, chatty','Tilda herds Fluffin on the hills above Mossgrove and knows every lamb by name. She has never seen the sea and dreams of the Tidehaven docks.'],
 [0,'corin','Corin',11,'Farm Kid','Restless, brave','Corin wants to be a ranger like Old Bram and practises by tracking Mossnail trails through the Deepwood.'],
 [0,'hesper','Hesper',63,'Beekeeper','Slow, kind, wise','Hesper supplies the bakery with honey. Her bees refuse to fly toward the Hollow Barrow, and she has stopped asking them to.'],
 [0,'dale','Dale',27,'Woodcarver','Shy, gentle','Dale carves temple candle-holders - always three. Once he carved a fourth without thinking, and burned it before anyone saw.'],
 [1,'varga','Varga',45,'Miner','Blunt, loyal','Varga survived the cave-in that cost Foreman Dunn two fingers and has worked beside him every day since.'],
 [1,'emmet','Emmet',10,'Bellows Boy','Sooty, cheerful','Emmet pumps the forge bellows and collects cooled lava beads from the Cinder Slopes.'],
 [1,'sorrel','Sorrel',31,'Glassblower','Proud, artistic','Sorrel makes the coloured lamp glass used across the island - white, blue and red for the Three.'],
 [1,'grum','Old Grum',70,'Retired Smith','Grumbling, warm','Grum taught Brann to forge. He still critiques every blade that leaves Cinderbrook.'],
 [2,'nerys','Nerys',38,'Net Mender','Patient, funny','Nerys mends the harbour nets and sings old sailing hymns to Mantermo while she works.'],
 [2,'fynn','Fynn',13,'Deckhand','Eager, reckless','Fynn dreams of sailing past the horizon to learn whether the sea around the island ever ends.'],
 [2,'marlow','Marlow',52,'Fishmonger','Loud, honest','Marlow sells the daily catch and swears the fish swim in circles near the lighthouse on moonless nights.'],
 [2,'ysolde','Ysolde',24,'Pearl Diver','Calm, daring','Ysolde dives the coves for pearls and once saw a seabed carving of four figures, not three.'],
 [3,'brisa','Brisa',29,'Kite Maker','Bright, quick','Brisa builds the racing kites for the Regatta. Pip is her best - and loudest - customer.'],
 [3,'tor','Tor',41,'Miller','Steady, quiet','Tor runs the biggest windmill on the bluffs and grinds flour for half the island.'],
 [3,'wendeline','Wendeline',67,'Weather Watcher','Mysterious, precise','Wendeline has logged every wind for forty years. Some winds, she says, blow from nowhere at all.'],
 [3,'ozzie','Ozzie',12,'Gull Trainer','Noisy, sweet','Ozzie is teaching a Breezel to carry letters. So far it mostly carries socks.'],
 [4,'katla','Katla',36,'Ice Fisher','Stoic, dry humour','Katla cuts fishing holes in the frozen ponds and has never once admitted to being cold.'],
 [4,'bjorn','Bjorn',58,'Fur Trader','Jolly, shrewd','Bjorn trades furs with Galecrest and tells wildly exaggerated tales of the beasts on Frostpeak.'],
 [4,'sigrid','Sigrid',14,'Sled Racer','Fearless, proud','Sigrid means to sled from Frostpeak Summit all the way down to Mirrorlake in a single run.'],
 [4,'elof','Elof',33,'Pilgrim Guide','Devout, careful','Elof guides pilgrims up to the Celestine Citadel and counts every step as a prayer.'],
 [5,'morwen','Morwen',39,'Candle Maker','Soft-spoken, eerie','Morwen makes the black candles for the Ember Vigil and keeps one unlit candle she will never explain.'],
 [5,'gideon','Gideon',54,'Gravekeeper','Gloomy, kind','Gideon tends the old graves of Duskhollow and talks to them, so they never feel forgotten.'],
 [5,'liesel','Liesel',9,'Lantern Kid','Curious, fearless','Liesel follows Wynn on the lamp rounds and wants to light the tallest lamp herself one day.'],
 [5,'ravel','Ravel',46,'Ruin Scavenger','Shifty, charming','Ravel sells "ancient" trinkets to travellers. A few of them are actually real.']];
const FOLK_HOME=tn=>tn===0?'b0_1':'b'+tn+'_5';
FOLK_RAW.forEach(([tn,id,name,age,job,pers,back],i)=>{const k=i%4,home=FOLK_HOME(tn);const T0=TOWNS[tn];let sched,walk=null;
 if(k===0){walk={ax:2,ay:6,bx:17,by:6};sched=[[0,home,1,5,0],[7,'world',T0.x+2,T0.y+6,0],[20,home,1,5,0]];}
 else if(k===1){walk={ax:10,ay:4,bx:10,by:12};sched=[[0,home,3,5,0],[8,'world',T0.x+10,T0.y+4,0],[19,home,3,5,0]];}
 else sched=[[0,home,k*2+3,5,0],[8,'world',T0.x+13+k,T0.y+7,0],[20,home,k*2+3,5,0]];
 PEOPLE.push({id,name,town:tn,col:'#888',age,job,pers,back,sched,walk,folk:true,face:k===2?'right':k===3?'left':null,
  talk:[[0,'Life in '+T0.name+' goes on, even with the Followers about.'],[3,'Folk say you are clearing the Followers out of every town. Thank you.'],[7,'The Champion, here! Wait until I tell everyone.']]});});
const hamSched=(home,wx,wy)=>[[0,home,3,4,0],[7,'world',wx,wy,1],[20,home,3,4,0]];
[['maren','Maren',0,44,'Reed Weaver','Practical, wistful','Maren weaves baskets and little river-boats from reeds. She left Tidehaven after a storm took her husband\'s boat, and the river feels kinder than the sea.',hamSched('h_reed0',21,111)],
 ['tobin','Tobin',0,10,'Ferry Boy','Talkative, observant','Tobin poles the reed ferry and keeps a list of every monster he has seen from the river. The list is very long.',hamSched('h_reed1',31,112)],
 ['edda','Edda',4,50,'Woodcutter','Strong, reverent','Edda cuts only fallen trees. The old pines of Hollowpine, she says, remember too much to cut.',hamSched('h_pine0',84,23)],
 ['fenna','Old Fenna',4,81,'Herbalist','Sharp, cryptic','Fenna brews remedies from forest herbs. She met the Monk long ago, when he was still Brother Aldric, weeping alone among the pines.',hamSched('h_pine1',93,23)],
 ['rusk','Rusk',1,37,'Prospector','Rough, hopeful','Rusk camps on the Cinder Slopes hunting fire-opals and has a scar for every eruption he has survived.',hamSched('h_ember0',103,130)],
 ['wilma','Wilma',3,61,'Innkeeper of Gull\'s Rest','Hearty, nosy','Wilma runs the little inn at Gull\'s Rest and feeds every stray Breezel the gales blow in.',hamSched('h_gull0',212,131)],
 ['jory','Jory',3,12,'Birdwatcher','Quiet, dreamy','Jory watches seabirds from the cliffs and swears one flock always flies in the shape of four stars.',hamSched('h_gull1',219,131)],
 ['aldous','Keeper Aldous',2,66,'Lighthouse Keeper','Solemn, gentle','Aldous has kept the island light burning for thirty years. He lost his son at sea and keeps the lamp lit for him every night.',[[0,'h_light',3,4,0],[6,'world',LAY.lighthouse[0]+2,LAY.lighthouse[1]+1,1],[18,'h_light',3,4,0]]],
 ['brin','Old Brin',2,72,'Retired Sailor','Storyteller, salty','Brin sailed every coast of the island and now sits at the end of the Tidehaven dock, telling stories to anyone who will listen.',[[0,'world',LAY.dockEnd[0]-2,LAY.dockEnd[1],0]]],
 ['quill','Scholar Quill',5,35,'Ruin Scholar','Excitable, scholarly','Quill camps at the Ruins of Ost and is certain the circle of broken columns once had a fourth gate.',[[0,'world',62,72,0]]],
 ['pell','Herald Pell',-1,40,'League Herald','Grand, precise','Pell announces every challenger at the Summit League and knows each Champion\'s record by heart.',[[0,'world',52,33,0]]]
].forEach(([id,name,tn,age,job,pers,back,sched])=>PEOPLE.push({id,name,town:tn,col:'#888',age,job,pers,back,sched,hamlet:true,
  talk:[[0,{maren:'The river is gentle here. Mind the bridge planks.',tobin:'Want a ride? ...Oh, the bridge works too.',edda:'Listen - the pines creak like old men talking.',fenna:'The forest keeps secrets, child. So do I.',rusk:'The Cone rumbled last night. Good sign for opals!',wilma:'Welcome to Gull\'s Rest! Mind the wind on the cliffs.',jory:'Shh. The gulls are landing.',aldous:'The light must never go out. Not while ships are at sea.',brin:'Sit, sit. Did I ever tell you about the Rime Inlet?',quill:'Four gates! There were FOUR. I just need to prove it.',pell:'Challengers of the Summit League! The Hall lies straight ahead - the way is clear.'}[id]],[7,'Champion! The whole island is talking about you.']]}));
// relationship data: liked / disliked gifts per NPC (deterministic, with regional flavour)
const GIFTS=['Wildflower Posy','Ember Charm','Sea Glass','Spiced Tea','Frost Lily','Star Candle','Honey Bread','Old Coin'];
const shash=s=>{let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;};
PEOPLE.forEach(p=>{const h=shash(p.id);const reg=GIFTS[p.town>=0?p.town:6];let a=GIFTS[h%8];if(a===reg)a=GIFTS[(h+3)%8];let d=null;for(let j=0;j<8&&!d;j++){const c=GIFTS[((h>>>4)+j)%8];if(c!==reg&&c!==a)d=c;}p.likes=p.likes||[reg,a];p.dislikes=p.dislikes||[d];});
const PEOPLE_BY_ID={};PEOPLE.forEach(p=>PEOPLE_BY_ID[p.id]=p);
// Bios for leaders/rival/villain (for People journal)
const VERSES=['Book of the Three 1:1 - Before there was ground or sky, there was only the Deep: dark, silent water with no bottom and no surface. Then three sisters rose from it at the same moment, as if something had called them.',
 '1:4 - Mancaco lifted her spear and drove it upward, splitting the Deep, and the top half became the heavens. She set the sun, the moon and the stars in them, so that all things might be seen.',
 '1:7 - Mantermo took the lower half of the Deep and calmed it into seas, rivers and rain. Then she breathed across it, and that breath became air and sky.',
 '1:9 - Mandara lit the first fire and drew the night across the sky. Fire gave warmth, and night gave rest.',
 '2:1 - Mancaco\'s light to see by, Mantermo\'s water and air to live on, Mandara\'s fire and night to rest in. None of these gifts is complete without the others.',
 '2:3 - Call upon a Creator with a pure heart, and she will come in blessing. Call her through a dark rite, and she will come in ruin.',
 '2:8 - The Three sleep in their lairs: Mancaco in a citadel above the clouds, Mantermo in a temple where the sea meets the sky, Mandara in Crimsonspire Castle. Their heralds - Solaryx, Tidemaw and Aurorath - keep watch until they wake.',
 '3:1 - At the Dawnlight Feast keep watch through the darkest night and greet the sunrise with song. At the Tide & Gale Regatta race boats and kites. At the Ember Vigil light one candle in every window and sleep without fear.',
 '3:5 - Woe to those who seek the Deep to command the Creators, for the Deep answers only with darkness.',
 '[cracked fragment] ...and the Three were not first...',
 '[half-burned fragment] ...who called them up out of the Deep? For a thing does not rise unless it is called...',
 '[fragment] ...not a world, but all worlds...',
 '[fragment] ...his name is not to be written. When the seal of the eighth door breaks, He will look upon...'];
const INSCRIPTIONS=['Mossgrove temple lintel: "THREE FLAMES WE LIGHT - WHITE, BLUE, RED." Beneath it, a fourth candle-holder, empty and very old.','Cinderbrook temple anvil-stone: "Mandara lit the first fire. Who struck the first spark?" Someone has scratched the second line out.','Tidehaven temple: a carved tide-chart with three currents... and a fourth line running straight up off the stone.','Galecrest temple windvane: three blades, and the stub of a fourth that was sawn off long ago.','Frostmere temple ice-carving: three sisters looking up, toward a place in the ice that has been melted smooth.','Duskhollow temple: "FOR A THING DOES NOT RISE UNLESS IT IS CALLED." The caller\'s name has been chiselled away.'];
const RUMORS=['Folk say on the clearest nights you can see a fourth star-shape behind the three Sister Stars. Then you blink and it\'s gone.','The old smiths say the first spark came from somewhere Mandara herself looked up to. Strange thing for a Creator to do, isn\'t it?','My gran says the Deep had a surface once - and someone stood upon it.','Kites over Galecrest sometimes fly toward nothing at all, as if pulled by a wind no one can feel.','The ice under the shrine hums at midwinter. Ivo says it sounds like a name. He won\'t say which.','The old archivists called the door in our ruins "the eighth seal". Nobody knows what the first seven were.'];
const FESTS={2:{name:'Ember Vigil',cr:'Mandara',gift:'Super Potion',txt:'Families light one candle in every window and sleep without fear.'},4:{name:'Dawnlight Feast',cr:'Mancaco',gift:'Ultra Orb',txt:'We keep watch through the night and greet the sunrise with song.'},6:{name:'Tide & Gale Regatta',cr:'Mantermo',gift:'Revive',txt:'Whole towns race boats and kites in her name!'}};
const BIOS={
 rival:{job:'Your Rival',age:16,pers:'Confident, competitive, secretly caring',back:'Your neighbour since childhood. Lost their mother young and wants to become Champion to prove they are strong enough to never lose anyone again.'},
 monk:{job:'Leader of the Followers of the Deep',age:58,pers:'Soft-spoken, zealous, grief-stricken',back:'Once Brother Aldric, high priest of Duskhollow, until a flood and a fire took his wife and two children in the same year. The temple records say he left the faith in grief and founded the Followers of the Deep, who believe he wants to command Mandara through the forbidden Deep Rite. Some say he was once seen giving a strange greeting - three fingers to the brow, one raised to the sky - to a stranger at the altar. He cried out to the Three and they slept; perhaps he wants something above them to answer.'},
 Hazel:{job:'Mossgrove Gym Leader',age:34,pers:'Patient gardener, strict teacher',back:'Hazel grows the rarest herbs in the region and tests new trainers with patience before power.'},
 Brann:{job:'Cinderbrook Gym Leader',age:50,pers:'Booming, fair, hot-headed',back:'Master smith who forged the region\'s medals. He trains fire monsters to work the forge beside him.'},
 Marisol:{job:'Tidehaven Gym Leader',age:29,pers:'Graceful, playful, fierce',back:'A champion swimmer who returned to Tidehaven to protect the lake from the Follower pumps.'},
 Skye:{job:'Galecrest Gym Leader',age:22,pers:'Reckless, joyful, daring',back:'A stunt glider pilot who learned to fly by clinging to her Galeon in storms.'},
 Halvard:{job:'Frostmere Gym Leader',age:61,pers:'Silent, stoic, honourable',back:'Once a mountain rescuer; Blizzhound and he have saved over two hundred climbers.'},
 Nocturne:{job:'Duskhollow Gym Leader',age:40,pers:'Theatrical, mysterious, kind',back:'A former stage magician who uses shadow monsters to keep Duskhollow\'s ruins safe at night.'},
 Garrick:{job:'Elite of Stone',age:57,pers:'Unshakable',back:'A geologist who has never been moved by a single attack.'},
 Ferra:{job:'Elite of Metal',age:39,pers:'Exacting',back:'An inventor who builds armour for injured monsters.'},
 Lune:{job:'Elite of Mind',age:27,pers:'Dreamy, perceptive',back:'Reads the intentions of challengers before they move.'},
 Volta:{job:'Elite of Storms',age:33,pers:'Electric, impatient',back:'Storm chaser and former Galecrest engineer.'},
 Aurelia:{job:'Champion',age:45,pers:'Serene, generous, unbeaten',back:'Rowan\'s oldest friend and Champion for twelve years. She has waited for a challenger worthy of the title.'}
};
const QUESTS={
 q0:{town:0,name:'The Lost Locket',giver:'bram',desc:'Find Mara\'s locket lost somewhere in Whisperwood (Route 1) and return it to Old Bram.',type:'item',item:'locket',reward:{items:{'Super Potion':3},money:500}},
 q1:{town:1,name:'Fire Census',giver:'kiri',desc:'Show Kiri a Fire-type monster in your party.',type:'hasType',ptype:'Fire',reward:{items:{'Great Orb':5}}},
 q2:{town:2,name:'Pier Pests',giver:'odile',desc:'Defeat 3 wild monsters after accepting, then report to Odile.',type:'defeat',n:3,reward:{items:{'Ultra Orb':2},money:1500}},
 q3:{town:3,name:'Runaway Kite',giver:'pip',desc:'Find Pip\'s kite somewhere along the Frostpeak Trail (Route 4).',type:'item',item:'kite',reward:{items:{'Rare Candy':3}}},
 q4:{town:4,name:'A Letter Home',giver:'greta',desc:'Deliver Greta\'s letter to Hermit Osric in the Ember Caverns, then return to Greta.',type:'deliver',to:'osric',reward:{items:{'Max Potion':2},money:1000}},
 q5:{town:5,name:'Lantern Thief',giver:'wynn',desc:'Defeat Mott, the Follower straggler stealing lantern crystals near the ruins (east side of town).',type:'trainer',trainer:'mott',reward:{items:{'Dawn Orb':1}}}
};
const QITEMS=[{id:'locket',map:'world',x:62,y:146,q:'q0'},{id:'kite',map:'world',x:204,y:62,q:'q3'}];
const LEGENDS=[{sp:'Mandara',map:'castle',x:5,y:2,lv:60,boss:true},{sp:'Mancaco',map:'citadel',x:5,y:2,lv:62,creator:true},{sp:'Mantermo',map:'skysea',x:5,y:2,lv:62,creator:true},{sp:'Solaryx',map:'world',x:110,y:47,lv:50},{sp:'Tidemaw',map:'world',x:115,y:92,lv:50},{sp:'Aurorath',map:'world',x:204,y:24,lv:50}];
// Trainers: placed NPCs that battle
const TRAINERS=[];
function trn(o){TRAINERS.push(o);return o;}
const SYN=[
 ['Pike','Grunt',0,15,11,[['Gloomote',7],['Emberat',8]],'The Followers of the Deep will summon Mandara, Creator of Dark and Fire! The Monk needs the old ranger maps!','Tch. The Monk said Mossgrove would be easy...'],
 ['Sable','Grunt',1,4,10,[['Emberat',13],['Pebblit',14]],'We\'re siphoning the volcano heat to wake the Ember Beast. Scram!','The siphon... fine. The deep caverns hold the real prize anyway.'],
 ['Bray','Admin',2,16,9,[['Frostfin',19],['Gloomote',20],['Boltnut',20]],'Our pumps will drain the lake and expose the Lake Sovereign\'s isle!','Drat! Report to the Monk: the lake plan has failed.'],
 ['The Monk','Leader',3,4,11,[['Boltnut',25],['Gloomote',26],['Duskowl',27]],'I am called the Monk. I once had a wife and two children. I prayed to the Three, and they slept. Your town\'s winds will feed the Deep Rite. Step aside.','You fight with a pure heart... a rare thing. It will not save this world. We will meet again.'],
 ['Wick','Admin',4,16,9,[['Snowpup',30],['Ironmite',31],['Umbrawl',32]],'This shrine\'s ice hides the last line of the Dawn Tablet!','Go to Duskhollow then. The Monk will finish you.'],
 ['The Monk','Leader',5,10,3,[['Umbrawl',37],['Gearhorn',37],['Duskowl',38],['Mindmoth',39]],'We meet again. With the Dawn Tablet and every spark we stole, the Deep Rite is nearly complete. Mandara will answer - and obey.','...Impossible. No matter. The ritual needs only one more night. Rowan? Take him. I no longer need his knowledge. Someone will answer me - if not the Three, then whatever is above them.']
];
SYN.forEach(([n,cls,tnId,rx,ry,party,pre,post],i)=>{const [x,y]=i<5?tp(tnId,6,12):tp(tnId,11,4);/* beside the gym door, off the road (brief 38) */trn({id:'syn'+i,name:n,cls:'Follower '+cls,col:'#202028',map:'world',x,y,party,money:300+i*400,pre,post,vanish:true,bio:(i===3||i===5)?'monk':null});});
const MYTH=['The Three made this world: Mancaco the light, Mantermo the waters and winds, Mandara the dark and fire. My hedges grow toward all three.','Our forge-fire is Mandara\'s gift - warmth in the dark. The Followers pervert her name.','Mantermo calmed the Deep into seas and rain. Her herald Tidemaw still sleeps beneath Mirrorlake.','Mantermo\'s winds and Mancaco\'s heavens meet over Galecrest.','The shrine ice recalls the scripture: a pure summoning brings blessing, a dark ritual brings ruin.','My shadows honour Mandara\'s true night - rest, not terror. The Monk would make it a weapon.'];
GYMS.forEach((g,i)=>{const id='b'+g.town+'_4';
 trn({id:'gymt'+i+'a',name:['Ivy','Cole','Wade','Gust','Rime','Umber'][i],cls:'Gym Trainer',col:TCOL[g.type],map:id,x:3,y:10,party:g.party.slice(0,2).map(([s,l])=>[s,l-2]),money:200+i*200,pre:'You must pass me before the leader!',post:'Go on, the leader awaits.'});
 trn({id:'gym'+i,name:g.leader,cls:'Gym Leader',col:TCOL[g.type],map:id,x:6,y:2,party:g.party,money:1000+i*800,gym:i,pre:'I am '+g.leader+', master of '+g.type+'-type. '+g.theme+' '+MYTH[i]+' Show me your strength!',post:'You earned the '+g.medal+'. Wear it proudly.'});
});
ELITE.forEach((e,i)=>trn({id:'elite'+i,name:e.name,cls:e.title,col:i===4?'#f0d080':'#806040',map:'league',x:i===4?5:7,y:[21,17,13,9,3][i],party:e.party,money:3000+i*1000,elite:i,pre:i===4?'I am Aurelia, Champion of the Summit League. Rowan told me you would come. Show me everything!':'I am '+e.name+', the '+e.title+'. Prove you belong here!',post:i===4?'A new Champion is crowned!':'Go on. The next challenge awaits.'}));
trn({id:'mott',name:'Mott',cls:'Follower Straggler',col:'#302830',map:'world',x:TOWNS[5].x+19,y:TOWNS[5].y+12,party:[['Gloomote',36],['Duskowl',37]],money:800,pre:'These crystals are MINE! The Followers still pays for them!',post:'Fine, fine! Take the stupid crystals back.',vanish:true,needQuest:'q5'});
// route trainers
[['Bug Kid Tim','r',62,142,[['Psyfly',6],['Mossnail',6]]],['Hiker Ott','r',70,150,[['Pebblit',8]]],['Fisher Lou','r',128,154,[['Pondhop',12],['Frostfin',13]]],['Lass Bea','r',182,140,[['Fluffin',17],['Psyfly',18]]],['Bird Fan Jo','r',194,122,[['Breezel',19],['Galeon',21]]],['Skier Ana','r',180,52,[['Snowpup',25],['Frostfin',26]]],['Miner Gus','r',128,45,[['Ironmite',29],['Boulderon',30]]],['Ace Rhea','r',42,60,[['Voltusk',37],['Scorchrat',37],['Galeon',38]]]]
 .forEach(([n,,x,y,party],i)=>trn({id:'rt'+i,name:n,cls:'Trainer',col:'#60a0a0',map:'world',x,y,party,money:150+i*120,pre:'Our eyes met! Battle!',post:'Good fight! Keep training.'}));
trn({id:'rival1',name:'@RIVAL',cls:'Rival',col:'#3050c0',map:'world',x:TOWNS[3].x+12,y:TOWNS[3].y+7,party:'rival2',money:1500,pre:'There you are! Four medals soon? Let\'s see if you\'re keeping up!',post:'Hah... you\'re really good. See you at the League.',rival:true});
trn({id:'rival2',name:'@RIVAL',cls:'Rival',col:'#3050c0',map:'world',x:44,y:33,party:'rival3',money:4000,pre:'This is it. Beat me, and you can face the Elite.',post:'Go. Win it for both of us.',rival:true,vanish:true});
trn({id:'vesper2',name:'The Monk',cls:'Follower Leader',col:'#202028',map:'castle',x:5,y:8,party:[['Umbrawl',55],['Gearhorn',55],['Duskowl',56],['Mindmoth',56],['Scorchrat',57]],money:6000,pre:'The Deep Rite is done! Mandara has come, bound in darkness to my will. She will burn this faithless world clean!',post:'No... the corruption feeds on HER, not on me... What have I done? Child - free her. Please.',vanish:true,bio:'monk'});
const GATES=[{x:71,y:30,need:'champ'}]; // open world: route guards removed; story order enforced by gym leaders, League and castle doors
