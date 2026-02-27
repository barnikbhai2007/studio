
export type RarityType = 'IRON' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND' | 'MASTER' | 'GRANDMASTER' | 'LEGENDARY';

export interface Footballer {
  id: string;
  name: string;
  countryCode: string; 
  position: string;
  club: string;
  hints: string[];
  version: 'DEMO' | 'FDv1.0';
}

export const RARITIES: { type: RarityType; bg: string; weight: number }[] = [
  { type: 'IRON', bg: 'from-slate-500 to-slate-800', weight: 17 },
  { type: 'BRONZE', bg: 'from-orange-700 to-orange-950', weight: 16 },
  { type: 'SILVER', bg: 'from-slate-300 to-slate-500', weight: 15 },
  { type: 'GOLD', bg: 'from-yellow-400 via-amber-500 to-yellow-600', weight: 13 },
  { type: 'PLATINUM', bg: 'from-cyan-400 to-blue-600', weight: 12 },
  { type: 'DIAMOND', bg: 'from-blue-400 via-indigo-500 to-purple-600', weight: 10 },
  { type: 'MASTER', bg: 'from-purple-600 to-fuchsia-900', weight: 9 },
  { type: 'GRANDMASTER', bg: 'from-red-600 to-red-950', weight: 5 },
  { type: 'LEGENDARY', bg: 'from-yellow-300 via-yellow-500 to-orange-500', weight: 3 }
];

export const getRandomRarity = () => {
  const totalWeight = RARITIES.reduce((acc, r) => acc + r.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const rarity of RARITIES) {
    if (random < rarity.weight) return rarity;
    random -= rarity.weight;
  }
  return RARITIES[0];
};

// --- STARTER PACK (DEMO) ---
const DEMO_PLAYERS: Footballer[] = [
  { id: '1', name: 'Lionel Messi', countryCode: 'ar', position: 'RW', club: 'Inter Miami', hints: ["Record 8 Ballon d'Ors.", "Barcelona legend.", "2022 World Cup winner.", "'La Pulga'.", "Inter Miami star."], version: 'DEMO' },
  { id: '2', name: 'Cristiano Ronaldo', countryCode: 'pt', position: 'ST', club: 'Al Nassr', hints: ["International top scorer.", "5 Champions Leagues.", "Man Utd & Real Madrid icon.", "'Siu' celebration.", "Plays for Al Nassr."], version: 'DEMO' },
  { id: '3', name: 'Kylian Mbappé', countryCode: 'fr', position: 'ST', club: 'Real Madrid', hints: ["Hat-trick in 2022 Final.", "PSG top scorer.", "2018 World Cup winner.", "Fastest in the world.", "Real Madrid player."], version: 'DEMO' },
  { id: '4', name: 'Erling Haaland', countryCode: 'no', position: 'ST', club: 'Man City', hints: ["PL goal record breaker.", "The 'Cyborg'.", "Ex-Dortmund.", "Father played for City.", "Norway striker."], version: 'DEMO' },
  { id: '5', name: 'Son Heung-min', countryCode: 'kr', position: 'LW', club: 'Tottenham', hints: ["Asian PL top scorer.", "Golden Boot 21-22.", "Spurs captain.", "Puskas winner.", "Korea's superstar."], version: 'DEMO' },
  { id: '6', name: 'Harry Kane', countryCode: 'gb-eng', position: 'ST', club: 'Bayern', hints: ["England top scorer.", "Ex-Spurs hero.", "Moved to Germany.", "Elite finisher.", "Wears number 9."], version: 'DEMO' },
  { id: '7', name: 'Casemiro', countryCode: 'br', position: 'CDM', club: 'Man Utd', hints: ["Defensive wall.", "5 UCL titles with Real.", "Brazil hardman.", "Plays in midfield.", "Current Man Utd player."], version: 'DEMO' },
  { id: '8', name: 'Nicolas Jackson', countryCode: 'sn', position: 'ST', club: 'Chelsea', hints: ["Senegal striker.", "Plays for Chelsea.", "Moved from Villarreal.", "Young talent.", "Speedy attacker."], version: 'DEMO' },
  { id: '9', name: 'Richarlison', countryCode: 'br', position: 'ST', club: 'Spurs', hints: ["The 'Pigeon'.", "Brazil number 9.", "Scored worldie in WC 2022.", "Spurs striker.", "Ex-Everton."], version: 'DEMO' },
  { id: '10', name: 'Luka Modric', countryCode: 'hr', position: 'CM', club: 'Real Madrid', hints: ["2018 Ballon d'Or.", "Croatia captain.", "Midfield maestro.", "6 UCL titles.", "Trivela specialist."], version: 'DEMO' },
  { id: '11', name: 'Antony', countryCode: 'br', position: 'RW', club: 'Man Utd', hints: ["Spin move specialist.", "Ex-Ajax winger.", "Expensive transfer.", "Plays for United.", "Brazil winger."], version: 'DEMO' },
  { id: '12', name: 'Darwin Nunez', countryCode: 'uy', position: 'ST', club: 'Liverpool', hints: ["Uruguay forward.", "Chaotic energy.", "Liverpool striker.", "Ex-Benfica.", "Highly athletic."], version: 'DEMO' },
  { id: '13', name: 'Bernardo Silva', countryCode: 'pt', position: 'CM', club: 'Man City', hints: ["Workhorse.", "City playmaker.", "Portuguese star.", "Incredible dribbling.", "Left footed."], version: 'DEMO' },
  { id: '16', name: 'Harry Maguire', countryCode: 'gb-eng', position: 'CB', club: 'Man Utd', hints: ["Big head nickname.", "England CB.", "United defender.", "Dominant in air.", "Sheffield born."], version: 'DEMO' },
  { id: '17', name: 'Kai Havertz', countryCode: 'de', position: 'ST', club: 'Arsenal', hints: ["Chelsea UCL winner.", "German attacker.", "Plays for Arsenal.", "Versatile player.", "Ex-Leverkusen."], version: 'DEMO' },
  { id: '18', name: 'Declan Rice', countryCode: 'gb-eng', position: 'CDM', club: 'Arsenal', hints: ["Ex-West Ham captain.", "Arsenal anchor.", "England midfielder.", "Elite ball recovery.", "High energy."], version: 'DEMO' },
  { id: '19', name: 'Neymar Jr', countryCode: 'br', position: 'LW', club: 'Al Hilal', hints: ["World record fee.", "Skill move king.", "Brazil's main man.", "Ex-Barca & PSG.", "Plays in Saudi."], version: 'DEMO' },
  { id: '20', name: 'Timo Werner', countryCode: 'de', position: 'LW', club: 'Spurs', hints: ["Fast runner.", "Ex-Chelsea & Leipzig.", "German forward.", "Plays for Spurs.", "Speedster."], version: 'DEMO' }
];

// --- SEASON 1 PACK (FDv1.0) ---
// BROKENAQUA: Add your Season 1 players here!
const SEASON_1_PLAYERS: Footballer[] = [
  { id: '14', name: 'Zinedine Zidane', countryCode: 'fr', position: 'CAM', club: 'Icon', hints: ["1998 WC winner.", "Madrid icon.", "Legendary volley.", "'Zizou'.", "Elite ball control."], version: 'FDv1.0' },
  { id: '15', name: 'Pele', countryCode: 'br', position: 'ST', club: 'Icon', hints: ["3 World Cups.", "1000+ goals.", "Santos legend.", "FIFA player of century.", "The King."], version: 'FDv1.0' },
  { id: '21', name: 'Ronaldinho', countryCode: 'br', position: 'LW', club: 'Icon', hints: ["Joga Bonito icon.", "Always smiling.", "Barca & Milan legend.", "The 'Elastico' king.", "2002 World Cup winner."], version: 'FDv1.0' },
  { id: '22', name: 'Robert Lewandowski', countryCode: 'pl', position: 'ST', club: 'Barcelona', hints: ["Bayern Munich legend.", "Poland top scorer.", "Goal machine.", "The 'Body' nickname.", "Moved to Barcelona in 2022."], version: 'FDv1.0' },
  { id: '23', name: 'Kevin De Bruyne', countryCode: 'be', position: 'CM', club: 'Man City', hints: ["Assist king.", "Belgian maestro.", "Man City captain.", "Visionary passing.", "Ex-Chelsea & Wolfsburg."], version: 'FDv1.0' },
  { id: '24', name: 'Mohamed Salah', countryCode: 'eg', position: 'RW', club: 'Liverpool', hints: ["The Egyptian King.", "Liverpool goalscorer.", "Puskas winner.", "African legend.", "Ex-Chelsea & Roma."], version: 'FDv1.0' },
  { id: '25', name: 'Karim Benzema', countryCode: 'fr', position: 'ST', club: 'Al Ittihad', hints: ["2022 Ballon d'Or.", "Real Madrid legend.", "French striker.", "9 seasons with CR7.", "Plays in Saudi Arabia."], version: 'FDv1.0' },
  { id: '26', name: 'Vinícius Júnior', countryCode: 'br', position: 'LW', club: 'Real Madrid', hints: ["Real Madrid talisman.", "Scored in 2022 & 2024 UCL finals.", "Dynamic Brazilian winger.", "Known for elite dribbling.", "Number 7 icon."], version: 'FDv1.0' },
  { id: '27', name: 'Jude Bellingham', countryCode: 'gb-eng', position: 'CAM', club: 'Real Madrid', hints: ["English golden boy.", "Golden Boy 2023.", "Real Madrid's goal-scoring midfielder.", "Ex-Dortmund & Birmingham.", "Open arms celebration."], version: 'FDv1.0' },
  { id: '28', name: 'Phil Foden', countryCode: 'gb-eng', position: 'RW', club: 'Man City', hints: ["Stockport Iniesta.", "PL Player of the Season 23/24.", "City homegrown hero.", "Elite technical ability.", "Three Lions creative hub."], version: 'FDv1.0' },
  { id: '29', name: 'Bukayo Saka', countryCode: 'gb-eng', position: 'RW', club: 'Arsenal', hints: ["Starboy.", "Arsenal's main winger.", "England's constant threat.", "Hale End graduate.", "Left-footed magician."], version: 'FDv1.0' },
  { id: '30', name: 'Jamal Musiala', countryCode: 'de', position: 'CAM', club: 'Bayern', hints: ["Germany's rising gem.", "Magic Musiala.", "Bayern Munich playmaker.", "Incredible close control.", "Ex-Chelsea academy."], version: 'FDv1.0' },
  { id: '31', name: 'Lamine Yamal', countryCode: 'es', position: 'RW', club: 'Barcelona', hints: ["Youngest ever Euro scorer.", "Barca's new prodigy.", "Left-footed winger.", "La Masia graduate.", "Breakout star of Euro 2024."], version: 'FDv1.0' },
  { id: '32', name: 'Antoine Griezmann', countryCode: 'fr', position: 'ST', club: 'Atletico', hints: ["Atleti's all-time scorer.", "2018 World Cup winner.", "Versatile attacker.", "Ex-Barcelona.", "Known for his work rate."], version: 'FDv1.0' },
  { id: '33', name: 'David Beckham', countryCode: 'gb-eng', position: 'RM', club: 'Icon', hints: ["Free-kick specialist.", "Man Utd Class of '92.", "Real Madrid Galactico.", "Global fashion icon.", "Golden balls."], version: 'FDv1.0' },
  { id: '34', name: 'Diego Maradona', countryCode: 'ar', position: 'CAM', club: 'Icon', hints: ["'Hand of God' goal.", "Napoli legend.", "1986 World Cup winner.", "Dribbling genius.", "The Golden Boy of Argentina."], version: 'FDv1.0' },
  { id: '35', name: 'Gianluigi Buffon', countryCode: 'it', position: 'GK', club: 'Icon', hints: ["Goalkeeping legend.", "2006 World Cup winner.", "Juventus icon.", "Longevity record holder.", "Safe hands."], version: 'FDv1.0' },
  { id: '36', name: 'Luis Suarez', countryCode: 'uy', position: 'ST', club: 'Inter Miami', hints: ["Uruguay's top scorer.", "Ex-Barca & Liverpool.", "El Pistolero.", "European Golden Shoe winner.", "Plays with Messi in Miami."], version: 'FDv1.0' },
  { id: '37', name: 'Virgil van Dijk', countryCode: 'nl', position: 'CB', club: 'Liverpool', hints: ["Liverpool captain.", "Dutch defensive giant.", "Ex-Celtic & Southampton.", "Ballon d'Or runner up.", "Elite positioning."], version: 'FDv1.0' },
  { id: '38', name: 'Alisson Becker', countryCode: 'br', position: 'GK', club: 'Liverpool', hints: ["Brazil's number one.", "Liverpool's brick wall.", "Scored a header vs West Brom.", "Golden Glove winner.", "Ex-Roma."], version: 'FDv1.0' },
  { id: '39', name: 'Angel Di Maria', countryCode: 'ar', position: 'RW', club: 'Benfica', hints: ["Scored in 2022 WC Final.", "Real Madrid UCL winner.", "The 'Noodle'.", "Left-footed playmaker.", "Ex-PSG & Man Utd."], version: 'FDv1.0' },
  { id: '40', name: 'Thierry Henry', countryCode: 'fr', position: 'ST', club: 'Icon', hints: ["Arsenal's King.", "Invincibles legend.", "Top PL goalscorer.", "Vava-voom.", "Ex-Barca & Monaco."], version: 'FDv1.0' }
];

export const FOOTBALLERS: Footballer[] = [...DEMO_PLAYERS, ...SEASON_1_PLAYERS];

export function getRandomFootballer(excludeIds: string[] = [], version: string = 'All'): Footballer {
  let pool = FOOTBALLERS;
  
  if (version !== 'All') {
    pool = FOOTBALLERS.filter(f => f.version === version);
  }

  const available = pool.filter(f => !excludeIds.includes(f.id));
  
  if (available.length === 0) {
    return pool[Math.floor(Math.random() * pool.length)];
  }

  return available[Math.floor(Math.random() * available.length)];
}
