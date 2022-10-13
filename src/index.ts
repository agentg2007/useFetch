import React, { useCallback, useEffect, useReducer, useState } from "react";

type UseFetchResultType<TData> = {
    data: TData;
    statusCode: number;
    statusText: string;
}
type UseFetchStatuses = "idle" | "busy" | "cancelled" | "error";
type UseFetchState<TData> = {
    result: UseFetchResultType<TData>;
    status: UseFetchStatuses;
    initialized: boolean;
};
type UseFetchActions = "setInitialized" | "setResult" | "setStatus";
type UseFetchReducerType<TData = any> = React.Reducer<UseFetchState<TData>, {
    type: UseFetchActions;
    payload: any;
}>

const UseFetchReducer: UseFetchReducerType = (state, { type, payload }) => {
    const upst = (newState: Partial<UseFetchState<any>>) => ({ ...state, ...newState });
    switch (type) {
        case "setResult":
            return upst({ result: payload });
        case "setInitialized":
            return upst({ initialized: payload === true });
        case "setStatus":
            return upst({ status: payload });
        default:
            return state;
    }
}

export default <TData = any>(output: "json" | "text" | "blob" = "json") => {
    const [controller, setController] = useState<AbortController>();
    const [state, d] = useReducer<UseFetchReducerType<TData>>(UseFetchReducer, {
        result: null,
        initialized: false,
        status: "idle",
    });
    const dispatch = (type: UseFetchActions, payload?: any) => d({ type, payload });
    const f = (d: UseFetchResultType<TData>) => d;

    const cancel = useCallback(() => {
        if (controller != null) {
            controller.abort();
        }
    }, [controller]);
    const fetchInternal = useCallback(async (input: RequestInfo, init: RequestInit) => {
        if (!state.initialized) return;
        dispatch("setStatus", "busy");
        const abortController = new AbortController();
        setController(c => {
            c != null && c.abort();
            return abortController;
        });
        const data = await fetch(input, {
            ...init,
            signal: abortController.signal
        }).then(async r => {
            const get = async () => {
                if (r.ok) {
                    const out = async () => {
                        switch (output) {
                            case "blob": return await r.blob();
                            case "text": return await r.text();
                            default: return await r.json();
                        }
                    }
                    const data = await out();
                    dispatch("setStatus", "idle");
                    return data;
                } else {
                    dispatch("setStatus", "error");
                    return null
                }
            }
            return f({
                statusCode: r.status,
                statusText: r.statusText,
                data: await get(),
            })
        }).catch(e => {
            dispatch("setStatus", "error");
            return f({
                data: null,
                statusCode: 500,
                statusText: e.message
            });
        }).finally(() => setController(null));
        dispatch("setResult", data);
    }, [state.initialized]);

    useEffect(() => {
        dispatch("setInitialized", true);
        return () => {
            dispatch("setInitialized", false);
            setController(c => {
                c != null && c.abort();
                return null;
            });
        };
    }, []);
    useEffect(() => {
        return () => cancel();
    }, [cancel]);

    return {
        initialized: state.initialized,
        result: state.result,
        status: state.status,
        fetch: fetchInternal,
        cancel,
    }
};

