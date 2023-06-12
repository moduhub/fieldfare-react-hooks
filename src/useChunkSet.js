import { useEffect, useReducer, useContext } from 'react';
import { ChunkSet } from '@fieldfare/core';
import { CollectionContext } from './FieldfareContext.js';

function reducer(state, action) {
    switch (action.type) {
        case 'loading': {
            return {
                ...state,
                status: 'loading',
            }
        }
        case 'loaded': {
            return {
                status: 'loaded',
                chunks: action.chunks,
                error: undefined
            }
        }
        case 'error': {
            return {
                status: 'error',
                chunks: [],
                error: action.error
            }
        }
        case 'added': {
            return {
                ...state,
                chunks: [...state.chunks, action.hostIdentifier]
            }
        }
        case 'removed': {
            return {
                ...state,
                chunks: state.chunks.filter((t) => t.hostIdentifier !== action.hostIdentifier)
            }
        }
        default: {
            throw Error('Unknown action: ' + action.type);
        }
    }
}

export function useChunkSet(elementName) {
    const initialState = {
        status: 'loading',
        chunks: [],
        error: undefined
    };
    const collection = useContext(CollectionContext);
    const [state, dispatch] = useReducer(reducer, initialState);
    useEffect(() => {
        dispatch({type: 'loading'});
        if(!collection) {
            dispatch({
                type: 'error',
                error: 'Collection not found'
            });
            return;
        }
        collection.getElement(elementName).then((chunkSet) => {
            if(!chunkSet) {
                dispatch({
                    type: 'error',
                    error: elementName + ' is not defined'
                });
                return Promise.reject('NOT_DEFINED');
            }
            if(chunkSet instanceof ChunkSet === false) {
                dispatch({
                    type: 'error',
                    error: elementName + ' is not a ChunkSet'
                });
                return Promise.reject('INVALID_TYPE');
            }
            return chunkSet.toArray();
        }).then((chunkArray) => {
            dispatch({
                type: 'loaded',
                chunks: chunkArray
            });
            collection.events.on(elementName + '.change', async (chunkSet) => {
                // I need a better diff...
                // for await (const chunk of chunkSet) {
                //     if(!state.chunks.has(hostIdentifier)) {
                //         dispatch({
                //             type: 'added',
                //             chunk: chunk
                //         });
                //     }
                // }
            });
        });
    }, [collection, elementName]);
    return state;
}