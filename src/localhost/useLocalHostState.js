import { useState, useEffect } from 'react';
import { LocalHost, Collection } from '@fieldfare/core';

export function useLocalHostState() {
    const [announceMessage, setAnnounceMessage] = useState(undefined);
    const [collectionStates, setCollectionStates] = useState(undefined);
    useEffect(() => {
        const checkInterval = setInterval(() => {
            Collection.getLocalCollectionsStates().then((newCollectionStates) => {
                if(!collectionStates) {
                    setCollectionStates(newCollectionStates);
                    return;
                }
                for(const prop in newCollectionStates) {
                    if(!collectionStates[prop]
                    || collectionStates[prop] !== newCollectionStates[prop]) {
                        console.log('collection states updated ' + prop + ' from ' + collectionStates[prop] + ' to ' + newCollectionStates[prop]);
                        setCollectionStates(newCollectionStates);
                        return;
                    }
                }
            }
        )}, 1000);
        return () => {
            clearInterval(checkInterval);
        }
    }, [collectionStates]);
    useEffect(() => {
        LocalHost.announce().then((announceMessage) => {
            setAnnounceMessage(announceMessage);
        });
    }, [collectionStates]);
    return announceMessage;
}
            