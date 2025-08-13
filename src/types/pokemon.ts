export interface DirectBidCard {
  id: number;
  card_name: string;
  card_number: string | null;
  set_name: string | null;
  rarity: string | null;
  image_url: string | null;
  ungraded_market_price: number | null;
  date_updated: string | null;
}

export type PokemonCard = DirectBidCard;