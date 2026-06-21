export type UserRole = "super_admin" | "admin" | "hbt_admin" | "employee";

export type User = {
  id: number;
  full_name: string;
  email: string;
  role: UserRole | string;
  team_id?: number | null;
  partnership_id?: number | null;
  is_active?: number;
};
