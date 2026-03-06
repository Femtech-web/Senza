(function () {
  if (window.senzaEthereum) return;

  const listeners = {};
  const pending = new Map();

  function emit(event, payload) {
    (listeners[event] || []).forEach((fn) => fn(payload));
  }

  function request(payload) {
    const id = `${Date.now()}-${Math.random()}`;
    const message = { type: "SENZA_REQUEST", id, payload };

    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      window.postMessage(message, "*");
      setTimeout(() => {
        if (pending.has(id)) {
          pending.delete(id);
          reject({ code: 4900, message: "Senza request timed out" });
        }
      }, 60000);
    });
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    const { type, id, response, eventName, eventData } = event.data || {};
    if (type === "SENZA_RESPONSE" && pending.has(id)) {
      const { resolve, reject } = pending.get(id);
      pending.delete(id);
      if (response && response.error) {
        reject(response.error);
      } else {
        resolve(response.result);
      }
    }

    if (type === "SENZA_EVENT") {
      emit(eventName, eventData);
    }
  });

  const provider = {
    isSenza: true,
    isMetaMask: false,
    request: ({ method, params }) => request({ method, params }),
    on: (event, handler) => {
      listeners[event] = listeners[event] || [];
      listeners[event].push(handler);
    },
    removeListener: (event, handler) => {
      listeners[event] = (listeners[event] || []).filter(
        (fn) => fn !== handler
      );
    },
  };

  const info = {
    uuid: "9c682b1a-7b47-4b1d-bfa6-2c9a5b4c0a41",
    name: "Senza Wallet",
    icon: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIiB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiI+CiAgPGRlZnM+CiAgICA8Y2xpcFBhdGggaWQ9ImNvbnRhaW5lciI+CiAgICAgIDxyZWN0IHg9IjAiIHk9IjAiIHdpZHRoPSI1MTIiIGhlaWdodD0iNTEyIiByeD0iMTA4IiByeT0iMTA4Ii8+CiAgICA8L2NsaXBQYXRoPgogIDwvZGVmcz4KCiAgPCEtLSBSb3VuZGVkLXNxdWFyZSBjb250YWluZXIgLS0+CiAgPHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjUxMiIgaGVpZ2h0PSI1MTIiIHJ4PSIxMDgiIHJ5PSIxMDgiIGZpbGw9IiNkMDc1ZmYiLz4KCiAgPCEtLSBTdHlsaXplZCBTIG1vbm9ncmFtOiBzaG9ydOKAk2xvbmfigJNzaG9ydCBzdGFnZ2VyZWQgYmFycwogICAgICAgVG9wICAgIOKGkiBzaG9ydCwgb2Zmc2V0IHJpZ2h0CiAgICAgICBNaWRkbGUg4oaSIHdpZGVzdCwgY2VudGVyZWQKICAgICAgIEJvdHRvbSDihpIgc2hvcnQsIG9mZnNldCBsZWZ0CiAgICAgICBDcmVhdGVzIFMtY3VydmU6IHRvcCBvcGVucyBsZWZ0LCBib3R0b20gb3BlbnMgcmlnaHQgLS0+CgogIDwhLS0gVG9wIGJhciDigJQgc2hvcnQsIHB1c2hlZCByaWdodCAtLT4KICA8cmVjdCB4PSIyMTAiIHk9IjE1MiIgd2lkdGg9IjE2NCIgaGVpZ2h0PSI0NiIgcng9IjIzIiByeT0iMjMiIGZpbGw9IiNmZmZmZmYiLz4KCiAgPCEtLSBNaWRkbGUgYmFyIOKAlCB3aWRlc3QsIGNlbnRlcmVkIC0tPgogIDxyZWN0IHg9IjEyOCIgeT0iMjMzIiB3aWR0aD0iMjU2IiBoZWlnaHQ9IjQ2IiByeD0iMjMiIHJ5PSIyMyIgZmlsbD0iI2ZmZmZmZiIvPgoKICA8IS0tIEJvdHRvbSBiYXIg4oCUIHNob3J0LCBwdXNoZWQgbGVmdCAtLT4KICA8cmVjdCB4PSIxMzgiIHk9IjMxNCIgd2lkdGg9IjE2NCIgaGVpZ2h0PSI0NiIgcng9IjIzIiByeT0iMjMiIGZpbGw9IiNmZmZmZmYiLz4KPC9zdmc+Cg==",
    rdns: "com.senza.wallet",
  };

  function announce() {
    window.dispatchEvent(
      new CustomEvent("eip6963:announceProvider", {
        detail: Object.freeze({ info, provider }),
      })
    );
  }

  window.addEventListener("eip6963:requestProvider", announce);

  window.senzaEthereum = provider;
  if (!window.ethereum) {
    window.ethereum = provider;
    window.dispatchEvent(new Event("ethereum#initialized"));
  }
  announce();
})();
