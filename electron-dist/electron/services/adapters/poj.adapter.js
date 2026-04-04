"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PojAdapter = void 0;
const base_adapter_1 = require("./base-adapter");
class PojAdapter extends base_adapter_1.BaseAdapter {
    id = 'poj';
    displayName = 'POJ';
    async fetchSolvedCount(handle) {
        const url = `https://ojhunt.com/api/crawlers/poj/${encodeURIComponent(handle)}`;
        const response = await this.http.get(url);
        if (response.data?.data?.solved != null) {
            return { name: handle, solvedNum: response.data.data.solved };
        }
        throw new Error('POJ API response invalid');
    }
}
exports.PojAdapter = PojAdapter;
