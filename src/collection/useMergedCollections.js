import { useEffect, useState, useRef } from "react";
import { useContents } from "./useContents.js";
import {
    HostIdentifier, Collection, LocalHost,
    ChunkList, ChunkSet, ChunkMap
} from "@fieldfare/core";

export function useMergedCollections(env, uuid, elementName, transform=(keyChunk,valueChunk)=>valueChunk?valueChunk:keyChunk) {
    const [contents, setContents] = useState(() => new Map());
    const providersIdentifiers = useContents(env?.localCopy, uuid+'.providers');
    const listeners = useRef();
    useEffect(() => {
        if(!env || !uuid || !providersIdentifiers) {
            return;
        }
        if(providersIdentifiers.status !== 'loaded'
        || !providersIdentifiers.contents?.size) {
            return;
        }
        if(!listeners.current) {
            listeners.current = new Map();
        }
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
        const assignListeners = async () => {
            let newMergedContents = undefined;
            for(const [chunkIdentifier] of providersIdentifiers.contents) {
                if(!listeners.current.has(chunkIdentifier)) {
                    const providerIdentifier = HostIdentifier.fromChunkIdentifier(chunkIdentifier);
                    let collection;
                    if(providerIdentifier === LocalHost.getID()) {
                        collection = await Collection.getLocalCollection(uuid);
                    } else {
                        collection = await Collection.getRemoteCollection(providerIdentifier, uuid);
                    }
                    const listener = collection.events.on('change', () => {
                        console.log('yyy collection change event', collection);
                        updateFromCollection(collection).then(newContents => {
                            if(newContents) {
                                setContents(newContents);
                            }
                        }).catch((error) => {
                            console.error('Error while updating collection', error);
                        });
                    });
                    listeners.current.set(chunkIdentifier, {listener, collection});
                    newMergedContents = await updateFromCollection(collection, newMergedContents);
                }
            }
            for(const [chunkIdentifier, {listener, collection}] of listeners.current) {
                if(!providersIdentifiers.contents.has(chunkIdentifier)) {
                    collection.events.removeEventListener(listener);
                    listeners.current.delete(chunkIdentifier);
                }
            }
            return newMergedContents;
        };
        assignListeners().then(newMergedContents => {
            if(newMergedContents) {
                setContents(newMergedContents);
            }
        }).catch((error) => {
            console.error('Error while merging collections');
        });
    }, [env, uuid, elementName, providersIdentifiers]);
    return contents;
}