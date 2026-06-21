export type QuizOption = {
  id: number;
  question_id: number;
  option_text: string;
  display_order?: number;
};

export type QuizQuestion = {
  id: number;
  quiz_id: number;
  question_text: string;
  question_type: string;
  is_required?: number;
  display_order?: number;
  options?: QuizOption[];
};

export type Quiz = {
  id: number;
  title: string;
  description?: string;
  is_active: number;
  access_type?: string;
};
