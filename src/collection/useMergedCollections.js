import { useEffect, useState, useRef } from "react";
import { useContents } from "./useContents.js";
import {
    Collection, LocalHost,
    ChunkList, ChunkSet, ChunkMap
} from "@fieldfare/core";

const transformHostIdentifiers = async (chunk) => {
    const {id} = await chunk.expand(0);
    return id;
};

export function useMergedCollections(env, uuid, elementName, transform=(keyChunk,valueChunk)=>valueChunk?valueChunk:keyChunk) {
    const [contents, setContents] = useState(() => new Map());
    const providersIdentifiers = useContents(env?.localCopy, uuid+'.providers', transformHostIdentifiers);
    console.log('providersIdentifiers', providersIdentifiers);
    const listeners = useRef();
    const pendingUpdates = useRef();
    useEffect(() => {
        const updateFromCollection = async (collection, newContents) => {
            const element = await collection.getElement(elementName);
            if(element) {
                if(element instanceof ChunkSet
                || element instanceof ChunkList) {
                    for await (const chunk of element.chunks()) {
                        const chunkIdentifier = chunk.id;
                        if(!contents.has(chunkIdentifier)) {
                            if(!newContents) {
                                newContents = new Map(contents);
                            }
                            const transformed = await transform(chunk);
                            newContents.set(chunkIdentifier, transformed);
                        }
                    }
                } else 
                if(element instanceof ChunkMap) {
                    for await (const [keyChunk, valueChunk] of element) {
                        const chunkIdentifier = keyChunk.id;
                        if(!contents.has(chunkIdentifier)) {
                            if(!newContents) {
                                newContents = new Map(contents);
                            }
                            const transformed = await transform(keyChunk, valueChunk);
                            newContents.set(chunkIdentifier, transformed);
                        }
                    }
                } else {
                    //throw Error('INVALID_TYPE'); //To be decided: throw or ignore?
                    console.error('INVALID_TYPE');
                    return;
                }
            }
            return newContents;
        };
        const mergeCollections = async () => {
            let mergedContents;
            if(!pendingUpdates.current?.length) {
                return;
            }
            for(const collection of pendingUpdates.current) {
                const newContents = await updateFromCollection(collection, mergedContents);
                if(newContents) {
                    mergedContents = newContents;
                }
            }
            pendingUpdates.current = [];
            return mergedContents;
        }
        const interval = setInterval(() => {
            mergeCollections().then(mergedContents => {
                if(mergedContents) {
                    setContents(mergedContents);
                }
            }).catch(error => {
                console.error('error while merging collections', error);
            });
        }, 1000);
        return () => {
            clearInterval(interval);
        };
    }, []);
    useEffect(() => {
        if(providersIdentifiers.status !== 'loaded'
        || !providersIdentifiers.contents?.size) {
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
                    console.log('set listener before ' + hostIdentifier, collection);
                    const listener = collection.events.on('change', () => {
                        console.log('yyy collection change event', collection);
                        if(!pendingUpdates.current) {
                            pendingUpdates.current = [];
                        }
                        pendingUpdates.current = [...pendingUpdates.current, collection];
                    });
                    listeners.current.set(chunkIdentifier, {listener, collection});
                    if(!pendingUpdates.current) {
                        pendingUpdates.current = [];
                    }
                    pendingUpdates.current = [...pendingUpdates.current, collection];
                    console.log('set listener after ' + hostIdentifier, collection);
                }
            }
            console.log('entering listener garbage collect', providersIdentifiers.contents);
            for(const [chunkIdentifier, {listener, collection}] of listeners.current) {
                if(!providersIdentifiers.contents.has(chunkIdentifier)) {
                    // collection.events.removeEventListener(listener);
                    // listeners.current.delete(chunkIdentifier);
                    console.log('del listener ' + chunkIdentifier, collection);
                } else {
                    console.log('keep listener ' + chunkIdentifier, collection);
                }
            }
            console.log('currentListeners', listeners.current);
        };
        assignListeners().catch((error) => {
            console.error('Error while merging collections', error);
        });
    }, [providersIdentifiers]);
    return contents;
}