import { useEffect, useReducer, useContext, useCallback, useState } from 'react';
import { ChunkList } from '@fieldfare/core';
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
                chunks: [...state.chunks, action.identifier]
            }
        }
        case 'removed': {
            return {
                ...state,
                chunks: state.chunks.filter((t) => t.identifier !== action.identifier)
            }
        }
        default: {
            throw Error('Unknown action: ' + action.type);
        }
    }
}

export function useChunkList(elementName) {
    const initialState = {
        status: 'loading',
        chunks: [],
        error: undefined
    };
    const collection = useContext(CollectionContext);
    const [state, dispatch] = useReducer(reducer, initialState);
    // const create = useCallback(() => {
    //     if(state.error === 'NOT_FOUND') {
    //         dispatch({type: 'loading'});
    //         collection.createElement(elementName, {
    //             type: 'list',
    //             degree: degree
    //         })
    //         .then((chunkList) => {
    //             setChunkListInstance(chunkList);
    //             dispatch({
    //                 type: 'loaded',
    //                 chunks: []
    //             });
    //         });
    //     }
    // });
    const getChunkListInstance = () => {
        if(!collection) {
            dispatch({
                type: 'error',
                error: 'NO_COLLECTION'
            });
            return Promise.reject('NO_COLLECTION');
        }
        return collection.getElement(elementName).then((chunkList) => {
            console.log('getChunkListInstance: ' + elementName, chunkList);
            if(!chunkList) {
                dispatch({
                    type: 'error',
                    error: 'NOT_FOUND'
                });
                return Promise.reject('NOT_FOUND');
            }
            if(chunkList instanceof ChunkList === false) {
                dispatch({
                    type: 'error',
                    error: 'INVALID_TYPE'
                });
            }
            return chunkList;
        });
    }
    useEffect(() => {
        dispatch({type: 'loading'});
        
        getChunkListInstance().then((chunkList) => {
            if(chunkList) {
                chunkList.toArray().then((chunkArray) => {
                    dispatch({
                        type: 'loaded',
                        chunks: chunkArray
                    });
                });
                collection.events.on(elementName + '.change', (chunkList) => {
                    dispatch({
                        type: 'loading'
                    });
                    console.log('chunkList reload...', chunkList);
                    chunkList.toArray().then((chunkArray) => {
                        dispatch({
                            type: 'loaded',
                            chunks: chunkArray
                        });
                    });
                });
            }
        });
    }, [collection]);
    const push = useCallback((chunk) => {
        getChunkListInstance().then((chunkList) => {
            if(chunkList) {
                console.log('chunkList push...', chunk);
                dispatch({type: 'loading'});
                chunkList.push(chunk)
                .then(() => {
                    console.log('updateElement...');
                    return collection.updateElement(elementName, chunkList.descriptor)
                }).then(() => {
                    console.log('updateElement done!');
                    dispatch({
                        type: 'added',
                        chunk: chunk
                    });
                });
            }
        });
    });
    return {...state, push};
}