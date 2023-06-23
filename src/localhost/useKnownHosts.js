import { useEffect, useState } from 'react';
import { HostIdentifier, LocalHost, RemoteHost } from '@fieldfare/core';

export function useKnownHosts(env) {
	const [knownHosts, setKnownHosts] = useState(new Set());
	useEffect(() => {
		const interval = setInterval(() => {
			let newKnownHosts;
			const ffknownHosts = RemoteHost.getKnownHostIdentifiers();
			ffknownHosts.unshift(LocalHost.getID());
			for(const newKnownHost of ffknownHosts) {
				if(!knownHosts.has(newKnownHost)) {
					if(!newKnownHosts) {
						newKnownHosts = new Set(knownHosts);
					}
					newKnownHosts.add(newKnownHost);
				}
			}
			if(newKnownHosts) {
				setKnownHosts(newKnownHosts);
			}
		}, 1000);
		return () => clearInterval(interval);
	}, [knownHosts]);
	useEffect(() => {
		if(!env) {
			return;
		}
		const getAllProviders = async () => {
			let newKnownHosts;
			const services = await env.localCopy.getElement('services');
			if(!services) {
				return;
			}
			for await (const serviceDescriptor of services) {
				const providers = await env.localCopy.getElement(serviceDescriptor.uuid+'.providers');
				if(!providers) {
					continue;
				}
				for await (const providerChunk of providers) {
					const providerIdentifier = HostIdentifier.fromChunkIdentifier(providerChunk.id);
					if(!knownHosts.has(providerIdentifier)) {
						if(!newKnownHosts) {
							newKnownHosts = new Set(knownHosts);
						}
						newKnownHosts.add(providerIdentifier);
					}
				}
			}
			return newKnownHosts;
		}
		getAllProviders().then((newKnownHosts) => {
			if(newKnownHosts) {
			   setKnownHosts(newKnownHosts);
			}
		}).catch((err) => {
			console.log('error getting all providers', err);
		});
	}, [env, knownHosts]);
	return knownHosts;
}