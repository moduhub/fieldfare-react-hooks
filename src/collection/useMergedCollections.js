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
            // console.log('assignListeners ' + uuid + ' - 1');
            for(const [chunkIdentifier, hostIdentifier] of providersIdentifiers.contents) {
                // console.log('assignListeners ' + uuid + ' - 2', hostIdentifier);
                if(!listeners.current.has(chunkIdentifier)) {
                    let collection;
                    if(hostIdentifier === LocalHost.getID()) {
                        collection = await Collection.getLocalCollection(uuid);
                    } else {
                        collection = await Collection.getRemoteCollection(hostIdentifier, uuid);
                    }
                    // console.log('assignListeners ' + uuid + ' - 3', collection.events);
                    const listener = collection.events.on('change', () => {
                        console.log('assignListeners ' + uuid + ' - event');
                        dispatchUpdate({type: 'push', collection});
                    });
                    // console.log('assignListeners ' + uuid + ' - 4', collection.events.listeners.get('change'));
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
        expandedIdentifiers.current = new Map();
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
            }
        };
        reloadCollections().catch((error) => {
            console.error('Error while merging collections', error);
        });
    }, [transform, filter]);
    //Process collection updates when they are generated
    useEffect(() => {
        if(!expandedIdentifiers.current) {
            expandedIdentifiers.current = new Map();
        }
        const getCollectionChanges = async (collection) => {
            const element = await collection.getElement(elementName);
            if(!element) {
                console.log('getCollectionChanges element not found ', elementName);
                throw Error('NOT_FOUND'); //To be decided: throw or ignore?
            }
            if(element instanceof ChunkSet === false
            && element instanceof ChunkList === false
            && element instanceof ChunkMap === false) {
                console.log('getCollectionChanges invalid type', element);
                throw Error('INVALID_TYPE');
            }
            let added, changed;
            for await (const item of element) {
                let keyChunk = item;
                let valueChunk;
                if(element instanceof ChunkMap) {
                    keyChunk = item[0];
                    valueChunk = item[1];
                }
                const chunkIdentifier = keyChunk.id;
                const expandedValue = expandedIdentifiers.current.get(chunkIdentifier);
                let addedOrChanged;
                if(expandedValue === undefined) {
                    if(!added) {
                        added = new Map();
                    }
                    addedOrChanged = added;
                } else 
                if(expandedValue !== expandedValue) {
                    if(!changed) {
                        changed = new Map();
                    }
                    addedOrChanged = changed;
                }
                if(addedOrChanged) {
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
                        addedOrChanged.set(chunkIdentifier, transformed);
                    } else {
                        if(filter
                        && !await filter(valueChunk)) {
                            continue;
                        }
                        addedOrChanged.set(chunkIdentifier, valueChunk);
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
            return {added, deleted, changed};
        };
        const processUpdates = async () => {
            console.log('processing updates', pendingUpdates);
            for(const collection of pendingUpdates) {
                const {added, deleted, changed} = await getCollectionChanges(collection);
                if(added) {
                    // console.log('added', added);
                    dispatch({type: 'added', added});
                }
                if(deleted) {
                    // console.log('deleted', deleted);
                    dispatch({type: 'deleted', deleted});
                }
                if(changed) {
                    console.log('changed', changed);
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