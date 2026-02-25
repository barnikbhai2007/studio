
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
  },
  {
    id: '13',
    name: 'Neymar Jr',
    flag: '🇧🇷',
    position: 'LW',
    rarity: 'GOLD',
    club: 'Al Hilal',
    hints: [
      "I became the world's most expensive player in 2017.",
      "I formed the legendary MSN trio at Barcelona.",
      "I won Olympic Gold with Brazil in 2016.",
      "I am famous for my incredible skill and 'Rainbow Flick'.",
      "I currently play for Al Hilal in Saudi Arabia."
    ]
  },
  {
    id: '14',
    name: 'Ronaldinho',
    flag: '🇧🇷',
    position: 'CAM',
    rarity: 'ICON',
    club: 'Icon',
    hints: [
      "I am famous for always playing with a smile on my face.",
      "I received a standing ovation from Real Madrid fans at the Bernabéu.",
      "I won the Ballon d'Or in 2005.",
      "I was a key part of Brazil's 2002 World Cup winning team.",
      "I am a legend for both Barcelona and AC Milan."
    ]
  },
  {
    id: '15',
    name: 'Pelé',
    flag: '🇧🇷',
    position: 'ST',
    rarity: 'ICON',
    club: 'Icon',
    hints: [
      "I am the only player to win three FIFA World Cups.",
      "I scored over 1,000 career goals.",
      "I spent the vast majority of my career at Santos.",
      "I was named the FIFA Player of the Century.",
      "I am widely regarded as the 'King of Football'."
    ]
  },
  {
    id: '16',
    name: 'Diego Maradona',
    flag: '🇦🇷',
    position: 'CAM',
    rarity: 'ICON',
    club: 'Icon',
    hints: [
      "I am famous for the 'Hand of God' goal.",
      "I scored the 'Goal of the Century' against England in 1986.",
      "I led Napoli to their first ever Serie A titles.",
      "I single-handedly inspired Argentina to the 1986 World Cup.",
      "I am a god-like figure in both Buenos Aires and Naples."
    ]
  },
  {
    id: '17',
    name: 'Jude Bellingham',
    flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    position: 'CAM',
    rarity: 'GOLD',
    club: 'Real Madrid',
    hints: [
      "My former club Birmingham City retired my shirt number when I was 17.",
      "I moved to Borussia Dortmund before joining Real Madrid.",
      "I wear the number 5 at Real Madrid, previously worn by Zidane.",
      "I am the youngest player ever to play for England in a major tournament.",
      "I had an incredible debut season in Spain, winning La Liga and the UCL."
    ]
  },
  {
    id: '18',
    name: 'Wayne Rooney',
    flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    position: 'ST',
    rarity: 'ICON',
    club: 'Icon',
    hints: [
      "I scored a hat-trick on my Manchester United debut at age 18.",
      "I held the record for most goals for England and Manchester United.",
      "I am famous for a spectacular bicycle kick against Manchester City.",
      "I started my career as a child prodigy at Everton.",
      "I was known for my incredible work rate, power, and aggression."
    ]
  },
  {
    id: '19',
    name: 'David Beckham',
    flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    position: 'RM',
    rarity: 'ICON',
    club: 'Icon',
    hints: [
      "I am famous for my incredible free-kick taking ability.",
      "I was part of the 'Class of 92' at Manchester United.",
      "I played for Real Madrid, LA Galaxy, AC Milan, and PSG.",
      "I am a global fashion icon and former England captain.",
      "I am one of the owners of Inter Miami."
    ]
  },
  {
    id: '20',
    name: 'Son Heung-min',
    flag: '🇰🇷',
    position: 'LW',
    rarity: 'GOLD',
    club: 'Tottenham',
    hints: [
      "I am the all-time leading Asian goalscorer in Premier League history.",
      "I won the Premier League Golden Boot in 2021-22.",
      "I am the current captain of Tottenham Hotspur.",
      "I won a Puskas Award for a solo goal against Burnley.",
      "I am a massive superstar in South Korea."
    ]
  }
];

export function getRandomFootballer(): Footballer {
  return FOOTBALLERS[Math.floor(Math.random() * FOOTBALLERS.length)];
}
