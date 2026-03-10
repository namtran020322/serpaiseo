

## Plan: Complete i18n — Translate ALL Remaining Hardcoded Strings

### Problem
Many components still have hardcoded English strings that don't change when user switches to Vietnamese. Affected components include: Billing page, ProjectRow, ClassRow, ProjectSettingsDialog, ClassSettingsDialog, EditProjectDialog, AddKeywordsDialog, CheckProgressDialog, ExportButton, RankingDistributionChart, RankingStatsCards, TopOverviewTable, RankingHistoryChart, HistoryDatePicker, SerpResultsDialog, SidebarSearch, ConfirmDeleteDialog, DataTablePagination, DataTableToolbar.

### Changes

#### A. Expand translation dictionaries (`src/i18n/en.ts` + `src/i18n/vi.ts`)

Add ~120 new keys covering:

| Section | Example keys |
|---------|-------------|
| **Ranking stats** | `stats.totalKeywords`, `stats.top1_3`, `stats.top4_10`, `stats.top11_30`, `stats.top31_100`, `stats.notFound` |
| **Ranking distribution** | `chart.rankingDistribution`, `chart.keywordsByPosition`, `chart.totalKeywords`, `chart.distributionHealth`, `chart.updated`, `chart.noRankingData` |
| **Domain comparison** | `domain.comparison`, `domain.vsCompetitors`, `domain.noDomainData`, `domain.header` |
| **Ranking history** | `history.title`, `history.noHistory`, `history.recordedOnRefresh`, `history.7days`, `history.30days`, `history.3months`, `history.viewHistory`, `history.hasRankingData` |
| **Project settings** | `projectSettings.title`, `projectSettings.description`, `projectSettings.projectName`, `projectSettings.domain`, `projectSettings.domainReadonly`, `projectSettings.deleteProject`, `projectSettings.deleteConfirm` |
| **Class settings** | `classSettings.title`, `classSettings.description`, `classSettings.general`, `classSettings.searchSettings`, `classSettings.competitors`, `classSettings.className`, `classSettings.autoCheck`, `classSettings.noSchedule`, `classSettings.daily/weekly/monthly`, `classSettings.checkTime`, `classSettings.searchParamsLocked`, `classSettings.country/language/device`, `classSettings.topResults`, `classSettings.competitorDomains`, `classSettings.noCompetitors`, `classSettings.competitorLimit`, `classSettings.deleteClass`, `classSettings.deleteConfirm` |
| **Edit project** | `editProject.title`, `editProject.description`, `editProject.projectName`, `editProject.placeholder` |
| **Add keywords** | `addKeywords.title`, `addKeywords.description`, `addKeywords.label`, `addKeywords.importFile`, `addKeywords.placeholder`, `addKeywords.uniqueCount`, `addKeywords.adding`, `addKeywords.add`, `addKeywords.fileImported`, `addKeywords.enterKeyword` |
| **Check progress** | `checkProgress.complete`, `checkProgress.checking`, `checkProgress.class`, `checkProgress.progress`, `checkProgress.checked`, `checkProgress.checkingKeyword`, `checkProgress.found`, `checkProgress.notFoundLabel`, `checkProgress.done`, `checkProgress.cancelCheck` |
| **Export** | `export.title`, `export.csv`, `export.json`, `export.complete`, `export.exported`, `export.failed`, `export.failedDesc` |
| **SERP** | `serp.title`, `serp.results`, `serp.tracking`, `serp.showMore`, `serp.showLess`, `serp.position` |
| **Confirm delete** | `confirmDelete.itemsWillBeDeleted`, `confirmDelete.cancel`, `confirmDelete.delete`, `confirmDelete.deleting` |
| **Project/Class row** | `projectRow.viewProject`, `projectRow.addClass`, `projectRow.refreshAll`, `projectRow.editProject`, `projectRow.deleteProject`, `projectRow.deleteConfirm`, `classRow.viewDetails`, `classRow.refreshRankings`, `classRow.editClass`, `classRow.deleteClass`, `classRow.deleteConfirm` |
| **Sidebar search** | `search.placeholder`, `search.noResults`, `search.pages`, `search.projects`, `search.classes`, `search.inProject` |
| **Data table** | `table.selected`, `table.rowsPerPage`, `table.page`, `table.showSerpTitles`, `table.columns`, `table.deleteSelected`, `table.refreshSelected` |
| **Billing page** | Update to use `t()` for all remaining hardcoded strings (status badges, features, transaction table headers) |

#### B. Update ~18 components to use `t()`

Each component: import `useLanguage`, destructure `{ t }`, replace hardcoded strings.

1. **`src/pages/Billing.tsx`** — All hardcoded strings (titles, badges, table headers, features list, toast messages)
2. **`src/components/projects/RankingStatsCards.tsx`** — Card labels ("Total Keywords", "Top 1-3", etc.)
3. **`src/components/projects/RankingDistributionChart.tsx`** — Title, subtitle, legend labels, center text
4. **`src/components/projects/TopOverviewTable.tsx`** — Title, subtitle, column headers
5. **`src/components/projects/RankingHistoryChart.tsx`** — Title, time range labels, empty state
6. **`src/components/projects/ProjectSettingsDialog.tsx`** — All labels and buttons
7. **`src/components/projects/ClassSettingsDialog.tsx`** — All tab labels, form labels, buttons, mixed VN/EN text
8. **`src/components/projects/EditProjectDialog.tsx`** — Title, labels, buttons
9. **`src/components/projects/AddKeywordsDialog.tsx`** — All text
10. **`src/components/projects/CheckProgressDialog.tsx`** — All text
11. **`src/components/projects/ExportButton.tsx`** — Button text, toast messages
12. **`src/components/projects/SerpResultsDialog.tsx`** — Title, meta labels
13. **`src/components/projects/HistoryDatePicker.tsx`** — Button text, legend
14. **`src/components/projects/ConfirmDeleteDialog.tsx`** — Button labels, "items will be deleted"
15. **`src/components/projects/ProjectRow.tsx`** — Dropdown menu items, delete dialog
16. **`src/components/projects/ClassRow.tsx`** — Dropdown menu items, delete dialog
17. **`src/components/SidebarSearch.tsx`** — Placeholder, headings, "in" prefix
18. **`src/components/ui/data-table-pagination.tsx`** — "Rows per page", "Page X of Y", "selected"
19. **`src/components/projects/ProjectDetail.tsx`** — "classes"/"keywords" count text (line 118)

This is a large but mechanical change. Every visible string across the app will be translatable.

