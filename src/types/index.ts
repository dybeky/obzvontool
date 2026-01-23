export type GameState = 'start' | 'playing' | 'paused' | 'result';
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface DifficultySettings {
  targetSize: number;
  spawnInterval: number;
  lifetime: number;
}

export interface Target {
  id: number;
  x: number;
  y: number;
  size: number;
  spawnTime: number;
  lifetime: number;
}

export interface Effect {
  id: number;
  x: number;
  y: number;
  type: 'hit' | 'miss';
  score?: number;
}

export interface GameStats {
  score: number;
  hits: number;
  misses: number;
  combo: number;
  maxCombo: number;
}

export interface SavedStats {
  highScore: number;
  totalHits: number;
  totalMisses: number;
  gamesPlayed: number;
}

export interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  needsUpdate: boolean;
  releaseUrl?: string;
  downloadUrl?: string;
  error?: string;
}
