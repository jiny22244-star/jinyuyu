export enum AppState {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface ImageFile {
  file: File;
  previewUrl: string;
  base64: string;
  mimeType: string;
}

export interface AnalysisResult {
  text: string;
}

export interface Post {
  id: string;
  image: ImageFile;
  description: string;
  date: Date;
}

export type Tab = 'home' | 'moments' | 'upload' | 'profile';