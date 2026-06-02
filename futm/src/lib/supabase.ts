import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Profile = {
  id: string
  username: string
  team: string
  goals_today: number
  goals_season: number
  acertos: number
  erros: number
  attr_forca: number
  attr_prec: number
  attr_stam: number
  attr_refl: number
  drills_done: string[]
  money: number
  vip_days: number
  match_score_h: number
  match_score_a: number
  match_acertos: number
  match_erros: number
  match_active: boolean
  match_cooldowns: string
}
