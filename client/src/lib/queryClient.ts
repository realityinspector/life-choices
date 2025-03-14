import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response, ignoreStatuses?: number[]) {
  // If status is in the ignoreStatuses list, don't throw
  if (ignoreStatuses?.includes(res.status)) {
    return;
  }
  
  if (!res.ok) {
    try {
      const text = await res.text();
      throw new Error(`${res.status}: ${text || res.statusText}`);
    } catch (error) {
      // If we can't read the response text, throw with status only
      if (!(error instanceof Error) || !error.message.includes(res.status.toString())) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }
      throw error;
    }
  }
}

export async function apiRequest(
  url: string,
  options?: RequestInit & { 
    signal?: AbortSignal,
    ignoreStatuses?: number[] // New option to specify status codes that shouldn't throw
  },
): Promise<Response> {
  try {
    const res = await fetch(url, {
      method: options?.method || 'GET',
      headers: options?.headers || {},
      body: options?.body,
      credentials: "include",
      signal: options?.signal
    });

    // Only throw for non-OK responses that aren't in the ignoreStatuses list
    await throwIfResNotOk(res, options?.ignoreStatuses);
    return res;
  } catch (error) {
    // Re-throw AbortError as is - this is expected when user navigates away
    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }
    
    // Re-throw other errors with more context
    if (error instanceof Error) {
      error.message = `API Request Error (${url}): ${error.message}`;
    }
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
  ignoreStatuses?: number[]; // Optional list of status codes to ignore
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior, ignoreStatuses }) =>
  async ({ queryKey }) => {
    try {
      const res = await fetch(queryKey[0] as string, {
        credentials: "include",
      });

      // Handle 401 Unauthorized based on the specified behavior
      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      // Check if the response status is in the list of statuses to ignore
      if (ignoreStatuses?.includes(res.status)) {
        // For these statuses, return null instead of throwing
        return null;
      }

      // For other non-OK responses, throw an error
      await throwIfResNotOk(res);
      
      // Parse and return the JSON response
      return await res.json();
    } catch (error) {
      // Handle AbortError (occurs when user navigates away)
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Request was aborted');
        throw error;
      }
      
      // Add context to other errors
      if (error instanceof Error) {
        console.error(`Query Error (${queryKey[0]}):`, error);
      }
      
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ 
        on401: "throw",
        ignoreStatuses: [] // By default, don't ignore any status codes
      }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
