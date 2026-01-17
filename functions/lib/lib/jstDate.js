"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentJstDate = getCurrentJstDate;
exports.toJstDateString = toJstDateString;
/**
 * Get current JST date as YYYY-MM-DD string
 * JST = UTC + 9 hours
 */
function getCurrentJstDate() {
    const now = new Date();
    // Add 9 hours for JST offset
    const jstTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    return jstTime.toISOString().split('T')[0];
}
/**
 * Convert a Date to JST date string
 */
function toJstDateString(date) {
    const jstTime = new Date(date.getTime() + 9 * 60 * 60 * 1000);
    return jstTime.toISOString().split('T')[0];
}
//# sourceMappingURL=jstDate.js.map