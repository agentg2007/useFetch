import React, { useCallback, useEffect, useReducer } from "react";

type UseFetchResultType<TData> = {
    data: TData;
    statusCode: number;
    statusText: string;
}
type UseFetchStatuses = "idle" | "busy" | "aborted" | "error";
type UseFetchState<TData> = {
    result: UseFetchResultType<TData>;
    status: UseFetchStatuses;
    initialized: boolean;
    controller: AbortController;
};
type UseFetchActions = "aborted"
    | "setError"
    | "setInitialized"
    | "setController"
    | "setResult"
    | "setStatus";
type UseFetchReducerType<TData = any> = React.Reducer<UseFetchState<TData>, {
    type: UseFetchActions;
    payload: any;
}>

const UseFetchReducer: UseFetchReducerType = (state, { type, payload }) => {
    const upst = (newState: Partial<UseFetchState<any>>) => ({ ...state, ...newState });
    switch (type) {
        case "aborted": return upst({
            status: "aborted", result: {
                data: null, statusCode: 230, statusText: "Client aborted the request."
            }
        })
        case "setError":
            return upst({ status: "error", result: payload });
        case "setResult":
            return upst({ status: "idle", result: payload });
        case "setInitialized":
            if (payload === true) {
                return upst({ initialized: true, })
            } else {
                state.controller?.abort();
                return upst({ initialized: false, controller: null });
            }
        case "setStatus":
            return upst({ status: payload });
        case "setController":
            return upst({ controller: payload });
        default:
            return state;
    }
}

export default <TData = any>(output: "json" | "text" | "blob" = "json") => {
    const [state, d] = useReducer<UseFetchReducerType<TData>>(UseFetchReducer, {
        result: null,
        initialized: false,
        status: "idle",
        controller: new AbortController()
    });
    const dispatch = (type: UseFetchActions, payload?: any) => d({ type, payload });
    const f = (d: UseFetchResultType<TData>) => d;

    const abort = useCallback(() => {
        console.log("ABORTED")
        state.controller?.abort();
    }, [state.controller]);
    const fetchInternal = useCallback((input: RequestInfo, init?: RequestInit) => {
        if (!state.initialized) return;
        dispatch("setStatus", "busy");

        state.controller?.abort();

        const abortController = new AbortController();
        fetch(input, {
            ...init,
            signal: abortController.signal
        }).then(async r => {
            if (r.ok) {
                const out = async () => {
                    switch (output) {
                        case "blob": return await r.blob();
                        case "text": return await r.text();
                        default: return await r.json();
                    }
                }
                dispatch("setResult", f({
                    data: await out(),
                    statusCode: r.status,
                    statusText: r.statusText,
                }));
            } else {
                dispatch("setError", f({
                    data: null, statusCode: r.status, statusText: r.statusText,
                }));
            }
        }).catch(e => {
            if (abortController.signal.aborted) {
                dispatch("aborted");
            } else {
                dispatch("setError", f({
                    data: null, statusCode: 500, statusText: e.message
                }));
            }
        });
        dispatch("setController", abortController);
    }, [state.initialized, state.controller]);

    useEffect(() => {
        dispatch("setInitialized", true);
        return () => dispatch("setInitialized", false);
    }, []);

    return {
        initialized: state.initialized,
        result: state.result,
        status: state.status,
        fetch: fetchInternal,
        abort,
    }
};

