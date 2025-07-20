import { ChunkList, ChunkSet } from "@fieldfare/core";
import { Chunk } from "@fieldfare/core";
import { useEffect, useRef, useState } from "react";
import { useImmerReducer } from "use-immer";

const initialState = {
    status: 'loading',
    contents: new Map(),
    error: undefined
};

export function chunkMapReducer(draft, action) {
    switch(action.type) {
        case 'reset': {
            return initialState;
        }
        case 'loading': {
            draft.status = 'loading';
            return draft;
        }
        case 'error': {
            draft.status = 'error';
            draft.error = action.error;
            return draft;
        }
        case 'added': {
            if(!draft.contents) {
                draft.contents = new Map(action.added);
            }
            for(const [chunkIdentifier, transformed] of action.added) {
                // console.log('reducer added', chunkIdentifier);
                draft.contents.set(chunkIdentifier, transformed);
            }
            draft.status = 'loaded';
            return draft;
        }
        case 'deleted': {
            if(draft.contents) {
                for(const chunkIdentifier of action.deleted) {
                    // console.log('reducer deleted', chunkIdentifier);
                    draft.contents.delete(chunkIdentifier);
                }
            }
            draft.status = 'loaded';
            return draft;
        }
        default:
            throw Error('Invalid action type: ' + action.type);
    }
}

/**
 * Use an up-to-date set built from the Chunks of a collection element, allows transforming
 * the chunks using the transform parameter and filtering using the filter param. Chunks from
 * the collection element are buffered and the buffer is updated when the collection element
 * changes. Default transform and filter functions are provided that return the chunk as is
 * and always return true respectively, so if they are not provided, the set should contain
 * the raw chunks of the collection element.
 * @param {Collection} collection The collection from where the element should be retrieved
 * @param {string} elementName Name of the element to retrieve
 * @param {Function|AsyncFunction} transform Function to transform the chunk before it is added to the buffer.
 * @param {Function|AsyncFunction} filter Function to filter the chunk before it is added to the buffer.
 * @returns state containing the status of the request, the transformed contents and the error if any.
 */
export function useContents(collection, elementName, transform = (chunk) => chunk, filter = () => true) {
    const [state, dispatch] = useImmerReducer(chunkMapReducer, initialState);
    const expandedIdentifiers = useRef();
    const [eventCounter, setEventCounter] = useState(0);
    useEffect(() => {
        if(!collection
        || !elementName) {
            return;
        }
        if(!expandedIdentifiers.current) {
            expandedIdentifiers.current = new Set();
        }
        const getElement = async () => {
            const element = await collection.getElement(elementName);
            if(!element) {
                throw Error('NOT_DEFINED');
            }
            if(element instanceof ChunkSet === false
            && element instanceof ChunkList === false) {
                throw Error('INVALID_TYPE');
            }
            return element;
        }
        const getChanges = async () => {
            let added;
            const element = await getElement();
            for await (const chunk of element.chunks()) {
                const chunkIdentifier = chunk.id;
                if(!expandedIdentifiers.current.has(chunkIdentifier)) {
                    const transformed = await transform(chunk);
                    if(!await filter(transformed)) {
                        continue;
                    }
                    if(!added) {
                        added = new Map();
                    }
                    expandedIdentifiers.current.add(chunkIdentifier);
                    added.set(chunkIdentifier, transformed);
                }
            }
            let deleted;
            for(const chunkIdentifier of expandedIdentifiers.current) {
                if(!await element.has(Chunk.fromIdentifier(chunkIdentifier))) {
                    if(!deleted) {
                        deleted = new Set();
                    }
                    deleted.add(chunkIdentifier);
                    expandedIdentifiers.current.delete(chunkIdentifier);
                }
            }
            return {added, deleted};
        }
        getChanges()
        .then(({added, deleted}) => {
            if(added) {
                dispatch({type: 'added', added});
            }
            if(deleted) {
                dispatch({type: 'deleted', deleted});
            }
        })
        .catch(error => {
            dispatch({type: 'error', error});
        });
    }, [collection, elementName, eventCounter]);
    useEffect(() => {
        if(!collection
        || !elementName) {
            return;
        }
        const listener = collection.events.on(elementName + '.change', (chunkSet) => {
            // console.log('useContents onChange counter:'+eventCounter);
            setEventCounter(eventCounter + 1);
        });
        return () => {
            collection.events.removeEventListener(listener);
        };
    }, [collection, elementName, eventCounter]);
    return state;
}