/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Copyright 2025 Chanakan Moongthin.
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { useFetcher } from "react-router";

export function useFetcherQueueWithPromise() {
  const fetcher = useFetcher();
  const queueRef = useRef<(() => Promise<any>)[]>([]);
  const isProcessingRef = useRef(false);
  const resolveRef = useRef<((value: unknown) => void) | null>(null);
  const rejectRef = useRef<((reason?: any) => void) | null>(null);

  const [currentData, setCurrentData] = useState<any>(null);
  const [currentError, setCurrentError] = useState<string | null>(null);

  // Process queue sequentially
  const processQueue = useCallback(async () => {
    if (isProcessingRef.current) return; // Prevent concurrent processing
    isProcessingRef.current = true;

    while (queueRef.current.length > 0) {
      const task = queueRef.current.shift();
      if (!task) continue;

      try {
        await task();
      } catch (error) {
        setCurrentData(null);
        setCurrentError("There was a problem processing the request.");
        if (rejectRef.current) {
          rejectRef.current(error);
          rejectRef.current = null;
        }
      }
    }

    isProcessingRef.current = false;
  }, []);

  // Enqueue a submit call and handle it as a promise
  const enqueueSubmit = (...args: Parameters<typeof fetcher.submit>) => {
    return new Promise((resolve, reject) => {
      resolveRef.current = resolve;
      rejectRef.current = reject;

      const task = async () => {
        fetcher.submit(...args);
      };

      // Add the task to the queue
      queueRef.current.push(task);
      processQueue(); // Start processing the queue if not already processing
    });
  };

  // Handle fetcher state changes using a regular useEffect
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data && resolveRef.current) {
      setCurrentData(fetcher.data);
      setCurrentError(null);
      resolveRef.current(fetcher.data);
      resolveRef.current = null;
      rejectRef.current = null;
    } else if ((fetcher.state === "idle" && !fetcher.data && rejectRef.current) || (fetcher.data && !fetcher.data.ok && rejectRef.current)) {
      setCurrentData(null);
      setCurrentError("There was a problem processing the request.");
      rejectRef.current(new Error("There was a problem processing the request."));
      resolveRef.current = null;
      rejectRef.current = null;
    }
  }, [fetcher.state, fetcher.data]);

  return {
    ...fetcher,
    enqueueSubmit,
    currentData,
    currentError,
  };
}