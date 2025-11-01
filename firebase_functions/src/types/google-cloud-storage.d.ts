// Type declaration for @google-cloud/storage
// This file provides type support when the actual package is not built locally
declare module '@google-cloud/storage' {
  export class Storage {
    constructor(options?: any);
    bucket(name: string): Bucket;
  }

  export class Bucket {
    file(name: string): File;
    getFiles(query?: any): Promise<[File[]]>;
    upload(localPath: string, options?: any): Promise<[File, any]>;
  }

  export class File {
    exists(): Promise<[boolean]>;
    download(): Promise<[Buffer]>;
    getMetadata(): Promise<[any]>;
    save(data: Buffer | string, options?: any): Promise<void>;
    delete(): Promise<void>;
    makePublic(): Promise<void>;
    makePrivate(): Promise<void>;
    publicUrl(): string;
    name: string;
  }
}
