import { useEffect, useState, useRef } from "react";
import { useContents } from "./useContents.js";
import { HostIdentifier, Collection, LocalHost } from "@fieldfare/core";

export function useMergedCollections(env, uuid, elementName) {
    const [contents, setContents] = useState(() => new Map());
    const providersIdentifiers = useContents(env?.localCopy, uuid+'.providers');
    const listeners = useRef();
    useEffect(() => {
        if(!env || !uuid || !providersIdentifiers) {
            return;
        }
        if(providersIdentifiers.status !== 'loaded'
        || !providersIdentifiers.chunks?.size) {
            return;
        }
        if(!listeners.current) {
            listeners.current = new Map();
        }
        const updateFromCollection = async (collection, newContents) => {
            const element = await collection.getElement(elementName);
            if(!element) {
                throw Error('NOT_DEFINED');
            }
            for await (const chunk of element.chunks()) {
                const chunkIdentifier = chunk.id;
                if(!contents.has(chunkIdentifier)) {
                    if(!newContents) {
                        newContents = new Map(contents);
                    }
                    newContents.set(chunkIdentifier, chunk);
                }
            }
            return newContents;
        };
        const assignListeners = async () => {
            let newMergedContents = undefined;
            for(const [chunkIdentifier] of providersIdentifiers.chunks) {
                if(!listeners.current.has(chunkIdentifier)) {
                    const providerIdentifier = HostIdentifier.fromChunkIdentifier(chunkIdentifier);
                    let collection;
                    if(providerIdentifier === LocalHost.getID()) {
                        collection = await Collection.getLocalCollection(uuid);
                    } else {
                        collection = await Collection.getRemoteCollection(providerIdentifier, uuid);
                    }
                    const listener = collection.events.on('change', () => {
                        updateFromCollection(collection).then(newContents => {
                            if(newContents) {
                                setContents(newContents);
                            }
                        });
                    });
                    listeners.current.set(chunkIdentifier, {listener, collection});
                    newMergedContents = await updateFromCollection(collection, newMergedContents);
                }
            }
            for(const [chunkIdentifier, {listener, collection}] of listeners.current) {
                if(!providersIdentifiers.chunks.has(chunkIdentifier)) {
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
        });
    }, [env, uuid, elementName, providersIdentifiers]);
    return contents;
}