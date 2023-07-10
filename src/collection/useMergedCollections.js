import { useEffect, useState, useRef, useCallback } from "react";
import { useImmerReducer } from 'use-immer';
import { useContents } from "./useContents.js";
import {
    Collection, LocalHost,
    ChunkList, ChunkSet, ChunkMap
} from "@fieldfare/core";
import { chunkMapReducer } from "./useContents.js";

const initialState = {
    status: 'loading',
    contents: new Map(),
    error: undefined,
};

export function useMergedCollections(env, uuid, elementName, transform, filter) {
    const [state, dispatch] = useImmerReducer(chunkMapReducer, initialState);
    const transformHostIdentifiers = useCallback(async (chunk) => {
        const {id} = await chunk.expand(0);
        return id;
    }, []);
    const providersIdentifiers = useContents(env?.localCopy, uuid+'.providers', transformHostIdentifiers);
    const expandedIdentifiers = useRef();
    const listeners = useRef();
    const [pendingUpdates, dispatchUpdate] = useImmerReducer((draft, action) => {
        switch(action.type) {
            case 'push':
                draft.push(action.collection);
                return draft;
            case 'clear':
                return [];
            default:
                throw Error('Invalid action type: ' + action.type);
        }
    }, []);
    //Assign listeners to collections every time the provider list is updated
    useEffect(() => {
        if(providersIdentifiers.status !== 'loaded'
        || !providersIdentifiers.contents?.size) {
            console.error('providersIdentifiers not loaded', providersIdentifiers);
            return;
        }
        if(!listeners.current) {
            listeners.current = new Map();
        }
        const assignListeners = async () => {
            for(const [chunkIdentifier, hostIdentifier] of providersIdentifiers.contents) {
                if(!listeners.current.has(chunkIdentifier)) {
                    let collection;
                    if(hostIdentifier === LocalHost.getID()) {
                        collection = await Collection.getLocalCollection(uuid);
                    } else {
                        collection = await Collection.getRemoteCollection(hostIdentifier, uuid);
                    }
                    const listener = collection.events.on('change', () => {
                        console.log('yyy collection change event', collection);
                        dispatchUpdate({type: 'push', collection});
                    });
                    listeners.current.set(chunkIdentifier, {listener, collection});
                    dispatchUpdate({type: 'push', collection}); //force initial update
                }
            }
            for(const [chunkIdentifier, {listener, collection}] of listeners.current) {
                if(!providersIdentifiers.contents.has(chunkIdentifier)) {
                    collection.events.removeEventListener(listener);
                    listeners.current.delete(chunkIdentifier);
                }
            }
        };
        assignListeners().catch((error) => {
            console.error('Error while merging collections', error);
        });
    }, [providersIdentifiers]);
    //Reload all collections when base props change
    useEffect(() => {
        if(providersIdentifiers.status !== 'loaded'
        || !providersIdentifiers.contents?.size) {
            console.error('providersIdentifiers not loaded', providersIdentifiers);
            return;
        }
        expandedIdentifiers.current = new Set();
        dispatch({type: 'reset'});
        const reloadCollections = async () => {
            for(const [chunkIdentifier, hostIdentifier] of providersIdentifiers.contents) {
                let collection;
                if(hostIdentifier === LocalHost.getID()) {
                    collection = await Collection.getLocalCollection(uuid);
                } else {
                    collection = await Collection.getRemoteCollection(hostIdentifier, uuid);
                }
                dispatchUpdate({type: 'push', collection});
                console.log('dispatchUpdate push 1', collection);
            }
        };
        reloadCollections().catch((error) => {
            console.error('Error while merging collections', error);
        });
    }, [transform, filter]);
    //Process collection updates when they are generated
    useEffect(() => {
        if(!expandedIdentifiers.current) {
            expandedIdentifiers.current = new Set();
        }
        const getCollectionChanges = async (collection) => {
            const element = await collection.getElement(elementName);
            if(!element) {
                throw Error('NOT_FOUND'); //To be decided: throw or ignore?
            }
            if(element instanceof ChunkSet === false
            && element instanceof ChunkList === false
            && element instanceof ChunkMap === false) {
                console.log('getCollectionChanges invalid type', element);
                throw Error('INVALID_TYPE');
            }
            let added;
            for await (const item of element) {
                let keyChunk = item;
                let valueChunk;
                if(element instanceof ChunkMap) {
                    keyChunk = item[0];
                    valueChunk = item[1];
                }
                const chunkIdentifier = keyChunk.id;
                if(!expandedIdentifiers.current.has(chunkIdentifier)) {
                    if(transform) {
                        let transformed;
                        if(valueChunk) {
                            transformed = await transform(keyChunk, valueChunk);
                        } else {
                            transformed = await transform(keyChunk);
                        }
                        if(filter
                        && !await filter(transformed)) {
                            continue;
                        }
                        if(!added) {
                            added = new Map();
                        }
                        added.set(chunkIdentifier, transformed);
                    } else {
                        if(filter
                        && !await filter(valueChunk)) {
                            continue;
                        }
                        added.set(chunkIdentifier, valueChunk);
                    }
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
        };
        const processUpdates = async () => {
            console.log('processing updates', pendingUpdates);
            for(const collection of pendingUpdates) {
                const {added, deleted} = await getCollectionChanges(collection);
                if(added) {
                    console.log('added', added);
                    dispatch({type: 'added', added});
                }
                if(deleted) {
                    console.log('deleted', deleted);
                    dispatch({type: 'deleted', deleted});
                }
            }
            dispatchUpdate({type: 'clear'});
        }
        if(pendingUpdates.length > 0) {
            processUpdates().catch((error) => {
                console.error('Error while merging collections', error);
            });
        }
    }, [pendingUpdates]);
    return state.contents;
}