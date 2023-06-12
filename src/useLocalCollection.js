import { useState, useEffect } from "react";
import { Collection, Utils } from "@fieldfare/core";

export function useLocalCollection(uuid) {
    const [instance, setInstance] = useState(undefined);
    useEffect(() => {
        if(!uuid
        || Utils.isUUID(uuid) === false) {
            return;
        }
        Collection.getLocalCollection(uuid).then((collection) => {
            setInstance(collection);
        });
    }, [uuid]);
    return instance;
}