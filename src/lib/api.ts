import { toast } from 'sonner';

export type ApiFetchOptions = RequestInit & {
  toast?: {
    success?: { enabled?: boolean; message?: string };
    error?: { enabled?: boolean; message?: string };
    always?: boolean; // if true, also show success toasts for GET requests
  };
};

export async function apiFetch(input: RequestInfo | URL, init: ApiFetchOptions = {}): Promise<Response> {
  const headers = new Headers(init.headers || {});
  if (!headers.has('Content-Type') && init.body) headers.set('Content-Type', 'application/json');
  const method = (init.method || 'GET').toUpperCase();
  const isMutation = method !== 'GET';
  const shouldShowSuccess = (() => {
    if (typeof init.toast?.success?.enabled === 'boolean') return init.toast.success.enabled;
    if (!isMutation) return init.toast?.always === true; // default: hide GET success toasts unless always=true
    return true; // default: show for mutations
  })();
  const shouldShowError = init.toast?.error?.enabled ?? true;

  try {
    const res = await fetch(input, { ...init, headers, credentials: 'include' });

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
    if (shouldShowError) {
      toast.error(init.toast?.error?.message || 'Erreur réseau');
    }
    throw e;
  }
}
