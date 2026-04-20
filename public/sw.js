// Service Worker for Push Notifications only
// Minimal SW — no caching, just push handling

self.addEventListener("push", (event) => {
  let data = { title: "Learning Plus", body: "Đã đến giờ luyện tập!" };
  try {
    data = event.data?.json() || data;
  } catch {
    // use defaults
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || "/icons/icon-192.png",
      badge: data.badge || "/icons/icon-192.png",
      data: data.data || { url: "/" },
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      return clients.openWindow(url);
    })
  );
});
