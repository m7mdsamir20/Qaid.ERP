# Standardizing Report Printing and PDF Downloads

- [x] Support `onExportPdf` prop in `ReportHeader.tsx`
- [x] Standardize daily-report printing/downloading
- [x] Standardize balance-sheet printing/downloading
- [x] Standardize installments report printing/downloading
- [x] Remove legacy `/print/report` page
- [x] Verify build and functionality

# Transitioning All PDF Downloads to Server-Side Generation (Puppeteer)

- [x] Create API Endpoint `/api/pdf/generate` (`src/app/api/pdf/generate/route.ts`)
- [x] Refactor existing HR report: Payroll Statement (`src/app/reports/payroll-statement/page.tsx`).
- [x] Update `generatePdfFromHtmlText` in `src/lib/printDirectly.ts` to use `/api/pdf/generate` via POST
- [x] Verify typescript build and test functionality
