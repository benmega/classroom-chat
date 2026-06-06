# State Update During Render in SmartImage

## Description
In `frontend/src/components/common/SmartImage.jsx`, there is a state update directly within the render body:
```javascript
  if (src !== prevSrc) {
    setPrevSrc(src);
    setErrorCount(0);
  }
```
Updating state during render in a React functional component is an anti-pattern. It forces React to immediately throw away the current render pass and restart it synchronously, which degrades performance. It also makes the component's logic harder to follow and prone to infinite loops if not handled perfectly.

## Location
- `frontend/src/components/common/SmartImage.jsx` (Lines 15-18)

## Proposed Fix
Use a `useEffect` hook to reset the error state when the `src` prop changes.
```javascript
  useEffect(() => {
    setErrorCount(0);
  }, [src]);
```
Alternatively, derive the state from props without keeping a separate `prevSrc` state, or manage the `src` via a key if appropriate.
