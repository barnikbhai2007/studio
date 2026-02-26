export interface Emote {
  id: string;
  name: string;
  url: string;
}

export const ALL_EMOTES: Emote[] = [
  { id: 'neymar_cute', name: 'Neymar Cute', url: 'https://res.cloudinary.com/speed-searches/image/upload/v1772131957/Neymar_cute_hg3e2v.jpg' },
  { id: 'messi_laugh', name: 'Messi Laugh', url: 'https://res.cloudinary.com/speed-searches/image/upload/v1772131957/2dc70f34-b7cf-45f1-9db0-7a7c667f11de_bx6ecv.jpg' },
  { id: 'shocked_meme', name: 'Shocked', url: 'https://res.cloudinary.com/speed-searches/image/upload/v1772131957/938ec3b5-6b90-4687-8d41-9a942b2142f6_iuitgx.jpg' },
  { id: 'vini_dance', name: 'Vini Dance', url: 'https://res.cloudinary.com/speed-searches/image/upload/v1772131957/fc314786-bb10-47c8-83c0-6936cafeed57_pheirf.jpg' },
  { id: 'ronaldo_siu', name: 'CR7 Focus', url: 'https://res.cloudinary.com/speed-searches/image/upload/v1772131958/RONALDO_PP_w2sjfy.jpg' },
  { id: 'mbappe_cry', name: 'Mbappe Cry', url: 'https://res.cloudinary.com/speed-searches/image/upload/v1772131958/kylian_mbappe_ty41ip.jpg' },
  { id: 'jude_hey', name: 'Jude Hey', url: 'https://res.cloudinary.com/speed-searches/image/upload/v1772131957/Jude_Bellingham_meme_afkxet.jpg' },
  // Locked Emotes (Planned for Quests)
  { id: 'trophy_gold', name: 'World Cup', url: 'https://picsum.photos/seed/trophy/200/200' },
  { id: 'fire_hot', name: 'On Fire', url: 'https://picsum.photos/seed/fire/200/200' },
  { id: 'goal_text', name: 'Goal!!', url: 'https://picsum.photos/seed/goal/200/200' },
  { id: 'flex_power', name: 'Pure Power', url: 'https://picsum.photos/seed/flex/200/200' },
  { id: 'cool_shades', name: 'Cool', url: 'https://picsum.photos/seed/cool/200/200' },
  { id: 'heart_love', name: 'Love', url: 'https://picsum.photos/seed/heart/200/200' },
  { id: 'clown_meme', name: 'Clown', url: 'https://picsum.photos/seed/clown/200/200' },
  { id: 'skull_dead', name: 'Dead', url: 'https://picsum.photos/seed/skull/200/200' },
  { id: 'magic_wand', name: 'Magic', url: 'https://picsum.photos/seed/magic/200/200' },
];

export const UNLOCKED_EMOTE_IDS = [
  'neymar_cute', 
  'messi_laugh', 
  'shocked_meme', 
  'vini_dance', 
  'ronaldo_siu', 
  'mbappe_cry', 
  'jude_hey'
];

export const DEFAULT_EQUIPPED_IDS = [
  'neymar_cute', 
  'messi_laugh', 
  'shocked_meme', 
  'vini_dance', 
  'ronaldo_siu', 
  'mbappe_cry'
];