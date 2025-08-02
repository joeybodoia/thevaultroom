export interface PrismaticPokemonFull {
  id: number;
  name: string | null;
  image_url: string | null;
  price: number | null;
  set_name: string | null;
  rarity: string | null;
  card_num: string | null;
  date_updated: string | null;
}

export interface CrownZenithFull {
  id: number;
  name: string | null;
  image_url: string | null;
  price: number | null;
  set_name: string | null;
  rarity: string | null;
  card_num: string | null;
  date_updated: string | null;
}

export interface DestinedRivalsFull {
  id: number;
  name: string | null;
  image_url: string | null;
  price: number | null;
  set_name: string | null;
  rarity: string | null;
  card_num: string | null;
  date_updated: string | null;
}

export type PokemonCard = PrismaticPokemonFull | CrownZenithFull | DestinedRivalsFull;