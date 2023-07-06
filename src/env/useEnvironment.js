import { useReducer, useEffect } from 'react';
import { Environment, LocalHost } from '@fieldfare/core';

export function useEnvironment(uuid, webports) {
    const initialState = {
        status: 'loading',
        error: undefined,
        env: undefined,
        version: undefined
    };
    const [state, dispatch] = useReducer((prevState, newState) => {
        switch(newState.status) {
            case 'loading': {
                return {
                    ...prevState,
                    status: 'loading'
                };
            }
            case 'loaded': {
                return {
                    status: 'loaded',
                    env: newState.env ? newState.env : prevState.env,
                    version: newState.version ? newState.version : prevState.version,
                    error: undefined
                };
            }
            case 'error': {
                return {
                    status: 'error',
                    env: undefined,
                    version: undefined,
                    error: newState.error
                };
            }
            default: {
                throw Error('Invalid status: ' + newState.status);
            }
        }
    }, initialState);
    useEffect(() => {
        let env = LocalHost.getEnvironment(uuid);
        if(env) {
            dispatch({
                status: 'loaded',
                env: env,
                version: env.currentVersion
            });
            return;
        }
        const setupEnvironment = async () => {
            const newEnv = new Environment(uuid);
            await newEnv.init();
            await LocalHost.join(newEnv);
            return newEnv;
        };
        setupEnvironment().then((newEnv) => {
            dispatch({
                status: 'loaded',
                env: newEnv,
                version: newEnv.currentVersion
            });
        }).catch((err) => {
            console.error('Error while setting up the environment', err);
            dispatch({
                status: 'error',
                error: err
            });
        });
    }, [uuid]);
    useEffect(() => {
        const webportStringList = webports.split(',');
        for (const webportString of webportStringList) {
            const webportStringParts = webportString.split(':');
            const webportObject = {
                protocol: webportStringParts[0],
                address: webportStringParts[1],
                port: webportStringParts[2]
            };
            LocalHost.connectWebport(webportObject);
        }
    }, [webports]);
    useEffect(() => {
        if(state.env) {
            const listener = state.env.events.on('update', (version) => {
                dispatch({
                    status: 'loaded',
                    version: version
                });
            });
            return () => {
                state.env.events.removeEventListener(listener);
            }
        }
    }, [state.env]);
    return state;
}
