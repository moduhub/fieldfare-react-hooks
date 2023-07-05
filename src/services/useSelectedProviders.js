import { useEffect, useState } from 'react';
import { LocalHost, RemoteHost } from "@fieldfare/core";
import { useContents } from '../collection/index.js';

export function useSelectedProviders(env, serviceUUID, filters, quantity) {
    const [selectedProviders, setSelectedProviders] = useState({
        online: [],
        offline: []
    });
    const providers = useContents(env?.localCopy, serviceUUID+'.providers', async (chunk) => {
        const {id} = await chunk.expand(0);
        return id;
    });
    useEffect(() => {
        const offlineEventHandler = RemoteHost.on('offline', (newOfflineHost) => {
            for(const [index, onlineHost] of selectedProviders.online.entries()) {
                if(onlineHost.id == newOfflineHost.id) {
                    setSelectedProviders({
                        online: selectedProviders.online.toSpliced(index, 1),
                        offline: [...(selectedProviders.offline), newOfflineHost]
                    });
                    break;
                }
            }
        });
        const onlineEventHandler = RemoteHost.on('online', (newOnlineHost) => {
            for(const [index, offlineHost] of selectedProviders.offline.entries()) {
                if(offlineHost.id == newOnlineHost.id) {
                    setSelectedProviders({
                        online: [...(selectedProviders.online), newOnlineHost],
                        offline: selectedProviders.offline.toSpliced(index, 1)
                    });
                    break;
                }
            }
        });
        const establishInterval = setInterval(() => {
            for(const [index, offlineHost] of selectedProviders.offline.entries()) {
                LocalHost.establish(offlineHost);
            }
        }, 10000);
        return () => { 
            clearInterval(establishInterval);
            RemoteHost.removeEventListener(onlineEventHandler);
            RemoteHost.removeEventListener(offlineEventHandler);
        }
    }, [selectedProviders]);
    useEffect(() => {
        if(providers.status !== 'loaded') {
            return;
        }
        //TODO: randomize array
        const newOnlineProviders = [];
        const newOfflineProviders = [];
        for(const [chunkIdentifier, hostIdentifier] of providers.contents) {
            const remoteHost = RemoteHost.fromHostIdentifier(hostIdentifier);
            if(remoteHost.isActive()) {
                newOnlineProviders.push(remoteHost);
                if(newOnlineProviders.length == quantity) {
                    break;
                }
            }
        }
        if(newOnlineProviders.length < quantity) {
            const remaining = quantity - newOnlineProviders.length;
            for(const [chunkIdentifier, hostIdentifier] of providers.contents) {
                const remoteHost = RemoteHost.fromHostIdentifier(hostIdentifier);
                if(!remoteHost.isActive()) {
                    newOfflineProviders.push(remoteHost);
                    LocalHost.establish(remoteHost);
                    if(newOfflineProviders.length == remaining) {
                        break;
                    }
                }
            }
        }
        // setSelectedProviders(newSelectedProviders);
        setSelectedProviders({
            online: newOnlineProviders,
            offline: newOfflineProviders
        });
    }, [providers, filters, quantity]);
    return selectedProviders;
}