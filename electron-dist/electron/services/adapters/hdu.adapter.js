"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HduAdapter = void 0;
const base_adapter_1 = require("./base-adapter");
class HduAdapter extends base_adapter_1.BaseAdapter {
    id = 'hdu';
    displayName = 'HDU';
    async fetchSolvedCount(handle) {
        const url = `https://ojhunt.com/api/crawlers/hdu/${encodeURIComponent(handle)}`;
        const response = await this.http.get(url);
        if (response.data?.data?.solved != null) {
            return { name: handle, solvedNum: response.data.data.solved };
        }
        throw new Error('HDU API response invalid');
    }
}
exports.HduAdapter = HduAdapter;
