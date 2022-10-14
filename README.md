# useFetch

useFetch is an easy to use, lightweight, fetch api hook for react.

## Features:

- Fetch management.
- Cancelable queries.
- Ensures only 1 fetching is called.
- Prevents data leaking by previous call.

## Usage:

> useFetch(output: "text" | "blob" | "json") - _default: json_

## Example:

```typescript
const App = () => {
  const { result, status, abort, fetch } = useFetch("text");
  const resultText = `${result?.statusCode}: ${result?.statusText}`;
  return (
    <div>
      <h1>{result?.data}</h1>
      <h3>{status}</h3>
      <div>{resultText}</div>
      <button onClick={() => fetch(`/test-api`)}>Request</button>
      <button disabled={status != "busy"} onClick={abort}>
        Abort
      </button>
    </div>
  );
};
const root = document.getElementById("AppRoot");
root && ReactDOM.render(<App />, root);
```
