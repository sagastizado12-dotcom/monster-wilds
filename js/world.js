// ===== World generation, buildings, NPCs, quests =====
'use strict';
const T={CWALL:29,CFLOOR:30,ROOF_T:31,ALTAR:32,HWALL:33,HFLOOR:34,SFLOOR:35,MURAL:36,SEAL:37,GRASS:0,TALL:1,TREE:2,PATH:3,WATER:4,SAND:5,SNOW:6,CAVE:7,ROCK:8,BRIDGE:9,WALL:10,ROOF_H:11,ROOF_C:12,ROOF_S:13,ROOF_G:14,DOOR:15,FLOWER:16,FLOOR:18,IWALL:19,COUNTER:20,BED:21,TABLE:22,PC:23,MAT:24,SNOWTALL:25,ROOF_L:26,PILLAR:27,ICE:28};
const SOLID=new Set([T.TREE,T.WATER,T.ROCK,T.WALL,T.ROOF_H,T.ROOF_C,T.ROOF_S,T.ROOF_G,T.ROOF_L,T.IWALL,T.COUNTER,T.BED,T.TABLE,T.PC,T.PILLAR,T.CWALL,T.ROOF_T,T.ALTAR,T.HWALL,T.MURAL,T.SEAL]);
const WW=150,WH=112;
function rng(seed){let s=seed>>>0;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
const MAPS={};const DOORS={};const ZONEMAP=new Array(WW*WH).fill(null);
function buildWorld(){
 const m={id:'world',w:WW,h:WH,t:new Array(WW*WH).fill(T.TREE),outdoor:true};
 const set=(x,y,v)=>{if(x>=0&&y>=0&&x<WW&&y<WH)m.t[y*WW+x]=v;};
 const get=(x,y)=>m.t[y*WW+x];
 const R=rng(1234);
 const theme=(x,y,def)=>def==='cave'?'cave':(x>=80&&y<44)||(y<8&&x>120)?'snow':'grass';
 function seg(x1,y1,x2,y2,zone,th){
  const dx=Math.sign(x2-x1),dy=Math.sign(y2-y1);let x=x1,y=y1;
  while(true){
   for(let o=-3;o<=3;o++)for(let o2=-3;o2<=3;o2++){
    if(dx!==0&&o2!==0)continue; if(dy!==0&&o!==0)continue;
    const px=x+(dy!==0?o2:0)+(dx===0&&dy===0?o:0),py=y+(dx!==0?o:0);
    const xx=dy!==0?x+o2:x, yy=dx!==0?y+o:y;
    const tth=theme(xx,yy,th);
    const center=(dx!==0?Math.abs(o)<=0:Math.abs(o2)<=0);
    let v;
    if(tth==='cave'){v=T.CAVE;}
    else if(center)v=T.PATH;
    else{const tall=R()<0.62&&Math.abs(dx!==0?o:o2)>=1;v=tth==='snow'?(tall?T.SNOWTALL:T.SNOW):(tall?T.TALL:(R()<0.06?T.FLOWER:T.GRASS));}
    set(xx,yy,v);ZONEMAP[yy*WW+xx]=zone;
   }
   if(x===x2&&y===y2)break;x+=dx;y+=dy;
  }
 }
 function route(pts,zone,th){for(let i=0;i<pts.length-1;i++)seg(pts[i][0],pts[i][1],pts[i+1][0],pts[i+1][1],zone,th);
  // round corners
  for(const [x,y] of pts.slice(1,-1))for(let a=-3;a<=3;a++)for(let b=-3;b<=3;b++){if(get(x+a,y+b)===T.TREE||get(x+a,y+b)===T.ROCK){const tth=theme(x+a,y+b,th);set(x+a,y+b,tth==='cave'?T.CAVE:tth==='snow'?T.SNOW:T.GRASS);ZONEMAP[(y+b)*WW+x+a]=zone;}}}
 // cave walls region background
 for(let y=8;y<56;y++)for(let x=46;x<82;x++)set(x,y,T.ROCK);
 route([[32,98],[52,98]],'r1','grass');
 route([[80,98],[100,98]],'r2','grass');
 route([[114,88],[114,70],[132,70],[132,64]],'r3','grass');
 route([[132,42],[132,16],[108,16]],'r4','snow');
 route([[132,16],[132,5]],'r4','snow');
 route([[80,16],[60,16],[60,46],[48,46]],'cave','cave');
 route([[60,30],[76,30]],'cave','cave');
 route([[34,36],[34,28],[18,28],[18,17]],'r6','grass');
 // lake
 for(let y=68;y<=91;y++)for(let x=66;x<=102;x++)set(x,y,T.SAND);
 for(let y=70;y<=89;y++)for(let x=68;x<=100;x++)set(x,y,T.WATER);
 for(let y=71;y<=76;y++)for(let x=81;x<=87;x++)set(x,y,T.SAND);
 for(let y=77;y<=89;y++)set(84,y,T.BRIDGE);
 for(let y=90;y<=94;y++)set(84,y,T.PATH);
 // towns
 TOWNS.forEach(tn=>{
  const snow=tn.id===4;
  for(let y=tn.y;y<tn.y+TH;y++)for(let x=tn.x;x<tn.x+TW;x++)set(x,y,snow?T.SNOW:(tn.id===5?T.GRASS:T.GRASS));
  for(let x=tn.x;x<tn.x+TW;x++)set(x,tn.y+6,T.PATH);
  for(let y=tn.y;y<tn.y+TH;y++)set(tn.x+10,y,T.PATH);
  const blds=[['house',1,1,4,3],['temple',5,1,4,3],['center',12,1,6,3],['shop',12,8,6,3],['gym',1,8,6,4],[tn.id===0?'lab':'house',7,9,3,3]];
  tn.blds=[];
  blds.forEach(([type,rx,ry,w,h],i)=>{
   const bx=tn.x+rx,by=tn.y+ry;const roof={house:T.ROOF_H,center:T.ROOF_C,shop:T.ROOF_S,gym:T.ROOF_G,lab:T.ROOF_L,temple:T.ROOF_T}[type];
   for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++)set(bx+xx,by+yy,yy<h-1?roof:T.WALL);
   const dx=bx+Math.floor(w/2),dy=by+h-1;set(dx,dy,T.DOOR);set(dx,dy+1,T.PATH);
   const id='b'+tn.id+'_'+i;DOORS[dx+','+dy]=id;tn.blds.push({id,type,dx,dy,bx,by,w,h,idx:i});
   MAPS[id]=makeInterior(id,type,tn,dx,dy);
  });
  // flowers
  for(let k=0;k<8;k++){const x=tn.x+2+Math.floor(R()*16),y=tn.y+4+Math.floor(R()*3);if(get(x,y)===T.GRASS)set(x,y,T.FLOWER);}
 });
 // town openings
 const open=(x1,y1,x2,y2)=>{for(let y=Math.min(y1,y2);y<=Math.max(y1,y2);y++)for(let x=Math.min(x1,x2);x<=Math.max(x1,x2);x++)set(x,y,get(x,y)===T.CAVE?T.CAVE:T.PATH);};
 open(28,98,31,98);open(53,98,55,98);open(76,98,79,98);open(101,98,103,98);
 open(114,89,114,91);open(132,60,132,63);open(132,43,132,45);open(104,16,107,16);
 open(81,16,83,16);open(44,46,47,46);open(34,37,34,39);
 // league plaza
 for(let y=4;y<17;y++)for(let x=8;x<29;x++)set(x,y,T.PATH);
 for(let y=5;y<10;y++)for(let x=13;x<24;x++)set(x,y,y<9?T.ROOF_L:T.WALL);
 set(18,9,T.DOOR);DOORS['18,9']='league';MAPS.league=makeLeague();
 // Crimsonspire Castle (late game)
 for(let x=29;x<=38;x++)set(x,10,T.PATH);for(let y=1;y<=9;y++)for(let x=32;x<=42;x++)set(x,y,T.CWALL);set(37,9,T.DOOR);DOORS['37,9']='castle';MAPS.castle=makeCastle();
 for(let y=2;y<8;y++)for(let x=127;x<138;x++)set(x,y,T.SNOW);
 // sealed door in Duskhollow ruins (Legranta hook)
 set(TOWNS[5].x+19,TOWNS[5].y+2,T.SEAL);
 // Celestine Citadel (Mancaco) at summit, Skysea Temple (Mantermo) on isle
 for(let y=2;y<=4;y++)for(let x=134;x<=137;x++)set(x,y,T.HWALL);set(135,4,T.DOOR);DOORS['135,4']='citadel';
 for(let y=72;y<=73;y++)for(let x=85;x<=87;x++)set(x,y,T.HWALL);set(86,73,T.DOOR);DOORS['86,73']='skysea';
 // summit & chambers
 for(let y=26;y<35;y++)for(let x=72;x<80;x++)set(x,y,T.CAVE);
 for(let y=69;y<72;y++)for(let x=83;x<86;x++)set(x,y,T.SAND);
 // OPEN WORLD (brief 35): no tree/rock walls - convert filler into open terrain; only sparse single decorative trees remain
 {const R2=rng(4242);const inTown=(x,y)=>TOWNS.some(t=>x>=t.x-1&&x<=t.x+TW&&y>=t.y-1&&y<=t.y+TH);
  for(let y=0;y<WH;y++)for(let x=0;x<WW;x++){const v=get(x,y);if(v!==T.TREE&&v!==T.ROCK)continue;
   const th=(x>=80&&y<44)||(y<8&&x>120)?'snow':(x>=46&&x<82&&y>=8&&y<56)?'cave':'grass';
   set(x,y,th==='snow'?T.SNOW:th==='cave'?T.CAVE:(R2()<0.04?T.FLOWER:T.GRASS));}
  for(let y=1;y<WH-1;y++)for(let x=1;x<WW-1;x++){if(get(x,y)!==T.GRASS||inTown(x,y)||ZONEMAP[y*WW+x])continue;if((x*7+y*13)%9||R2()>0.35)continue;
   let ok=true;for(let a=-1;a<=1&&ok;a++)for(let b=-1;b<=1;b++){const g=get(x+a,y+b);if(g!==T.GRASS&&g!==T.FLOWER){ok=false;break;}}if(ok)set(x,y,T.TREE);}}
 return m;
}
function emptyRoom(w,h){const t=new Array(w*h).fill(T.FLOOR);for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(x===0||y===0||x===w-1||y===h-1)t[y*w+x]=T.IWALL;return t;}
function makeInterior(id,type,tn,dx,dy){
 const w=type==='gym'?13:11,h=type==='gym'?15:9;const t=emptyRoom(w,h);const s=(x,y,v)=>t[y*w+x]=v;
 const ex=Math.floor(w/2);s(ex,h-1,T.MAT);
 if(type==='house'){s(1,1,T.BED);s(2,1,T.BED);s(8,1,T.BED);s(9,1,T.BED);s(5,3,T.TABLE);s(4,3,T.TABLE);}
 if(type==='temple'){s(5,1,T.ALTAR);s(3,0,T.MURAL);s(7,0,T.MURAL);s(1,1,T.BED);s(9,1,T.BED);for(const yy of [4,6])for(const xx of [2,3,7,8])s(xx,yy,T.TABLE);}
 if(type==='center'){for(let x=1;x<w-1;x++)s(x,3,T.COUNTER);s(5,3,T.COUNTER);s(ex,3,T.COUNTER);s(9,1,T.PC);s(ex,3,T.COUNTER);}
 if(type==='shop'){for(let x=1;x<w-1;x++)s(x,3,T.COUNTER);s(1,6,T.TABLE);s(9,6,T.TABLE);}
 if(type==='lab'){s(4,3,T.TABLE);s(5,3,T.TABLE);s(6,3,T.TABLE);s(1,1,T.PC);s(9,1,T.PC);}
 if(type==='gym'){for(let y=3;y<h-2;y+=3)for(let x=1;x<w-1;x++)if(Math.abs(x-ex)>((y/3)%2?1:3))s(x,y,T.PILLAR);}
 return {id,w,h,t,type,town:tn.id,exit:{x:dx,y:dy+1},spawn:{x:ex,y:h-2},name:tn.name+' '+({house:'House',center:'Healing Center',shop:'Market',gym:'Gym',lab:'Wren Lab',temple:'Temple of the Three'}[type])};
}
function makeLeague(){const w=7,h=26;const t=emptyRoom(w,h);for(let y=1;y<h-1;y++){t[y*w+1]=T.IWALL;t[y*w+5]=T.IWALL;}
 [21,17,13,9,5].forEach(y=>{t[y*w+2]=T.PILLAR;t[y*w+4]=T.PILLAR;});t[(h-1)*w+3]=T.MAT;
 return {id:'league',w,h,t,type:'league',town:-1,exit:{x:18,y:10},spawn:{x:3,y:h-2},name:'Summit League Hall'};}

function makeCastle(){const w=11,h=18;const t=emptyRoom(w,h);for(let i=0;i<w*h;i++)if(t[i]===T.FLOOR)t[i]=T.CFLOOR;for(let y=2;y<h-2;y+=3){t[y*w+2]=T.PILLAR;t[y*w+8]=T.PILLAR;}t[(h-1)*w+5]=T.MAT;
 return {id:'castle',w,h,t,type:'castle',town:-1,exit:{x:37,y:10},spawn:{x:5,y:h-2},name:'Crimsonspire Castle'};}
function makeLair(id,floor,name,exit){const w=11,h=14;const t=emptyRoom(w,h);for(let i=0;i<w*h;i++)if(t[i]===T.FLOOR)t[i]=floor;for(let y=3;y<h-2;y+=3){t[y*w+2]=T.PILLAR;t[y*w+8]=T.PILLAR;}t[(h-1)*w+5]=T.MAT;return {id,w,h,t,type:'lair',town:-1,exit,spawn:{x:5,y:h-2},name};}
MAPS.citadel=makeLair('citadel',T.HFLOOR,'Celestine Citadel',{x:135,y:5});MAPS.skysea=makeLair('skysea',T.SFLOOR,'Skysea Temple',{x:86,y:74});
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
  sched:townSched(0,'b0_1',3,1,15,5,11,7,6,8,18,20),quest:'q0',
  talk:[[0,'Hmph. Whisperwood east of here eats things. Took my Mara\'s locket, it did.'],[3,'Rowan always said the legends sleep where the land is oldest: fire, lake and sky.'],[7,'Ha! The boy... the girl... the CHAMPION I once let pet my Puffalo!']]},
 {id:'wren',name:'Professor Wren',town:0,col:'#e0e0e0',age:38,job:'Monster Researcher',pers:'Brilliant, scatterbrained, kind',back:'Wren was Rowan\'s research partner. She believes the Followers of the Deep kidnapped Rowan to learn how to awaken the three legendaries, and has quietly prepared you to follow his trail.',
  sched:[[0,'b0_5',8,2,0],[7,'b0_5',5,2,1],[19,'b0_5',8,2,0]],
  talk:[[0,'Choose a partner from the table, then come talk to me!'],[1,'Six medals open the Summit League. And on the way... look for clues about Rowan.'],[5,'The Monk leads the Followers of the Deep - heretics of the Triune Faith. They steal power from every town to summon Mandara by a dark ritual.'],[7,'You did it. Rowan is free and the legends are safe. Thank you.']]},
 // Cinderbrook
 {id:'kiri',name:'Kiri',town:1,col:'#e08040',age:19,job:'Smith Apprentice',pers:'Energetic, competitive, loud',back:'Kiri left a fishing family to learn the forge. She is cataloguing every fire monster near Cinderbrook to prove smiths and monsters can work together.',
  sched:townSched(1,'b1_0',3,1,5,5,10,8),quest:'q1',
  talk:[[0,'The forge fires are dying! The Followers are siphoning the volcano heat!'],[2,'Fires are back! Brann even let me run the big anvil.'],[7,'I\'m forging a Champion\'s plaque. Guess whose name is on it?']]},
 {id:'dunn',name:'Foreman Dunn',town:1,col:'#705040',age:55,job:'Mine Foreman',pers:'Practical, protective, tired',back:'Dunn has run the Cinderbrook mines for thirty years and lost two fingers in a cave-in. He distrusts outsiders since the Followers bought half the mining claims.',
  sched:townSched(1,'b1_1',3,1,16,7,9,5,5,7,17,20),
  talk:[[0,'Strangers in black coats have been buying claims. Never trust a coat that clean.'],[2,'Mines are ours again, thanks to you.'],[7,'Drinks at the springs are on me, Champion.']]},
 {id:'ash',name:'Ashlynn',town:1,col:'#c05080',age:28,job:'Hot-Spring Keeper',pers:'Calm, wry, observant',back:'Ashlynn moved from the capital after burning out as a doctor. She runs the springs and quietly patches up injured wild monsters.',
  sched:townSched(1,'b1_5',3,1,3,6,12,5,8,10,19,23),
  talk:[[0,'The springs are going cold. Something is draining the heat below us.'],[2,'Warm again! Even the Emberat came back to bathe.'],[7,'Even champions need a soak. Come back anytime.']]},
 // Tidehaven
 {id:'odile',name:'Odile',town:2,col:'#4060a0',age:60,job:'Fisher',pers:'Blunt, generous, superstitious',back:'Odile has fished Mirrorlake for forty years. She swears she once saw a giant shadow beneath the island and has never fished near it since.',
  sched:townSched(2,'b2_0',3,1,14,12,9,5,4,5,16,20),quest:'q2',
  talk:[[0,'Pests on the shore are biting my nets to ribbons!'],[3,'The lake level is rising again now the Follower pumps are gone.'],[7,'The shadow under the island... I think it\'s grateful to you.']]},
 {id:'rook',name:'Captain Rook',town:2,col:'#304050',age:47,job:'Ferry Captain',pers:'Boastful, brave, honest',back:'Rook lost his ferry when the Followers drained the harbour. He is saving coin to rebuild and tells tall tales to pass the time.',
  sched:townSched(2,'b2_1',3,1,17,12,11,7),
  talk:[[0,'Harbour\'s half dry! The Followers set pumps around the lake to expose the island.'],[3,'Pumps are scrap. Soon my ferry sails again!'],[7,'Ferry\'s rebuilt and named after you. Fair winds!']]},
 {id:'nell',name:'Nell',town:2,col:'#f0a0c0',age:12,job:'Shell Collector',pers:'Curious, chatty, fearless',back:'Nell lives with her grandmother Odile. Her parents work on boats far away and send her strange shells from across the sea.',
  sched:townSched(2,'b2_0',3,1,7,13,11,7,8,10,17,19),
  talk:[[0,'I found a scale on the shore bigger than my head! It was dark blue...'],[3,'Grandma says you\'re a hero. Are heroes allowed to collect shells?'],[7,'I\'m going to be Champion next! After you retire.']]},
 // Galecrest
 {id:'pip',name:'Pip',town:3,col:'#f0d040',age:9,job:'Kite Flyer',pers:'Excitable, honest, clumsy',back:'Pip wants to be a sky-ranger. His homemade kite flew off toward Frostpeak during a gust.',
  sched:townSched(3,'b3_0',3,1,6,5,12,7,8,9,17,19),quest:'q3',
  talk:[[0,'The windmills stopped! Weird antennas are jamming the wind.'],[4,'My new dream: ride a Galeon over Frostpeak!'],[7,'Champion! Can I hold your medal case?']]},
 {id:'tamsin',name:'Tamsin',town:3,col:'#80a0c0',age:35,job:'Windmill Engineer',pers:'Precise, impatient, loyal',back:'Tamsin designed half the windmills in Galecrest. She discovered that the Follower jammers were tuned to calm the skies so they could reach Frostpeak.',
  sched:townSched(3,'b3_1',3,1,16,5,9,8,6,7,18,22),
  talk:[[0,'Jammers on the cliffs are killing our wind. The Followers want calm skies over the peak.'],[4,'Mills are spinning again! Engineering triumphs.'],[7,'I\'m building a wind-lift to the League. Champion discount, of course.']]},
 {id:'corwin',name:'Old Corwin',town:3,col:'#a090a0',age:80,job:'Storyteller',pers:'Dreamy, wise, long-winded',back:'Corwin has collected legends for sixty years. He told your father the tale of the three beasts that hold the dawn, sea and sky.',
  sched:townSched(3,'b3_5',3,1,11,4,8,5,9,10,16,19),
  talk:[[0,'In the beginning the Three shaped the world: Mancaco raised light and heaven, Mantermo poured water and breathed air, Mandara kindled dark and fire. Their heralds - Solaryx, Tidemaw, Aurorath - still guard the land. And remember: a pure summoning brings a benevolent Creator; a dark ritual brings ruin.'],[4,'Your father sat right where you stand. He feared someone would use the Dawn Tablet to summon Mandara through the dark Deep Rite - and twist her.'],[7,'Now there\'s a story worth telling.']]},
 // Frostmere
 {id:'greta',name:'Greta',town:4,col:'#c06040',age:52,job:'Innkeeper',pers:'Motherly, nosy, cheerful',back:'Greta runs the only inn in Frostmere. Her estranged brother Osric became a hermit in the Ember Caverns after a quarrel twenty years ago.',
  sched:townSched(4,'b4_0',3,1,5,5,12,7,6,7,20,23),quest:'q4',
  talk:[[0,'Follower diggers have been hacking at the frozen shrine all week.'],[5,'Did Osric read my letter? ... He did? Oh, that stubborn old goat.'],[7,'Free room for life, Champion!']]},
 {id:'ivo',name:'Shrine-keeper Ivo',town:4,col:'#e0e0f0',age:66,job:'Shrine Keeper',pers:'Solemn, gentle, devout',back:'Ivo guards the Rime Shrine, said to hold Aurorath\'s first feather. The Followers stole a tablet describing the Dawnstone ritual.',
  sched:townSched(4,'b4_1',3,1,9,4,15,7,5,6,18,20),
  talk:[[0,'They stole the Dawn Tablet. It records the summoning rites of the Three - pure and forbidden alike.'],[5,'The tablet was taken to Duskhollow ruins. Hurry.'],[7,'Aurorath\'s aurora shines brighter tonight.']]},
 {id:'lars',name:'Lars',town:4,col:'#4080c0',age:24,job:'Ice Sculptor',pers:'Artsy, moody, dramatic',back:'Lars carves ice statues of famous trainers. He secretly fears his art melts too fast to matter.',
  sched:townSched(4,'b4_5',3,1,15,12,8,8,10,11,20,2),
  talk:[[0,'I\'m carving the Followers\' leader... as a gargoyle.'],[5,'Halvard says my sculptures have soul. Halvard never says anything.'],[7,'I\'m carving YOU. In ice. Permanent until spring.']]},
 // Duskhollow
 {id:'wynn',name:'Wynn',town:5,col:'#f0c060',age:30,job:'Lamplighter',pers:'Quiet, diligent, brave',back:'Wynn lights the lamps that keep Duskhollow\'s shadows from swallowing travelers. A Follower straggler has been stealing the lantern crystals.',
  sched:[[0,'b5_0',3,1,0],[9,'b5_0',3,3,1],[17,'world',...tp(5,6,5),1],[23,'world',...tp(5,14,5),1]],quest:'q5',
  talk:[[0,'Someone steals my lantern crystals every night. Without them the ruins go dark.'],[6,'The lamps burn steady. Thank you.'],[7,'I lit a lamp in your honour, Champion.']]},
 {id:'moira',name:'Archivist Moira',town:5,col:'#8040a0',age:45,job:'Ruins Archivist',pers:'Sharp, secretive, principled',back:'Moira studied scripture beside Brother Aldric before he became the Monk. She keeps the forbidden pages describing the Deep Rite locked away - or so she thought.',
  sched:townSched(5,'b5_1',3,1,4,5,17,12,8,9,20,24),
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
  sched:[[0,'world',58,25,0]],
  talk:[[0,'Go away. Caves are quiet. People are loud.']]},
 {id:'stranger',name:'Hooded Stranger',town:5,col:'#504060',age:'?',job:'Unknown',pers:'Calm, amused, ancient',back:'A traveller in a grey hood who appeared beside the eighth door the day the world shook. Nobody saw them arrive. Their shadow falls the wrong way.',sched:[[0,'world',TOWNS[5].x+18,TOWNS[5].y+3,0]],hidden:'legrantaSecret',knower:true,
  talk:[[0,'So the ground told you too. Every one of us felt it when you learned. Welcome to a very small circle, @NAME. (They touch three fingers to the brow and raise one to the sky.)']]},
 {id:'rowan',name:'Rowan',town:0,col:'#507050',age:44,job:'Ranger / Researcher',pers:'Patient, adventurous, guilty',back:'Your father. He discovered the legends\' resting places and sealed the Dawn Tablet\'s secret. The Followers held him in the Duskhollow vault for five years until you broke their grip.',
  sched:[[0,'b0_0',5,4,1]],hidden:'champ',
  talk:[[0,'I followed your journey from the vault through the guards\' chatter. I\'m so proud of you.']]}
];
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
const QITEMS=[{id:'locket',map:'world',x:42,y:96,q:'q0'},{id:'kite',map:'world',x:131,y:28,q:'q3'}];
const LEGENDS=[{sp:'Mandara',map:'castle',x:5,y:2,lv:60,boss:true},{sp:'Mancaco',map:'citadel',x:5,y:2,lv:62,creator:true},{sp:'Mantermo',map:'skysea',x:5,y:2,lv:62,creator:true},{sp:'Solaryx',map:'world',x:78,y:30,lv:50},{sp:'Tidemaw',map:'world',x:84,y:70,lv:50},{sp:'Aurorath',map:'world',x:132,y:3,lv:50}];
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
SYN.forEach(([n,cls,tnId,rx,ry,party,pre,post],i)=>{const [x,y]=i<5?tp(tnId,4,12):tp(tnId,rx,ry);trn({id:'syn'+i,name:n,cls:'Follower '+cls,col:'#202028',map:'world',x,y,party,money:300+i*400,pre,post,vanish:true,bio:(i===3||i===5)?'monk':null});});
const MYTH=['The Three made this world: Mancaco the light, Mantermo the waters and winds, Mandara the dark and fire. My hedges grow toward all three.','Our forge-fire is Mandara\'s gift - warmth in the dark. The Followers pervert her name.','Mantermo calmed the Deep into seas and rain. Her herald Tidemaw still sleeps beneath Mirrorlake.','Mantermo\'s winds and Mancaco\'s heavens meet over Galecrest.','The shrine ice recalls the scripture: a pure summoning brings blessing, a dark ritual brings ruin.','My shadows honour Mandara\'s true night - rest, not terror. The Monk would make it a weapon.'];
GYMS.forEach((g,i)=>{const id='b'+g.town+'_4';
 trn({id:'gymt'+i+'a',name:['Ivy','Cole','Wade','Gust','Rime','Umber'][i],cls:'Gym Trainer',col:TCOL[g.type],map:id,x:3,y:10,party:g.party.slice(0,2).map(([s,l])=>[s,l-2]),money:200+i*200,pre:'You must pass me before the leader!',post:'Go on, the leader awaits.'});
 trn({id:'gym'+i,name:g.leader,cls:'Gym Leader',col:TCOL[g.type],map:id,x:6,y:2,party:g.party,money:1000+i*800,gym:i,pre:'I am '+g.leader+', master of '+g.type+'-type. '+g.theme+' '+MYTH[i]+' Show me your strength!',post:'You earned the '+g.medal+'. Wear it proudly.'});
});
ELITE.forEach((e,i)=>trn({id:'elite'+i,name:e.name,cls:e.title,col:i===4?'#f0d080':'#806040',map:'league',x:3,y:[21,17,13,9,5][i],party:e.party,money:3000+i*1000,elite:i,pre:i===4?'I am Aurelia, Champion of the Summit League. Rowan told me you would come. Show me everything!':'I am '+e.name+', the '+e.title+'. Prove you belong here!',post:i===4?'A new Champion is crowned!':'Go on. The next challenge awaits.'}));
trn({id:'mott',name:'Mott',cls:'Follower Straggler',col:'#302830',map:'world',x:TOWNS[5].x+19,y:TOWNS[5].y+12,party:[['Gloomote',36],['Duskowl',37]],money:800,pre:'These crystals are MINE! The Followers still pays for them!',post:'Fine, fine! Take the stupid crystals back.',vanish:true,needQuest:'q5'});
// route trainers
[['Bug Kid Tim','r',40,99,[['Psyfly',6],['Mossnail',6]]],['Hiker Ott','r',49,96,[['Pebblit',8]]],['Fisher Lou','r',90,97,[['Pondhop',12],['Frostfin',13]]],['Lass Bea','r',114,80,[['Fluffin',17],['Psyfly',18]]],['Bird Fan Jo','r',124,70,[['Breezel',19],['Galeon',21]]],['Skier Ana','r',120,15,[['Snowpup',25],['Frostfin',26]]],['Miner Gus','r',60,40,[['Ironmite',29],['Boulderon',30]]],['Ace Rhea','r',25,28,[['Voltusk',37],['Scorchrat',37],['Galeon',38]]]]
 .forEach(([n,,x,y,party],i)=>trn({id:'rt'+i,name:n,cls:'Trainer',col:'#60a0a0',map:'world',x,y,party,money:150+i*120,pre:'Our eyes met! Battle!',post:'Good fight! Keep training.'}));
trn({id:'rival1',name:'@RIVAL',cls:'Rival',col:'#3050c0',map:'world',x:TOWNS[3].x+12,y:TOWNS[3].y+7,party:'rival2',money:1500,pre:'There you are! Four medals soon? Let\'s see if you\'re keeping up!',post:'Hah... you\'re really good. See you at the League.',rival:true});
trn({id:'rival2',name:'@RIVAL',cls:'Rival',col:'#3050c0',map:'world',x:18,y:10,party:'rival3',money:4000,pre:'This is it. Beat me, and you can face the Elite.',post:'Go. Win it for both of us.',rival:true,vanish:true});
trn({id:'vesper2',name:'The Monk',cls:'Follower Leader',col:'#202028',map:'castle',x:5,y:8,party:[['Umbrawl',55],['Gearhorn',55],['Duskowl',56],['Mindmoth',56],['Scorchrat',57]],money:6000,pre:'The Deep Rite is done! Mandara has come, bound in darkness to my will. She will burn this faithless world clean!',post:'No... the corruption feeds on HER, not on me... What have I done? Child - free her. Please.',vanish:true,bio:'monk'});
const GATES=[{x:29,y:10,need:'champ'}]; // open world: route guards removed; story order enforced by gym leaders, League and castle doors
