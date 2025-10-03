// Lighthouse performance auditing for FinePointRehab
import lighthouse from 'lighthouse';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const LIGHTHOUSE_CONFIG = {
  extends: 'lighthouse:default',
  settings: {
    onlyAudits: [
      'performance',
      'accessibility',
      'best-practices',
      'seo',
      'first-contentful-paint',
      'largest-contentful-paint',
      'cumulative-layout-shift',
      'total-blocking-time'
    ],
    formFactor: 'mobile',
    throttling: {
      rttMs: 150,
      throughputKbps: 1.6 * 1024,
      cpuSlowdownMultiplier: 4
    }
  }
};

const PAGES_TO_AUDIT = [
  { name: 'Home', url: 'http://localhost:8081/' },
  { name: 'Bubble Exercise', url: 'http://localhost:8081/exercises/bubble-exercise.html' },
  { name: 'Dashboard', url: 'http://localhost:8081/dashboard.html' }
];

const TARGET_SCORES = {
  performance: 90,
  accessibility: 90,
  'best-practices': 90,
  seo: 90
};

const TARGET_METRICS = {
  'first-contentful-paint': 2000, // 2 seconds
  'largest-contentful-paint': 3000, // 3 seconds
  'cumulative-layout-shift': 0.1,
  'total-blocking-time': 300 // 300ms
};

async function runLighthouseAudit() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });

  const results = [];
  
  try {
    for (const page of PAGES_TO_AUDIT) {
      console.log(`\n🔍 Auditing: ${page.name} (${page.url})`);
      
      try {
        const { lhr } = await lighthouse(page.url, {
          port: new URL(browser.wsEndpoint()).port,
          output: 'json',
          logLevel: 'info'
        }, LIGHTHOUSE_CONFIG);

        const pageResult = {
          name: page.name,
          url: page.url,
          scores: {
            performance: Math.round(lhr.categories.performance.score * 100),
            accessibility: Math.round(lhr.categories.accessibility.score * 100),
            'best-practices': Math.round(lhr.categories['best-practices'].score * 100),
            seo: Math.round(lhr.categories.seo.score * 100)
          },
          metrics: {
            'first-contentful-paint': lhr.audits['first-contentful-paint'].numericValue,
            'largest-contentful-paint': lhr.audits['largest-contentful-paint'].numericValue,
            'cumulative-layout-shift': lhr.audits['cumulative-layout-shift'].numericValue,
            'total-blocking-time': lhr.audits['total-blocking-time'].numericValue
          },
          timestamp: new Date().toISOString()
        };

        results.push(pageResult);
        console.log(`✅ Performance: ${pageResult.scores.performance}%`);
        console.log(`✅ Accessibility: ${pageResult.scores.accessibility}%`);
        console.log(`✅ Best Practices: ${pageResult.scores['best-practices']}%`);
        console.log(`✅ SEO: ${pageResult.scores.seo}%`);

      } catch (error) {
        console.error(`❌ Failed to audit ${page.name}: ${error.message}`);
        results.push({
          name: page.name,
          url: page.url,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }

  } finally {
    await browser.close();
  }

  return results;
}

function analyzeResults(results) {
  const summary = {
    totalPages: results.length,
    passedPages: 0,
    failedPages: 0,
    issues: [],
    recommendations: []
  };

  console.log('\n📊 LIGHTHOUSE AUDIT SUMMARY');
  console.log('='.repeat(50));

  results.forEach(result => {
    if (result.error) {
      summary.failedPages++;
      console.log(`\n❌ ${result.name}: FAILED`);
      console.log(`   Error: ${result.error}`);
      summary.issues.push(`${result.name}: Audit failed - ${result.error}`);
      return;
    }

    console.log(`\n📄 ${result.name}:`);
    
    let pagePassed = true;
    
    // Check scores against targets
    Object.entries(TARGET_SCORES).forEach(([category, target]) => {
      const score = result.scores[category];
      const status = score >= target ? '✅' : '❌';
      console.log(`   ${status} ${category}: ${score}% (target: ${target}%)`);
      
      if (score < target) {
        pagePassed = false;
        summary.issues.push(`${result.name}: ${category} score ${score}% below target ${target}%`);
      }
    });

    // Check metrics against targets  
    Object.entries(TARGET_METRICS).forEach(([metric, target]) => {
      const value = result.metrics[metric];
      let status, displayValue;
      
      if (metric === 'cumulative-layout-shift') {
        status = value <= target ? '✅' : '❌';
        displayValue = value.toFixed(3);
      } else {
        status = value <= target ? '✅' : '❌';
        displayValue = `${Math.round(value)}ms`;
      }
      
      console.log(`   ${status} ${metric}: ${displayValue} (target: ${metric === 'cumulative-layout-shift' ? target : target + 'ms'})`);
      
      if ((metric === 'cumulative-layout-shift' && value > target) || 
          (metric !== 'cumulative-layout-shift' && value > target)) {
        pagePassed = false;
        summary.issues.push(`${result.name}: ${metric} ${displayValue} exceeds target`);
      }
    });

    if (pagePassed) {
      summary.passedPages++;
      console.log(`   🎉 PASSED - All targets met!`);
    } else {
      summary.failedPages++;
      console.log(`   ⚠️  NEEDS IMPROVEMENT`);
    }
  });

  // Generate recommendations
  const commonIssues = {
    performance: [
      'Optimize images (use WebP format, proper sizing)',
      'Minify CSS and JavaScript',
      'Enable compression (gzip/brotli)',
      'Implement lazy loading for images',
      'Remove unused CSS/JS'
    ],
    accessibility: [
      'Add alt text to images',
      'Ensure sufficient color contrast (4.5:1 ratio)',
      'Add ARIA labels where needed',
      'Ensure keyboard navigation works',
      'Use semantic HTML elements'
    ],
    'best-practices': [
      'Use HTTPS',
      'Fix console errors',
      'Optimize third-party resources',
      'Use modern image formats',
      'Implement proper caching headers'
    ],
    seo: [
      'Add meta descriptions',
      'Use proper heading hierarchy',
      'Optimize page titles',
      'Add structured data',
      'Improve internal linking'
    ]
  };

  // Analyze patterns in issues
  const categoryIssues = {};
  summary.issues.forEach(issue => {
    Object.keys(commonIssues).forEach(category => {
      if (issue.includes(category)) {
        if (!categoryIssues[category]) categoryIssues[category] = 0;
        categoryIssues[category]++;
      }
    });
  });

  Object.entries(categoryIssues).forEach(([category, count]) => {
    summary.recommendations.push({
      category,
      priority: count > 1 ? 'High' : 'Medium',
      suggestions: commonIssues[category].slice(0, 3) // Top 3 suggestions
    });
  });

  return summary;
}

function saveResults(results, summary) {
  const reportsDir = path.join(process.cwd(), 'test-results');
  
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  // Save detailed results
  const resultsPath = path.join(reportsDir, `lighthouse-results-${timestamp}.json`);
  fs.writeFileSync(resultsPath, JSON.stringify({ results, summary }, null, 2));
  
  // Save summary report
  const reportPath = path.join(reportsDir, `lighthouse-summary-${timestamp}.txt`);
  let reportContent = `LIGHTHOUSE AUDIT SUMMARY\n`;
  reportContent += `Generated: ${new Date().toISOString()}\n`;
  reportContent += `${'='.repeat(50)}\n\n`;
  
  reportContent += `OVERVIEW:\n`;
  reportContent += `  Total Pages Audited: ${summary.totalPages}\n`;
  reportContent += `  Pages Passed: ${summary.passedPages}\n`;
  reportContent += `  Pages Failed: ${summary.failedPages}\n`;
  reportContent += `  Success Rate: ${Math.round((summary.passedPages / summary.totalPages) * 100)}%\n\n`;
  
  if (summary.issues.length > 0) {
    reportContent += `ISSUES FOUND:\n`;
    summary.issues.forEach((issue, index) => {
      reportContent += `  ${index + 1}. ${issue}\n`;
    });
    reportContent += `\n`;
  }
  
  if (summary.recommendations.length > 0) {
    reportContent += `RECOMMENDATIONS:\n`;
    summary.recommendations.forEach((rec, index) => {
      reportContent += `  ${index + 1}. ${rec.category.toUpperCase()} (${rec.priority} Priority):\n`;
      rec.suggestions.forEach(suggestion => {
        reportContent += `     - ${suggestion}\n`;
      });
      reportContent += `\n`;
    });
  }
  
  fs.writeFileSync(reportPath, reportContent);
  
  console.log(`\n📁 Results saved:`);
  console.log(`   Detailed: ${resultsPath}`);
  console.log(`   Summary: ${reportPath}`);
}

async function main() {
  console.log('🚀 Starting Lighthouse Performance Audit...');
  console.log('Target Scores:', TARGET_SCORES);
  console.log('Target Metrics:', TARGET_METRICS);
  
  try {
    const results = await runLighthouseAudit();
    const summary = analyzeResults(results);
    saveResults(results, summary);
    
    console.log(`\n🏁 FINAL RESULT:`);
    console.log(`   ${summary.passedPages}/${summary.totalPages} pages passed all targets`);
    
    if (summary.failedPages > 0) {
      console.log(`   ⚠️  ${summary.failedPages} pages need improvement`);
      process.exit(1); // Exit with error code for CI/CD
    } else {
      console.log(`   🎉 All pages meet performance targets!`);
      process.exit(0);
    }
    
  } catch (error) {
    console.error('❌ Lighthouse audit failed:', error);
    process.exit(1);
  }
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch('http://localhost:8081/');
    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }
    console.log('✅ Test server is running on port 8081');
    return true;
  } catch (error) {
    console.error('❌ Test server is not running on port 8081');
    console.error('   Please run: npm run serve:test');
    return false;
  }
}

// Run audit if server is available
checkServer().then(serverRunning => {
  if (serverRunning) {
    main();
  } else {
    process.exit(1);
  }
});