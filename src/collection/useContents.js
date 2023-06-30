import { ChunkList, ChunkSet } from "@fieldfare/core";
import { Chunk } from "@fieldfare/core";
import { useEffect, useRef, useState, useReducer} from "react";

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
    const initialState = {
        status: 'loading',
        contents: undefined,
        error: undefined
    };
    const [state, dispatch] = useReducer((prevState, newState) => {
        switch(newState.status) {
            case 'loading': {
                if(prevState.status === 'loading') {
                    return prevState;
                }
                return {
                    ...prevState,
                    status: 'loading'
                };
            }
            case 'loaded': {
                return {
                    status: 'loaded',
                    contents: newState.contents ? newState.contents : prevState.contents,
                    error: undefined
                };
            }
            case 'error': {
                return {
                    status: 'error',
                    contents: undefined,
                    error: newState.error
                };
            }
            default: {
                throw Error('Invalid status: ' + newState.status);
            }
        }
    }, initialState);
    const expandedIdentifiers = useRef();
    // const [status,setStatus] = useState('loading');
    // const [contents,setContents] = useState(undefined);
    // const [error,setError] = useState(undefined);
    const [eventCounter, setEventCounter] = useState(0);
    const refreshContents = async () => {
        let newContents;
        if(!expandedIdentifiers.current) {
            expandedIdentifiers.current = new Set();
        }
        const element = await collection.getElement(elementName);
        if(!element) {
            throw Error('NOT_DEFINED');
        }
        if(element instanceof ChunkSet === false
        && element instanceof ChunkList === false) {
            throw Error('INVALID_TYPE');
        }
        for await (const chunk of element) {
            const chunkIdentifier = chunk.id;
            if(!expandedIdentifiers.current.has(chunkIdentifier)) {
                if(!newContents) {
                    newContents = new Map(state.contents);
                }
                const transformed = await transform(chunk);
                if(!await filter(transformed)) {
                    continue;
                }
                expandedIdentifiers.current.add(chunkIdentifier);
                newContents.set(chunkIdentifier, transformed);
            }
        }
        for(const chunkIdentifier of expandedIdentifiers.current) {
            if(!await element.has(Chunk.fromIdentifier(chunkIdentifier))) {
                if(!newContents) {
                    newContents = new Map(state.contents);
                }
                newContents.delete(chunkIdentifier);
                expandedIdentifiers.current.delete(chunkIdentifier);
            }
        }
        return newContents;
    };
    useEffect(() => {
        if(!collection
        || !elementName) {
            return;
        }
        dispatch({status: 'loading'});
        refreshContents()
        .then(newContents => {
            if(newContents) {
                dispatch({status: 'loaded', contents: newContents});
            } else {
                dispatch({status: 'loaded'});
            }
        })
        .catch(error => {
            dispatch({status: 'error', error});
        });
    }, [collection, elementName, eventCounter]);
    useEffect(() => {
        if(!collection
        || !elementName) {
            return;
        }
        const listener = collection.events.on(elementName + '.change', (chunkSet) => {
            console.log('useContents onChange', eventCounter);
            setEventCounter(eventCounter + 1);
        });
        return () => {
            collection.events.removeEventListener(listener);
        };
    }, [collection, elementName, eventCounter]);
    return state;
}