import { useState, useEffect } from 'react';

/**
 * Get service descriptor from environment
 * @param {Environment} env Environment instance
 * @param {UUID} uuid Service UUID
 * @returns 
 */
export function useServiceDescriptor(env, uuid) {
    const [descriptor, setDescriptor] = useState(undefined);
    useEffect(() => {
        if(!env || !uuid) {
            return;
        }
        env.getServiceDescriptor(uuid).then((descriptor) => {
            setDescriptor(descriptor);
        }).catch((error) => {
            console.error('Error while getting service descriptor', error);
        });
    }, [env, uuid]);
    return descriptor;
}