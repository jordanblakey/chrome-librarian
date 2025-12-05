const WS_URL = 'ws://localhost:8081';

let socket: WebSocket;

function connect() {
    socket = new WebSocket(WS_URL);

    socket.onopen = () => {
        console.log('[Hot Reload] Connected to dev server');
    };

    socket.onmessage = (event) => {
        const msg = event.data;
        if (msg === 'reload:full') {
            console.log('[Hot Reload] Full extension reload...');
            chrome.runtime.reload();
        } else if (msg === 'reload:ui') {
            console.log('[Hot Reload] UI reload...');
            if (typeof window !== 'undefined' && window.location) {
                window.location.reload();
            }
        }
    };

    socket.onclose = () => {
        console.log('[Hot Reload] Disconnected. Retrying in 1s...');
        setTimeout(connect, 1000);
    };

    socket.onerror = (err) => {
        console.error('[Hot Reload] Connection error:', err);
        socket.close();
    };
}

connect();
