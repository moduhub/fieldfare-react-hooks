import { useEffect, useState, useCallback} from 'react';

export function useRemoteMethod(provider, serviceDescriptor, methodName) {
    const [serviceInstance, setServiceInstance] = useState(undefined);
    const [state, setState] = useState({
        status: 'loading',
        error: undefined,
        result: undefined,
    });
    useEffect(() => {
        if(!serviceDescriptor) {
            console.log('useRemoteMethod failed, no service descriptor');
            setState({
                status: 'error',
                error: 'no service descriptor',
                result: undefined
            });
            return;
        }
        if(!provider) {
            console.log('useRemoteMethod failed, no provider');
            setState({
                status: 'error',
                error: 'no provider',
                result: undefined
            });
            return;
        }
        provider.accessService(serviceDescriptor)
        .then((service) => {
            setServiceInstance(service);
            setState({
                status: 'idle',
                error: undefined,
                result: undefined
            });
        })
        .catch((error) => {
            setState({
                status: 'error',
                error: error,
                result: undefined
            });
        });
    }, [serviceDescriptor, provider]);
    const call = useCallback((params) => {
        console.log('useRemoteMethod call updated', serviceInstance, methodName);
        if(!serviceInstance) {
            console.log('useRemoteMethod call failed, no service instance');
            setState({
                status: 'error',
                error: 'no service instance',
                result: undefined
            });
            return;
        }
        if(!serviceInstance[methodName]) {
            console.log("Service instance doesn't have method " + methodName);
            setState({
                status: 'error',
                error: 'method ' + methodName + ' not found',
                result: undefined
            });
            return;
        }
        setState({
            status: 'requested',
            error: undefined,
            result: undefined
        });
        serviceInstance[methodName](params)
        .then((result) => {
            console.log('useRemoteMethod call succeeded', result);
            setState({
                status: 'success',
                error: undefined,
                result: result
            });
        }).catch((error) => {
            console.log('useRemoteMethod call failed', error);
            setState({
                status: 'error',
                error: error.message,
                result: undefined
            });
        });
    }, [serviceInstance, methodName]);
    return {...state, call};
}