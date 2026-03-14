(() => {
  const EXTENSION_INVALIDATED = "Extension context invalidated.";

  const inject = () => {
    const script = document.createElement("script");
    try {
      script.src = chrome.runtime.getURL("inpage.js");
    } catch (error) {
      console.warn("[Senza] failed to inject inpage script", error);
      return;
    }
    script.type = "text/javascript";
    script.onload = () => script.remove();
    (document.head || document.documentElement).appendChild(script);
  };

  const postRuntimeError = (id, message) => {
    window.postMessage(
      {
        type: "SENZA_RESPONSE",
        id,
        response: {
          error: {
            code: 4900,
            message,
          },
        },
      },
      "*"
    );
  };

  inject();

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    const { type, id, payload } = event.data || {};
    if (type !== "SENZA_REQUEST") return;

    try {
      if (!chrome?.runtime?.id) {
        postRuntimeError(
          id,
          `${EXTENSION_INVALIDATED} Refresh the page after reloading Senza.`
        );
        return;
      }

      chrome.runtime.sendMessage({ type: "SENZA_REQUEST", id, payload }, (response) => {
        if (chrome.runtime.lastError) {
          postRuntimeError(id, chrome.runtime.lastError.message);
          return;
        }
        window.postMessage({ type: "SENZA_RESPONSE", id, response }, "*");
      });
    } catch (error) {
      postRuntimeError(
        id,
        error?.message || `${EXTENSION_INVALIDATED} Refresh the page after reloading Senza.`
      );
    }
  });

  try {
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
  } catch (error) {
    console.warn("[Senza] runtime listener unavailable", error);
  }
})();
