export type Magnet = Partial<{
  magnetId: string;
  title: string;
  searchExpression: string;
  searchType: string;

  // Scoring parameters
  fuzzySimilarityThreshold: number;
  exactSubstringScore: number;
  reverseSubstringScore: number;
  debugScoring: boolean;

  // Core enable/physics
  enabled: boolean;
  magnetEnabled: boolean;
  magnetStrength: number;
  magnetRadius: number;
  magnetSoftness: number;
  magnetHoleRadius: number;
  magnetHoleStrength: number;
  orbitForce: number;
  orbitWidth: number;
  scoreMin: number;
  scoreMax: number;

  // BaseView / physics shared
  mass: number;
  staticFriction: number;
  dynamicFriction: number;
  viewScale: number;
  viewScaleInitial: number;
  isKinematic: boolean;

  // Additional fields that may be present
  viewScaleSlerpRate: number;
  minViewScale: number;
  maxViewScale: number;
  aspectRatio: number;
  displayText: string;
  linearDrag: number;
  angularDrag: number;
  highlightElevation: number;
  highlightMargin: number;
  selectionElevation: number;
  selectionMargin: number;
}>;