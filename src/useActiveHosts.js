import { useState, useEffect, useContext } from 'react';
import { EnvironmentContext } from './FieldfareContext.js';

export function useActiveHosts() {
    const [activeHostsStatus, setActiveHostsStatus] = useState('loading'); // 'loading', 'loaded', 'error'
    const [activeHosts, setActiveHosts] = useState([]);
    const env = useContext(EnvironmentContext);
    useEffect(() => {
        if(!env) {
            return;
        }
        env.getActiveHosts().then((activeHosts) => {
            setActiveHosts(activeHosts);
            setActiveHostsStatus('loaded');
        });
    }, [env]);
    return {activeHostsStatus, activeHosts};
}