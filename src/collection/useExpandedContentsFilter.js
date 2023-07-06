import { useEffect, useRef, useState } from "react";

export function useExpandedContentsFilter(chunks, filterProp, filterValue, depth=0) {
    const expandedIdentifiers = useRef();
    const [filteredContents, setFilteredContents] = useState(() => new Map());
    useEffect(() => {
        console.log('FILTER CRITERIA CHANGED: ', filterProp, filterValue);
        if(expandedIdentifiers.current) {
            expandedIdentifiers.current.clear();
        }
    }, [filterProp, filterValue]);
    useEffect(() => {
        if(!chunks) {
            return;
        }
        const expand = async () => {
            if(!expandedIdentifiers.current) {
                expandedIdentifiers.current = new Set();
            }
            let newFilteredContents = undefined;
            for(const [identifier, chunk] of chunks) {
                if(!expandedIdentifiers.current.has(identifier)) {
                    const expanded = await chunk.expand(depth);
                    expandedIdentifiers.current.add(identifier);    //only expand once
                    if(filterProp in expanded
                    && expanded[filterProp] === filterValue) {
                        console.log('filter add:', expanded);
                        if(!newFilteredContents) {
                            newFilteredContents = new Map(filteredContents);
                        }
                        newFilteredContents.set(identifier, expanded);
                    }
                }
            }
            for(const [identifier, expanded] of filteredContents) {
                if(!chunks.has(identifier)
                || expanded[filterProp] !== filterValue) {
                    console.log('filter remove:', identifier);
                    if(!newFilteredContents) {
                        newFilteredContents = new Map(filteredContents);
                    }
                    newFilteredContents.delete(identifier);
                    expandedIdentifiers.current.delete(identifier);
                }
            }
            return newFilteredContents;
        };
        expand().then((newFilteredContents) => {
            if(newFilteredContents) {
                setFilteredContents(newFilteredContents);
            }
        });
    }, [chunks, filterProp, filterValue]);
    return filteredContents;
}