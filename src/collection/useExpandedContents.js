import { useState, useEffect } from 'react';

export function useExpandedContents(chunks, depth=0) {
    const [expandedContents, setExpandedContents] = useState(() => new Map());
    useEffect(() => {
        if(!chunks) {
            return;
        }
        const expand = async () => {
            let newExpandedContents = undefined;
            for(const [identifier, chunk] of chunks) {
                if(!expandedContents.has(identifier)) {
                    const expanded = await chunk.expand(depth);
                    if(!newExpandedContents) {
                        newExpandedContents = new Map(expandedContents);
                    }
                    newExpandedContents.set(identifier, expanded);
                }
            }
            return newExpandedContents;
        };
        expand().then((newExpandedContents) => {
            if(newExpandedContents) {
                setExpandedContents(newExpandedContents);
            }
        });
    }, [chunks]);
    return expandedContents;
}
        