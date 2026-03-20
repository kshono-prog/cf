# Untracked Feature Inventory

このリポジトリで未追跡になっている追加実装を、機能単位で整理した一覧です。
コミットやレビューは、この単位で分けると追いやすくなります。

## 1. 基盤設定とランタイム

- `tailwind.config.mjs`
- `next.config.ts`
- `postcss.config.mjs`
- `config/appkit.ts`
- `context/AppKitProvider.tsx`
- `context/appkitInstance.ts`
- `shims/async-storage.ts`
- `utils/baseUrl.ts`

## 2. 公開ページとプロフィール表示

- `app/[username]/page.tsx`
- `app/[username]/layout.tsx`
- `app/[username]/loading.tsx`
- `app/[username]/ProfileClientSection.tsx`
- `app/[username]/manifest.webmanifest/route.ts`
- `components/ProfileClient.tsx`
- `components/BottomNav.tsx`
- `components/ConnectWallet.tsx`
- `components/SwipeNavigationArea.tsx`
- `components/MyPageFooter.tsx`
- `components/shared/Avatar.tsx`
- `components/profile/ProfileHeader.tsx`
- `components/profile/ProfileSummaryServer.tsx`
- `components/profile/ProfileWalletClient.tsx`
- `components/profile/ProjectProgressCard.tsx`
- `components/profile/TipThanksCard.tsx`
- `components/profile/WalletSection.tsx`
- `components/profile/profileClientHelpers.ts`
- `types/creator.ts`
- `lib/creatorProfile.ts`
- `lib/profileTypes.ts`
- `lib/publicSummary.ts`
- `lib/numberFormat.ts`

## 3. マイページとクリエイター管理

- `app/[username]/mypage/page.tsx`
- `app/[username]/mypage/AccountPageClient.tsx`
- `components/mypage/MyPageAccordion.tsx`
- `components/mypage/UnconnectedMyPage.tsx`
- `components/mypage/UserRegistrationForm.tsx`
- `components/mypage/UserUpdateForm.tsx`
- `components/mypage/CreatorApplyCard.tsx`
- `components/mypage/CreatorProfileSection.tsx`
- `components/mypage/CreatorProfileEditForm.tsx`
- `components/mypage/CreatorProfileViewCard.tsx`
- `components/mypage/AvatarUploader.tsx`
- `components/mypage/SocialLinksEditor.tsx`
- `components/mypage/YoutubeVideosEditor.tsx`
- `lib/mypage/api.ts`
- `lib/mypage/helpers.ts`
- `lib/mypage/types.ts`

## 4. プロジェクト、Goal、Purpose、Contribution

- `components/ProjectCreateCard.tsx`
- `components/mypage/ProjectCreateCard.tsx`
- `components/mypage/ProjectSection.tsx`
- `app/api/projects/route.ts`
- `app/api/projects/[projectId]/route.ts`
- `app/api/projects/[projectId]/goal/route.ts`
- `app/api/projects/[projectId]/goal/target/route.ts`
- `app/api/projects/[projectId]/goal/achieve/route.ts`
- `app/api/projects/[projectId]/progress/route.ts`
- `app/api/projects/[projectId]/summary/route.ts`
- `app/api/projects/[projectId]/purposes/route.ts`
- `app/api/purposes/[purposeId]/route.ts`
- `app/api/purposes/[purposeId]/allocations/route.ts`
- `app/api/allocations/[allocationId]/route.ts`
- `app/api/contributions/route.ts`
- `app/api/contributions/reverify/route.ts`
- `app/api/projects/[projectId]/contributions/route.ts`
- `lib/goalAutoAchieve.ts`
- `lib/projectStatus.ts`
- `lib/reverifyClient.ts`

## 5. ブリッジ、L1、Settlement、Distribution

- `components/ProjectL1SettingsForm.tsx`
- `components/ProjectL1SettingsForm.AuditPanels.tsx`
- `components/bridge/BridgeWithICTTButton.tsx`
- `components/bridge/BridgeWithWormholeOrManualButton.tsx`
- `components/mypage/CurrencyGoalSettlementPanel.tsx`
- `components/mypage/ProjectSettlementPanel.tsx`
- `app/api/projects/[projectId]/l1/route.ts`
- `app/api/projects/[projectId]/bridge/route.ts`
- `app/api/projects/[projectId]/bridge/prepare/route.ts`
- `app/api/projects/[projectId]/bridge/run/route.ts`
- `app/api/projects/[projectId]/bridge/reverify/route.ts`
- `app/api/projects/[projectId]/bridge/execute/route.ts`
- `app/api/projects/[projectId]/distribution/plan/route.ts`
- `app/api/projects/[projectId]/distribution/execute/route.ts`
- `app/api/projects/[projectId]/settlement/route.ts`
- `app/api/projects/[projectId]/settlement/bridge/route.ts`
- `app/api/projects/[projectId]/settlement/distributions/route.ts`
- `app/api/projects/[projectId]/settlement/distribution-result/route.ts`
- `app/api/projects/[projectId]/cctp/jobs/route.ts`
- `lib/bridgeVerify.ts`
- `lib/cctpBridgeJobs.ts`
- `lib/chainConfig.ts`
- `lib/clientRpc.ts`
- `lib/contracts/eventFunding.ts`
- `lib/eventChainConfig.ts`
- `lib/projectSettlement.ts`
- `lib/tokenRegistry.ts`
- `lib/useEthersSigner.ts`
- `lib/walletService.ts`

## 6. イベント機能

- `app/[username]/events/page.tsx`
- `components/EventDateTime.tsx`
- `components/EventManager.tsx`
- `app/api/events/public/route.ts`
- `app/api/creators/[username]/events/route.ts`
- `app/api/creators/[username]/events/manage/route.ts`

## 7. ガス支援

- `components/mypage/GasSupportCard.tsx`
- `components/mypage/GasSupportTabs.tsx`
- `app/api/gas-support/claim/route.ts`
- `app/api/gas-support/eligibility/route.ts`
- `app/api/gas-support/faucet-balance/route.ts`
- `app/api/gas-support/nonce/route.ts`

## 8. AI Office とメトリクス

- `components/mypage/AiOfficePanel.tsx`
- `app/api/social/connections/route.ts`
- `app/api/metrics/collect/route.ts`
- `app/api/metrics/snapshots/route.ts`
- `app/api/metrics/trends/route.ts`
- `app/api/agent/tasks/route.ts`
- `app/api/translation/route.ts`
- `lib/translation.ts`

## 9. Creator / User API

- `app/api/creator/route.ts`
- `app/api/creator/avatar/route.ts`
- `app/api/creators/[username]/route.ts`
- `app/api/creators/[username]/apply/route.ts`
- `app/api/creators/random/route.ts`
- `app/api/public/creator/route.ts`
- `app/api/user/route.ts`
- `app/api/me/route.ts`

## 10. API 共通基盤

- `app/api/_lib/chain.ts`
- `app/api/_lib/cors.ts`
- `app/api/_lib/db.ts`
- `app/api/_lib/rpc.ts`
- `lib/api/guards.ts`
- `lib/api/responses.ts`
- `lib/appkitInstance.ts`
- `lib/prisma.ts`
- `lib/prismaRetry.ts`

## 11. Prisma と DB

- `prisma/schema.prisma`
- `prisma/seed.ts`
- `prisma/baseline.sql`
- `prisma/migrations/20251226152714_20251227/migration.sql`
- `prisma/migrations/20251227152439_rename_project_l1_fields/migration.sql`
- `prisma/migrations/20251228005732_rename_project_l1_fields2/migration.sql`
- `prisma/migrations/20251228113343_add_bridge_run_log_only/migration.sql`
- `prisma/migrations/20251229125224_add_distribution_plan_and_run/migration.sql`
- `prisma/migrations/20251230022819_sync_schema_to_db_budgetrun/migration.sql`
- `prisma/migrations/20260208130000_add_project_settlement_flow/migration.sql`
- `prisma/migrations/20260216101500_add_ai_office_phase1/migration.sql`
- `prisma/migrations/20260216112000_add_agent_task_audit_log/migration.sql`
- `prisma/migrations/20260222123000_add_project_currency_separation/migration.sql`
- `prisma/migrations/20260227160000_add_cctp_bridge_jobs/migration.sql`
- `prisma/migrations/migration_lock.toml`

## 12. アセットと補助ファイル

- `public/avatars/alice.png`
- `public/avatars/bob.png`
- `public/avatars/kazu.jpg`
- `public/avatars/kazu.png`
- `public/avatars/taeko.png`
- `public/qr/kazu.png`
- `public/icon/creator_founding_white.svg`
- `public/icon/gasfaucet.png`
- `public/icon/icon-cf.png`
- `public/icon/icon-facebook.svg`
- `public/icon/icon-instagram.svg`
- `public/icon/icon-link.svg`
- `public/icon/icon-tiktok.svg`
- `public/icon/icon-twitter.svg`
- `public/icon/icon-youtube.svg`
- `public/icon/jpycex-logo-normal-blue.svg`
- `public/icon/logo-creatorfounding.svg`
- `public/icon/nagesen250.png`
- `public/icon/world.png`
- `public/KryptoKyotoEvent.webp`
- `public/Polygon_blockchain_logo.png`
- `scripts/importSocialsAndVideos.cjs`
- `app/routes.txt`
- `API.txt`

## コミットを分ける場合の推奨順

1. `基盤設定 + Prisma`
2. `公開ページ + Creator/User API`
3. `マイページ管理`
4. `Project / Goal / Purpose / Contribution`
5. `Bridge / Settlement / Distribution`
6. `Events`
7. `Gas support`
8. `AI Office / Metrics`
9. `アセットと補助ファイル`
