import { useState, useEffect } from "react";
import { LocalHost } from "@fieldfare/core";

export function useAdminAuth(env) {
    const [isAdminState, setIsAdmin] = useState(false);
    useEffect(() => {
        if(!env) {
            return;
        }
        env.isAdmin(LocalHost.getID()).then((isAdmin) => {
            setIsAdmin(isAdmin);
        });
    }, [env]);
    return isAdminState;
}