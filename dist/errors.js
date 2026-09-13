"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitError = void 0;
class RateLimitError extends Error {
    retryAfterSeconds;
    status;
    constructor(message, retryAfterSeconds, status) {
        super(message || 'Rate limited');
        this.name = 'RateLimitError';
        this.retryAfterSeconds = retryAfterSeconds;
        this.status = status;
    }
}
exports.RateLimitError = RateLimitError;
