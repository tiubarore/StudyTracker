const CACHE_NAME = "timer-pwa-v3";
const DB_NAME = "timer-store";

// 1. Installation - Cache essential files
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache
        .addAll([
          "/",
          "/index.html",
          "/manifest.json",
          "/favicon.ico",
          // Add paths to your compiled JS/CSS files
          "/assets/main.js",
          "/assets/main.css",
        ])
        .catch((err) => {
          console.log("Cache addAll error:", err);
        });
    })
  );
});

// 2. Fetch handling - Cache-first strategy
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests and browser extensions
  if (
    event.request.method !== "GET" ||
    event.request.url.startsWith("chrome-extension://")
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Return cached version if available
      if (cachedResponse) return cachedResponse;

      // Otherwise go to network
      return fetch(event.request)
        .then((response) => {
          // Don't cache API requests
          if (event.request.url.includes("/api/")) {
            return response;
          }

          // Cache other successful responses
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback for failed requests
          if (event.request.headers.get("accept").includes("text/html")) {
            return caches.match("/offline.html");
          }
        });
    })
  );
});

// 3. Background Sync - Timer state persistence
self.addEventListener("sync", (event) => {
  if (event.tag === "save-timer-state") {
    event.waitUntil(
      handleTimerSync().catch((error) => {
        console.error("Sync failed:", error);
        // Retry automatically
        return Promise.reject(error);
      })
    );
  }
});

// 4. Clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Helper Functions ==========================================

async function handleTimerSync() {
  try {
    const state = await getTimerState();
    if (state) {
      // Try to send to server if online
      if (navigator.onLine) {
        await sendToServer(state);
      } else {
        // Store for later sync if offline
        await storePendingSync(state);
      }
    }
  } catch (error) {
    console.error("Timer sync handling failed:", error);
    throw error; // Will trigger retry
  }
}

async function getTimerState() {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("timer", "readonly");
    const store = tx.objectStore("timer");
    const request = store.get("current-state");

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function storePendingSync(state) {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("timer", "readwrite");
    const store = tx.objectStore("timer");
    const request = store.put(state, "pending-sync");

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function sendToServer(data) {
  // Replace with your actual API endpoint
  const API_URL = "https://your-api-endpoint.com/save-timer";

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        timerData: data,
        lastSynced: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to send to server:", error);
    throw error; // Important for retry logic
  }
}

function openIDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("timer")) {
        db.createObjectStore("timer");
      }
    };
  });
}
