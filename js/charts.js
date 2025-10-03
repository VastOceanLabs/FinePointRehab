/**
 * FinePointRehab - Data Visualization Module
 * Task 19: Chart.js integration with performance optimization (FIXED)
 * 
 * Features:
 * - Lazy-loaded Chart.js (UMD bundle with registerables)
 * - Performance constraints (60-day window, IntersectionObserver)
 * - Session frequency visualization
 * - Progress trend charts with aggregated datasets
 * - Achievement timeline display
 * - Local Chart.js bundle (offline functionality)
 * - Theme-aware colors from CSS variables
 * - Reduced motion support
 * - Mobile-responsive charts
 */

import { storage } from './utils.js';
import { getExercise, EXERCISES } from './exercises.js';

// Chart.js will be lazy-loaded
let Chart = null;
let chartsInitialized = false;

// Chart configuration constants
const CHART_CONFIG = {
  maxDataDays: 60,        // Limit data window for performance
  defaultDuration: 30,    // Default chart period in days
  animationDuration: 0,   // Will be set based on reduced motion preference
  pointRadius: 4,
  pointHoverRadius: 6,
  tension: 0.3,          // Smooth curves
  responsive: true,
  maintainAspectRatio: false
};

// Theme-aware color configuration
const CHART_COLORS = {
  // Will be populated from CSS variables at runtime
  primary: null,
  secondary: null,
  success: null,
  warning: null,
  error: null,
  brand: null,
  text: null,
  grid: null,
  background: null
};

/**
 * Create safe RGBA color from CSS variable with alpha
 * @param {string} color - CSS color value
 * @param {number} alpha - Alpha value (0-1)
 * @returns {string} RGBA color string
 */
function withAlpha(color, alpha) {
  if (color?.startsWith('#')) {
    if (color.length === 7) {
      // 6-digit hex: add alpha as hex
      return `${color}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;
    }
    return color; // 3-digit hex or malformed, return as-is
  }
  
  // Fallback for rgb(), hsl(), or other formats
  // Try to get RGB values from a parallel CSS variable
  const rgbVar = color?.replace('--', '--') + '-rgb';
  const rgbValue = getComputedStyle(document.documentElement).getPropertyValue(rgbVar).trim();
  
  if (rgbValue) {
    return `rgba(${rgbValue}, ${alpha})`;
  }
  
  // Final fallback
  return `rgba(0, 0, 0, ${alpha})`;
}

/**
 * Create consistent date key for local timezone
 * @param {Date} date - Date object
 * @returns {number} Timestamp at local midnight
 */
function dateToKey(date) {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/**
 * Initialize Chart.js with lazy loading (UMD bundle)
 * @returns {Promise<boolean>} Success status
 */
async function initializeCharts() {
  if (chartsInitialized && Chart) {
    return true;
  }

  try {
    // Lazy load Chart.js from local UMD bundle
    const module = await import('./vendor/chart.umd.js');
    Chart = module.Chart || module.default;
    
    if (!Chart) {
      throw new Error('Chart not found in UMD bundle');
    }

    // Register all Chart.js components using registerables
    if (Chart.registerables) {
      Chart.register(...Chart.registerables);
    } else {
      console.warn('Chart.registerables not available, charts may not work correctly');
    }

    // Update animation duration based on reduced motion preference
    const prefersReducedMotion = typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    CHART_CONFIG.animationDuration = prefersReducedMotion ? 0 : 300;

    // Load theme colors from CSS variables
    loadThemeColors();

    chartsInitialized = true;
    console.log('Chart.js initialized successfully');
    return true;

  } catch (error) {
    console.error('Failed to initialize Chart.js:', error);
    return false;
  }
}

/**
 * Load theme colors from CSS variables
 */
function loadThemeColors() {
  const root = document.documentElement;
  const getColor = (variable) => {
    const color = getComputedStyle(root).getPropertyValue(variable).trim();
    return color || '#6b7280'; // Fallback gray
  };

  CHART_COLORS.primary = getColor('--brand-blue');
  CHART_COLORS.secondary = getColor('--brand-aqua');
  CHART_COLORS.success = getColor('--success');
  CHART_COLORS.warning = getColor('--warning');
  CHART_COLORS.error = getColor('--error');
  CHART_COLORS.brand = getColor('--brand-aqua');
  CHART_COLORS.text = getColor('--text-primary');
  CHART_COLORS.grid = getColor('--border-light');
  CHART_COLORS.background = getColor('--bg-secondary');
}

/**
 * Get color for dataset based on its purpose
 * @param {string} label - Dataset label
 * @returns {string} Color value
 */
function getColorForDataset(label) {
  if (label.includes('Best') || label.includes('Progress')) {
    return CHART_COLORS.success;
  }
  if (label.includes('Achievement')) {
    return CHART_COLORS.warning;
  }
  return CHART_COLORS.secondary;
}

/**
 * Create session frequency chart
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {number} days - Number of days to show (default: 30)
 * @returns {Promise<Chart|null>} Chart instance or null
 */
async function createSessionFrequencyChart(canvas, days = 30) {
  if (!await initializeCharts()) {
    return null;
  }

  // Clamp days to maximum allowed
  days = Math.min(days, CHART_CONFIG.maxDataDays);

  const data = await getSessionFrequencyData(days);
  const datasetColor = getColorForDataset('Sessions');
  
  const config = {
    type: 'line',
    data: {
      labels: data.labels,
      datasets: [{
        label: 'Sessions Completed',
        data: data.values,
        borderColor: datasetColor,
        backgroundColor: withAlpha(datasetColor, 0.125),
        borderWidth: 2,
        pointRadius: CHART_CONFIG.pointRadius,
        pointHoverRadius: CHART_CONFIG.pointHoverRadius,
        tension: CHART_CONFIG.tension,
        fill: true
      }]
    },
    options: {
      responsive: CHART_CONFIG.responsive,
      maintainAspectRatio: CHART_CONFIG.maintainAspectRatio,
      animation: {
        duration: CHART_CONFIG.animationDuration
      },
      plugins: {
        title: {
          display: true,
          text: `Session Frequency (Last ${days} Days)`,
          color: CHART_COLORS.text,
          font: {
            size: 16,
            weight: 'bold'
          }
        },
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: CHART_COLORS.background,
          titleColor: CHART_COLORS.text,
          bodyColor: CHART_COLORS.text,
          borderColor: CHART_COLORS.grid,
          borderWidth: 1,
          borderRadius: 8,
          displayColors: false,
          callbacks: {
            title: function(tooltipItems) {
              return tooltipItems[0].label;
            },
            label: function(context) {
              const value = context.parsed.y;
              return value === 1 ? '1 session' : `${value} sessions`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            color: withAlpha(CHART_COLORS.grid, 0.4),
            borderColor: CHART_COLORS.grid
          },
          ticks: {
            color: CHART_COLORS.text,
            maxTicksLimit: 7 // Show max 7 labels to avoid crowding
          }
        },
        y: {
          beginAtZero: true,
          grid: {
            color: withAlpha(CHART_COLORS.grid, 0.4),
            borderColor: CHART_COLORS.grid
          },
          ticks: {
            color: CHART_COLORS.text,
            stepSize: 1,
            callback: function(value) {
              return Number.isInteger(value) ? value : '';
            }
          }
        }
      }
    }
  };

  return new Chart(canvas, config);
}

/**
 * Create progress trend chart for specific exercise
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {string} exerciseId - Exercise identifier
 * @param {number} days - Number of days to show (default: 30)
 * @returns {Promise<Chart|null>} Chart instance or null
 */
async function createProgressTrendChart(canvas, exerciseId, days = 30) {
  if (!await initializeCharts()) {
    return null;
  }

  // Clamp days to maximum allowed
  days = Math.min(days, CHART_CONFIG.maxDataDays);

  const exercise = getExercise(exerciseId);
  if (!exercise) {
    console.error(`Exercise not found: ${exerciseId}`);
    return null;
  }

  const data = await getProgressTrendData(exerciseId, days);
  const datasetColor = getColorForDataset('Best Score');
  
  const config = {
    type: 'line',
    data: {
      labels: data.labels,
      datasets: [{
        label: 'Best Score',
        data: data.scores,
        borderColor: datasetColor,
        backgroundColor: withAlpha(datasetColor, 0.125),
        borderWidth: 2,
        pointRadius: CHART_CONFIG.pointRadius,
        pointHoverRadius: CHART_CONFIG.pointHoverRadius,
        tension: CHART_CONFIG.tension,
        fill: true
      }]
    },
    options: {
      responsive: CHART_CONFIG.responsive,
      maintainAspectRatio: CHART_CONFIG.maintainAspectRatio,
      animation: {
        duration: CHART_CONFIG.animationDuration
      },
      plugins: {
        title: {
          display: true,
          text: `${exercise.name} Progress (Last ${days} Days)`,
          color: CHART_COLORS.text,
          font: {
            size: 16,
            weight: 'bold'
          }
        },
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: CHART_COLORS.background,
          titleColor: CHART_COLORS.text,
          bodyColor: CHART_COLORS.text,
          borderColor: CHART_COLORS.grid,
          borderWidth: 1,
          borderRadius: 8,
          displayColors: false,
          callbacks: {
            title: function(tooltipItems) {
              return tooltipItems[0].label;
            },
            label: function(context) {
              return `Best Score: ${context.parsed.y}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            color: withAlpha(CHART_COLORS.grid, 0.4),
            borderColor: CHART_COLORS.grid
          },
          ticks: {
            color: CHART_COLORS.text,
            maxTicksLimit: 7
          }
        },
        y: {
          beginAtZero: true,
          grid: {
            color: withAlpha(CHART_COLORS.grid, 0.4),
            borderColor: CHART_COLORS.grid
          },
          ticks: {
            color: CHART_COLORS.text,
            callback: function(value) {
              return Number.isInteger(value) ? value : '';
            }
          }
        }
      }
    }
  };

  return new Chart(canvas, config);
}

/**
 * Create achievement timeline chart
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @returns {Promise<Chart|null>} Chart instance or null
 */
async function createAchievementTimelineChart(canvas) {
  if (!await initializeCharts()) {
    return null;
  }

  const data = await getAchievementTimelineData();
  
  if (data.labels.length === 0) {
    // No achievements to display
    canvas.style.display = 'none';
    return null;
  }

  const datasetColor = getColorForDataset('Achievements Unlocked');

  const config = {
    type: 'line',
    data: {
      labels: data.labels,
      datasets: [{
        label: 'Achievements Unlocked',
        data: data.values,
        borderColor: datasetColor,
        backgroundColor: withAlpha(datasetColor, 0.125),
        borderWidth: 2,
        pointRadius: CHART_CONFIG.pointRadius + 1, // Slightly larger for achievements
        pointHoverRadius: CHART_CONFIG.pointHoverRadius + 1,
        tension: 0, // Step-like progression for achievements
        fill: true,
        stepped: true
      }]
    },
    options: {
      responsive: CHART_CONFIG.responsive,
      maintainAspectRatio: CHART_CONFIG.maintainAspectRatio,
      animation: {
        duration: CHART_CONFIG.animationDuration
      },
      plugins: {
        title: {
          display: true,
          text: 'Achievement Progress',
          color: CHART_COLORS.text,
          font: {
            size: 16,
            weight: 'bold'
          }
        },
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: CHART_COLORS.background,
          titleColor: CHART_COLORS.text,
          bodyColor: CHART_COLORS.text,
          borderColor: CHART_COLORS.grid,
          borderWidth: 1,
          borderRadius: 8,
          displayColors: false,
          callbacks: {
            title: function(tooltipItems) {
              return tooltipItems[0].label;
            },
            label: function(context) {
              const value = context.parsed.y;
              return value === 1 ? '1 achievement' : `${value} achievements`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            color: withAlpha(CHART_COLORS.grid, 0.4),
            borderColor: CHART_COLORS.grid
          },
          ticks: {
            color: CHART_COLORS.text,
            maxTicksLimit: 7
          }
        },
        y: {
          beginAtZero: true,
          grid: {
            color: withAlpha(CHART_COLORS.grid, 0.4),
            borderColor: CHART_COLORS.grid
          },
          ticks: {
            color: CHART_COLORS.text,
            stepSize: 1,
            callback: function(value) {
              return Number.isInteger(value) ? value : '';
            }
          }
        }
      }
    }
  };

  return new Chart(canvas, config);
}

/**
 * Get session frequency data for chart (FIXED: local date handling)
 * @param {number} days - Number of days
 * @returns {Promise<{labels: string[], values: number[]}>} Chart data
 */
async function getSessionFrequencyData(days) {
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - days + 1);

  const labels = [];
  const values = [];
  const dailySessions = new Map();

  // Initialize all days with 0 sessions using local date keys
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateKey = dateToKey(date);
    dailySessions.set(dateKey, 0);
    
    // Format label for display (use user's locale)
    const label = date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric' 
    });
    labels.push(label);
  }

  // Count sessions from all exercises
  for (const exercise of EXERCISES) {
    const sessionData = storage.get(`exercise:${exercise.id}:sessionHistory`);
    if (sessionData && Array.isArray(sessionData)) {
      for (const session of sessionData) {
        if (session.date) {
          const sessionDateKey = dateToKey(new Date(session.date));
          if (dailySessions.has(sessionDateKey)) {
            dailySessions.set(sessionDateKey, dailySessions.get(sessionDateKey) + 1);
          }
        }
      }
    }
  }

  // Convert to arrays for Chart.js
  for (const count of dailySessions.values()) {
    values.push(count);
  }

  return { labels, values };
}

/**
 * Get progress trend data for specific exercise (FIXED: local date handling)
 * @param {string} exerciseId - Exercise identifier
 * @param {number} days - Number of days
 * @returns {Promise<{labels: string[], scores: number[]}>} Chart data
 */
async function getProgressTrendData(exerciseId, days) {
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - days + 1);

  const labels = [];
  const scores = [];
  const dailyBestScores = new Map();

  // Initialize all days using local date keys
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateKey = dateToKey(date);
    dailyBestScores.set(dateKey, null);
    
    const label = date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric' 
    });
    labels.push(label);
  }

  // Get session data for this exercise
  const sessionData = storage.get(`exercise:${exerciseId}:sessionHistory`);
  if (sessionData && Array.isArray(sessionData)) {
    for (const session of sessionData) {
      if (session.date && typeof session.score === 'number') {
        const sessionDateKey = dateToKey(new Date(session.date));
        if (dailyBestScores.has(sessionDateKey)) {
          const currentBest = dailyBestScores.get(sessionDateKey);
          if (currentBest === null || session.score > currentBest) {
            dailyBestScores.set(sessionDateKey, session.score);
          }
        }
      }
    }
  }

  // Fill forward null values to show progress continuation
  let lastScore = null;
  for (const score of dailyBestScores.values()) {
    if (score !== null) {
      lastScore = score;
      scores.push(score);
    } else {
      scores.push(lastScore); // Show last known score or null
    }
  }

  return { labels, scores };
}

/**
 * Get achievement timeline data (FIXED: local date handling)
 * @returns {Promise<{labels: string[], values: number[]}>} Chart data
 */
async function getAchievementTimelineData() {
  const achievementHistory = storage.get('achievementHistory') || [];
  
  if (achievementHistory.length === 0) {
    return { labels: [], values: [] };
  }

  // Sort by date
  achievementHistory.sort((a, b) => new Date(a.date) - new Date(b.date));

  const labels = [];
  const values = [];
  let count = 0;

  for (const achievement of achievementHistory) {
    count++;
    const date = new Date(achievement.date);
    const label = date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric' 
    });
    labels.push(label);
    values.push(count);
  }

  return { labels, values };
}

/**
 * Setup IntersectionObserver for chart containers
 * @param {HTMLElement} container - Chart container element
 * @param {Function} createChartFunction - Function to create chart
 * @returns {IntersectionObserver} Observer instance
 */
function setupIntersectionObserver(container, createChartFunction) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !entry.target.dataset.chartLoaded) {
          // Mark as loaded to prevent duplicate creation
          entry.target.dataset.chartLoaded = 'true';
          
          // Create chart when container comes into view
          createChartFunction();
          
          // Stop observing this element
          observer.unobserve(entry.target);
        }
      });
    },
    {
      root: null,
      rootMargin: '50px', // Start loading 50px before visible
      threshold: 0.1
    }
  );

  observer.observe(container);
  return observer;
}

/**
 * Destroy chart instance and clean up
 * @param {Chart} chartInstance - Chart.js instance
 */
function destroyChart(chartInstance) {
  if (chartInstance && typeof chartInstance.destroy === 'function') {
    chartInstance.destroy();
  }
}

/**
 * Reset chart container for re-initialization
 * @param {HTMLElement} container - Chart container element
 */
function resetChartContainer(container) {
  if (container && container.dataset.chartLoaded) {
    delete container.dataset.chartLoaded;
  }
}

/**
 * Update chart colors when theme changes (FIXED: preserve dataset-specific colors)
 * @param {Chart} chartInstance - Chart.js instance
 */
function updateChartTheme(chartInstance) {
  if (!chartInstance) return;

  loadThemeColors();
  
  // Update chart colors
  const config = chartInstance.config;
  
  // Update dataset colors based on their purpose
  if (config.data.datasets) {
    config.data.datasets.forEach((dataset) => {
      const newColor = getColorForDataset(dataset.label);
      dataset.borderColor = newColor;
      dataset.backgroundColor = withAlpha(newColor, 0.125);
    });
  }

  // Update scale colors
  if (config.options.scales) {
    ['x', 'y'].forEach(axis => {
      if (config.options.scales[axis]) {
        config.options.scales[axis].grid.color = withAlpha(CHART_COLORS.grid, 0.4);
        config.options.scales[axis].grid.borderColor = CHART_COLORS.grid;
        config.options.scales[axis].ticks.color = CHART_COLORS.text;
      }
    });
  }

  // Update plugin colors
  if (config.options.plugins) {
    if (config.options.plugins.title) {
      config.options.plugins.title.color = CHART_COLORS.text;
    }
    if (config.options.plugins.tooltip) {
      config.options.plugins.tooltip.backgroundColor = CHART_COLORS.background;
      config.options.plugins.tooltip.titleColor = CHART_COLORS.text;
      config.options.plugins.tooltip.bodyColor = CHART_COLORS.text;
      config.options.plugins.tooltip.borderColor = CHART_COLORS.grid;
    }
  }

  chartInstance.update('none'); // Update without animation
}

// Export public API
export {
  initializeCharts,
  createSessionFrequencyChart,
  createProgressTrendChart,
  createAchievementTimelineChart,
  setupIntersectionObserver,
  destroyChart,
  resetChartContainer,
  updateChartTheme,
  CHART_CONFIG
};