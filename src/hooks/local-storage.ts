/* eslint-disable no-console */
/* eslint-disable react-hooks/exhaustive-deps */
import { get, set } from 'local-storage'
import { useState, useEffect } from "react";
import { isUndefined } from 'lodash';

export const useLocalStorage = <T>(key: string, initialValue: T) => {
  const [storedValue, setStoredValue] = useState<T | undefined>(initialValue);

  const setValue = (value: T) => {
    set(key, value);
  };

  useEffect(() => {
    const value = get(key);

    if (value) {
      try {
        const parsed = value as T;
        setStoredValue(parsed);
      } catch (error) {
        console.log(error);
        setStoredValue(initialValue);
      }
    } else {
      setStoredValue(initialValue);
    }
  }, []);

  useEffect(() => {
    if (!isUndefined(storedValue)) {
      setValue(storedValue);
    }
  }, [storedValue]);

  return [storedValue as T, setStoredValue] as const;
};