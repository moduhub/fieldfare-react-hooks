import { useReducer, useEffect } from 'react';
import { Environment, LocalHost } from '@fieldfare/core';

/**
 * A custom React hook that initializes and manages the Fieldfare environment.
 * @param {string} uuid - The UUID of the environment to initialize.
 * @param {string} webports - A comma-separated string of webports to connect to.
 * @param {Environment} [EnvironmentClass=Environment] - The class to use for the environment.
 * @returns {Object} An object containing the current status, error (if any), environment, and version.
 */
export function useEnvironment(uuid, webports, EnvironmentClass=Environment) {
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
            const newEnv = new EnvironmentClass(uuid);
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
