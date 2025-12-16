import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getMessaging,
  getToken,
  isSupported,
  onMessage,
  type Messaging,
  type MessagePayload,
} from "firebase/messaging";
import { apiFetch } from "@/lib/api";

type FirebaseEnv = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;
let currentToken: string | null = null;
let lastTokenErrorLoggedAt = 0;

function getFirebaseConfig(): FirebaseEnv {
  const cfg = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  } as Partial<FirebaseEnv>;

  const missing = Object.entries(cfg)
    .filter(([, v]) => !v)
    .map(([k]) => k);

  if (missing.length) {
    throw new Error(`Missing Firebase env vars: ${missing.join(", ")}`);
  }

  return cfg as FirebaseEnv;
}

async function ensureFirebase(): Promise<void> {
  const supported = await isSupported();
  if (!supported) {
    throw new Error("Firebase messaging is not supported in this browser");
  }

  if (!app) {
    app = initializeApp(getFirebaseConfig());
  }
  if (!messaging) {
    messaging = getMessaging(app);
  }
}

function buildSwUrl(): string {
  return `/firebase-messaging-sw.js`;
}

export async function registerFcmServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  const swUrl = buildSwUrl();
  try {
    await navigator.serviceWorker.register(swUrl, { scope: "/" });
    // Ensure an active SW is controlling the page before attempting Push subscription.
    // Without this, getToken() can fail with "no active Service Worker".
    try {
      const readyReg = await navigator.serviceWorker.ready;
      return readyReg;
    } catch {
      return navigator.serviceWorker.getRegistration("/") ?? null;
    }
  } catch (e: any) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const permission = typeof Notification !== "undefined" ? Notification.permission : "";
    const msg = e?.message ? String(e.message) : String(e);
    // Don't throw: push can be unavailable in some environments (firewall, extensions, policies)
    // and we don't want to break app boot.
    try {
      console.error(
        `Service worker registration failed (${msg}). origin=${origin} permission=${permission} swUrl=${swUrl}`
      );
    } catch { void 0 }
    return null;
  }
}

export async function initForegroundFcmListener(
  onPayload: (payload: MessagePayload) => void
): Promise<(() => void) | null> {
  await ensureFirebase();
  if (!messaging) return null;

  const unsubscribe = onMessage(messaging, (payload) => {
    onPayload(payload);
  });

  return unsubscribe;
}

export async function ensureFcmToken(device?: string): Promise<string | null> {
  await ensureFirebase();
  if (!messaging) return null;

  if (Notification.permission !== "granted") {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;
  }

  const registration = await registerFcmServiceWorker();
  if (!registration?.active) {
    // If SW is not active, Push subscription will fail; don't spam errors.
    return null;
  }

  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;
  if (!vapidKey) {
    throw new Error("Missing VITE_FIREBASE_VAPID_KEY");
  }

  const cfg = getFirebaseConfig();

  let token: string;
  try {
    token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration ?? undefined,
    });
  } catch (e: any) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const permission = typeof Notification !== "undefined" ? Notification.permission : "";
    const hasSw = typeof navigator !== "undefined" ? ("serviceWorker" in navigator) : false;
    const swActive = registration?.active ? true : false;
    const vapidPreview = `${vapidKey.slice(0, 8)}...${vapidKey.slice(-8)}`;
    const msg = e?.message ? String(e.message) : String(e);
    const now = Date.now();
    // Throttle logs to avoid flooding console on each render/boot.
    if (now - lastTokenErrorLoggedAt > 15_000) {
      lastTokenErrorLoggedAt = now;
      try {
        console.error(
          `getToken failed (${msg}). origin=${origin} permission=${permission} serviceWorker=${hasSw} swActive=${swActive} ` +
          `projectId=${cfg.projectId} senderId=${cfg.messagingSenderId} vapid=${vapidPreview}. ` +
          `Push is blocked/unavailable on this browser/environment.`
        );
      } catch { void 0 }
    }
    return null;
  }

  if (!token) return null;
  currentToken = token;

  // Send to backend (JWT cookie is included via apiFetch)
  const res = await apiFetch("/api/fcm/token", {
    method: "POST",
    body: JSON.stringify({ token, device: device || "web" }),
    toast: { error: { enabled: false }, success: { enabled: false } },
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    try {
      console.error(`FCM token registration failed: ${res.status} ${msg}`);
    } catch { void 0 }
    return token;
  }

  return token;
}

export async function removeFcmToken(): Promise<void> {
  if (!currentToken) return;

  try {
    await apiFetch("/api/fcm/token", {
      method: "DELETE",
      body: JSON.stringify({ token: currentToken }),
      toast: { error: { enabled: false }, success: { enabled: false } },
    });
  } catch {
    // ignore
  } finally {
    currentToken = null;
  }
}
