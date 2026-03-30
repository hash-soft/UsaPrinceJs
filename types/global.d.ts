interface File {
  send(channel: string, saveFileFormat: string, max: number);
  send(channel: string, name: string, data1?: string, data2?: string | number);
  on(channel: string, fn: (result: string, data?: string) => void);
  readSaveHeader(filename: string): Promise<string>;
  readTextFile(filename: string): Promise<string>;
  writeTextFile(filename: string, data: string): Promise<boolean>;
  resetConfig(data: string): Promise<boolean>; // config
  onResetConfig(callback: (data: string) => boolean);
  endResetConfig(): Promise<void>;
  onEndResetConfig(callback: () => void); // config
  writeBase64File(filename: string, data: string): Promise<boolean>;
  specialKeyDown(key: string): Promise<void>;
}

interface Android {
  sendMessage(msg: string);
}

interface Window {
  file: File;
  android: Android;
}
