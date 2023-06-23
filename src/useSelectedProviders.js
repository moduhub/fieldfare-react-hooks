import { useEffect, useState } from 'react';
import { HostIdentifier, LocalHost, RemoteHost, Utils } from "@fieldfare/core";

export function useSelectedProviders(env, serviceUUID, filters, quantity) {
    const [selectedProviders, setSelectedProviders] = useState({
        online: [],
        offline: []
    });
    useEffect(() => {
        const offlineEventHandler = RemoteHost.on('offline', (newOfflineHost) => {
            for(const [index, onlineHost] of selectedProviders.online.entries()) {
                if(onlineHost.id == newOfflineHost.id) {
                    console.log(onlineHost.id + ' is now offline');
                    selectedProviders.online = selectedProviders.online.slice(index, 1)
                    setSelectedProviders({
                        online: selectedProviders.online,
                        offline: [...(selectedProviders.offline), newOfflineHost]
                    });
                    break;
                }
            }
        });
        const onlineEventHandler = RemoteHost.on('online', (newOnlineHost) => {
            for(const [index, offlineHost] of selectedProviders.offline.entries()) {
                if(offlineHost.id == newOnlineHost.id) {
                    selectedProviders.offline = selectedProviders.offline.slice(index, 1)
                    setSelectedProviders({
                        online: [...(selectedProviders.online), newOnlineHost],
                        offline: selectedProviders.offline
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
        if(!serviceUUID
        || Utils.isUUID(serviceUUID) == false) {
            console.log('ProviderSelector failed, no service uuid');
            return;
        }
        if(!env) {
            console.log('ProviderSelector failed, no environment');
            return;
        }
        env.localCopy.getElement(serviceUUID + '.providers')
        .then((providers) => {
            if(!providers) {
                return Promise.reject('No providers found');
            }
            return providers.toArray();
        }).then((providersArray) => {
            //TODO: randomize array
            const newOnlineProviders = [];
            const newOfflineProviders = [];
            for(const chunk of providersArray) {
                const hostIdentifier = HostIdentifier.fromChunkIdentifier(chunk.id);
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
                for(const chunk of providersArray) {
                    const hostIdentifier = HostIdentifier.fromChunkIdentifier(chunk.id);
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
        });
    }, [env, serviceUUID, filters, quantity]);
    return selectedProviders;
}