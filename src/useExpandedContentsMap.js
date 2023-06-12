import { useState, useEffect, useRef } from 'react';

/**
 * Map the expanded contents of a structure to a map using a property of the chunk as the key,
 * will update the map only when new chunks are added to the structure
 * @param {Map} chunks A map of chunk identifiers to chunks
 * @param {*} mapProp The property of the chunk to use as the key in the map
 * @param {*} depth Expand depth
 * @returns 
 */
export function useExpandedContentsMap(chunks, mapProp, depth=0) {
    const expandedIdentifiers = useRef();
    const [mappedContents, setMappedContents] = useState(() => new Map());
    useEffect(() => {
        if(!chunks) {
            return;
        }
        const expand = async () => {
            if(!expandedIdentifiers.current) {
                expandedIdentifiers.current = new Set();
            }
            let newMappedContents = undefined;
            for(const [identifier, chunk] of chunks) {
                if(!expandedIdentifiers.current.has(identifier)) {
                    const expanded = await chunk.expand(depth);
                    expandedIdentifiers.current.add(identifier);    //only expand once
                    if(mapProp in expanded) {   //only add to map if it has the mapProp
                        if(!newMappedContents) {
                            newMappedContents = new Map(mappedContents);
                        }
                        if(!newMappedContents.has(expanded[mapProp])) {
                            newMappedContents.set(expanded[mapProp], expanded);
                        } else {
                            console.warning('Duplicate mapProp value: ' + expanded[mapProp]);
                        }
                    }
                }
            }
            //TODO: handle removal of chunks
            return newMappedContents;
        };
        expand().then((newMappedContents) => {
            if(newMappedContents) {
                setMappedContents(newMappedContents);
            }
        });
    }, [chunks]);
    return mappedContents;
}