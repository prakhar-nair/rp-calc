// ============================================================
// RENEGADE PLATINUM .SAV FILE PARSER
// Reads Gen 4 Platinum save files and extracts box Pokemon
// ============================================================

// Block orders: 24 permutations of [G,A,E,M] substructs (substruct indices 0-3)
const SAV_BLOCK_ORDERS = [
  [0,1,2,3],[0,1,3,2],[0,2,1,3],[0,2,3,1],[0,3,1,2],[0,3,2,1],
  [1,0,2,3],[1,0,3,2],[1,2,0,3],[1,2,3,0],[1,3,0,2],[1,3,2,0],
  [2,0,1,3],[2,0,3,1],[2,1,0,3],[2,1,3,0],[2,3,0,1],[2,3,1,0],
  [3,0,1,2],[3,0,2,1],[3,1,0,2],[3,1,2,0],[3,2,0,1],[3,2,1,0],
];

// Nature names by index (PID % 25)
const SAV_NATURES = [
  'Hardy','Lonely','Brave','Adamant','Naughty',
  'Bold','Docile','Relaxed','Impish','Lax',
  'Timid','Hasty','Serious','Jolly','Naive',
  'Modest','Mild','Quiet','Bashful','Rash',
  'Calm','Gentle','Sassy','Careful','Quirky',
];

// Gen 4 Platinum ability IDs (0-123)
const SAV_ABILITIES = [
  '','Stench','Drizzle','Speed Boost','Battle Armor','Sturdy','Damp','Limber',
  'Sand Veil','Static','Volt Absorb','Water Absorb','Oblivious','Cloud Nine',
  'Compound Eyes','Insomnia','Color Change','Immunity','Flash Fire','Shield Dust',
  'Own Tempo','Suction Cups','Intimidate','Shadow Tag','Rough Skin','Wonder Guard',
  'Levitate','Effect Spore','Synchronize','Clear Body','Natural Cure','Lightning Rod',
  'Serene Grace','Swift Swim','Chlorophyll','Illuminate','Trace','Huge Power',
  'Poison Point','Inner Focus','Magma Armor','Water Veil','Magnet Pull','Soundproof',
  'Rain Dish','Sand Stream','Pressure','Thick Fat','Early Bird','Flame Body',
  'Run Away','Keen Eye','Hustle','Cute Charm','Plus','Minus','Forecast',
  'Sticky Hold','Shed Skin','Guts','Marvel Scale','Liquid Ooze','Overgrow',
  'Blaze','Torrent','Swarm','Rock Head','Drought','Arena Trap','Vital Spirit',
  'White Smoke','Pure Power','Shell Armor','Air Lock','Tangled Feet','Motor Drive',
  'Rivalry','Steadfast','Snow Cloak','Gluttony','Anger Point','Unburden',
  'Heatproof','Simple','Dry Skin','Download','Iron Fist','Poison Heal',
  'Adaptability','Skill Link','Hydration','Solar Power','Quick Feet','Normalize',
  'Sniper','Magic Guard','No Guard','Stall','Technician','Leaf Guard','Klutz',
  'Mold Breaker','Super Luck','Aftermath','Anticipation','Forewarn','Unaware',
  'Tinted Lens','Filter','Slow Start','Scrappy','Storm Drain','Ice Body',
  'Solid Rock','Snow Warning','Honey Gather','Frisk','Reckless','Multitype',
  'Flower Gift','Bad Dreams','Pickpocket','Sheer Force',
];

// Gen 4 Platinum item IDs for battle-relevant held items
// Items not listed here will display as a numeric ID fallback
const SAV_ITEMS = {};
// Berries
const SAV_ITEM_BERRIES = {
  149:'Cheri Berry',150:'Chesto Berry',151:'Pecha Berry',152:'Rawst Berry',
  153:'Aspear Berry',154:'Leppa Berry',155:'Oran Berry',156:'Persim Berry',
  157:'Lum Berry',158:'Sitrus Berry',159:'Figy Berry',160:'Wiki Berry',
  161:'Mago Berry',162:'Aguav Berry',163:'Iapapa Berry',164:'Razz Berry',
  165:'Bluk Berry',166:'Nanab Berry',167:'Wepear Berry',168:'Pinap Berry',
  169:'Pomeg Berry',170:'Kelpsy Berry',171:'Qualot Berry',172:'Hondew Berry',
  173:'Grepa Berry',174:'Tamato Berry',175:'Cornn Berry',176:'Magost Berry',
  177:'Rabuta Berry',178:'Nomel Berry',179:'Spelon Berry',180:'Pamtre Berry',
  181:'Watmel Berry',182:'Durin Berry',183:'Belue Berry',184:'Occa Berry',
  185:'Passho Berry',186:'Wacan Berry',187:'Rindo Berry',188:'Yache Berry',
  189:'Chople Berry',190:'Kebia Berry',191:'Shuca Berry',192:'Coba Berry',
  193:'Payapa Berry',194:'Tanga Berry',195:'Charti Berry',196:'Kasib Berry',
  197:'Haban Berry',198:'Colbur Berry',199:'Babiri Berry',200:'Chilan Berry',
  201:'Liechi Berry',202:'Ganlon Berry',203:'Salac Berry',204:'Petaya Berry',
  205:'Apicot Berry',206:'Lansat Berry',207:'Starf Berry',208:'Enigma Berry',
  209:'Micle Berry',210:'Custap Berry',211:'Jaboca Berry',212:'Rowap Berry',
};
// Battle held items — Gen 4 Platinum IDs (verified from Bulbapedia)
const SAV_ITEM_HELD = {
  0:'None',
  // Scope Lens, Shell Bell, Metal Coat etc. (210-219)
  210:'Scope Lens',211:'Metal Coat',212:'Dragon Scale',213:'Up-Grade',
  214:"King's Rock",215:'Silver Powder',216:'Amulet Coin',217:'Cleanse Tag',
  218:'Soul Dew',219:'Deep Sea Tooth',
  // 220+ — main battle held items
  220:'Choice Band',221:'Deep Sea Scale',222:'Smoke Ball',223:'Everstone',
  224:'Focus Band',225:'Lucky Egg',226:'Scope Lens',227:'Metal Coat',
  228:'Bright Powder',229:'White Herb',230:'Macho Brace',231:'Exp. Share',
  232:'Quick Claw',233:'Soothe Bell',234:'Leftovers',235:'Dragon Scale',
  236:'Light Ball',237:'Soft Sand',238:'Hard Stone',239:'Miracle Seed',
  240:'Black Glasses',241:'Black Belt',242:'Magnet',243:'Mystic Water',
  244:'Sharp Beak',245:'Poison Barb',246:'Never-Melt Ice',247:'Spell Tag',
  248:'Twisted Spoon',249:'Charcoal',250:'Dragon Fang',251:'Silk Scarf',
  252:'Up-Grade',253:'Shell Bell',254:'Sea Incense',255:'Lax Incense',
  256:'Lucky Punch',257:'Metal Powder',258:'Thick Club',259:'Stick',
  260:'Red Scarf',261:'Blue Scarf',262:'Pink Scarf',263:'Green Scarf',
  264:'Yellow Scarf',265:'Wide Lens',266:'Muscle Band',267:'Wise Glasses',
  268:'Expert Belt',269:'Light Clay',270:'Life Orb',271:'Power Herb',
  272:'Toxic Orb',273:'Flame Orb',274:'Quick Powder',275:'Focus Sash',
  276:'Zoom Lens',277:'Metronome',278:'Iron Ball',279:'Lagging Tail',
  280:'Destiny Knot',281:'Black Sludge',282:'Icy Rock',283:'Smooth Rock',
  284:'Heat Rock',285:'Damp Rock',286:'Grip Claw',287:'Choice Scarf',
  288:'Sticky Barb',289:'Power Bracer',290:'Power Belt',291:'Power Lens',
  292:'Power Band',293:'Power Anklet',294:'Power Weight',295:'Shed Shell',
  296:'Big Root',297:'Choice Specs',298:'Flame Plate',299:'Splash Plate',
  300:'Zap Plate',301:'Meadow Plate',302:'Icicle Plate',303:'Fist Plate',
  304:'Toxic Plate',305:'Earth Plate',306:'Sky Plate',307:'Mind Plate',
  308:'Insect Plate',309:'Stone Plate',310:'Spooky Plate',311:'Draco Plate',
  312:'Dread Plate',313:'Iron Plate',314:'Odd Incense',315:'Rock Incense',
  316:'Full Incense',317:'Wave Incense',318:'Rose Incense',319:'Luck Incense',
  320:'Pure Incense',321:'Razor Claw',322:'Razor Fang',323:'Electirizer',
  324:'Magmarizer',325:'Dubious Disc',326:'Protector',327:'Reaper Cloth',
};
// Merge into single lookup
Object.assign(SAV_ITEMS, SAV_ITEM_BERRIES, SAV_ITEM_HELD);

// Species names indexed by national dex ID (0 = empty, 1 = Bulbasaur, ...)
// Names match POKEMON_DATA keys in data.js
const SAV_SPECIES = ['','Bulbasaur','Ivysaur','Venusaur','Charmander','Charmeleon','Charizard','Squirtle','Wartortle','Blastoise','Caterpie','Metapod','Butterfree','Weedle','Kakuna','Beedrill','Pidgey','Pidgeotto','Pidgeot','Rattata','Raticate','Spearow','Fearow','Ekans','Arbok','Pikachu','Raichu','Sandshrew','Sandslash','Nidoran_F','Nidorina','Nidoqueen','Nidoran_M','Nidorino','Nidoking','Clefairy','Clefable','Vulpix','Ninetales','Jigglypuff','Wigglytuff','Zubat','Golbat','Oddish','Gloom','Vileplume','Paras','Parasect','Venonat','Venomoth','Diglett','Dugtrio','Meowth','Persian','Psyduck','Golduck','Mankey','Primeape','Growlithe','Arcanine','Poliwag','Poliwhirl','Poliwrath','Abra','Kadabra','Alakazam','Machop','Machoke','Machamp','Bellsprout','Weepinbell','Victreebel','Tentacool','Tentacruel','Geodude','Graveler','Golem','Ponyta','Rapidash','Slowpoke','Slowbro','Magnemite','Magneton','Farfetchd','Doduo','Dodrio','Seel','Dewgong','Grimer','Muk','Shellder','Cloyster','Gastly','Haunter','Gengar','Onix','Drowzee','Hypno','Krabby','Kingler','Voltorb','Electrode','Exeggcute','Exeggutor','Cubone','Marowak','Hitmonlee','Hitmonchan','Lickitung','Koffing','Weezing','Rhyhorn','Rhydon','Chansey','Tangela','Kangaskhan','Horsea','Seadra','Goldeen','Seaking','Staryu','Starmie','Mr_Mime','Scyther','Jynx','Electabuzz','Magmar','Pinsir','Tauros','Magikarp','Gyarados','Lapras','Ditto','Eevee','Vaporeon','Jolteon','Flareon','Porygon','Omanyte','Omastar','Kabuto','Kabutops','Aerodactyl','Snorlax','Articuno','Zapdos','Moltres','Dratini','Dragonair','Dragonite','Mewtwo','Mew','Chikorita','Bayleef','Meganium','Cyndaquil','Quilava','Typhlosion','Totodile','Croconaw','Feraligatr','Sentret','Furret','Hoothoot','Noctowl','Ledyba','Ledian','Spinarak','Ariados','Crobat','Chinchou','Lanturn','Pichu','Cleffa','Igglybuff','Togepi','Togetic','Natu','Xatu','Mareep','Flaaffy','Ampharos','Bellossom','Marill','Azumarill','Sudowoodo','Politoed','Hoppip','Skiploom','Jumpluff','Aipom','Sunkern','Sunflora','Yanma','Wooper','Quagsire','Espeon','Umbreon','Murkrow','Slowking','Misdreavus','Unown','Wobbuffet','Girafarig','Pineco','Forretress','Dunsparce','Gligar','Steelix','Snubbull','Granbull','Qwilfish','Scizor','Shuckle','Heracross','Sneasel','Teddiursa','Ursaring','Slugma','Magcargo','Swinub','Piloswine','Corsola','Remoraid','Octillery','Delibird','Mantine','Skarmory','Houndour','Houndoom','Kingdra','Phanpy','Donphan','Porygon2','Stantler','Smeargle','Tyrogue','Hitmontop','Smoochum','Elekid','Magby','Miltank','Blissey','Raikou','Entei','Suicune','Larvitar','Pupitar','Tyranitar','Lugia','Ho_Oh','Celebi','Treecko','Grovyle','Sceptile','Torchic','Combusken','Blaziken','Mudkip','Marshtomp','Swampert','Poochyena','Mightyena','Zigzagoon','Linoone','Wurmple','Silcoon','Beautifly','Cascoon','Dustox','Lotad','Lombre','Ludicolo','Seedot','Nuzleaf','Shiftry','Taillow','Swellow','Wingull','Pelipper','Ralts','Kirlia','Gardevoir','Surskit','Masquerain','Shroomish','Breloom','Slakoth','Vigoroth','Slaking','Nincada','Ninjask','Shedinja','Whismur','Loudred','Exploud','Makuhita','Hariyama','Azurill','Nosepass','Skitty','Delcatty','Sableye','Mawile','Aron','Lairon','Aggron','Meditite','Medicham','Electrike','Manectric','Plusle','Minun','Volbeat','Illumise','Roselia','Gulpin','Swalot','Carvanha','Sharpedo','Wailmer','Wailord','Numel','Camerupt','Torkoal','Spoink','Grumpig','Spinda','Trapinch','Vibrava','Flygon','Cacnea','Cacturne','Swablu','Altaria','Zangoose','Seviper','Lunatone','Solrock','Barboach','Whiscash','Corphish','Crawdaunt','Baltoy','Claydol','Lileep','Cradily','Anorith','Armaldo','Feebas','Milotic','Castform','Kecleon','Shuppet','Banette','Duskull','Dusclops','Tropius','Chimecho','Absol','Wynaut','Snorunt','Glalie','Spheal','Sealeo','Walrein','Clamperl','Huntail','Gorebyss','Relicanth','Luvdisc','Bagon','Shelgon','Salamence','Beldum','Metang','Metagross','Regirock','Regice','Registeel','Latias','Latios','Kyogre','Groudon','Rayquaza','Jirachi','Deoxys','Turtwig','Grotle','Torterra','Chimchar','Monferno','Infernape','Piplup','Prinplup','Empoleon','Starly','Staravia','Staraptor','Bidoof','Bibarel','Kricketot','Kricketune','Shinx','Luxio','Luxray','Budew','Roserade','Cranidos','Rampardos','Shieldon','Bastiodon','Burmy','Wormadam','Mothim','Combee','Vespiquen','Pachirisu','Buizel','Floatzel','Cherubi','Cherrim','Shellos','Gastrodon','Ambipom','Drifloon','Drifblim','Buneary','Lopunny','Mismagius','Honchkrow','Glameow','Purugly','Chingling','Stunky','Skuntank','Bronzor','Bronzong','Bonsly','Mime_Jr','Happiny','Chatot','Spiritomb','Gible','Gabite','Garchomp','Munchlax','Riolu','Lucario','Hippopotas','Hippowdon','Skorupi','Drapion','Croagunk','Toxicroak','Carnivine','Finneon','Lumineon','Mantyke','Snover','Abomasnow','Weavile','Magnezone','Lickilicky','Rhyperior','Tangrowth','Electivire','Magmortar','Togekiss','Yanmega','Leafeon','Glaceon','Gliscor','Mamoswine','Porygon_Z','Gallade','Probopass','Dusknoir','Froslass','Rotom','Uxie','Mesprit','Azelf','Dialga','Palkia','Heatran','Regigigas','Giratina','Cresselia','Phione','Manaphy','Darkrai','Shaymin','Arceus'];

// Growth rates per national dex ID (same indexing as SAV_SPECIES)
// 0=MedFast, 1=Erratic, 2=Fluctuating, 3=MedSlow, 4=Fast, 5=Slow
const SAV_GROWTHS = [0,3,3,3,3,3,3,3,3,3,4,4,4,0,0,0,3,3,3,4,4,0,0,0,0,0,0,0,0,3,3,3,3,3,3,0,0,0,0,4,4,0,0,3,3,3,4,4,0,0,0,0,0,0,0,0,0,0,5,5,3,3,3,3,3,3,3,3,3,3,3,3,5,5,3,3,3,0,0,0,0,0,0,4,0,0,0,0,0,0,5,5,3,3,3,0,4,4,0,0,0,0,0,0,0,0,0,0,0,0,0,5,5,4,0,0,0,0,4,4,5,5,0,0,0,0,0,5,0,5,5,5,0,0,0,0,0,0,0,0,0,0,5,5,5,5,5,5,5,5,5,3,3,3,3,3,3,3,3,3,3,4,4,0,0,4,4,4,4,0,4,4,0,0,4,0,0,0,0,3,3,3,3,0,0,4,3,3,3,3,4,3,3,0,0,0,0,0,3,0,0,0,0,4,0,0,4,3,0,4,4,4,0,3,5,3,0,0,4,4,5,5,4,0,0,4,0,5,5,5,0,0,0,0,4,4,0,0,0,0,0,0,4,5,5,5,5,5,5,5,5,3,3,3,3,3,3,3,3,3,3,4,4,0,0,4,4,4,4,4,3,3,3,3,3,3,3,3,0,0,5,5,5,0,0,0,0,5,5,5,0,0,0,3,3,3,4,4,0,0,4,4,3,4,5,5,5,0,0,5,5,4,4,4,4,3,4,4,5,5,4,4,4,4,0,4,4,4,3,3,3,3,3,0,0,4,4,4,4,0,0,0,0,0,0,4,4,4,4,0,0,4,3,4,4,4,4,4,4,3,0,0,0,3,3,3,1,1,1,4,4,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,3,3,3,3,3,3,3,3,3,3,3,3,0,0,4,4,3,3,3,3,3,1,1,4,4,4,4,4,3,3,4,0,0,4,4,0,0,4,4,4,0,0,0,3,4,4,4,0,0,0,0,4,0,4,3,0,5,5,5,5,3,3,5,5,5,5,0,0,4,1,1,0,5,5,3,0,0,5,0,0,0,0,0,0,0,3,5,0,5,0,4,0,0,5,5,5,5,5,5,5,5,5,5,5,5,3,5];

// Move names indexed by Gen 4 move ID
const SAV_MOVES = ['','Pound','Karate Chop','Double Slap','Comet Punch','Mega Punch','Pay Day','Fire Punch','Ice Punch','Thunder Punch','Scratch','Vise Grip','Guillotine','Razor Wind','Swords Dance','Cut','Gust','Wing Attack','Whirlwind','Fly','Bind','Slam','Vine Whip','Stomp','Double Kick','Mega Kick','Jump Kick','Rolling Kick','Sand-Attack','Headbutt','Horn Attack','Fury Attack','Horn Drill','Tackle','Body Slam','Wrap','Take Down','Thrash','Double-Edge','Tail Whip','Poison Sting','Twineedle','Pin Missile','Leer','Bite','Growl','Roar','Sing','Supersonic','Sonic Boom','Disable','Acid','Ember','Flamethrower','Mist','Water Gun','Hydro Pump','Surf','Ice Beam','Blizzard','Psybeam','Bubble Beam','Aurora Beam','Hyper Beam','Peck','Drill Peck','Submission','Low Kick','Counter','Seismic Toss','Strength','Absorb','Mega Drain','Leech Seed','Growth','Razor Leaf','Solar Beam','Poison Powder','Stun Spore','Sleep Powder','Petal Dance','String Shot','Dragon Rage','Fire Spin','Thunder Shock','Thunderbolt','Thunder Wave','Thunder','Rock Throw','Earthquake','Fissure','Dig','Toxic','Confusion','Psychic','Hypnosis','Meditate','Agility','Quick Attack','Rage','Teleport','Night Shade','Mimic','Screech','Double Team','Recover','Harden','Minimize','Smokescreen','Confuse Ray','Withdraw','Defense Curl','Barrier','Light Screen','Haze','Reflect','Focus Energy','Bide','Metronome','Mirror Move','Self-Destruct','Egg Bomb','Lick','Smog','Sludge','Bone Club','Fire Blast','Waterfall','Clamp','Swift','Skull Bash','Spike Cannon','Constrict','Amnesia','Kinesis','Soft Boiled','High Jump Kick','Glare','Dream Eater','Poison Gas','Barrage','Leech Life','Lovely Kiss','Sky Attack','Transform','Bubble','Dizzy Punch','Spore','Flash','Psywave','Splash','Acid Armor','Crabhammer','Explosion','Fury Swipes','Bonemerang','Rest','Rock Slide','Hyper Fang','Sharpen','Conversion','Tri Attack','Super Fang','Slash','Substitute','Struggle','Sketch','Triple Kick','Thief','Spider Web','Mind Reader','Nightmare','Flame Wheel','Snore','Curse','Flail','Conversion 2','Aeroblast','Cotton Spore','Reversal','Spite','Powder Snow','Protect','Mach Punch','Scary Face','Feint Attack','Sweet Kiss','Belly Drum','Sludge Bomb','Mud-Slap','Octazooka','Spikes','Zap Cannon','Foresight','Destiny Bond','Perish Song','Icy Wind','Detect','Bone Rush','Lock On','Outrage','Sandstorm','Giga Drain','Endure','Charm','Rollout','False Swipe','Swagger','Milk Drink','Spark','Fury Cutter','Steel Wing','Mean Look','Attract','Sleep Talk','Heal Bell','Return','Present','Frustration','Safeguard','Pain Split','Sacred Fire','Magnitude','Dynamic Punch','Megahorn','Dragon Breath','Baton Pass','Encore','Pursuit','Rapid Spin','Sweet Scent','Iron Tail','Metal Claw','Vital Throw','Morning Sun','Synthesis','Moonlight','Hidden Power','Cross Chop','Twister','Rain Dance','Sunny Day','Crunch','Mirror Coat','Psych Up','Extreme Speed','Ancient Power','Shadow Ball','Future Sight','Rock Smash','Whirlpool','Beat Up','Fake Out','Uproar','Stockpile','Spit Up','Swallow','Heat Wave','Hail','Torment','Flatter','Will-O-Wisp','Memento','Facade','Focus Punch','Smelling Salts','Follow Me','Nature Power','Charge','Taunt','Helping Hand','Trick','Role Play','Wish','Assist','Ingrain','Superpower','Magic Coat','Recycle','Revenge','Brick Break','Yawn','Knock Off','Endeavor','Eruption','Skill Swap','Imprison','Refresh','Grudge','Snatch','Secret Power','Dive','Arm Thrust','Camouflage','Tail Glow','Luster Purge','Mist Ball','Feather Dance','Teeter Dance','Blaze Kick','Mud Sport','Ice Ball','Needle Arm','Slack Off','Hyper Voice','Poison Fang','Crush Claw','Blast Burn','Hydro Cannon','Meteor Mash','Astonish','Weather Ball','Aromatherapy','Fake Tears','Air Cutter','Overheat','Odor Sleuth','Rock Tomb','Silver Wind','Metal Sound','Grass Whistle','Tickle','Cosmic Power','Water Spout','Signal Beam','Shadow Punch','Extrasensory','Sky Uppercut','Sand Tomb','Sheer Cold','Muddy Water','Bullet Seed','Aerial Ace','Icicle Spear','Iron Defense','Block','Howl','Dragon Claw','Frenzy Plant','Bulk Up','Bounce','Mud Shot','Poison Tail','Covet','Volt Tackle','Magical Leaf','Water Sport','Calm Mind','Leaf Blade','Dragon Dance','Rock Blast','Shock Wave','Water Pulse','Doom Desire','Psycho Boost','Roost','Gravity','Miracle Eye','Wake-Up Slap','Hammer Arm','Gyro Ball','Healing Wish','Brine','Natural Gift','Feint','Pluck','Tailwind','Acupressure','Metal Burst','U-turn','Close Combat','Payback','Assurance','Embargo','Fling','Psycho Shift','Trump Card','Heal Block','Wring Out','Power Trick','Gastro Acid','Lucky Chant','Me First','Copycat','Power Swap','Guard Swap','Punishment','Last Resort','Worry Seed','Sucker Punch','Toxic Spikes','Heart Swap','Aqua Ring','Magnet Rise','Flare Blitz','Force Palm','Aura Sphere','Rock Polish','Poison Jab','Dark Pulse','Night Slash','Aqua Tail','Seed Bomb','Air Slash','X-Scissor','Bug Buzz','Dragon Pulse','Dragon Rush','Power Gem','Drain Punch','Vacuum Wave','Focus Blast','Energy Ball','Brave Bird','Earth Power','Switcheroo','Giga Impact','Nasty Plot','Bullet Punch','Avalanche','Ice Shard','Shadow Claw','Thunder Fang','Ice Fang','Fire Fang','Shadow Sneak','Mud Bomb','Psycho Cut','Zen Headbutt','Mirror Shot','Flash Cannon','Rock Climb','Defog','Trick Room','Draco Meteor','Discharge','Lava Plume','Leaf Storm','Power Whip','Rock Wrecker','Cross Poison','Gunk Shot','Iron Head','Magnet Bomb','Stone Edge','Captivate','Stealth Rock','Grass Knot','Chatter','Judgment','Bug Bite','Charge Beam','Wood Hammer','Aqua Jet','Attack Order','Defend Order','Heal Order','Head Smash','Double Hit','Roar Of Time','Spacial Rend','Lunar Dance','Crush Grip','Magma Storm','Dark Void','Seed Flare','Ominous Wind','Shadow Force'];

// ============================================================
// DECRYPTION
// ============================================================

function savDecryptData(encryptedData, seed, wordCount) {
  const decryptedData = [];
  let X = BigInt(seed);
  for (let i = 0; i < wordCount; i++) {
    X = BigInt(0x41C64E6D) * X + BigInt(0x6073);
    const prng = Number((X >> 16n) & 0xFFFFn);
    decryptedData.push((encryptedData[i] ^ prng) & 0xFFFF);
  }
  return decryptedData;
}

// ============================================================
// LEVEL FROM EXP
// ============================================================

function savExpForLevel(lv, gr) {
  const n = lv;
  switch (gr) {
    case 0: return n * n * n;  // Medium Fast
    case 1: {  // Erratic
      if (n <= 50) return Math.floor(n * n * n * (100 - n) / 50);
      if (n <= 68) return Math.floor(n * n * n * (150 - n) / 100);
      if (n <= 98) return Math.floor(n * n * n * Math.floor((1911 - 10 * n) / 3) / 500);
      return Math.floor(n * n * n * (160 - n) / 100);
    }
    case 2: {  // Fluctuating
      if (n <= 15) return Math.floor(n * n * n * (Math.floor((n + 1) / 3) + 24) / 50);
      if (n <= 36) return Math.floor(n * n * n * (n + 14) / 50);
      return Math.floor(n * n * n * (Math.floor(n / 2) + 32) / 50);
    }
    case 3: return Math.max(0, Math.floor(6 / 5 * n * n * n - 15 * n * n + 100 * n - 140));  // Medium Slow
    case 4: return Math.floor(4 * n * n * n / 5);  // Fast
    case 5: return Math.floor(5 * n * n * n / 4);  // Slow
    default: return n * n * n;
  }
}

function savLevelFromExp(exp, gr) {
  if (exp <= 0) return 1;
  for (let lv = 100; lv >= 2; lv--) {
    if (exp >= savExpForLevel(lv, gr)) return lv;
  }
  return 1;
}

// ============================================================
// READ HELPERS
// ============================================================

function savRead32(view, offset) {
  return ((view[offset] | (view[offset+1] << 8) | (view[offset+2] << 16) | (view[offset+3] << 24)) >>> 0);
}

// ============================================================
// PARSE INDIVIDUAL PKM (136-byte box slot)
// ============================================================

function savParsePKM(chunk) {
  // PID is first 4 bytes (little-endian, treated as unsigned)
  const pid = ((chunk[0] | (chunk[1] << 8) | (chunk[2] << 16) | (chunk[3] << 24)) >>> 0);

  // Empty slot: PID of 0 means no Pokemon
  if (pid === 0) return null;

  // Checksum at bytes 6-7
  const checksum = chunk[6] | (chunk[7] << 8);

  // 128 bytes of encrypted data starting at offset 8
  const encrypted = [];
  for (let j = 0; j < 128; j += 2) {
    encrypted.push(chunk[j + 8] | (chunk[j + 9] << 8));
  }

  // Decrypt 64 words using checksum as PRNG seed
  const dec = savDecryptData(encrypted, checksum, 64);

  // Determine block order from PID
  const shiftVal = ((pid >>> 0) & 0x3E000) >> 13;
  const shiftIdx = shiftVal % 24;
  const order = SAV_BLOCK_ORDERS[shiftIdx];

  // Substruct offsets in words (each substruct = 16 words)
  const gOff = order.indexOf(0) * 16;  // Growth (species, item, exp, etc.)
  const aOff = order.indexOf(1) * 16;  // Attacks (moves, IVs)

  // Species
  const speciesId = dec[gOff];
  if (!speciesId || speciesId === 0) return null;

  const name = SAV_SPECIES[speciesId] || `Poke#${speciesId}`;

  // Item
  const itemId = dec[gOff + 1];
  const item = SAV_ITEMS[itemId] || (itemId > 0 ? `Item#${itemId}` : 'None');

  // EXP (32-bit: words 4-5 of growth substruct)
  const exp = (((dec[gOff + 5] << 16) | (dec[gOff + 4] & 0xFFFF)) >>> 0);

  // Growth rate
  const gr = (speciesId < SAV_GROWTHS.length) ? SAV_GROWTHS[speciesId] : 0;
  const level = savLevelFromExp(exp, gr);

  // EVs (packed into 3 words starting at gOff+8)
  const evHp  = dec[gOff + 8] & 0xFF;
  const evAtk = (dec[gOff + 8] >> 8) & 0xFF;
  const evDef = dec[gOff + 9] & 0xFF;
  const evSpe = (dec[gOff + 9] >> 8) & 0xFF;
  const evSpa = dec[gOff + 10] & 0xFF;
  const evSpd = (dec[gOff + 10] >> 8) & 0xFF;

  // Ability ID (byte at gOff+6 high byte)
  const abilityId = (dec[gOff + 6] >> 8) & 0xFF;
  const ability = SAV_ABILITIES[abilityId] || '';

  // Moves (first 4 words of attack substruct — 16-bit move IDs)
  const moves = [];
  for (let m = 0; m < 4; m++) {
    const moveId = dec[aOff + m];
    const moveName = SAV_MOVES[moveId] || '';
    if (moveName) moves.push(moveName);
  }

  // IVs: packed 30 bits in words aOff+8 (low 16) and aOff+9 (high 16)
  const ivRaw = ((dec[aOff + 9] << 16) | (dec[aOff + 8] & 0xFFFF)) >>> 0;
  const ivHp  = (ivRaw)        & 0x1F;
  const ivAtk = (ivRaw >>> 5)  & 0x1F;
  const ivDef = (ivRaw >>> 10) & 0x1F;
  const ivSpe = (ivRaw >>> 15) & 0x1F;
  const ivSpa = (ivRaw >>> 20) & 0x1F;
  const ivSpd = (ivRaw >>> 25) & 0x1F;

  // Nature from PID
  const nature = SAV_NATURES[Math.abs(pid >>> 0) % 25];

  return {
    name,
    level,
    nature,
    ability,
    item,
    moves,
    ivs: { hp: ivHp, atk: ivAtk, def: ivDef, spa: ivSpa, spd: ivSpd, spe: ivSpe },
    evs: { hp: evHp, atk: evAtk, def: evDef, spa: evSpa, spd: evSpd, spe: evSpe },
    status: 'Healthy',
  };
}

// ============================================================
// MAIN ENTRY POINT: parseSavFile(arrayBuffer) -> [{...}, ...]
// Returns array of parsed box Pokemon objects (skips empty slots)
// ============================================================

function parseSavFile(arrayBuffer) {
  const view = new Uint8Array(arrayBuffer);

  // Platinum offsets
  const smallBlockSize = 0xCF2C;
  let boxDataOffset = 0xCF30;

  // Block selection: compare save counters at smallBlockSize-16 and smallBlockSize+0x40000-16
  const sc1 = savRead32(view, smallBlockSize - 16);
  const sc2 = savRead32(view, smallBlockSize + 0x40000 - 16);

  let smallBlockStart = 0;
  let blockId;

  if (sc2 > sc1) {
    smallBlockStart = 0x40000;
    blockId = savRead32(view, smallBlockSize + 0x40000 - 20);
  } else {
    blockId = savRead32(view, smallBlockSize - 20);
  }

  // Big block selection for box data
  const bigBlockSize = 0x121E4;
  const bigBlockStart1 = boxDataOffset - 4;
  const block1Id = savRead32(view, bigBlockStart1 + bigBlockSize - 20);

  if (block1Id !== blockId) {
    boxDataOffset += 0x40000;
  }

  // Read 510 box slots (17 boxes × 30), 136 bytes each
  const boxMons = [];
  let offset = boxDataOffset;
  const CHUNK = 136;
  const TOTAL = 510;

  for (let i = 0; i < TOTAL; i++) {
    const chunk = view.slice(offset, offset + CHUNK);
    const mon = savParsePKM(chunk);
    if (mon) boxMons.push(mon);
    offset += CHUNK;
  }

  return boxMons;
}
