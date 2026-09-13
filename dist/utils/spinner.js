"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startSpinner = startSpinner;
function startSpinner(message) {
    const frames = ['|', '/', '-', '\\'];
    let i = 0;
    const interval = setInterval(() => {
        try {
            process.stdout.write('\u001b[2K\r' + message + ' ' + frames[i % frames.length]);
            i++;
        }
        catch { }
    }, 100);
    return function stop() {
        clearInterval(interval);
        try {
            process.stdout.write('\u001b[2K\r');
        }
        catch { }
    };
}
