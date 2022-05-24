/**
 * Pauses execution for the given number of milliseconds
 *
 * @param millis - duration to pause for in milliseconds
 */
export async function pause(millis: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, millis));
}

/**
 * Resets the world to a blank state with no entities.
 *
 * WARNING: This will permanently delete every entity in your world (scenes, actors, items, macros, roll tables, journal entries, playlists, chat messages, folders, etc.)
 */
export async function clearWorld(): Promise<void> {
  const exclude = new Set([User].map((element) => element.metadata.name));
  for (const collection of Object.values(game)) {
    if (!(collection instanceof DocumentCollection) || exclude.has(collection.documentName))
      continue;
    if (collection.size === 0) continue;

    await collection.documentClass.deleteDocuments(collection.map((document_) => document_.id));
  }
}
