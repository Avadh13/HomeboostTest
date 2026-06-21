export type Resource = {
  id: number;
  title: string;
  description?: string | null;
  content?: string | null;
  image_url?: string | null;
  category?: string | null;
  is_active?: number;
};
