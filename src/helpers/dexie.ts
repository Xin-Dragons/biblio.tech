import { useLiveQuery } from "dexie-react-hooks";
import { useDatabase } from "../context/database";
import { DB } from "../db";

export enum Status {
  PENDING = 'pending',
  RESOLVED = 'resolved'
}

export type AsyncLiveQueryReturn<T = any> = AsyncLiveQueryReturnPending | AsyncLiveQueryReturnResolved<T>;

export interface AsyncLiveQueryReturnPending {
  isLoading: true;
  isSuccess: false;
  status: Status.PENDING;
  data: null;
}

export interface AsyncLiveQueryReturnResolved<T = any> {
  isLoading: false;
  isSuccess: true;
  status: Status.RESOLVED;
  data: T extends Array<infer U> ? Array<U> : (T | undefined);
}

const useAsyncLiveQuery = <T>(querier: (db: DB) => Promise<T>, deps: any[] = [], defaultIfMissing?: T): AsyncLiveQueryReturn<T> => {
  const { db } = useDatabase();

  const [data, status] = useLiveQuery(() => {
      return querier(db).then((data: T) => {
          const d = data === undefined ? defaultIfMissing : data;
          return [d, Status.RESOLVED]
      })
  }, deps, [null, Status.PENDING])


  return {
      isLoading: status === Status.PENDING,
      isSuccess: status === Status.RESOLVED,
      status,
      data,
  } as AsyncLiveQueryReturn<T>;
};

export default useAsyncLiveQuery;