
export enum GameState {
  START = 'START',
  PLAYING = 'PLAYING',
  GAMEOVER = 'GAMEOVER'
}

export interface ObstacleData {
  id: string;
  type: 'CAR' | 'TRUCK' | 'RAMP_TRUCK';
  lane: number; // -1, 0, 1
  z: number;
}

export interface CoinData {
  id: string;
  lane: number;
  z: number;
}

export interface GameScore {
  distance: number;
  coins: number;
  highScore: number;
}
