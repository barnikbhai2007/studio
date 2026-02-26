export type RarityType = 'IRON' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND' | 'MASTER' | 'GRANDMASTER' | 'LEGENDARY';

export interface Footballer {
  id: string;
  name: string;
  countryCode: string; 
  position: string;
  club: string;
  hints: string[];
  version: 'DEMO' | 'FDv0.1';
}

export const RARITIES: { type: RarityType; bg: string; weight: number }[] = [
  { type: 'IRON', bg: 'from-slate-500 to-slate-800', weight: 70 },
  { type: 'BRONZE', bg: 'from-orange-700 to-orange-950', weight: 55 },
  { type: 'SILVER', bg: 'from-slate-300 to-slate-500', weight: 40 },
  { type: 'GOLD', bg: 'from-yellow-400 via-amber-500 to-yellow-600', weight: 30 },
  { type: 'PLATINUM', bg: 'from-cyan-400 to-blue-600', weight: 20 },
  { type: 'DIAMOND', bg: 'from-blue-400 via-indigo-500 to-purple-600', weight: 10 },
  { type: 'MASTER', bg: 'from-purple-600 to-fuchsia-900', weight: 5 },
  { type: 'GRANDMASTER', bg: 'from-red-600 to-red-950', weight: 3 },
  { type: 'LEGENDARY', bg: 'from-yellow-300 via-yellow-500 to-orange-500', weight: 2 }
];

export const getRandomRarity = () => {
  const totalWeight = RARITIES.reduce((sum, r) => sum + r.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const rarity of RARITIES) {
    if (random < rarity.weight) return rarity;
    random -= rarity.weight;
  }
  return RARITIES[0];
};

export const FOOTBALLERS: Footballer[] = [
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
  { id: '14', name: 'Zinedine Zidane', countryCode: 'fr', position: 'CAM', club: 'Icon', hints: ["1998 WC winner.", "Madrid icon.", "Legendary volley.", "'Zizou'.", "Elite ball control."], version: 'DEMO' },
  { id: '15', name: 'Pele', countryCode: 'br', position: 'ST', club: 'Icon', hints: ["3 World Cups.", "1000+ goals.", "Santos legend.", "FIFA player of century.", "The King."], version: 'DEMO' },
  { id: '16', name: 'Harry Maguire', countryCode: 'gb-eng', position: 'CB', club: 'Man Utd', hints: ["Big head nickname.", "England CB.", "United defender.", "Dominant in air.", "Sheffield born."], version: 'DEMO' },
  { id: '17', name: 'Kai Havertz', countryCode: 'de', position: 'ST', club: 'Arsenal', hints: ["Chelsea UCL winner.", "German attacker.", "Plays for Arsenal.", "Versatile player.", "Ex-Leverkusen."], version: 'DEMO' },
  { id: '18', name: 'Declan Rice', countryCode: 'gb-eng', position: 'CDM', club: 'Arsenal', hints: ["Ex-West Ham captain.", "Arsenal anchor.", "England midfielder.", "Elite ball recovery.", "High energy."], version: 'DEMO' },
  { id: '19', name: 'Neymar Jr', countryCode: 'br', position: 'LW', club: 'Al Hilal', hints: ["World record fee.", "Skill move king.", "Brazil's main man.", "Ex-Barca & PSG.", "Plays in Saudi."], version: 'DEMO' },
  { id: '20', name: 'Timo Werner', countryCode: 'de', position: 'LW', club: 'Spurs', hints: ["Fast runner.", "Ex-Chelsea & Leipzig.", "German forward.", "Plays for Spurs.", "Speedster."], version: 'DEMO' },
  { id: '21', name: 'Ronaldinho', countryCode: 'br', position: 'LW', club: 'Icon', hints: ["Joga Bonito icon.", "Always smiling.", "Barca & Milan legend.", "The 'Elastico' king.", "2002 World Cup winner."], version: 'DEMO' },
  { id: '22', name: 'Robert Lewandowski', countryCode: 'pl', position: 'ST', club: 'Barcelona', hints: ["Bayern Munich legend.", "Poland top scorer.", "Goal machine.", "The 'Body' nickname.", "Moved to Barcelona in 2022."], version: 'DEMO' },
  { id: '23', name: 'Kevin De Bruyne', countryCode: 'be', position: 'CM', club: 'Man City', hints: ["Assist king.", "Belgian maestro.", "Man City captain.", "Visionary passing.", "Ex-Chelsea & Wolfsburg."], version: 'DEMO' },
  { id: '24', name: 'Mohamed Salah', countryCode: 'eg', position: 'RW', club: 'Liverpool', hints: ["The Egyptian King.", "Liverpool goalscorer.", "Puskas winner.", "African legend.", "Ex-Chelsea & Roma."], version: 'DEMO' },
  { id: '25', name: 'Karim Benzema', countryCode: 'fr', position: 'ST', club: 'Al Ittihad', hints: ["2022 Ballon d'Or.", "Real Madrid legend.", "French striker.", "9 seasons with CR7.", "Plays in Saudi Arabia."], version: 'DEMO' }
];

export function getRandomFootballer(excludeIds: string[] = [], version: string = 'All'): Footballer {
  let pool = FOOTBALLERS.filter(f => !excludeIds.includes(f.id));
  if (version !== 'All') {
    pool = pool.filter(f => f.version === version);
  }
  
  if (pool.length === 0) {
    pool = FOOTBALLERS;
  }
  
  // All players have equal probability
  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex];
}
