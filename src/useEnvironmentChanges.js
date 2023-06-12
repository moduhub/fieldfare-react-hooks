import { useState, useEffect, useContext } from 'react';
import { EnvironmentContext } from './FieldfareContext.js';
import { LocalHost, VersionChain } from '@fieldfare/core';

export function useEnvironmentChanges(maxChanges) {
    const [status, setStatus] = useState('loading'); // 'loading', 'loaded', 'error'
    const [changes, setChanges] = useState([]);
    const env = useContext(EnvironmentContext);
    useEffect(() => {
        if(!env) {
            return;
        }
        if(maxChanges <= 0) {
            return;
        }
        const localChain = new VersionChain(env.currentVersion, LocalHost.getID(), maxChanges);
        localChain.getChangesArray().then((localChainArray) => {
            setChanges(localChainArray);
            setStatus('loaded');
        });
    }, [env, maxChanges]);
    return {status, changes};
}