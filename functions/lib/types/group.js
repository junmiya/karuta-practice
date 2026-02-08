"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GROUP_DEFAULTS = exports.GROUP_COLLECTIONS = void 0;
// コレクション名
exports.GROUP_COLLECTIONS = {
    GROUPS: 'groups',
    MEMBERSHIPS: 'group_memberships',
    INVITES: 'group_invites',
    EVENTS: 'group_events',
    EVENT_PARTICIPANTS: 'group_event_participants',
    STATS: 'group_stats',
};
// デフォルト値
exports.GROUP_DEFAULTS = {
    INVITE_EXPIRES_DAYS: 7,
    INVITE_MAX_JOINS: 100,
    INVITE_MAX_EXPIRES_DAYS: 30,
    INVITE_MAX_MAX_JOINS: 1000,
    NAME_MIN_LENGTH: 1,
    NAME_MAX_LENGTH: 50,
    DESCRIPTION_MAX_LENGTH: 500,
    EVENT_TITLE_MIN_LENGTH: 1,
    EVENT_TITLE_MAX_LENGTH: 100,
    EVENT_DESCRIPTION_MAX_LENGTH: 1000,
};
//# sourceMappingURL=group.js.map