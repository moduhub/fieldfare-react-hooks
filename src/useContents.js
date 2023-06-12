import { ChunkList, ChunkSet } from "@fieldfare/core";
import { useEffect, useReducer } from "react";

export function useContents(collection, elementName) {
    const initialState = {
        status: 'loading',
        chunks: undefined,
        error: undefined
    };
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
        const loadContents = async (prevContents) => {
            let newContents = undefined;
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
                if(!prevContents?.has(chunkIdentifier)) {
                    if(!newContents) {
                        newContents = new Map(prevContents);
                    }
                    newContents.set(chunkIdentifier, chunk);
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