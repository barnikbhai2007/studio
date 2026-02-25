
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
      "I have won a record 8 Ballon d'Or awards.",
      "I spent 21 years at FC Barcelona.",
      "I captained Argentina to the 2022 World Cup trophy.",
      "My nickname is 'La Pulga'.",
      "I currently play in the MLS for Inter Miami."
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
      "I am the all-time leading goalscorer in international football.",
      "I have won 5 UEFA Champions League titles.",
      "I am a club legend for both Manchester United and Real Madrid.",
      "I am famous for my 'Siu' celebration.",
      "I play for Al Nassr in Saudi Arabia."
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
      "I scored a hat-trick in the 2022 World Cup Final.",
      "I was the top scorer in the history of Paris Saint-Germain.",
      "I won the World Cup in 2018 as a teenager.",
      "I am widely considered the fastest player in world football.",
      "I recently joined Real Madrid in a blockbuster move."
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
      "I broke the record for most goals in a single Premier League season.",
      "I am known for my incredible physical strength and 'Cyborg' style.",
      "I previously played for Red Bull Salzburg and Borussia Dortmund.",
      "My father, Alf-Inge, also played for my current club.",
      "I lead the line for Manchester City and Norway."
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
      "I am famous for a volley in the 2002 Champions League final.",
      "I won the 1998 World Cup for France by scoring two headers in the final.",
      "My playing career ended with a red card in the 2006 World Cup final.",
      "I managed Real Madrid to three consecutive Champions League titles.",
      "My nickname is 'Zizou'."
    ]
  },
  { 
    id: '6', 
    name: 'Kevin De Bruyne', 
    flag: '🇧🇪', 
    position: 'CM', 
    rarity: 'GOLD', 
    club: 'Manchester City',
    hints: [
      "I am often called the best playmaker in the world.",
      "I have the joint-most assists in a single Premier League season.",
      "I played for Chelsea and Wolfsburg before my current club.",
      "I am the heartbeat of the Belgian 'Golden Generation'.",
      "I am known for my incredible crossing and vision."
    ]
  },
  { 
    id: '7', 
    name: 'Robert Lewandowski', 
    flag: '🇵🇱', 
    position: 'ST', 
    rarity: 'GOLD', 
    club: 'Barcelona',
    hints: [
      "I once scored 5 goals in 9 minutes coming off the bench.",
      "I broke Gerd Müller's record for most goals in a single Bundesliga season.",
      "I spent 8 highly successful years at Bayern Munich.",
      "I am Poland's all-time leading scorer.",
      "I moved to FC Barcelona in 2022."
    ]
  },
  { 
    id: '8', 
    name: 'Mohamed Salah', 
    flag: '🇪🇬', 
    position: 'RW', 
    rarity: 'GOLD', 
    club: 'Liverpool',
    hints: [
      "I am known as 'The Egyptian King'.",
      "I helped Liverpool win their first Premier League title in 30 years.",
      "I have won multiple Premier League Golden Boots.",
      "I previously played for Basel, Chelsea, and Roma.",
      "I am the highest-scoring African player in Premier League history."
    ]
  },
  { 
    id: '9', 
    name: 'Luka Modrić', 
    flag: '🇭🇷', 
    position: 'CM', 
    rarity: 'GOLD', 
    club: 'Real Madrid',
    hints: [
      "I won the Ballon d'Or in 2018, breaking the Messi-Ronaldo dominance.",
      "I led Croatia to the 2018 World Cup Final.",
      "I am known for my 'Trivela' (outside of the foot) passes.",
      "I have won 6 Champions League titles with Real Madrid.",
      "I played for Tottenham Hotspur before moving to Spain."
    ]
  },
  { 
    id: '10', 
    name: 'Vinícius Júnior', 
    flag: '🇧🇷', 
    position: 'LW', 
    rarity: 'GOLD', 
    club: 'Real Madrid',
    hints: [
      "I scored the winning goal in the 2022 Champions League Final.",
      "I am a Brazilian winger famous for my dribbling and flair.",
      "I wear the iconic number 7 at Real Madrid.",
      "I was signed from Flamengo as a teenager.",
      "I am a leading candidate for the 2024 Ballon d'Or."
    ]
  },
  { 
    id: '11', 
    name: 'Harry Kane', 
    flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 
    position: 'ST', 
    rarity: 'GOLD', 
    club: 'Bayern Munich',
    hints: [
      "I am England's all-time leading goalscorer.",
      "I am the second-highest scorer in Premier League history.",
      "I spent most of my career at Tottenham Hotspur without winning a trophy.",
      "I moved to Bayern Munich in 2023.",
      "I have won three Premier League Golden Boots."
    ]
  },
  { 
    id: '12', 
    name: 'Thierry Henry', 
    flag: '🇫🇷', 
    position: 'ST', 
    rarity: 'ICON', 
    club: 'Icon',
    hints: [
      "I am the greatest player in Arsenal's history.",
      "I was the main man in the 'Invincibles' season.",
      "I won the World Cup, Euros, and Champions League during my career.",
      "I have a statue outside the Emirates Stadium.",
      "I am famous for my va-va-voom and clinical finishing."
    ]
  }
];

export function getRandomFootballer(): Footballer {
  return FOOTBALLERS[Math.floor(Math.random() * FOOTBALLERS.length)];
}
