// Firebase Cloud Messaging background handler. Must live at this exact path
// (project root) — the default scope Firebase's Web SDK registers under.
// A static file, not processed by Next's bundler, so the Firebase config
// below is hardcoded rather than read from env vars — these are the same
// public (non-secret) values already committed in apphosting.yaml/
// .env.local.example.
importScripts("https://www.gstatic.com/firebasejs/12.17.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.17.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDAAoy6IIfPVq40SC4OpVqgq6lngwo4PAM",
  authDomain: "daily-brief-b4383.firebaseapp.com",
  projectId: "daily-brief-b4383",
  storageBucket: "daily-brief-b4383.firebasestorage.app",
  messagingSenderId: "1052531140945",
  appId: "1:1052531140945:web:30bb8471780c57d1cf0b70",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || "Daily Brief", {
    body: body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
  });
});
