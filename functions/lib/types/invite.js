"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VALID_TARGET_MODES = exports.INVITE_DEFAULTS = exports.TARGET_MODE_CONFIG = exports.INVITE_COLLECTIONS = void 0;
// コレクション名
exports.INVITE_COLLECTIONS = {
    INVITES: 'invites',
    PARTICIPANTS: 'invite_participants',
};
exports.TARGET_MODE_CONFIG = {
    tenarai: {
        label: '手習',
        startUrl: '/practice',
        requiresAuth: false,
    },
    keiko: {
        label: '稽古',
        startUrl: '/practice12',
        requiresAuth: true,
    },
    utaawase: {
        label: '歌合',
        startUrl: '/utaawase',
        requiresAuth: true,
    },
};
// デフォルト値
exports.INVITE_DEFAULTS = {
    EXPIRY_HOURS: 24,
    CODE_LENGTH: 6,
    // 紛らわしい文字(0/O, 1/I/L)除外の32文字セット
    CODE_CHARSET: 'ABCDEFGHJKMNPQRSTUVWXYZ23456789',
    DEFAULT_SETTINGS: {
        yomiKana: false,
        toriKana: false,
        kimarijiShow: false,
        kimarijiFilter: [],
        poemRange: '',
    },
};
// 有効な対象モード一覧
exports.VALID_TARGET_MODES = ['tenarai', 'keiko', 'utaawase'];
//# sourceMappingURL=invite.js.map