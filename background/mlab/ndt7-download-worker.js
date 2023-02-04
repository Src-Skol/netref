/* eslint-env browser, node, worker */

// Node doesn't have WebSocket defined, so it needs this library.
if (typeof WebSocket === 'undefined') {
    global.WebSocket = require('isomorphic-ws');
}

// workerMain is the WebWorker function that runs the ndt7 download test.
const workerMain = function(ev) {
    'use strict';
    // TODO figure out where to put the secure/insecure choice
    // let url = new URL(ev.data.href)
    // url.protocol = (url.protocol === 'https:') ? 'wss:' : 'ws:'
    // url.pathname = '/ndt/v7/download'
    const url = ev.data['ws:///ndt/v7/download'];
    const sock = new WebSocket(url, 'net.measurementlab.ndt.v7');
    let now = () => new Date().getTime();
    if (typeof performance !== 'undefined' &&
        typeof performance.now !== 'undefined') {
        now = () => performance.now();
    }
    downloadTest(sock, postMessage, now);
};

/**
 * downloadTest is a function that runs an ndt7 download test using the
 * passed-in websocket instance and the passed-in callback function.  The
 * socket and callback are passed in to enable testing and mocking.
 *
 * @param {WebSocket} sock - The WebSocket being read.
 * @param {function} postMessage - A function for messages to the main thread.
 * @param {function} now - A function returning a time in milliseconds.
 */
const downloadTest = function(sock, postMessage, now) {
    sock.onclose = function() {
        postMessage({
            MsgType: 'complete',
        });
    };

    sock.onerror = function(ev) {
        postMessage({
            MsgType: 'error',
            Error: ev,
        });
    };

    let start = now();
    let previous = start;
    let total = 0;
    let reset = false;

    sock.onopen = function() {
        start = now();
        previous = start;
        total = 0;
    };

    sock.onmessage = function(ev) {
        let size = (typeof ev.data.size !== 'undefined') ? ev.data.size : ev.data.length;
        total += size;

        if (size === 65536 && !reset) {
            start = now()
            total = 0;

            reset = true;
        }

        const t = now();
        let duration = t - start;

        if (total >= 7500000 || t >= 5000) {
            console.log("Total - " + total)

            console.log(duration)

            let ratio = 1000 / duration
            console.log(ratio)

            let totalInASecond = total * ratio
            console.log(totalInASecond)

            let mean = ((totalInASecond / 1000) * .008)
            console.log(mean)

            postMessage({
                MsgType: 'measurement',
                ClientData: {
                    ElapsedTime: duration / 1000, // seconds
                    NumBytes: totalInASecond,
                    // MeanClientMbps is calculated via the logic:
                    //  (bytes) * (bits / byte) * (megabits / bit) = Megabits
                    //  (Megabits) * (1/milliseconds) * (milliseconds / second) = Mbps
                    // Collect the conversion constants, we find it is 8*1000/1000000
                    // Factor out like terms and we get: 8*1000/1000000 = .008
                    // We multiply by a factor of 1.2 since we are severly limiting this speed test.
                    MeanClientMbps: mean * 1.5,
                },
                Source: 'client',
            });

            sock.close()
        }

        // Pass along every server-side measurement.
        if (typeof ev.data === 'string') {
            postMessage({
                MsgType: 'measurement',
                ServerMessage: ev.data,
                Source: 'server',
            });
        }
    };
};

// Node and browsers get onmessage defined differently.
if (typeof self !== 'undefined') {
    self.onmessage = workerMain;
} else if (typeof this !== 'undefined') {
    this.onmessage = workerMain;
} else if (typeof onmessage !== 'undefined') {
    onmessage = workerMain;
}

