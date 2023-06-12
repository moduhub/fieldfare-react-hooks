import { useContext, useEffect, useState, useCallback} from 'react';
import {
    ServiceDescriptorContext,
    SelectedHostsContext
} from './FieldfareContext.js';

export function useRemoteMethod(methodName, params) {
    const serviceDescriptor = useContext(ServiceDescriptorContext);
    const selectedProviders = useContext(SelectedHostsContext);
    const [serviceInstance, setServiceInstance] = useState(undefined);
    const [state, setState] = useState({
        status: 'loading',
        error: undefined,
        result: undefined,
    });
    useEffect(() => {
        if(!serviceDescriptor) {
            console.log('useRemoteMethod failed, no service descriptor');
            return;
        }
        if(!selectedProviders
        || selectedProviders.online.length === 0) {
            console.log('useRemoteMethod failed, no online providers');
            setState({
                status: 'error',
                error: 'no online providers',
                result: undefined
            });
            return;
        }
        const service = selectedProviders.online[0].accessService(serviceDescriptor);
        if(!service) {
            setState({
                status: 'error',
                error: 'method ' + methodName + ' not found',
                result: undefined
            });
            return;
        }
        setServiceInstance(service);
        setState({
            status: 'idle',
            error: undefined,
            result: undefined
        });
    }, [serviceDescriptor, selectedProviders]);
    const call = useCallback(() => {
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
            setState({
                status: 'error',
                error: error,
                result: undefined
            });
        });
    }, [serviceInstance, params]);
    return {...state, call};
}