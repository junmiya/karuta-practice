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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRuleset = getRuleset;
exports.saveRuleset = saveRuleset;
/**
 * 102: ルールセット Firestore CRUD
 * Document: rulesets/current
 */
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
const utaawase_1 = require("../types/utaawase");
const ruleEngine_1 = require("../lib/ruleEngine");
const db = admin.firestore();
async function getRuleset() {
    const doc = await db.collection(utaawase_1.UTAAWASE_COLLECTIONS.RULESETS).doc('current').get();
    if (!doc.exists)
        return null;
    return doc.data();
}
async function saveRuleset(ruleset) {
    const errors = (0, ruleEngine_1.validateRuleset)(ruleset);
    if (errors.length > 0) {
        throw new Error(`Invalid ruleset: ${errors.join(', ')}`);
    }
    const ref = db.collection(utaawase_1.UTAAWASE_COLLECTIONS.RULESETS).doc('current');
    const existing = await ref.get();
    const data = {
        ...ruleset,
        isActive: true,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
        ...(existing.exists ? {} : { createdAt: firestore_1.FieldValue.serverTimestamp() }),
    };
    await ref.set(data, { merge: true });
    const saved = await ref.get();
    return saved.data();
}
//# sourceMappingURL=rulesetService.js.map