export interface Emote {
  id: string;
  name: string;
  url: string;
}

export const ALL_EMOTES: Emote[] = [
  { id: 'laugh', name: 'Laughing', url: 'https://picsum.photos/seed/laugh/200/200' },
  { id: 'cry', name: 'Crying', url: 'https://picsum.photos/seed/cry/200/200' },
  { id: 'fire', name: 'On Fire', url: 'https://picsum.photos/seed/fire/200/200' },
  { id: 'goal', name: 'Goal!!', url: 'https://picsum.photos/seed/goal/200/200' },
  { id: 'shock', name: 'Shocked', url: 'https://picsum.photos/seed/shock/200/200' },
  { id: 'flex', name: 'Flex', url: 'https://picsum.photos/seed/flex/200/200' },
  { id: 'angry', name: 'Angry', url: 'https://picsum.photos/seed/angry/200/200' },
  { id: 'cool', name: 'Cool', url: 'https://picsum.photos/seed/cool/200/200' },
  { id: 'heart', name: 'Love', url: 'https://picsum.photos/seed/heart/200/200' },
  { id: 'clown', name: 'Clown', url: 'https://picsum.photos/seed/clown/200/200' },
  { id: 'skull', name: 'Dead', url: 'https://picsum.photos/seed/skull/200/200' },
  { id: 'star', name: 'Star', url: 'https://picsum.photos/seed/star/200/200' },
];

export const DEFAULT_EQUIPPED_IDS = ['laugh', 'cry', 'fire', 'goal', 'shock', 'flex'];
