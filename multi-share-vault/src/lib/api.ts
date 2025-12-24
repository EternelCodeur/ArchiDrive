import { toast } from 'sonner';

const API_BASE_URL: string = (() => {
  try {
    const env = (import.meta as any)?.env as Record<string, any> | undefined;
    const isDev = Boolean(env?.DEV);
    if (isDev) return '';
    const fromEnv = (env?.VITE_API_BASE_URL as string | undefined)
      || (env?.VITE_API_URL as string | undefined)
      || '';
    if (fromEnv && String(fromEnv).trim().length > 0) return String(fromEnv).trim();
    return 'https://api.archi-drive.ga';
  } catch {
    return 'https://api.archi-drive.ga';
  }
})();

export type ApiFetchOptions = RequestInit & {
  toast?: {
    success?: { enabled?: boolean; message?: string };
    error?: { enabled?: boolean; message?: string };
    always?: boolean; // if true, also show success toasts for GET requests
  };
  timeoutMs?: number;
};

 function resolveApiInput(input: RequestInfo | URL): RequestInfo | URL {
   if (!API_BASE_URL) return input;
   if (typeof input !== 'string') return input;
   if (!input.startsWith('/')) return input;
   return new URL(input, API_BASE_URL);
 }

export function resolveApiUrl(path: string): string {
  const resolved = resolveApiInput(path);
  if (typeof resolved === 'string') return resolved;
  return resolved.toString();
}

export async function apiFetch(input: RequestInfo | URL, init: ApiFetchOptions = {}): Promise<Response> {
  const headers = new Headers(init.headers || {});
  const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData;
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');
  if (!headers.has('Content-Type') && init.body && !isFormData) headers.set('Content-Type', 'application/json');
  const method = (init.method || 'GET').toUpperCase();
  const isMutation = method !== 'GET';
  const shouldShowSuccess = init.toast?.success?.enabled === true || (init.toast?.always === true && !isMutation);
  const shouldShowError = init.toast?.error?.enabled === true;
  const timeoutMs = init.timeoutMs;
  const controller = timeoutMs ? new AbortController() : undefined;
  const timeout = timeoutMs ? setTimeout(() => controller!.abort(), timeoutMs) : undefined;

  try {
    const resolvedInput = resolveApiInput(input);
    const res = await fetch(resolvedInput, { ...init, headers, credentials: 'include', signal: controller?.signal });

    // Attempt to build a meaningful message
    const methodMsg: Record<string, string> = {
      GET: 'Chargement réussi',
      POST: 'Création réussie',
      PUT: 'Mise à jour réussie',
      PATCH: 'Mise à jour réussie',
      DELETE: 'Suppression réussie',
    };
    const defaultOkMsg = init.toast?.success?.message || methodMsg[method] || 'Action effectuée';
    const defaultErrMsg = init.toast?.error?.message || `Erreur ${res.status}`;

    if (res.ok) {
      if (shouldShowSuccess) {
        // Blue toast for success (use info to get blue theme)
        toast.info(defaultOkMsg);
      }
    } else if (shouldShowError) {
      let bodyMsg: string | undefined;
      try {
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          const data = await res.clone().json();
          bodyMsg = (data && (data.message || data.error)) as string | undefined;
        } else {
          bodyMsg = await res.clone().text();
        }
      } catch { bodyMsg = undefined }
      const msg = (bodyMsg && bodyMsg.trim()) ? bodyMsg : defaultErrMsg;
      toast.error(msg);
    }

    return res;
  } catch (e: unknown) {
    const aborted = (e instanceof DOMException) && e.name === 'AbortError';
    if (shouldShowError) {
      toast.error(init.toast?.error?.message || (aborted ? 'Délai dépassé' : 'Erreur réseau'));
    }
    // Return a synthetic Response to keep callers in the normal flow
    const status = aborted ? 499 : 520; // 499: client timeout, 520: unknown error
    const body = { message: aborted ? 'Délai dépassé' : 'Erreur réseau' };
    return new Response(JSON.stringify(body), {
      status,
      statusText: body.message,
      headers: { 'content-type': 'application/json' },
    });
  } finally { if (timeout) clearTimeout(timeout) }
}
