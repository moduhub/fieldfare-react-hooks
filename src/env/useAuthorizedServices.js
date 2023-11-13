import {useState, useEffect} from 'react'

export function useAuthorizedServices(env, hostIdentifier) {
    const [serviceIdentifiers, setServiceIdentifiers] = useState([]);
    useEffect(() => {
        if(!env) {
            return;
        }
        env.getServicesForHost(hostIdentifier).then((services) => {
            setServiceIdentifiers(services);
        });
    }, [env, hostIdentifier]);
    return serviceIdentifiers;
}