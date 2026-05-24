"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QojAdapter = void 0;
const base_adapter_1 = require("./base-adapter");
class QojAdapter extends base_adapter_1.BaseAdapter {
    id = 'qoj';
    displayName = 'QOJ';
    async fetchSolvedCount(handle) {
        const url = `https://qoj.ac/user/profile/${encodeURIComponent(handle)}`;
        const response = await this.http.get(url);
        const html = response.data;
        const match = html.match(/Accepted problems\uff1a(\d+) problems/);
        if (match) {
            return { name: handle, solvedNum: parseInt(match[1], 10) };
        }
        throw new Error(`QOJ user not found or profile not accessible: ${handle}`);
    }
}
exports.QojAdapter = QojAdapter;
