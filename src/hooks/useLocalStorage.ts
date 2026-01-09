import { useCallback, useEffect, useRef, useState } from 'react';
import { getFromIndexedDb, setInIndexedDb } from '../utils/storage';

let didWarnQuotaExceeded = false;
const IDB_MARKER = '__indexed_db__';
const IDB_THRESHOLD_BYTES = 200_000;

const isQuotaExceededError = (error: unknown): boolean => {
  if (error instanceof DOMException) {
    return (
      error.name === 'QuotaExceededError' ||
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    );
  }
  return false;
};

const cloneForState = <T,>(value: T): T => {
  try {
    if (typeof structuredClone === 'function') {
      return structuredClone(value);
    }
  } catch {
    // ignore
  }
  // Fallback seguro para valores serializables (requisito para localStorage)
  return JSON.parse(JSON.stringify(value)) as T;
};

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (!item) return initialValue;
      if (item === IDB_MARKER) return initialValue;
      return JSON.parse(item);
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const storedValueRef = useRef(storedValue);

  useEffect(() => {
    storedValueRef.current = storedValue;
  }, [storedValue]);

  useEffect(() => {
    const item = window.localStorage.getItem(key);
    if (item !== IDB_MARKER) return;
    getFromIndexedDb(key)
      .then((json) => {
        if (!json) return;
        try {
          const parsed = JSON.parse(json) as T;
          storedValueRef.current = parsed;
          setStoredValue(parsed);
        } catch (error) {
          console.error(error);
        }
      })
      .catch((error) => {
        console.error(error);
      });
  }, [key]);

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const current = storedValueRef.current;
      const computed = value instanceof Function ? value(current) : value;
      const valueToStore = Object.is(computed, current) ? cloneForState(computed) : computed;
      storedValueRef.current = valueToStore;
      setStoredValue(valueToStore);
      const json = JSON.stringify(valueToStore);
      if (json.length > IDB_THRESHOLD_BYTES) {
        setInIndexedDb(key, json)
          .then(() => window.localStorage.setItem(key, IDB_MARKER))
          .catch((error) => console.error(error));
        return;
      }
      window.localStorage.setItem(key, json);
    } catch (error) {
      if (isQuotaExceededError(error)) {
        try {
          const current = storedValueRef.current;
          const computed = value instanceof Function ? value(current) : value;
          const valueToStore = Object.is(computed, current) ? cloneForState(computed) : computed;
          storedValueRef.current = valueToStore;
          setStoredValue(valueToStore);
          setInIndexedDb(key, JSON.stringify(valueToStore))
            .then(() => window.localStorage.setItem(key, IDB_MARKER))
            .catch((idbError) => console.error(idbError));
        } finally {
          if (!didWarnQuotaExceeded) {
            window.dispatchEvent(new Event('storage-quota-exceeded'));
            didWarnQuotaExceeded = true;
          }
        }
        return;
      }
      console.error(error);
    }
  }, [key]);

  return [storedValue, setValue];
}
