
/**
 * Asynchronously transforms and buffers chunks from an iterable chunk structure.
 * @param {ChunkSet|ChunkMap|ChunkList} element Reference to an iterable chunk structure (ChunkSet, ChunkMap of ChunkList)
 * @param {Map<ChunkIdentifier, *>} buffer A map contained previously loaded chunks referenced by the chunk id.
 * @param {Function} transform A method that will be called to tranform the chunk before it is added to the buffer.
 * @returns {Promise<Map<ChunkIdentifier, *>>} A new buffer containing the transformed chunks, or undefined if no changes were made to the buffer.
 */
export async function makeChunkBuffer(element, buffer, transform = (x) => x) {
    if(!element) {
        return new Map();
    }
    let newBuffer;
    for await(const chunk of element.chunks()) {
        const transformed = await transform(chunk);
        if(!buffer?.has(chunk.id)) {
            if(!newBuffer) {
                newBuffer = new Map(buffer);
            }
            newBuffer.set(chunk.id, transformed);
        }
    }
    if(buffer) {
        for(const [identifier, transformed] of buffer) {
            if(!await element.has(identifier)) {
                if(!newBuffer) {
                    newBuffer = new Map(buffer);
                }
                newBuffer.delete(identifier);
            }
        }
    }
    return newBuffer;
}