/**
 * Pauses execution for the given number of milliseconds
 * @param {number} millis - duration to pause for in milliseconds
 * @returns {Promise}
 */
async function pause(millis) { return new Promise(resolve => setTimeout(resolve, millis)); }

/**
 * Resets the world to a blank state with no entities.
 *
 * WARNING: This will permanently delete every entity in your world (scenes, actors, items, macros, roll tables, journal entries, playlists, chat messages, folders, etc.)
 * @returns {Promise<void>}
 */
async function clearWorld() {
    const exclude = [User].map(e => e.config.baseEntity.name);
    for (let collection of Object.values(game)) {
        if (!(collection instanceof EntityCollection) || exclude.includes(collection.entity)) continue;
        if (!collection.size) continue;

        await CONFIG[collection.entity].entityClass.delete(collection.entities.map(e => e.id));
    }
}

export const quenchUtils = { pause, clearWorld };
