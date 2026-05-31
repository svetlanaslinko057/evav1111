# Cabinet i18n Coverage — 2026-05-30

**Scope:** 98 cabinet pages under `/app/web/src/pages/` (TARGETS=60 explicit + 38 auto-discovered).

## Summary

- Total `tByEn(...)` calls: **1844**
- Total probable hardcoded EN JSX text nodes: **~0**
- Dictionary EN keys: **2145**
- Dictionary UK keys: **2145**

Heuristic: a "hardcoded" JSX text node is `>...<` content that starts with a letter, has 4–80 chars, contains at least one lowercase, and is not an all-caps tech label. False positives expected; use this to triage.

## Top offenders (most probable hardcoded EN)

| Rank | File | tByEn | Hardcoded≈ | Lines |
|------|------|------:|----------:|-----:|
| 1 | `ClientProjectPage.js` | 69 | 0 | 1307 |
| 2 | `LandingPage.js` | 60 | 0 | 3006 |
| 3 | `LandingPageLight.js` | 59 | 0 | 2981 |
| 4 | `AdminReconciliation.js` | 57 | 0 | 689 |
| 5 | `AdminV2Portfolio.js` | 57 | 0 | 858 |
| 6 | `AdminIntegrationsPage.js` | 49 | 0 | 679 |
| 7 | `AdminTeamPanel.js` | 44 | 0 | 359 |
| 8 | `DeveloperWorkspaceV2.js` | 44 | 0 | 295 |
| 9 | `AdminExecutionIntelligence.js` | 42 | 0 | 1763 |
| 10 | `DeveloperGrowthPage.js` | 42 | 0 | 566 |
| 11 | `ScopeBuilder.js` | 39 | 0 | 691 |
| 12 | `UnifiedAuthPage.js` | 39 | 0 | 694 |
| 13 | `AdminPaymentsPage.js` | 38 | 0 | 576 |
| 14 | `AdminPayoutsQueue.js` | 37 | 0 | 458 |
| 15 | `AdminDeveloperProfile.js` | 32 | 0 | 412 |
| 16 | `ClientDeliverablePage.js` | 31 | 0 | 584 |
| 17 | `ClientHub.js` | 31 | 0 | 370 |
| 18 | `ContractSignEvidencePage.js` | 29 | 0 | 429 |
| 19 | `PortfolioCaseDetail.js` | 29 | 0 | 717 |
| 20 | `NewRequest.js` | 28 | 0 | 553 |
| 21 | `AcceptanceQueue.js` | 27 | 0 | 359 |
| 22 | `AdminPayoutBatchDetail.js` | 27 | 0 | 419 |
| 23 | `ClientProfilePage.js` | 26 | 0 | 422 |
| 24 | `AdminValidationPage.js` | 25 | 0 | 532 |
| 25 | `DeveloperDashboard.js` | 25 | 0 | 360 |
| 26 | `AdminUsersPage.js` | 24 | 0 | 437 |
| 27 | `ClientCabinet.js` | 24 | 0 | 386 |
| 28 | `DeveloperWorkPage.js` | 24 | 0 | 525 |
| 29 | `AdminDeliverableBuilder.js` | 23 | 0 | 489 |
| 30 | `ClientReferralPage.js` | 23 | 0 | 366 |

## Per-file detail (full list)

### `ClientProjectPage.js` — tByEn=69 hardcoded≈0
### `LandingPage.js` — tByEn=60 hardcoded≈0
### `LandingPageLight.js` — tByEn=59 hardcoded≈0
### `AdminReconciliation.js` — tByEn=57 hardcoded≈0
### `AdminV2Portfolio.js` — tByEn=57 hardcoded≈0
### `AdminIntegrationsPage.js` — tByEn=49 hardcoded≈0
### `AdminTeamPanel.js` — tByEn=44 hardcoded≈0
### `DeveloperWorkspaceV2.js` — tByEn=44 hardcoded≈0
### `AdminExecutionIntelligence.js` — tByEn=42 hardcoded≈0
### `DeveloperGrowthPage.js` — tByEn=42 hardcoded≈0
### `ScopeBuilder.js` — tByEn=39 hardcoded≈0
### `UnifiedAuthPage.js` — tByEn=39 hardcoded≈0
### `AdminPaymentsPage.js` — tByEn=38 hardcoded≈0
### `AdminPayoutsQueue.js` — tByEn=37 hardcoded≈0
### `AdminDeveloperProfile.js` — tByEn=32 hardcoded≈0
### `ClientDeliverablePage.js` — tByEn=31 hardcoded≈0
### `ClientHub.js` — tByEn=31 hardcoded≈0
### `ContractSignEvidencePage.js` — tByEn=29 hardcoded≈0
### `PortfolioCaseDetail.js` — tByEn=29 hardcoded≈0
### `NewRequest.js` — tByEn=28 hardcoded≈0
### `AcceptanceQueue.js` — tByEn=27 hardcoded≈0
### `AdminPayoutBatchDetail.js` — tByEn=27 hardcoded≈0
### `ClientProfilePage.js` — tByEn=26 hardcoded≈0
### `AdminValidationPage.js` — tByEn=25 hardcoded≈0
### `DeveloperDashboard.js` — tByEn=25 hardcoded≈0
### `AdminUsersPage.js` — tByEn=24 hardcoded≈0
### `ClientCabinet.js` — tByEn=24 hardcoded≈0
### `DeveloperWorkPage.js` — tByEn=24 hardcoded≈0
### `AdminDeliverableBuilder.js` — tByEn=23 hardcoded≈0
### `ClientReferralPage.js` — tByEn=23 hardcoded≈0
### `AdminMarketplaceQuality.js` — tByEn=22 hardcoded≈0
### `DeveloperWorkspace.js` — tByEn=22 hardcoded≈0
### `AdminLeadsPage.js` — tByEn=21 hardcoded≈0
### `DeveloperProfileEnhanced.js` — tByEn=21 hardcoded≈0
### `TwoFactorRecoveryPage.js` — tByEn=21 hardcoded≈0
### `AdminPricingConfigPanel.js` — tByEn=20 hardcoded≈0
### `AdminV2Dashboard.js` — tByEn=20 hardcoded≈0
### `ClientEstimatePage.js` — tByEn=20 hardcoded≈0
### `WorkUnitDetail.js` — tByEn=20 hardcoded≈0
### `AdminProjectReprice.js` — tByEn=17 hardcoded≈0
### `AdminTemplatesPage.js` — tByEn=17 hardcoded≈0
### `ClientSupport.js` — tByEn=17 hardcoded≈0
### `DeveloperLeaderboard.js` — tByEn=17 hardcoded≈0
### `GPTScopeBuilder.js` — tByEn=17 hardcoded≈0
### `DevWork.js` — tByEn=16 hardcoded≈0
### `EstimateResultPage.js` — tByEn=16 hardcoded≈0
### `ExecutorBoard.js` — tByEn=16 hardcoded≈0
### `ClientDashboardOS.js` — tByEn=15 hardcoded≈0
### `AdminFinancialsPage.js` — tByEn=14 hardcoded≈0
### `AdminLoginPage.js` — tByEn=14 hardcoded≈0
### `AdminLegalSettings.js` — tByEn=13 hardcoded≈0
### `DeliverableBuilder.js` — tByEn=13 hardcoded≈0
### `DeveloperEarnings.js` — tByEn=13 hardcoded≈0
### `ProjectDetails.js` — tByEn=13 hardcoded≈0
### `AdminV2Profile.js` — tByEn=12 hardcoded≈0
### `ClientProjectWorkspaceOS.js` — tByEn=12 hardcoded≈0
### `TesterValidationPage.js` — tByEn=12 hardcoded≈0
### `AdminWithdrawalsPage.js` — tByEn=11 hardcoded≈0
### `ClientAuthPage.js` — tByEn=11 hardcoded≈0
### `ClientTransparency.js` — tByEn=11 hardcoded≈0
### `ValidatorMissionsPage.js` — tByEn=11 hardcoded≈0
### `AdminEarningsControl.js` — tByEn=10 hardcoded≈0
### `AdminV2Finance.js` — tByEn=10 hardcoded≈0
### `DeveloperMarketplace.js` — tByEn=10 hardcoded≈0
### `TesterPerformance.js` — tByEn=10 hardcoded≈0
### `TwoFactorSetupPage.js` — tByEn=10 hardcoded≈0
### `AdminV2Team.js` — tByEn=9 hardcoded≈0
### `ClientBillingOS.js` — tByEn=9 hardcoded≈0
### `ClientProjects.js` — tByEn=9 hardcoded≈0
### `DeveloperIntelGrowth.js` — tByEn=9 hardcoded≈0
### `DeveloperPerformance.js` — tByEn=9 hardcoded≈0
### `AdminPressureTopology.js` — tByEn=8 hardcoded≈0
### `AdminV2Workflow.js` — tByEn=8 hardcoded≈0
### `BuilderAuthPage.js` — tByEn=8 hardcoded≈0
### `CreateModuleDominance.js` — tByEn=8 hardcoded≈0
### `ClientContractPage.js` — tByEn=7 hardcoded≈0
### `ClientCosts.js` — tByEn=7 hardcoded≈0
### `ClientDocumentsPage.js` — tByEn=7 hardcoded≈0
### `ClientVersionsPage.js` — tByEn=7 hardcoded≈0
### `ClientWorkspace.js` — tByEn=7 hardcoded≈0
### `DeveloperIntelFeedback.js` — tByEn=7 hardcoded≈0
### `TesterHub.js` — tByEn=7 hardcoded≈0
### `TwoFactorChallengePage.js` — tByEn=7 hardcoded≈0
### `AdminPricingCalibration.js` — tByEn=6 hardcoded≈0
### `AdminQAPage.js` — tByEn=6 hardcoded≈0
### `ClientOperator.js` — tByEn=6 hardcoded≈0
### `DeveloperIntelLeaderboard.js` — tByEn=6 hardcoded≈0
### `AdminSystemUsers.js` — tByEn=5 hardcoded≈0
### `AdminV2System.js` — tByEn=5 hardcoded≈0
### `TesterIssues.js` — tByEn=5 hardcoded≈0
### `ClientLeaderboardPage.js` — tByEn=4 hardcoded≈0
### `DescribeFlow.js` — tByEn=4 hardcoded≈0
### `DeveloperAssignments.js` — tByEn=4 hardcoded≈0
### `DeveloperTimeControl.js` — tByEn=4 hardcoded≈0
### `ProjectBootingPage.js` — tByEn=4 hardcoded≈0
### `TesterValidationList.js` — tByEn=2 hardcoded≈0
### `ProviderAuth.js` — tByEn=1 hardcoded≈0
### `ProviderInbox.js` — tByEn=0 hardcoded≈0
