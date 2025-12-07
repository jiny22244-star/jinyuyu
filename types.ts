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

export interface DiaryEntry {
  id: string;
  title: string;
  content: string;
  date: Date;
  updatedAt: Date;
}

export type Tab = 'home' | 'diary' | 'upload' | 'profile';