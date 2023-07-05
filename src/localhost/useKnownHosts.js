import { useEffect, useState } from 'react';
import { LocalHost, RemoteHost } from '@fieldfare/core';

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
		const getAllAdmins = async (prevKnownHosts) => {
			let newKnownHosts;
			const admins = await env.localCopy.getElement('admins');
			if(!admins) {
				return;
			}
			for await (const adminChunk of admins) {
				const {id:adminIdentifier} = await adminChunk.expand(0);
				if(!prevKnownHosts.has(adminIdentifier)) {
					if(!newKnownHosts) {
						newKnownHosts = new Set(prevKnownHosts);
					}
					newKnownHosts.add(adminIdentifier);
				}
			}
			return newKnownHosts;
		}
		const getAllProviders = async (prevKnownHosts) => {
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
					const {id:providerIdentifier} = providerChunk.expand(0);
					if(!prevKnownHosts.has(providerIdentifier)) {
						if(!newKnownHosts) {
							newKnownHosts = new Set(prevKnownHosts);
						}
						newKnownHosts.add(providerIdentifier);
					}
				}
			}
			return newKnownHosts;
		}
		getAllProviders(knownHosts).then((newKnownHosts) => {
			let nextKnownHosts = knownHosts;
			if(newKnownHosts) {
				setKnownHosts(newKnownHosts);
				nextKnownHosts = newKnownHosts;
			}
			getAllAdmins(nextKnownHosts).then((newKnownHosts) => {
				if(newKnownHosts) {
					setKnownHosts(newKnownHosts);
				}
			});
		}).catch((err) => {
			console.log('error getting new known hosts', err);
		});
	}, [env, knownHosts]);
	return knownHosts;
}