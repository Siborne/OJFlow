"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseAdapter = void 0;
const axios_1 = __importStar(require("axios"));
const cheerio = __importStar(require("cheerio"));
/** Base class for all platform adapters, providing shared utilities */
class BaseAdapter {
    http;
    constructor(options) {
        this.http = axios_1.default.create({
            timeout: options?.timeoutMs ?? 10000,
            headers: {
                'User-Agent': 'OJFlow/1.3 (Desktop App)',
            },
        });
    }
    /** Parse HTML string into cheerio instance */
    parseHtml(html) {
        return cheerio.load(html);
    }
    /** Wrap an async operation with unified error handling and timing */
    async safeFetch(fn, fallback) {
        const start = Date.now();
        try {
            const data = await fn();
            return {
                success: true,
                data,
                platform: this.displayName,
                elapsed: Date.now() - start,
            };
        }
        catch (error) {
            const elapsed = Date.now() - start;
            const { message, errorType } = this.classifyError(error);
            console.warn(`[${this.id}] fetch failed (${elapsed}ms):`, message);
            return {
                success: false,
                data: fallback,
                platform: this.displayName,
                elapsed,
                error: message,
                errorType,
            };
        }
    }
    /** Classify errors into categories for UI display */
    classifyError(error) {
        if (error instanceof axios_1.AxiosError) {
            if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
                return { message: `Request timeout (${this.id})`, errorType: 'timeout' };
            }
            if (error.code === 'ENOTFOUND' ||
                error.code === 'ECONNRESET' ||
                error.code === 'EAI_AGAIN' ||
                error.code === 'ECONNREFUSED') {
                return { message: `Network error: ${error.code}`, errorType: 'network' };
            }
            if (error.response) {
                return { message: `HTTP ${error.response.status}`, errorType: 'api' };
            }
            return { message: error.message, errorType: 'network' };
        }
        if (error instanceof SyntaxError) {
            return { message: 'Data parse error', errorType: 'parse' };
        }
        if (error instanceof Error) {
            return { message: error.message, errorType: 'unknown' };
        }
        return { message: 'Unknown error', errorType: 'unknown' };
    }
    /** Default health check implementation */
    async healthCheck() {
        return true;
    }
}
exports.BaseAdapter = BaseAdapter;
