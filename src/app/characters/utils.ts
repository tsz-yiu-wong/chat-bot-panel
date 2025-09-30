import { Character } from './page';

/**
 * Filters the list of characters based on a search query.
 * The search is case-insensitive and checks the character's name.
 *
 * @param characters - The array of characters to filter.
 * @param searchQuery - The search term to filter by.
 * @returns A filtered array of characters.
 */
export function filterCharacters(
  characters: Character[],
  searchQuery: string
): Character[] {
  if (!searchQuery.trim()) {
    return characters;
  }

  const lowercasedQuery = searchQuery.toLowerCase();

  return characters.filter(character => 
    character.name?.toLowerCase().includes(lowercasedQuery)
  );
}
