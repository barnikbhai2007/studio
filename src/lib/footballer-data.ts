
export type RarityType = 'IRON' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND' | 'MASTER' | 'GRANDMASTER' | 'LEGENDARY';

export interface Footballer {
  id: string;
  name: string;
  flag: string;
  position: string;
  rating: number; // 1-1000 (hidden, used for variety)
  club: string;
  hints: string[];
}

export const RARITIES: { type: RarityType; bg: string }[] = [
  { type: 'IRON', bg: 'from-slate-500 to-slate-800' },
  { type: 'BRONZE', bg: 'from-orange-700 to-orange-950' },
  { type: 'SILVER', bg: 'from-slate-300 to-slate-500' },
  { type: 'GOLD', bg: 'from-yellow-500 to-yellow-800' },
  { type: 'PLATINUM', bg: 'from-cyan-400 to-cyan-700' },
  { type: 'DIAMOND', bg: 'from-blue-400 to-blue-600' },
  { type: 'MASTER', bg: 'from-purple-500 to-purple-800' },
  { type: 'GRANDMASTER', bg: 'from-red-600 to-red-900' },
  { type: 'LEGENDARY', bg: 'from-yellow-300 via-yellow-500 to-yellow-600' }
];

export const getRandomRarity = () => RARITIES[Math.floor(Math.random() * RARITIES.length)];

export const FOOTBALLERS: Footballer[] = [
  { id: '1', name: 'Lionel Messi', flag: '🇦🇷', position: 'RW', rating: 980, club: 'Inter Miami', hints: ["Record 8 Ballon d'Ors.", "Barcelona legend.", "2022 World Cup winner.", "'La Pulga'.", "Inter Miami star."] },
  { id: '2', name: 'Cristiano Ronaldo', flag: '🇵🇹', position: 'ST', rating: 975, club: 'Al Nassr', hints: ["International top scorer.", "5 Champions Leagues.", "Man Utd & Real Madrid icon.", "'Siu' celebration.", "Plays for Al Nassr."] },
  { id: '3', name: 'Kylian Mbappé', flag: '🇫🇷', position: 'ST', rating: 970, club: 'Real Madrid', hints: ["Hat-trick in 2022 Final.", "PSG top scorer.", "2018 World Cup winner.", "Fastest in the world.", "Real Madrid player."] },
  { id: '4', name: 'Erling Haaland', flag: '🇳🇴', position: 'ST', rating: 965, club: 'Man City', hints: ["PL goal record breaker.", "The 'Cyborg'.", "Ex-Dortmund.", "Father played for City.", "Norway striker."] },
  { id: '5', name: 'Son Heung-min', flag: '🇰🇷', position: 'LW', rating: 450, club: 'Tottenham', hints: ["Asian PL top scorer.", "Golden Boot 21-22.", "Spurs captain.", "Puskas winner.", "Korea's superstar."] },
  { id: '6', name: 'Harry Kane', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', position: 'ST', rating: 480, club: 'Bayern', hints: ["England top scorer.", "Ex-Spurs hero.", "Moved to Germany.", "Elite finisher.", "Wears number 9."] },
  { id: '7', name: 'Casemiro', flag: '🇧🇷', position: 'CDM', rating: 150, club: 'Man Utd', hints: ["Defensive wall.", "5 UCL titles with Real.", "Brazil hardman.", "Plays in midfield.", "Current Man Utd player."] },
  { id: '8', name: 'Nicolas Jackson', flag: '🇸🇳', position: 'ST', rating: 120, club: 'Chelsea', hints: ["Senegal striker.", "Plays for Chelsea.", "Moved from Villarreal.", "Young talent.", "Speedy attacker."] },
  { id: '9', name: 'Richarlison', flag: '🇧🇷', position: 'ST', rating: 180, club: 'Spurs', hints: ["The 'Pigeon'.", "Brazil number 9.", "Scored worldie in WC 2022.", "Spurs striker.", "Ex-Everton."] },
  { id: '10', name: 'Luka Modric', flag: '🇭🇷', position: 'CM', rating: 940, club: 'Real Madrid', hints: ["2018 Ballon d'Or.", "Croatia captain.", "Midfield maestro.", "6 UCL titles.", "Trivela specialist."] },
  { id: '11', name: 'Antony', flag: '🇧🇷', position: 'RW', rating: 50, club: 'Man Utd', hints: ["Spin move specialist.", "Ex-Ajax winger.", "Expensive transfer.", "Plays for United.", "Brazil winger."] },
  { id: '12', name: 'Darwin Nunez', flag: '🇺🇾', position: 'ST', rating: 220, club: 'Liverpool', hints: ["Uruguay forward.", "Chaotic energy.", "Liverpool striker.", "Ex-Benfica.", "Highly athletic."] },
  { id: '13', name: 'Bernardo Silva', flag: '🇵🇹', position: 'CM', rating: 350, club: 'Man City', hints: ["Workhorse.", "City playmaker.", "Portuguese star.", "Incredible dribbling.", "Left footed."] },
  { id: '14', name: 'Zinedine Zidane', flag: '🇫🇷', position: 'CAM', rating: 995, club: 'Icon', hints: ["1998 WC winner.", "Madrid icon.", "Legendary volley.", "'Zizou'.", "Elite ball control."] },
  { id: '15', name: 'Pele', flag: '🇧🇷', position: 'ST', rating: 1000, club: 'Icon', hints: ["3 World Cups.", "1000+ goals.", "Santos legend.", "FIFA player of century.", "The King."] },
  { id: '16', name: 'Harry Maguire', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', position: 'CB', rating: 80, club: 'Man Utd', hints: ["Big head nickname.", "England CB.", "United defender.", "Dominant in air.", "Sheffield born."] },
  { id: '17', name: 'Kai Havertz', flag: '🇩🇪', position: 'ST', rating: 280, club: 'Arsenal', hints: ["Chelsea UCL winner.", "German attacker.", "Plays for Arsenal.", "Versatile player.", "Ex-Leverkusen."] },
  { id: '18', name: 'Declan Rice', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', position: 'CDM', rating: 390, club: 'Arsenal', hints: ["Ex-West Ham captain.", "Arsenal anchor.", "England midfielder.", "Elite ball recovery.", "High energy."] },
  { id: '19', name: 'Neymar Jr', flag: '🇧🇷', position: 'LW', rating: 920, club: 'Al Hilal', hints: ["World record fee.", "Skill move king.", "Brazil's main man.", "Ex-Barca & PSG.", "Plays in Saudi."] },
  { id: '20', name: 'Timo Werner', flag: '🇩🇪', position: 'LW', rating: 110, club: 'Spurs', hints: ["Fast runner.", "Ex-Chelsea & Leipzig.", "German forward.", "Plays for Spurs.", "Speedster."] }
];

export function getRandomFootballer(excludeIds: string[] = []): Footballer {
  const available = FOOTBALLERS.filter(f => !excludeIds.includes(f.id));
  const pool = available.length > 0 ? available : FOOTBALLERS;
  return pool[Math.floor(Math.random() * pool.length)];
}
