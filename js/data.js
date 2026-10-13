// ===== Monster Wilds: data =====
'use strict';
const TYPES=['Normal','Fire','Tide','Leaf','Volt','Stone','Gale','Frost','Dark','Mind','Metal','Light'];
const TCOL={Normal:'#b8b090',Fire:'#f06030',Tide:'#3878e8',Leaf:'#48b048',Volt:'#f0d030',Stone:'#a08858',Gale:'#90b8f0',Frost:'#90e0f0',Dark:'#604878',Mind:'#e858a0',Metal:'#a0a8b8',Light:'#e8c848'};
// attacker -> {defender:mult}
const CHART={
 Normal:{Stone:.5,Metal:.5,Dark:0},
 Fire:{Leaf:2,Frost:2,Metal:2,Tide:.5,Stone:.5,Fire:.5},
 Tide:{Fire:2,Stone:2,Leaf:.5,Tide:.5,Frost:.5},
 Leaf:{Tide:2,Stone:2,Fire:.5,Gale:.5,Leaf:.5,Metal:.5},
 Volt:{Tide:2,Gale:2,Leaf:.5,Volt:.5,Stone:0},
 Stone:{Fire:2,Gale:2,Frost:2,Metal:.5},
 Gale:{Leaf:2,Mind:2,Volt:.5,Stone:.5,Metal:.5},
 Frost:{Leaf:2,Gale:2,Fire:.5,Tide:.5,Metal:.5,Frost:.5},
 Dark:{Mind:2,Dark:2,Metal:.5,Normal:0,Light:.5},
 Light:{Dark:2,Frost:2,Fire:.5,Metal:.5,Light:.5},
 Mind:{Normal:2,Stone:2,Metal:.5,Mind:.5,Dark:.5},
 Metal:{Frost:2,Stone:2,Fire:.5,Tide:.5,Volt:.5,Metal:.5}
};
function eff(at,defTypes){let m=1;for(const d of defTypes){const v=CHART[at][d];if(v!==undefined)m*=v;}return m;}
// moves: name:[type,power,acc,cat(p/s/x),effect]
const MOVES={};
const MT={
 Normal:[['Tackle',40],['Quick Jab',45],['Body Slam',85,'para'],['Hyper Rush',110]],
 Fire:[['Spark Flick',40,'burn'],['Fire Fang',65,'burn'],['Blaze Wave',90,'burn'],['Sunfire',120]],
 Tide:[['Splash Shot',40],['Aqua Lunge',65],['Tidal Crash',90],['Maelstrom',120]],
 Leaf:[['Leaf Nip',40],['Sap Drain',60,'drain'],['Thorn Whip',85],['Verdant Storm',120]],
 Volt:[['Static Zap',40,'para'],['Volt Bite',65,'para'],['Thunder Lance',90],['Skybolt',120]],
 Stone:[['Pebble Toss',40],['Rock Slide',70],['Quake Stomp',95],['Meteor Fall',120]],
 Gale:[['Gust',40],['Wing Slice',65],['Cyclone',90],['Tempest',120]],
 Frost:[['Chill Breath',40],['Ice Fang',65],['Frost Beam',90],['Glacier Crash',120]],
 Dark:[['Shadow Claw',50],['Night Wisp',65],['Hex Pulse',90],['Umbral Void',120]],
 Mind:[['Mind Poke',40],['Psy Beam',65],['Mind Crush',90],['Psionic Nova',120]],
 Light:[['Glimmer',40],['Halo Strike',65],['Radiant Beam',90],['Heaven\'s Judgment',120]],
 Metal:[['Iron Tap',40],['Steel Rake',70],['Gear Grind',90],['Titan Press',120]]
};
const PHYS=new Set(['Tackle','Quick Jab','Body Slam','Hyper Rush','Fire Fang','Aqua Lunge','Leaf Nip','Thorn Whip','Volt Bite','Pebble Toss','Rock Slide','Quake Stomp','Meteor Fall','Wing Slice','Ice Fang','Glacier Crash','Shadow Claw','Iron Tap','Steel Rake','Gear Grind','Titan Press','Halo Strike']);
for(const t in MT)for(const [n,p,e] of MT[t])MOVES[n]={type:t,pow:p,acc:p>=120?80:p>=90?90:100,cat:PHYS.has(n)?'p':'s',eff:e||null};
const STATUSMOVES={Normal:'Growl',Fire:'Heat Haze',Tide:'Soak',Leaf:'Toxic Spores',Volt:'Thunder Wave',Stone:'Harden',Gale:'Tailwind',Frost:'Harden',Dark:'Lullaby',Mind:'Focus',Metal:'Harden',Light:'Focus'};
Object.assign(MOVES,{
 'Growl':{type:'Normal',pow:0,acc:100,cat:'x',eff:'atk-'},
 'Heat Haze':{type:'Fire',pow:0,acc:85,cat:'x',eff:'burnS'},
 'Soak':{type:'Tide',pow:0,acc:100,cat:'x',eff:'spe-'},
 'Toxic Spores':{type:'Leaf',pow:0,acc:85,cat:'x',eff:'poisonS'},
 'Thunder Wave':{type:'Volt',pow:0,acc:90,cat:'x',eff:'paraS'},
 'Harden':{type:'Normal',pow:0,acc:100,cat:'x',eff:'def+'},
 'Tailwind':{type:'Gale',pow:0,acc:100,cat:'x',eff:'spe+'},
 'Lullaby':{type:'Dark',pow:0,acc:65,cat:'x',eff:'sleepS'},
 'Focus':{type:'Mind',pow:0,acc:100,cat:'x',eff:'spa+'},
 'Crimson Edge':{type:'Fire',pow:100,acc:95,cat:'p',eff:'burn'},'Abyss Night':{type:'Dark',pow:100,acc:95,cat:'s',eff:null},
 'Heaven\'s Lance':{type:'Light',pow:100,acc:95,cat:'p',eff:null},'Seraph Wings':{type:'Gale',pow:90,acc:100,cat:'s',eff:null},
 'Tempest Tide':{type:'Tide',pow:100,acc:95,cat:'s',eff:null},'Skysea Spiral':{type:'Gale',pow:100,acc:95,cat:'p',eff:'para'}
});
const ABIL={Normal:'Steadfast',Fire:'Kindling Heart',Tide:'Riptide Skin',Leaf:'Photosynth',Volt:'Static Fur',Stone:'Bedrock',Gale:'Updraft',Frost:'Rimecoat',Dark:'Umbral Veil',Mind:'Foresight',Metal:'Alloy Plating',Light:'Halo'};
// species: name|types|hp,atk,def,spa,spd,spe|evoLv>evoTo|catch|height m|weight kg|habitat|lore
const SPRAW=`Cindle|Fire|39,52,43,60,50,65|16>Pyrrix|45|0.5|7|Volcanic foothills|A spark-tailed pup that sleeps curled around its own warm tail. Its flame flickers blue when it is happy.
Pyrrix|Fire|58,64,58,80,65,80|34>Blazewyrm|45|1.1|19|Volcanic foothills|Its mane of embers grows denser as it wins battles. It patrols lava vents at dusk.
Blazewyrm|Fire,Gale|78,84,78,109,85,100||45|1.7|90|Volcanic peaks|A winged serpent whose breath melts stone. Legends say it guided early smiths to the first forges.
Drizzlet|Tide|44,48,65,50,64,43|16>Torrentail|45|0.5|9|Freshwater ponds|It stores rain in its round cheeks and sprays curious children for fun.
Torrentail|Tide|59,63,80,65,80,58|34>Abyssault|45|1.0|22|Rivers and lakes|Its whip-like tail can split river stones with a single crack of water.
Abyssault|Tide,Metal|79,83,100,85,105,78||45|1.6|85|Deep lakes|Armored by mineral scales from the lakebed, it guards sunken ruins.
Sprigling|Leaf|45,49,49,65,65,45|16>Thornback|45|0.4|6|Forest clearings|A sprout-headed sprite that bobs in sunlight. Its leaf droops when it is lonely.
Thornback|Leaf|60,62,63,80,80,60|34>Grovegiant|45|1.0|30|Old forests|Thorns along its spine release a calming scent that settles frightened animals.
Grovegiant|Leaf,Stone|80,82,83,100,100,80||45|2.0|155|Ancient groves|A walking hillside of moss and root. Villages once planted orchards in its footprints.
Fluffin|Normal|50,45,40,35,40,55|18>Puffalo|190|0.3|3|Meadows|A cotton-ball creature that floats on warm breezes. Flocks of them signal good weather.
Puffalo|Normal|85,80,70,50,60,70||75|1.4|110|Grasslands|Its fluffy coat hides solid muscle; herds shake the ground when they stampede.
Zappip|Volt|35,50,30,60,40,85|20>Voltusk|190|0.3|2|Power lines and fields|It nibbles on static from fur and sweaters. Rubbing it is a shocking experience.
Voltusk|Volt|65,90,60,95,70,110||75|1.2|40|Stormy plains|Twin tusks crackle with lightning; it charges them by running into storms.
Pebblit|Stone|40,70,90,30,30,20|20>Boulderon|190|0.4|20|Caves and cliffs|It disguises itself as a pebble on paths. Hikers often trip over sleeping Pebblit.
Boulderon|Stone|60,95,110,40,45,30|36>Montitan|90|1.0|105|Caves|It rolls down mountainsides to travel, leaving grooves that become streams.
Montitan|Stone,Metal|85,120,130,55,65,40||45|1.8|300|Mountain cores|Veins of ore glitter across its body. It sleeps for decades inside mountains.
Breezel|Gale|40,45,35,40,35,70|18>Galeon|190|0.3|2|Windy hills|A tiny bird that rides gusts for hours without flapping once.
Galeon|Gale|70,80,65,70,65,105||75|1.3|30|Cliffs and peaks|Its cry can be heard across valleys; it dives faster than falling hail.
Frostfin|Frost|45,40,50,55,60,40|28>Rimewhale|190|0.6|12|Cold waters|A fish that freezes the water around it into a protective shell at night.
Rimewhale|Frost,Tide|100,75,85,85,90,45||60|3.0|400|Icy seas|It sings ancient songs; icebergs are said to form where it breathes.
Gloomote|Dark|40,45,40,55,45,60|25>Umbrawl|190|0.4|4|Ruins at night|A shadow mote that steals small trinkets and hides them in moonlit corners.
Umbrawl|Dark|65,85,65,90,70,90||75|1.5|45|Abandoned towns|It walks inside other creatures' shadows to sneak up on prey.
Psyfly|Mind,Gale|35,30,35,60,55,70|24>Mindmoth|190|0.2|1|Flower fields|Its wing patterns hypnotise predators into forgetting what they were doing.
Mindmoth|Mind,Gale|70,50,60,100,90,90||75|1.3|20|Moonlit meadows|Its scales glow with dreams it has gathered from sleeping villagers.
Boltnut|Metal,Volt|40,50,60,45,40,40|28>Gearhorn|190|0.3|11|Factories and scrapyards|A screw-shaped creature that spins into machines to feed on their current.
Gearhorn|Metal,Volt|70,95,100,80,70,55||75|1.6|140|Old mines|The gears on its horn turn faster when angry, building a crushing charge.
Mossnail|Leaf,Stone|50,40,70,40,60,20|22>Shellgrove|190|0.3|5|Damp forests|Moss on its shell is so lush that tiny flowers bloom on it in spring.
Shellgrove|Leaf,Stone|85,70,110,70,90,25||75|1.1|80|Forest floors|Birds nest in the garden growing on its shell; it moves gently so as not to disturb them.
Emberat|Fire|40,55,35,45,35,70|22>Scorchrat|190|0.3|3|Volcanic vents|A rodent with a coal-hot nose that it uses to toast seeds.
Scorchrat|Fire|65,85,60,70,55,95||75|0.8|18|Lava fields|It digs tunnels through cooled lava and smells of smoke.
Pondhop|Tide,Leaf|45,45,45,50,50,55|20>Lilyleap|190|0.3|3|Ponds|It wears a lily pad like a hat and hops between them all day.
Lilyleap|Tide,Leaf|75,70,70,85,85,80||75|1.1|28|Marshes|It conducts frog-choir concerts on summer nights.
Duskowl|Dark,Gale|70,65,60,85,75,85||60|0.9|15|Dark woods|A silent owl whose eyes see only in darkness. It hoots at every new moon.
Ironmite|Metal|45,60,70,30,40,40|30>Ferrobeast|190|0.3|15|Mines|It eats iron filings and grows a new layer of plating each year.
Ferrobeast|Metal|80,105,115,45,70,55||75|1.4|250|Deep mines|Its steel hide rings like a bell when struck.
Snowpup|Frost|45,50,45,45,45,60|26>Blizzhound|190|0.5|8|Snowfields|It loves to roll in fresh snow and leaves angel-shaped imprints.
Blizzhound|Frost|75,95,70,80,70,100||75|1.3|50|Mountain passes|It guides lost travelers down mountains, howling to call search parties.
Solaryx|Fire,Mind|100,100,100,130,110,100||10|3.2|210|Heart of the Ember Caverns|Herald of Mancaco. The Dawn Beast. It is said that the sun rose for the first time when Solaryx opened its eyes.
Tidemaw|Tide,Dark|105,120,100,100,100,95||10|5.0|680|Mirrorlake Isle|Herald of Mantermo's seas. It sleeps beneath the island and its dreams form the lake's tides.
Aurorath|Frost,Gale|95,85,100,120,125,110||10|3.4|160|Frostpeak Summit|Herald of Mantermo's winds. Auroras are the shed light of its feathers drifting across the north.
Mandara|Dark,Fire|110,135,95,130,95,110||5|2.1|88|Crimsonspire Castle|The Crimson Sovereign, Keeper of the Hearth. Crimson skin, hair black as smoke, a blade that glows like a forge. She lit the first fire and drew the night across the sky so all things could be warm and rest. A pure summoning brings her blessing; the Monk's Deep Rite twisted her into ruin.
Mancaco|Light,Gale|105,120,100,135,110,105||5|2.2|82|Celestine Citadel, Frostpeak Summit|The Radiant Mother, Creator of Light and Heaven. Pale gold skin, eyes burning blue. She drove her spear upward and split the Deep; the top half became the heavens, and she set the sun, moon and stars in them.
Mantermo|Tide,Gale|115,115,105,125,115,100||5|2.1|90|Skysea Temple, Mirrorlake Isle|Creator of Water and Air. Her hair moves like a tide and her voice sounds like wind. She calmed the lower Deep into seas, rivers and rain, then breathed across it to make the sky. Sailors pray to her before leaving port.`;
const SPECIES={};const SPLIST=[];
SPRAW.split('\n').forEach((l,i)=>{const p=l.split('|');const s={id:i+1,name:p[0],types:p[1].split(','),base:p[2].split(',').map(Number),catch:+p[4],h:p[5],w:p[6],habitat:p[7],lore:p[8]};
 if(p[3]){const [lv,to]=p[3].split('>');s.evo={lv:+lv,to};}
 s.ability=ABIL[s.types[0]];s.legend=s.catch<=10;s.creator=s.catch<=5;SPECIES[s.name]=s;SPLIST.push(s);});
const FOOTNOTES={Solaryx:'Temple footnote: "Even the dawn answers to a sunrise older than itself."',Tidemaw:'Fisher\'s footnote: it is said to sleep facing upward, as if waiting to be called.',Aurorath:'Shrine footnote: its aurora sometimes forms a fourth band that no instrument can record.',Mandara:'Scholar\'s footnote: "For a thing does not rise unless it is called." Who called the Three?',Mancaco:'Scholar\'s footnote: Mancaco\'s spear split the Deep - yet the oldest murals show her looking up, not down.',Mantermo:'Scholar\'s footnote: her breath became the sky. Whose breath became the Deep?',Gloomote:'Footnote: Gloomote hoard only shiny things... except near the sealed door in Duskhollow, where they leave offerings.',Mindmoth:'Footnote: villagers who dream with Mindmoth nearby sometimes speak of "the one above" on waking.'};
for(const s of SPLIST){if(s.evo)SPECIES[s.evo.to].pre=s.name;}
for(const s of SPLIST){
 const t1=s.types[0],t2=s.types[1];const L=[[1,'Tackle'],[1,MT[t1][0][0]],[5,'Growl'],[10,MT[t1][1][0]],[19,STATUSMOVES[t1]],[26,MT[t1][2][0]],[42,MT[t1][3][0]]];
 if(t2){L.push([14,MT[t2][0][0]],[32,MT[t2][1][0]],[50,MT[t2][2][0]]);}
 if(t1==='Normal'){L.splice(0,2,[1,'Tackle'],[3,'Quick Jab']);}
 if(s.name==='Mandara')L.push([45,'Crimson Edge'],[55,'Abyss Night']);if(s.name==='Mancaco')L.push([45,'Heaven\'s Lance'],[55,'Seraph Wings']);if(s.name==='Mantermo')L.push([45,'Tempest Tide'],[55,'Skysea Spiral']);
 s.learn=L.filter((v,i,a)=>a.findIndex(x=>x[1]===v[1])===i).sort((a,b)=>a[0]-b[0]);
}
function evoLine(n){let r=n;while(SPECIES[r].pre)r=SPECIES[r].pre;const out=[r];while(SPECIES[out[out.length-1]].evo)out.push(SPECIES[out[out.length-1]].evo.to);return out;}

const ITEMS={
 'Potion':{price:200,desc:'Restores 20 HP.',heal:20},
 'Super Potion':{price:600,desc:'Restores 60 HP.',heal:60},
 'Max Potion':{price:1500,desc:'Fully restores HP.',heal:9999},
 'Revive':{price:1500,desc:'Revives a fainted monster to half HP.',revive:true},
 'Full Heal':{price:400,desc:'Cures any status condition.',cure:true},
 'Snare Orb':{price:200,desc:'Basic capture orb.',ball:1},
 'Great Orb':{price:600,desc:'Better capture orb (1.5x).',ball:1.5},
 'Ultra Orb':{price:1200,desc:'High-grade capture orb (2x).',ball:2},
 'Dawn Orb':{price:0,desc:'Captures any monster without fail.',ball:255},
 'Rare Candy':{price:0,desc:'Raises a monster by one level.',candy:true}
};

// ===== World layout =====
const TOWNS=[
 {id:0,name:'Mossgrove',x:8,y:92,type:'Leaf',desc:'A quiet farming village under old oaks. Your hometown.'},
 {id:1,name:'Cinderbrook',x:56,y:92,type:'Fire',desc:'A smithing town built over warm volcanic springs.'},
 {id:2,name:'Tidehaven',x:104,y:92,type:'Tide',desc:'A fishing port on the shore of Mirrorlake.'},
 {id:3,name:'Galecrest',x:122,y:46,type:'Gale',desc:'A cliffside town of windmills and kites.'},
 {id:4,name:'Frostmere',x:84,y:10,type:'Frost',desc:'A snowbound town around a frozen shrine.'},
 {id:5,name:'Duskhollow',x:24,y:40,type:'Dark',desc:'A twilight town among ancient ruins.'}
];
const TW=20,TH=14; // town size
const GYMS=[
 {town:0,leader:'Hazel',type:'Leaf',medal:'Verdant Medal',party:[['Sprigling',10],['Mossnail',12]],theme:'Greenhouse gym filled with hedges.'},
 {town:1,leader:'Brann',type:'Fire',medal:'Ember Medal',party:[['Emberat',15],['Cindle',16],['Scorchrat',18]],theme:'A forge-hall with lava channels.'},
 {town:2,leader:'Marisol',type:'Tide',medal:'Wave Medal',party:[['Pondhop',21],['Torrentail',23],['Lilyleap',24]],theme:'A tidal pool arena.'},
 {town:3,leader:'Skye',type:'Gale',medal:'Zephyr Medal',party:[['Breezel',27],['Psyfly',27],['Galeon',29],['Voltusk',30]],theme:'A windswept tower of fans.'},
 {town:4,leader:'Halvard',type:'Frost',medal:'Rime Medal',party:[['Snowpup',33],['Frostfin',33],['Blizzhound',35],['Rimewhale',36]],theme:'An ice-sculpture hall.'},
 {town:5,leader:'Nocturne',type:'Dark',medal:'Umbra Medal',party:[['Gloomote',38],['Duskowl',39],['Mindmoth',40],['Umbrawl',41]],theme:'A candlelit crypt.'}
];
const ELITE=[
 {name:'Garrick',title:'Elite of Stone',party:[['Boulderon',44],['Shellgrove',45],['Montitan',47]]},
 {name:'Ferra',title:'Elite of Metal',party:[['Ironmite',45],['Gearhorn',46],['Ferrobeast',48]]},
 {name:'Lune',title:'Elite of Mind',party:[['Psyfly',46],['Mindmoth',48],['Umbrawl',48]]},
 {name:'Volta',title:'Elite of Storms',party:[['Voltusk',48],['Gearhorn',49],['Galeon',50]]},
 {name:'Aurelia',title:'Champion',party:[['Puffalo',51],['Blizzhound',52],['Montitan',52],['Galeon',53],['Abyssault',54],['Blazewyrm',55]]}
];
// encounter zones
const ZONES={
 r1:{name:'Route 1 - Whisperwood',lv:[3,7],sp:['Fluffin','Mossnail','Breezel','Zappip','Psyfly']},
 r2:{name:'Route 2 - Mirror Shore',lv:[9,14],sp:['Pondhop','Emberat','Zappip','Fluffin','Frostfin']},
 r3:{name:'Route 3 - Windward Climb',lv:[15,21],sp:['Breezel','Pebblit','Psyfly','Boltnut','Pondhop']},
 r4:{name:'Route 4 - Frostpeak Trail',lv:[22,28],sp:['Snowpup','Frostfin','Pebblit','Galeon','Boltnut']},
 cave:{name:'Ember Caverns',lv:[26,32],sp:['Pebblit','Ironmite','Emberat','Gloomote','Boulderon']},
 r6:{name:'Route 6 - Victory Road',lv:[34,40],sp:['Umbrawl','Duskowl','Ferrobeast','Gearhorn','Voltusk','Scorchrat']}
};
