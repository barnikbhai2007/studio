export interface Footballer {
  id: string;
  name: string;
  flag: string;
  position: string;
  rarity: 'GOLD' | 'SBC' | 'ICON' | 'HERO';
  club: string;
}

export const FOOTBALLERS: Footballer[] = [
  { id: '1', name: 'Lionel Messi', flag: '🇦🇷', position: 'RW', rarity: 'GOLD', club: 'Inter Miami' },
  { id: '2', name: 'Cristiano Ronaldo', flag: '🇵🇹', position: 'ST', rarity: 'GOLD', club: 'Al Nassr' },
  { id: '3', name: 'Kylian Mbappé', flag: '🇫🇷', position: 'ST', rarity: 'GOLD', club: 'Real Madrid' },
  { id: '4', name: 'Erling Haaland', flag: '🇳🇴', position: 'ST', rarity: 'GOLD', club: 'Manchester City' },
  { id: '5', name: 'Zinedine Zidane', flag: '🇫🇷', position: 'CAM', rarity: 'ICON', club: 'Icon' },
  { id: '6', name: 'David Beckham', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', position: 'RM', rarity: 'ICON', club: 'Icon' },
  { id: '7', name: 'Vinícius Júnior', flag: '🇧🇷', position: 'LW', rarity: 'GOLD', club: 'Real Madrid' },
  { id: '8', name: 'Kevin De Bruyne', flag: '🇧🇪', position: 'CM', rarity: 'GOLD', club: 'Manchester City' },
];

export function getRandomFootballer(): Footballer {
  return FOOTBALLERS[Math.floor(Math.random() * FOOTBALLERS.length)];
}