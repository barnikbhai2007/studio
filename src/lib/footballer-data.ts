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
      "Often called 'La Pulga' due to his height.",
      "Has won a record-breaking number of Ballon d'Or awards.",
      "Spent over 20 years at FC Barcelona.",
      "Finally won the World Cup in 2022 with Argentina.",
      "He currently plays in the MLS."
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
      "Known for his incredible work ethic and physique.",
      "The all-time leading goal scorer in international football.",
      "Wore the iconic number 7 at Manchester United and Real Madrid.",
      "Has won the UEFA Champions League five times.",
      "Currently playing in the Saudi Pro League."
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
      "Famous for his lightning-fast speed and finishing.",
      "Scored a hat-trick in a World Cup final.",
      "Left PSG as their all-time leading scorer.",
      "Joined Real Madrid in the summer of 2024.",
      "He is the face of modern French football."
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
      "Often referred to as a 'Cyborg' for his clinical scoring.",
      "Broke the Premier League single-season scoring record in his debut year.",
      "Previously played for Borussia Dortmund.",
      "Known for his unique meditation celebration.",
      "The star striker for Manchester City."
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
      "One of the most elegant midfielders in history.",
      "Famously headbutted an opponent in the 2006 World Cup Final.",
      "Scored an iconic volley in the 2002 Champions League Final.",
      "Managed Real Madrid to three consecutive Champions League titles.",
      "Nicknamed 'Zizou'."
    ]
  },
  { 
    id: '6', 
    name: 'David Beckham', 
    flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 
    position: 'RM', 
    rarity: 'ICON', 
    club: 'Icon',
    hints: [
      "Renowned for his world-class free-kicks and crossing.",
      "Part of the 'Class of 92' at Manchester United.",
      "Played for Real Madrid, AC Milan, PSG, and LA Galaxy.",
      "Co-owner of Inter Miami CF.",
      "Former captain of the England national team."
    ]
  },
  { 
    id: '7', 
    name: 'Vinícius Júnior', 
    flag: '🇧🇷', 
    position: 'LW', 
    rarity: 'GOLD', 
    club: 'Real Madrid',
    hints: [
      "A flashy Brazilian winger with elite dribbling skills.",
      "Scored the winning goal in the 2022 Champions League Final.",
      "A key figure in Real Madrid's 'New Era'.",
      "Known for his passionate dance celebrations.",
      "Inherited the number 7 shirt from Eden Hazard."
    ]
  },
  { 
    id: '8', 
    name: 'Kevin De Bruyne', 
    flag: '🇧🇪', 
    position: 'CM', 
    rarity: 'GOLD', 
    club: 'Manchester City',
    hints: [
      "Widely regarded as one of the best passers in the world.",
      "Known for his 'let me talk' moment with his manager.",
      "The creative engine of Manchester City's midfield.",
      "The 'Golden Generation' talisman for Belgium.",
      "Nicknamed 'KDB'."
    ]
  }
];

export function getRandomFootballer(): Footballer {
  return FOOTBALLERS[Math.floor(Math.random() * FOOTBALLERS.length)];
}
