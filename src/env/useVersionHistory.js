import { useState, useEffect } from 'react';
import { LocalHost, VersionChain, Chunk } from '@fieldfare/core';

export function useVersionHistory(versionedCollection, maxChanges) {
    const [status, setStatus] = useState('loading'); // 'loading', 'loaded', 'error'
    const [error, setError] = useState(undefined); // [error, setError
    const [statements, setStatements] = useState([]);
    useEffect(() => {
        if(!versionedCollection) {
            return;
        }
        if(maxChanges <= 0) {
            return;
        }
        const getStatements = async () => {
            const newStatements = [];
            const localChain = new VersionChain(
                versionedCollection.currentVersion,
                LocalHost.getID(),
                maxChanges);
            for await (const {version, statement} of localChain.versionsIterator()) {
                if(statement) {
                    const changes = await Chunk.fromIdentifier(statement.data.changes, statement.source).expand(0);
                    newStatements.push({version, issuer: statement.source, changes});
                }
            }
            return newStatements;
        };
        getStatements().then((newStatements) => {
            setStatements(newStatements);
            setStatus('loaded');
        }).catch((error) => {
            setError(JSON.stringify(error.msg));
            setStatus('error');
        });
    }, [versionedCollection, maxChanges]);
    return {status, error, statements};
}