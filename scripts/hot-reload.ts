const WS_URL = 'ws://localhost:8081';

let socket: WebSocket;

function connect() {
    socket = new WebSocket(WS_URL);

    socket.onopen = () => {
        console.debug('[Hot Reload] Connected to dev server');
    };

    socket.onmessage = (event) => {
        const msg = event.data;
        if (msg === 'reload:full') {
            console.debug('[Hot Reload] Full extension reload...');
            chrome.runtime.reload();
        } else if (msg === 'reload:ui') {
            console.debug('[Hot Reload] UI reload...');
            if (typeof window !== 'undefined' && window.location) {
                window.location.reload();
            }
        }
    };

    socket.onclose = () => {
        console.debug('[Hot Reload] Disconnected.');
    };

    socket.onerror = (err) => {
        console.debug('[Hot Reload] Error:', JSON.stringify(err));
        socket.close();
    };
}

connect();
