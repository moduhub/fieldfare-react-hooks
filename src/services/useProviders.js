import { useState, useEffect } from 'react';
import { HostIdentifier, Utils } from '@fieldfare/core';
import { useCollectionElement } from '../collection/useCollectionElement.js';
import { makeChunkBuffer } from '../utils/makeChunkBuffer.js';

/**
 * Get all providers for a service in a given environment
 * @param {Environment} env The environment to search providers in
 * @param {UUID} serviceUUID UUID of the service to search for providers of
 * @returns {Set<HostIdentifier>} Set of HostIdentifiers for the providers of the service
 */
export function useProviders(env, serviceUUID) {
	const providersChunkSet = useCollectionElement(env?.localCopy, serviceUUID + '.providers');
	const [providers, setProviders] = useState(() => makeChunkBuffer());
	useEffect(() => {
		if(!providersChunkSet.instance) {
			return;
		}
		makeChunkBuffer(providersChunkSet.instance, providers, (chunk) => {
			return HostIdentifier.fromChunkIdentifier(chunk.id);
		}).then((newProviders) => {
			if(newProviders) {
				setProviders(newProviders);
			}
		}).catch((err) => {
			console.log('error getting new providers', err);
		});
	}, [providersChunkSet]);
	return providers;
}