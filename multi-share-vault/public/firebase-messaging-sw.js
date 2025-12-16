/* eslint-disable no-restricted-globals */
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: 'AIzaSyAkYQVs4XzRdGYzIJjJEPqsJkOT_0y2cB4',
  authDomain: 'archi-drive-c6770.firebaseapp.com',
  projectId: 'archi-drive-c6770',
  storageBucket: 'archi-drive-c6770.firebasestorage.app',
  messagingSenderId: '839824177718',
  appId: '1:839824177718:web:952f05d01ac26272a7f697',
};

try {
  firebase.initializeApp(firebaseConfig);
} catch (e) {
  // ignore init errors
}

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notification = payload?.notification || {};
  const title = notification.title || 'Notification';
  const options = {
    body: notification.body,
    icon: '/favicon.ico',
    data: payload?.data || {},
  };

  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification?.data || {};
  const documentId = data.document_id;

  // Navigate to document if possible.
  const targetUrl = documentId ? `/documents/${documentId}` : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
      return undefined;
    })
  );
});
