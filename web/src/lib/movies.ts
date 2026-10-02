import { supabase, type Movie, type MovieInput } from './supabase'

export async function fetchMovies(): Promise<Movie[]> {
  const { data, error } = await supabase.from('movie_rating').select('*').order('date', { ascending: false })
  if (error) throw error
  return data
}

export async function addMovie(movie: MovieInput) {
  const { error } = await supabase.from('movie_rating').insert(movie)
  if (error) throw error
}

// Always update by id: the old Streamlit form updated by name, which hit every row sharing that name.
export async function updateMovie(id: number, changes: Partial<MovieInput>) {
  const { error } = await supabase.from('movie_rating').update(changes).eq('id', id)
  if (error) throw error
}

export async function deleteMovie(id: number) {
  const { error } = await supabase.from('movie_rating').delete().eq('id', id)
  if (error) throw error
}
