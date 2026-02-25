
export interface Footballer {
  id: string;
  name: string;
  flag: string;
  position: string;
  rarity: 'GOLD' | 'SBC' | 'ICON' | 'HERO';
  club: string;
  hints: string[];
}

export const FOOTBALLERS: Footballer[] = [
  { 
    id: '1', 
    name: 'Lionel Messi', 
    flag: '🇦🇷', 
    position: 'RW', 
    rarity: 'GOLD', 
    club: 'Inter Miami',
    hints: [
      "This player is famous for having the most Ballon d'Or awards in history.",
      "He spent the vast majority of his career at FC Barcelona.",
      "He led his nation to victory in the 2022 World Cup.",
      "His nickname is 'La Pulga' (The Flea).",
      "He currently plays for Inter Miami in the MLS."
    ]
  },
  { 
    id: '2', 
    name: 'Cristiano Ronaldo', 
    flag: '🇵🇹', 
    position: 'ST', 
    rarity: 'GOLD', 
    club: 'Al Nassr',
    hints: [
      "He is the all-time leading goalscorer in international football.",
      "He has won five UEFA Champions League titles.",
      "He is a legendary figure for both Manchester United and Real Madrid.",
      "Known for his incredible work ethic and the 'Siu' celebration.",
      "He currently plays in the Saudi Pro League for Al Nassr."
    ]
  },
  { 
    id: '3', 
    name: 'Kylian Mbappé', 
    flag: '🇫🇷', 
    position: 'ST', 
    rarity: 'GOLD', 
    club: 'Real Madrid',
    hints: [
      "He burst onto the scene as a teenager with Monaco.",
      "He scored a hat-trick in the 2022 World Cup Final.",
      "He is widely considered the fastest elite forward in the world.",
      "He recently joined Real Madrid after years at PSG.",
      "He won the World Cup at just 19 years old in 2018."
    ]
  },
  { 
    id: '4', 
    name: 'Erling Haaland', 
    flag: '🇳🇴', 
    position: 'ST', 
    rarity: 'GOLD', 
    club: 'Manchester City',
    hints: [
      "He is a physical powerhouse known as 'The Terminator' or 'Cyborg'.",
      "He broke the Premier League single-season scoring record in his debut year.",
      "He previously dominated at Borussia Dortmund.",
      "He plays for Manchester City and represents Norway.",
      "His father also played for Manchester City in the early 2000s."
    ]
  },
  { 
    id: '5', 
    name: 'Zinedine Zidane', 
    flag: '🇫🇷', 
    position: 'CAM', 
    rarity: 'ICON', 
    club: 'Icon',
    hints: [
      "He is one of the most elegant midfielders to ever play the game.",
      "He famously scored two headers in the 1998 World Cup Final.",
      "His career ended with a red card for a headbutt in the 2006 Final.",
      "He won three consecutive Champions Leagues as a manager.",
      "His nickname is 'Zizou'."
    ]
  },
  { 
    id: '6', 
    name: 'Mohamed Salah', 
    flag: '🇪🇬', 
    position: 'RW', 
    rarity: 'GOLD', 
    club: 'Liverpool',
    hints: [
      "He is known as 'The Egyptian King'.",
      "He has won multiple Premier League Golden Boots with Liverpool.",
      "He played for Roma and Chelsea before becoming a superstar at Anfield.",
      "He holds the record for most goals in a 38-game PL season (until Haaland).",
      "He is arguably the greatest African player of the modern era."
    ]
  },
  { 
    id: '7', 
    name: 'Neymar Jr', 
    flag: '🇧🇷', 
    position: 'LW', 
    rarity: 'GOLD', 
    club: 'Al Hilal',
    hints: [
      "He was part of the famous 'MSN' trio at Barcelona.",
      "He is the world's most expensive player in terms of transfer fee.",
      "He is Brazil's all-time leading goalscorer, surpassing Pelé.",
      "Known for his incredible flair, skill, and rainbow flicks.",
      "He left PSG to join the Saudi Pro League."
    ]
  },
  { 
    id: '8', 
    name: 'Luka Modrić', 
    flag: '🇭🇷', 
    position: 'CM', 
    rarity: 'GOLD', 
    club: 'Real Madrid',
    hints: [
      "He broke the Messi-Ronaldo Ballon d'Or streak in 2018.",
      "He led Croatia to a World Cup Final and a third-place finish.",
      "He is a maestro in the Real Madrid midfield with 6 CL titles.",
      "Known for his outside-of-the-foot passes (Trivela).",
      "He played for Tottenham Hotspur before moving to Spain."
    ]
  }
];

export function getRandomFootballer(): Footballer {
  return FOOTBALLERS[Math.floor(Math.random() * FOOTBALLERS.length)];
}
