(()=>{function e(t){const o={};if(!(null!==t&&t instanceof Object))return t;for(const n in t)o[n]=e(t[n]);return o}chrome.runtime.onMessage.addListener((function(t,o,n){if(console.log("hello"),"offscreen"!==t.target)return;if("get-geolocation"!==t.type)return void console.warn(`Unexpected message type received: '${t.type}'.`);return async function(){return new Promise(((t,o)=>{navigator.geolocation.getCurrentPosition((o=>t(e(o))),(e=>o(e)),{timeout:7500})}))}().then((e=>n(e))).catch((e=>{console.log("InError at getLocation"),n({error:!0,errorMessage:e.message,coords:{latitude:0,longitude:0},timestamp:Date.now()})})),!0}))})();