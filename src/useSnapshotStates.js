import { useState, useEffect } from "react";
import { useChunkSet, useSelectedProviders } from "./index.js";
import { snapshotServiceUUID } from "@fieldfare/standard";

export function useSnapshotStates(env, serviceUUID) {
    console.log('useSnapshotStates', snapshotServiceUUID)
    const [snapshotStates, setSnapshotStates] = useState(() => new Set());
    const selectedSnapshots = useSelectedProviders(env, snapshotServiceUUID, 'online', 1);
    const providersIdentifiers = useChunkSet(env?.localCopy, serviceUUID+'.providers');
    useEffect(() => {
        console.log('useSnapshotStates env', env);
        console.log('useSnapshotStates selectedSnapshots', selectedSnapshots);
        console.log('useSnapshotStates providersIdentifiers', providersIdentifiers);
        if(!env || !selectedSnapshots || !providersIdentifiers) {
            return;
        }
        const mergeHostStates = async () => {
            let newStates = undefined;
            const snapshotServiceDescriptor = await env.getServiceDescriptor(snapshotServiceUUID);
            for(const provider of selectedSnapshots.online) {
                const snapshotService = provider.accessService(snapshotServiceDescriptor);
                if(snapshotService) {
                    console.log('got snapshotService', snapshotService);
                    const hostStates = await snapshotService.collection.getElement('hostStates');
                    if(hostStates) {
                        for await (const providerIdentifier of providersIdentifiers) {
                            const newStateChunk = await hostStates.get(providerIdentifier);
                            const newState = await newStateChunk.expand(0);
                            const prevState = snapshotStates.get(providerIdentifier);
                            console.log('newStateChunk', newStateChunk);
                            if(!prevState || prevState.ts < newState.ts) {
                                if(!newStates) {
                                    newStates = new Set(snapshotStates);
                                }
                                newStates.set(providerIdentifier, newState);
                            }
                        }
                    }
                }
            }
            return newStates;
        }
        mergeHostStates().then((newStates) => {
            if(newStates) {
                setSnapshotStates(newStates);
            }
        });
    }, [env, snapshotStates, selectedSnapshots, providersIdentifiers]);
    console.log('useSnapshotStates', snapshotStates);
    return snapshotStates;
}