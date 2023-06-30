import { useState, useEffect, useRef } from 'react';
import { LocalHost, Collection } from '@fieldfare/core';

export function useLocalHostState() {
    const [announceMessage, setAnnounceMessage] = useState(undefined);
    const collectionStates = useRef(undefined);
    useEffect(() => {
        const checkInterval = setInterval(() => {
            Collection.getLocalCollectionsStates().then((newCollectionStates) => {
                let changed = false;
                if(collectionStates.current) {
                    for(const prop in newCollectionStates) {
                        if(!collectionStates.current[prop]
                        || collectionStates.current[prop] !== newCollectionStates[prop]) {
                            console.log('collection states updated ' + prop + ' from ' + collectionStates[prop] + ' to ' + newCollectionStates[prop]);
                            changed = true;
                            break;
                        }
                    }
                } else {
                    changed = true;
                }
                collectionStates.current = newCollectionStates;
                if(changed) {
                    LocalHost.announce().then((announceMessage) => {
                        console.log('new announce message', announceMessage);
                        setAnnounceMessage(announceMessage);
                    });
                }
            }
        )}, 1000);
        return () => {
            clearInterval(checkInterval);
        }
    }, []);
    return announceMessage;
}
            