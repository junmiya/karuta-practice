# Tasks: 掲示板（瓦版・不具合の部屋）

**Input**: Design documents from `/specs/108-bulletin-board/`
**Prerequisites**: 106-permission-system 完了

## Phase 1: データモデル＆セキュリティ

- [ ] BB001 [P] Create enums and types in `apps/web/src/types/board.ts`: `PostCategory` (`kawaraban`|`bugroom`), `PostType`, `BugStatus`, `BugTargetArea`, `BoardPost`, `BoardComment` type definitions
- [ ] BB002 [P] Implement Firestore Security Rules for `board_posts` and `board_comments` in `firestore.rules`:
  - `kawaraban`: read(auth), write(admin)
  - `bugroom`: read(uchideshi+), write(uchideshi+), updates status(admin only)
  - `comments`: read/write(uchideshi+)

## Phase 2: UI基礎＆瓦版

- [ ] BB003 Create `BoardLayout.tsx` and `BoardService.ts`: Tab navigation, basic fetch queries
- [ ] BB004 Implement `KawarabanList.tsx`: Display pinned posts first, then createdAt desc. Handle `expiresAt` logic
- [ ] BB005 Create `GroupSettings.tsx` update: Add "Enable Recruitment on Kawaraban" toggle (`isRecruitmentEnabled`). Only Owner/Organizer can change.
- [ ] BB006 Implement `KawarabanEditor.tsx`:
  - Admin: All types available
  - Member: Only `group_recruit` available (if they belong to a recruitment-enabled group)
- [ ] BB007 Implement `group_recruit` logic: Check for existing active recruit, ensure `groups/{groupId}.isRecruitmentEnabled` is true, validate `expiresAt`, invite code validation

## Phase 3: 不具合の部屋

- [ ] BB007 Implement `BugList.tsx`: Filter by status, targetArea. Display columns similar to user request.
- [ ] BB008 Implement `BugReportForm.tsx` (Uchideshi+): `targetArea` required dropdown, template fields
- [ ] BB009 Implement `BugDetail.tsx` & `CommentSection.tsx`: Show details, allow comments
- [ ] BB010 Implement Admin controls in `BugDetail.tsx`: Status change dropdown, `confirmed`/`developed` checkbox shortcuts
- [ ] BB011 Add Global CTA "Report Bug" to App Layout (visible to Uchideshi+)

## Phase 4: 検証

- [ ] BB013 Manual Test: Verify Member can post `group_recruit` ONLY if `isRecruitmentEnabled` is true
- [ ] BB014 Manual Test: Verify Admin can change bug status and post all types
- [ ] BB015 Manual Test: Verify `group_recruit` limits (1 active per group, 14 days max)
