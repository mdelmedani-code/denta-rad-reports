interface DropboxUploadConfig {
  accessToken: string;
  dropboxPath: string;
  expiresIn: number;
}

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export class DropboxUploadService {
  private static CHUNK_SIZE = 4 * 1024 * 1024; // 4MB chunks

  static async uploadFile(
    file: File,
    config: DropboxUploadConfig,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<{ success: boolean; path: string }> {
    const { accessToken, dropboxPath } = config;
    
    if (file.size < 150 * 1024 * 1024) {
      return this.simpleUpload(file, accessToken, dropboxPath, onProgress);
    }
    return this.chunkedUpload(file, accessToken, dropboxPath, onProgress);
  }

  private static async simpleUpload(
    file: File, 
    accessToken: string, 
    dropboxPath: string, 
    onProgress?: (progress: UploadProgress) => void
  ): Promise<{ success: boolean; path: string }> {
    const fileBuffer = await file.arrayBuffer();
    const response = await fetch('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': JSON.stringify({ 
          path: dropboxPath, 
          mode: 'overwrite', 
          autorename: false, 
          mute: false 
        }),
      },
      body: fileBuffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Dropbox upload failed: ${errorText}`);
    }
    
    if (onProgress) {
      onProgress({ loaded: file.size, total: file.size, percentage: 100 });
    }
    
    const result = await response.json();
    return { success: true, path: result.path_display };
  }

  private static async chunkedUpload(
    file: File, 
    accessToken: string, 
    dropboxPath: string, 
    onProgress?: (progress: UploadProgress) => void
  ): Promise<{ success: boolean; path: string }> {
    let offset = 0;
    let sessionId: string | undefined;
    const totalSize = file.size;

    while (offset < totalSize) {
      const end = Math.min(offset + this.CHUNK_SIZE, totalSize);
      const chunk = file.slice(offset, end);
      const chunkBuffer = await chunk.arrayBuffer();

      if (offset === 0) {
        sessionId = await this.startUploadSession(accessToken, chunkBuffer);
      } else if (end >= totalSize) {
        await this.finishUploadSession(accessToken, sessionId!, offset, dropboxPath, chunkBuffer);
      } else {
        await this.appendToUploadSession(accessToken, sessionId!, offset, chunkBuffer);
      }

      offset = end;
      if (onProgress) {
        onProgress({ 
          loaded: offset, 
          total: totalSize, 
          percentage: Math.round((offset / totalSize) * 100) 
        });
      }
    }

    return { success: true, path: dropboxPath };
  }

  private static async startUploadSession(accessToken: string, chunk: ArrayBuffer): Promise<string> {
    const response = await fetch('https://content.dropboxapi.com/2/files/upload_session/start', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': JSON.stringify({ close: false }),
      },
      body: chunk,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to start upload session: ${errorText}`);
    }
    
    const result = await response.json();
    return result.session_id;
  }

  private static async appendToUploadSession(
    accessToken: string, 
    sessionId: string, 
    offset: number, 
    chunk: ArrayBuffer
  ): Promise<void> {
    const response = await fetch('https://content.dropboxapi.com/2/files/upload_session/append_v2', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': JSON.stringify({ 
          cursor: { session_id: sessionId, offset: offset }, 
          close: false 
        }),
      },
      body: chunk,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to append to upload session: ${errorText}`);
    }
  }

  private static async finishUploadSession(
    accessToken: string, 
    sessionId: string, 
    offset: number, 
    dropboxPath: string, 
    chunk: ArrayBuffer
  ): Promise<void> {
    const response = await fetch('https://content.dropboxapi.com/2/files/upload_session/finish', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': JSON.stringify({
          cursor: { session_id: sessionId, offset: offset },
          commit: { path: dropboxPath, mode: 'overwrite', autorename: false, mute: false },
        }),
      },
      body: chunk,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to finish upload session: ${errorText}`);
    }
  }
}
