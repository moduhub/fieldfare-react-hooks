import { ChunkList, ChunkSet } from "@fieldfare/core";
import { useEffect, useReducer, useRef} from "react";

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
export function useContents(collection, elementName, transform = (chunk) => chunk, filter= (chunk) => true) {
    const initialState = {
        status: 'loading',
        chunks: undefined,
        error: undefined
    };
    const expandedIdentifiers = useRef();
    const [state, dispatch] = useReducer((prevState, newState) => {
        switch(newState.status) {
            case 'loading': {
                return {
                    ...prevState,
                    status: 'loading'
                };
            }
            case 'loaded': {
                return {
                    status: 'loaded',
                    chunks: newState.chunks ? newState.chunks : prevState.chunks,
                    error: undefined
                };
            }
            case 'error': {
                return {
                    status: 'error',
                    chunks: undefined,
                    error: newState.error
                };
            }
            default: {
                throw Error('Invalid status: ' + newState.status);
            }
        }
    }, initialState);
    useEffect(() => {
        if(!collection) {
            return;
        }
        const loadContents = async (prevContents) => {
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
                        newContents = new Map(prevContents);
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
                if(!await element.has(chunkIdentifier)) {
                    if(!newContents) {
                        newContents = new Map(prevContents);
                    }
                    newContents.delete(chunkIdentifier);
                    expandedIdentifiers.current.delete(chunkIdentifier);
                }
            }
            return newContents;
        };
        dispatch({status: 'loading'});
        loadContents(state.chunks)
        .then(newContents => {
            if(newContents) {
                dispatch({
                    status: 'loaded',
                    chunks: newContents
                });
            } else {
                dispatch({status: 'loaded'});
            }
        })
        .catch(error => {
            dispatch({
                status: 'error',
                error: error
            });
        });
        const listener = collection.events.on(elementName + '.change', (chunkSet) => {
            dispatch({status: 'loading'});
            loadContents(state.chunks)
            .then(newContents => {
                if(newContents) {
                    dispatch({
                        status: 'loaded',
                        chunks: newContents
                    });
                } else {
                    dispatch({status: 'loaded'});
                }
            })
            .catch(error => {
                dispatch({
                    status: 'error',
                    error: error
                });
            });
        });
        return () => {
            collection.events.removeEventListener(listener);
        };
    }, [collection, elementName]);
    return state;
}