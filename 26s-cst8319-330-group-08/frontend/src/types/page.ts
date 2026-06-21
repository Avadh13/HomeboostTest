export type PageCard = {
  id: number;
  title: string;
  description?: string | null;
  image_url?: string | null;
  button_text?: string | null;
  button_link?: string | null;
};

export type PageSection = {
  id: number;
  section_key: string;
  title?: string | null;
  subtitle?: string | null;
  content?: string | null;
  image_url?: string | null;
  display_order?: number;
  sort_order?: number;
  cards?: PageCard[];
};

export type Page = {
  id: number;
  title: string;
  slug: string;
  description?: string | null;
  sections?: PageSection[];
};
