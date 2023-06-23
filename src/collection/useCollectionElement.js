import {useEffect, useReducer} from 'react';

export function useCollectionElement(collection, elementName) {
    const initialState = {
        status: 'loading',
        instance: undefined,
        error: undefined
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
                    instance: newState.instance,
                    error: undefined
                };
            }
            case 'error': {
                return {
                    status: 'error',
                    instance: undefined,
                    error: newState.error
                };
            }
            default: {
                throw Error('Unknown status: ' + newState.status);
            }
        }
    }, initialState);
    useEffect(() => {
        if(!collection) {
            dispatch({
                status: 'error',
                error: 'NO_COLLECTION'
            });
            return;
        }
        dispatch({
            status: 'loading'
        });
        collection.getElement(elementName).then((instance) => {
            if(!instance) {
                throw Error('NOT_FOUND');
            }
            dispatch({
                status: 'loaded',
                instance: instance
            });
        }).catch((error) => {
            dispatch({
                status: 'error',
                error: error.message
            });
        });
        const listener = collection.events.on(elementName + '.change', (instance) => {
            dispatch({
                status: 'loaded',
                instance: instance
            });
        });
        return () => {
            collection.events.removeEventListener(listener);
        };
    }, [collection, elementName]);
    return state;
}