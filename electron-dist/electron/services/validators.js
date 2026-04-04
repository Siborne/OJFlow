"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateSolvedNum = exports.validateRating = exports.validateContest = void 0;
/** Validate that an object is a well-formed RawContest */
function validateContest(c) {
    if (!c || typeof c !== 'object')
        return false;
    const obj = c;
    return (typeof obj.name === 'string' &&
        obj.name.length > 0 &&
        typeof obj.startTime === 'number' &&
        Number.isFinite(obj.startTime) &&
        obj.startTime > 1000000000 && // after 2001
        typeof obj.duration === 'number' &&
        obj.duration > 0 &&
        typeof obj.platform === 'string' &&
        obj.platform.length > 0);
}
exports.validateContest = validateContest;
/** Validate that an object is a well-formed Rating */
function validateRating(r) {
    if (!r || typeof r !== 'object')
        return false;
    const obj = r;
    return (typeof obj.name === 'string' &&
        typeof obj.curRating === 'number' &&
        Number.isFinite(obj.curRating) &&
        typeof obj.maxRating === 'number' &&
        Number.isFinite(obj.maxRating));
}
exports.validateRating = validateRating;
/** Validate that an object is a well-formed SolvedNum */
function validateSolvedNum(s) {
    if (!s || typeof s !== 'object')
        return false;
    const obj = s;
    return (typeof obj.name === 'string' &&
        typeof obj.solvedNum === 'number' &&
        Number.isFinite(obj.solvedNum) &&
        obj.solvedNum >= 0);
}
exports.validateSolvedNum = validateSolvedNum;
