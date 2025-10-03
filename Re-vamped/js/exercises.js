/**
 * EXERCISE REGISTRY - CRITICAL FOR TEST COMPATIBILITY
 * Must match the exact structure that achievement tests expect
 */

// Exercise registry - defines all available exercises
// CRITICAL: This must be an OBJECT (not array) to match test expectations
export const EXERCISES = {
  bubble: {
    id: 'bubble',
    name: 'Bubble Tap',
    path: 'exercises/bubble-exercise.html',
    difficulties: ['easy', 'medium', 'hard'], // Standardized to common pattern
    category: 'coordination',
    description: 'Tap moving bubbles to improve hand-eye coordination and reaction time',
    visible: true
  },
  comet: {
    id: 'comet',
    name: 'Comet Tap', 
    path: 'exercises/comet-exercise.html',
    difficulties: ['easy', 'medium', 'hard'], // Standardized to common pattern
    category: 'coordination',
    description: 'Track and tap comets to enhance visual motor skills and tracking',
    visible: true
  },
  crosshair: {
    id: 'crosshair',
    name: 'Crosshair',
    path: 'exercises/crosshair-exercise.html',
    difficulties: ['easy', 'medium', 'hard'],
    category: 'coordination', 
    description: 'Track moving targets with precision',
    visible: true
  },
  saccade: {
    id: 'saccade',
    name: 'Saccade Training',
    path: 'exercises/saccade-exercise.html', 
    difficulties: ['easy', 'medium', 'hard'],
    category: 'visual',
    description: 'Improve rapid eye movements',
    visible: true
  },
  rhythm: {
    id: 'rhythm',
    name: 'Rhythm Reach',
    path: 'exercises/rhythm-exercise.html',
    difficulties: ['easy', 'medium', 'hard'], // Standardized instead of sequence lengths
    sequenceLengths: [2, 3, 4], // Moved specific config to separate property
    speedLevels: ['slow', 'medium', 'fast'],
    category: 'cognitive',
    description: 'Remember and repeat patterns to improve memory and cognitive function',
    visible: true
  },
  precision: {
    id: 'precision',
    name: 'Precision Drop',
    path: 'exercises/precision-drop-exercise.html',
    difficulties: ['easy', 'medium', 'hard'],
    category: 'precision',
    description: 'Drag objects to targets to enhance fine motor precision and control',
    visible: true
  },
  maze: {
    id: 'maze',
    name: 'Cosmic Maze',
    path: 'exercises/maze-exercise.html',
    difficulties: ['easy', 'medium', 'hard'],
    category: 'navigation',
    description: 'Navigate through mazes to improve spatial awareness and motor control',
    visible: true
  },
  sort: {
    id: 'sort',
    name: 'Sort & Categorize',
    path: 'exercises/sort-categorize-exercise.html',
    difficulties: ['easy', 'medium', 'hard'],
    categoryTypes: ['colors', 'shapes', 'numbers', 'letters'],
    category: 'cognitive',
    description: 'Categorize objects to enhance executive function and decision-making',
    visible: true
  },
  trace: {
    id: 'trace',
    name: 'Trace & Reveal',
    path: 'exercises/trace-reveal-exercise.html',
    difficulties: ['easy', 'medium', 'hard'],
    category: 'precision',
    description: 'Trace paths to reveal images and improve controlled movement',
    visible: true
  },
  sequence: {
    id: 'sequence',
    name: 'Sequence Builder',
    path: 'exercises/sequence-builder-exercise.html',
    difficulties: ['easy', 'medium', 'hard'],
    category: 'cognitive',
    description: 'Build sequences to enhance planning and executive function',
    visible: true
  },
  mirror: {
    id: 'mirror',
    name: 'Mirror Match',
    path: 'exercises/mirror-match-exercise.html',
    difficulties: ['easy', 'medium', 'hard'], // Standardized instead of small/large
    sizes: ['small', 'medium', 'large'], // Moved specific config to separate property
    modes: ['simultaneous', 'sequential'],
    category: 'coordination',
    description: 'Mirror bilateral movements to improve coordination and timing',
    visible: true
  },
  scanner: {
    id: 'scanner',
    name: 'Visual Scanner',
    path: 'exercises/visual-scanner-exercise.html',
    difficulties: ['easy', 'medium', 'hard'],
    category: 'visual',
    description: 'Search and identify targets to improve visual attention and scanning',
    visible: true
  }
};

// Exercise categories for grouping and filtering
// CRITICAL: These arrays must stay in sync with EXERCISES object
export const CATEGORIES = {
  coordination: {
    name: 'Hand-Eye Coordination',
    description: 'Exercises that improve coordination between visual input and motor response',
    exercises: ['bubble', 'comet', 'crosshair', 'mirror']
  },
  cognitive: {
    name: 'Cognitive Function', 
    description: 'Exercises that enhance memory, attention, and executive function',
    exercises: ['rhythm', 'sort', 'sequence']
  },
  precision: {
    name: 'Fine Motor Precision',
    description: 'Exercises that develop precise motor control and accuracy',
    exercises: ['precision', 'trace']
  },
  navigation: {
    name: 'Spatial Navigation',
    description: 'Exercises that improve spatial awareness and navigation skills',
    exercises: ['maze']
  },
  visual: {
    name: 'Visual Processing',
    description: 'Exercises that improve visual attention, scanning, and processing',
    exercises: ['scanner', 'saccade']
  }
};

// Known categories for validation
const VALID_CATEGORIES = Object.keys(CATEGORIES);

/**
 * Get all visible exercises for achievements/explorer badge
 * CRITICAL: This function must return exercises that match test expectations
 * @returns {Array} Array of exercises filtered by visibility
 */
export function getVisibleExercises() {
  return Object.values(EXERCISES).filter(ex => ex.visible);
}

/**
 * Get exercise by ID - CRITICAL for test compatibility
 * Primary function for retrieving exercises
 * @param {string} id Exercise ID
 * @returns {Object|null} Exercise object or null if not found
 */
export function getExerciseById(id) {
  return EXERCISES[id] || null;
}

/**
 * Get exercise by ID (legacy alias - avoid using in new code)
 * @deprecated Use getExerciseById instead for consistency
 * @param {string} exerciseId Exercise ID  
 * @returns {Object|null} Exercise object or null if not found
 */
export function getExercise(exerciseId) {
  return getExerciseById(exerciseId);
}

/**
 * Get exercises by category with validation
 * @param {string} category Category name
 * @returns {Array} Array of exercises in the category
 * @throws {Error} If category is not valid
 */
export function getExercisesByCategory(category) {
  if (!VALID_CATEGORIES.includes(category)) {
    throw new Error(`Invalid category: ${category}. Valid categories: ${VALID_CATEGORIES.join(', ')}`);
  }
  return Object.values(EXERCISES).filter(exercise => exercise.category === category);
}

/**
 * Get all exercise IDs as array - CRITICAL for exportData() to avoid hardcoding
 * This function prevents test failures when exercises are added/removed
 * @returns {Array} Array of all exercise IDs
 */
export function getAllExerciseIds() {
  return Object.keys(EXERCISES);
}

/**
 * Get all visible exercise IDs as array - for export functions
 * @returns {Array} Array of visible exercise IDs
 */
export function getVisibleExerciseIds() {
  return Object.values(EXERCISES)
    .filter(ex => ex.visible)
    .map(ex => ex.id);
}

/**
 * Validate exercise ID and difficulty combination
 * @param {string} exerciseId Exercise ID
 * @param {string|number} difficulty Difficulty level (optional, normalized to string)
 * @returns {boolean} Whether the combination is valid
 */
export function validateExercise(exerciseId, difficulty = null) {
  const exercise = EXERCISES[exerciseId];
  if (!exercise) return false;
  
  // If no difficulty specified, just check if exercise exists
  if (!difficulty) return true;
  
  // Normalize difficulty to string for consistent comparison
  const normalizedDifficulty = String(difficulty);
  
  // Check if difficulty is valid for this exercise
  return exercise.difficulties && exercise.difficulties.includes(normalizedDifficulty);
}

/**
 * Get exercise metadata for display
 * @param {string} exerciseId Exercise ID
 * @returns {Object|null} Exercise metadata or null
 */
export function getExerciseMetadata(exerciseId) {
  const exercise = EXERCISES[exerciseId];
  if (!exercise) return null;
  
  return {
    id: exercise.id,
    name: exercise.name,
    description: exercise.description,
    category: exercise.category,
    difficulties: exercise.difficulties || [],
    visible: exercise.visible
  };
}

/**
 * Validate that CATEGORIES arrays are in sync with EXERCISES
 * Call this during development/testing to catch sync issues
 * @returns {Object} Validation result with any mismatches
 */
export function validateCategorySync() {
  const issues = [];
  
  // Check that all exercises in category arrays exist in EXERCISES
  Object.entries(CATEGORIES).forEach(([categoryName, categoryData]) => {
    categoryData.exercises.forEach(exerciseId => {
      if (!EXERCISES[exerciseId]) {
        issues.push(`Category ${categoryName} references non-existent exercise: ${exerciseId}`);
      }
    });
  });
  
  // Check that all exercises are assigned to categories
  const exercisesInCategories = new Set();
  Object.values(CATEGORIES).forEach(category => {
    category.exercises.forEach(id => exercisesInCategories.add(id));
  });
  
  Object.keys(EXERCISES).forEach(exerciseId => {
    if (!exercisesInCategories.has(exerciseId)) {
      issues.push(`Exercise ${exerciseId} is not assigned to any category`);
    }
  });
  
  return {
    isValid: issues.length === 0,
    issues
  };
}