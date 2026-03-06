(() => {
  const inject = () => {
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("inpage.js");
    script.type = "text/javascript";
    script.onload = () => script.remove();
    (document.head || document.documentElement).appendChild(script);
  };

  inject();

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    const { type, id, payload } = event.data || {};
    if (type !== "SENZA_REQUEST") return;

    chrome.runtime.sendMessage({ type: "SENZA_REQUEST", id, payload }, (response) => {
      if (chrome.runtime.lastError) {
        window.postMessage(
          {
            type: "SENZA_RESPONSE",
            id,
            response: {
              error: {
                code: 4900,
                message: chrome.runtime.lastError.message,
              },
            },
          },
          "*"
        );
        return;
      }
      window.postMessage({ type: "SENZA_RESPONSE", id, response }, "*");
    });
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (!message || message.type !== "SENZA_EVENT") return;
    window.postMessage(
      {
        type: "SENZA_EVENT",
        eventName: message.event,
        eventData: message.data,
      },
      "*"
    );
  });
})();
