import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import assert from 'assert';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { sequelize } = await import('../config/db.js');
const { User, BirthChart, UserReport } = await import('../models/index.js');
const { extractAstrologicalSummary } = await import('../ai/reportPrompts.js');
const { getReportById, getReportBySlug, generateReportInBackground } = await import('../services/reportService.js');

try {
  const reports = await UserReport.findAll({
    include: [
      { model: User, as: 'user' },
      { model: BirthChart, as: 'chart' }
    ]
  });

  console.log(`Found ${reports.length} reports in user_reports.`);

  for (const report of reports) {
    const firstChapterSummary = report.sections?.[0]?.astrometricSummary || '';
    const realAsc = report.chart?.ascendant_sign;

    if (realAsc && realAsc !== 'Aries' && firstChapterSummary.includes('Aries')) {
      console.log(`Regenerating report ${report.id} (${report.report_slug}) with real ${realAsc} chart placements...`);
      report.status = 'generating';
      await report.save();
      await generateReportInBackground(report.id);
    } else if (report.chart?.chart_data) {
      const realFactors = extractAstrologicalSummary(
        report.chart.chart_data,
        report.report_type,
        report.chart
      );
      const userName = report.chart.person_name || report.user?.email?.split('@')[0] || 'Seeker';
      const currentSummary = report.summary || {};

      report.astrological_factors = realFactors;
      report.summary = {
        ...currentSummary,
        leadObservation: `Astrological synthesis for ${userName} grounded in ${realFactors.ascendantSign} Lagna and ${realFactors.moonSign} Rashi.`,
        activeDasha: realFactors.activeDasha?.period || currentSummary.activeDasha || 'Vimshottari Dasha Active'
      };
      await report.save();
    }

    const reloadedById = await getReportById(report.id, report.user_id);
    const reloadedBySlug = await getReportBySlug(report.user_id, report.report_slug);
    const jsonPayload = JSON.parse(JSON.stringify(reloadedById));

    console.log(`\n=== Verified Report [${jsonPayload.report_slug}] (${jsonPayload.id}) ===`);
    console.log('status:', jsonPayload.status);
    console.log('getReportBySlug.isUnlocked:', reloadedBySlug.isUnlocked);
    console.log('Array.isArray(sections):', Array.isArray(jsonPayload.sections), 'count:', jsonPayload.sections?.length);
    console.log('Array.isArray(table_of_contents):', Array.isArray(jsonPayload.table_of_contents), 'count:', jsonPayload.table_of_contents?.length);
    console.log('typeof summary:', typeof jsonPayload.summary, 'Array.isArray(keyHighlights):', Array.isArray(jsonPayload.summary?.keyHighlights));
    console.log('typeof astrological_factors:', typeof jsonPayload.astrological_factors);
    console.log('ascendantSign:', jsonPayload.astrological_factors?.ascendantSign);
    console.log('moonSign:', jsonPayload.astrological_factors?.moonSign);
    console.log('sunSign:', jsonPayload.astrological_factors?.sunSign);
    console.log('D-1 planets extracted:', Object.keys(jsonPayload.astrological_factors?.natalPlacements || {}).length);
    console.log('D-10 planets extracted:', Object.keys(jsonPayload.astrological_factors?.d10Placements || {}).length);
    console.log('D-9 planets extracted:', Object.keys(jsonPayload.astrological_factors?.d9Placements || {}).length);
    console.log('D-2 planets extracted:', Object.keys(jsonPayload.astrological_factors?.d2Placements || {}).length);
    console.log('Yogas extracted:', jsonPayload.astrological_factors?.yogas?.length);
    console.log('Doshas extracted:', jsonPayload.astrological_factors?.doshas?.length);
    console.log('Active Dasha:', jsonPayload.astrological_factors?.activeDasha);
    console.log('Upcoming Dashas count:', jsonPayload.astrological_factors?.upcomingDashas?.length);

    assert.strictEqual(Array.isArray(jsonPayload.sections), true, 'sections must be an Array');
    assert.strictEqual(Array.isArray(jsonPayload.table_of_contents), true, 'table_of_contents must be an Array');
    assert.strictEqual(typeof jsonPayload.summary, 'object', 'summary must be an Object');
    assert.strictEqual(typeof jsonPayload.astrological_factors, 'object', 'astrological_factors must be an Object');
    assert.strictEqual(Object.keys(jsonPayload.astrological_factors.natalPlacements).length, 9, 'All 9 D-1 planets must be extracted');
    assert.strictEqual(Object.keys(jsonPayload.astrological_factors.d10Placements).length, 9, 'All 9 D-10 planets must be extracted');
    assert.strictEqual(Object.keys(jsonPayload.astrological_factors.d9Placements).length, 9, 'All 9 D-9 planets must be extracted');
  }

  console.log('\nALL REPORT GENERATION & SERIALIZATION ASSERTIONS PASSED!');
  await sequelize.close();
  process.exit(0);
} catch (err) {
  console.error(err);
  process.exit(1);
}
