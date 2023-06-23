import { useState, useEffect } from 'react';
import { HostIdentifier } from '@fieldfare/core';

/**
 * Return the complete list of admins for a Fieldfare Environment
 * @param {Environment} env Fieldfare Environmente instance
 * @returns {Set<HostIdentifier>} Set of HostIdentifiers for the admins of the Environment
 */
export function useEnvironmentAdmins(env) {
    const [admins, setAdmins] = useState(new Set());
    useEffect(() => {
        if(!env) {
            return;
        }
        const getNewAdmins = async () => {
            let newAdmins;
            const adminsList = await env.localCopy.getElement('admins');
            if(!adminsList) {
                return;
            }
            for await (const adminChunk of adminsList) {
                const adminIdentifier = HostIdentifier.fromChunkIdentifier(adminChunk.id);
                if(!admins.has(adminIdentifier)) {
                    if(!newAdmins) {
                        newAdmins = new Set(admins);
                    }
                    newAdmins.add(adminIdentifier);
                }
            }
            return newAdmins;
        }
        getNewAdmins().then((newAdmins) => {
            if(newAdmins) {
                setAdmins(newAdmins);
            }
        }).catch((err) => {
            console.log('error getting new admins', err);
        });
    }, [env, admins]);
    return admins;
}