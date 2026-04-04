"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VJudgeAdapter = void 0;
const base_adapter_1 = require("./base-adapter");
class VJudgeAdapter extends base_adapter_1.BaseAdapter {
    id = 'vjudge';
    displayName = 'VJudge';
    async fetchSolvedCount(handle) {
        const url = `https://vjudge.net/user/${encodeURIComponent(handle)}`;
        const response = await this.http.get(url);
        const $ = this.parseHtml(response.data);
        let num = 0;
        let found = false;
        // Primary: search for "Overall" row
        $('tr').each((_i, el) => {
            if ($(el).text().includes('Overall')) {
                const anchor = $(el).find('a').first();
                if (anchor.length > 0) {
                    num = parseInt(anchor.text().trim(), 10);
                    found = true;
                    return false;
                }
            }
        });
        // Fallback: fixed table index
        if (!found) {
            const rows = $('.table.table-reflow.problem-solve tbody tr');
            if (rows.length >= 4) {
                const anchor = rows.eq(3).find('a').first();
                if (anchor.length > 0) {
                    num = parseInt(anchor.text().trim(), 10);
                }
            }
        }
        return { name: handle, solvedNum: isNaN(num) ? 0 : num };
    }
}
exports.VJudgeAdapter = VJudgeAdapter;
