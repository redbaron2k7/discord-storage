import CryptoJS from 'crypto-js';

async function callDiscordAPI(method: 'GET' | 'POST' | 'DELETE', endpoint: string, botToken: string, body?: any, isMultipart = false, retries = 3): Promise<any> {
  const url = `/api/discord?endpoint=${encodeURIComponent(endpoint)}`;
  const headers: HeadersInit = {
    'X-Discord-Bot-Token': botToken,
  };

  if (!isMultipart && method !== 'GET') {
    headers['Content-Type'] = 'application/json';
  }

  const options: RequestInit = {
    method,
    headers,
  };

  if (body && method !== 'GET') {
    options.body = isMultipart ? body : JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);

    if (response.status === 503 && retries > 0) {
      console.log(`Received 503 error, retrying... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (4 - retries)));
      return callDiscordAPI(method, endpoint, botToken, body, isMultipart, retries - 1);
    }

    if (!response.ok) {
      let errorMessage;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || 'Unknown error';
      } catch {
        errorMessage = response.statusText;
      }
      console.error('Discord API error:', {
        status: response.status,
        statusText: response.statusText,
        message: errorMessage,
        endpoint: endpoint,
        method: method
      });
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorMessage}`);
    }

    if (response.status === 204) {
      return null;
    }

    const responseText = await response.text();
    return responseText ? JSON.parse(responseText) : null;
  } catch (error) {
    console.error('Error calling Discord API:', error);
    throw error;
  }
}

const CHUNK_SIZE = 18 * 1024 * 1024;

export async function uploadFile(file: File, channelId: string, botToken: string, onProgress?: (progress: number) => void): Promise<void> {
  try {
    console.log(`Starting upload of file: ${file.name}, size: ${file.size} bytes`);

    const fileId = generateUniqueId();
    const metadata = {
      id: fileId,
      name: file.name,
      size: file.size,
      type: file.type,
    };

    console.log('Uploading metadata:', metadata);

    // Upload metadata
    await callDiscordAPI('POST', `/channels/${channelId}/messages`, botToken, {
      content: `metadata:${JSON.stringify(metadata)}`
    });

    let offset = 0;
    let chunkIndex = 0;
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    while (offset < file.size) {
      const chunk = file.slice(offset, offset + CHUNK_SIZE);
      console.log(`Processing chunk ${chunkIndex}, size: ${chunk.size} bytes`);

      const chunkContent = await readChunkAsArrayBuffer(chunk);
      console.log(`Chunk ${chunkIndex} read as ArrayBuffer, byteLength: ${chunkContent.byteLength}`);

      const wordArray = CryptoJS.lib.WordArray.create(new Uint8Array(chunkContent));
      const encryptedChunk = CryptoJS.AES.encrypt(wordArray, botToken).toString();
      console.log(`Chunk ${chunkIndex} encrypted, length: ${encryptedChunk.length}`);

      const formData = new FormData();
      formData.append('file', new Blob([encryptedChunk]), `${fileId}_chunk_${chunkIndex}`);

      await callDiscordAPI('POST', `/channels/${channelId}/messages`, botToken, formData, true);
      console.log(`Chunk ${chunkIndex} uploaded`);

      offset += CHUNK_SIZE;
      chunkIndex++;

      if (onProgress) {
        onProgress((chunkIndex / totalChunks) * 100);
      }
    }

    console.log(`File uploaded successfully. Total chunks: ${chunkIndex}`);
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
}

function readChunkAsArrayBuffer(chunk: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as ArrayBuffer;
      console.log(`Chunk read, result byteLength: ${result.byteLength}`);
      resolve(result);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(chunk);
  });
}

function generateUniqueId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

async function fetchAllMessages(channelId: string, botToken: string): Promise<any[]> {
  let allMessages: any[] = [];
  let lastId: string | null = null;

  while (true) {
    const endpoint = `/channels/${channelId}/messages?limit=100${lastId ? `&before=${lastId}` : ''}`;
    const messages: any[] = await callDiscordAPI('GET', endpoint, botToken);

    allMessages = allMessages.concat(messages);

    if (messages.length < 100) break;
    lastId = messages[messages.length - 1].id;
  }

  return allMessages;
}

async function bulkDeleteMessages(channelId: string, messageIds: string[], botToken: string): Promise<void> {
  const endpoint = `/channels/${channelId}/messages/bulk-delete`;
  await callDiscordAPI('POST', endpoint, botToken, { messages: messageIds });
}

export async function deleteFile(fileId: string, channelId: string, botToken: string): Promise<void> {
  try {
    const messages = await fetchAllMessages(channelId, botToken);
    
    const metadataMessage = messages.find(msg => msg.content.startsWith(`metadata:`) && msg.content.includes(`"id":"${fileId}"`));
    if (!metadataMessage) {
      throw new Error('File metadata not found');
    }

    const chunkMessages = messages.filter(msg => msg.attachments && msg.attachments.some((att: any) => att.filename.startsWith(`${fileId}_chunk_`)));

    const messageIdsToDelete = [metadataMessage.id, ...chunkMessages.map(msg => msg.id)];

    // Use bulk delete for messages less than 14 days old
    const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const recentMessageIds = messageIdsToDelete.filter(id => {
      const timestamp = ((BigInt(id) >> 22n) + 1420070400000n).toString();
      return parseInt(timestamp) > twoWeeksAgo;
    });

    if (recentMessageIds.length > 0) {
      // Discord's bulk delete can only handle up to 100 messages at a time
      for (let i = 0; i < recentMessageIds.length; i += 100) {
        const batch = recentMessageIds.slice(i, i + 100);
        try {
          await bulkDeleteMessages(channelId, batch, botToken);
        } catch (error: unknown) {
          console.error(`Error bulk deleting messages: ${(error as Error).message}`);
          // If bulk delete fails, fall back to individual deletes
          for (const id of batch) {
            try {
              await callDiscordAPI('DELETE', `/channels/${channelId}/messages/${id}`, botToken);
            } catch (deleteError: unknown) {
              console.error(`Error deleting message ${id}: ${(deleteError as Error).message}`);
            }
          }
        }
      }
    }

    // For older messages, delete them one by one
    const oldMessageIds = messageIdsToDelete.filter(id => !recentMessageIds.includes(id));
    for (const id of oldMessageIds) {
      try {
        await callDiscordAPI('DELETE', `/channels/${channelId}/messages/${id}`, botToken);
      } catch (error: unknown) {
        console.error(`Error deleting message ${id}: ${(error as Error).message}`);
      }
    }

    console.log(`File ${fileId} deleted successfully`);
  } catch (error: unknown) {
    console.error('Error deleting file:', error);
    throw error;
  }
}

export async function listFiles(channelId: string, botToken: string): Promise<any[]> {
  try {
    const messages = await fetchAllMessages(channelId, botToken);
    const metadataMessages = messages.filter(msg => msg.content.startsWith('metadata:'));

    return metadataMessages.map(msg => {
      const metadata = JSON.parse(msg.content.slice(9));
      const chunks = messages.filter(m => m.attachments && m.attachments.some((att: any) => att.filename.startsWith(`${metadata.id}_chunk_`))).length;
      return {
        id: metadata.id,
        name: metadata.name,
        size: metadata.size,
        type: metadata.type,
        chunks: chunks
      };
    });
  } catch (error: unknown) {
    console.error('Error listing files:', error);
    throw error;
  }
}

export async function downloadFile(fileId: string, channelId: string, botToken: string, onProgress?: (progress: number) => void): Promise<Blob> {
  try {
    const messages = await fetchAllMessages(channelId, botToken);
    console.log('Fetched messages:', messages);

    const metadataMessage = messages.find(msg => msg.content.startsWith(`metadata:`) && msg.content.includes(`"id":"${fileId}"`));
    if (!metadataMessage) {
      throw new Error('File metadata not found');
    }

    const metadata = JSON.parse(metadataMessage.content.slice(9));
    const chunkMessages = messages.filter(msg => msg.attachments && msg.attachments.some((att: any) => att.filename.startsWith(`${fileId}_chunk_`)));
    console.log('Found chunk messages:', chunkMessages);

    if (chunkMessages.length === 0) {
      throw new Error('File chunks not found');
    }

    const sortedChunks = chunkMessages.sort((a, b) => {
      const aIndex = parseInt(a.attachments[0].filename.split('_chunk_')[1]);
      const bIndex = parseInt(b.attachments[0].filename.split('_chunk_')[1]);
      return aIndex - bIndex;
    });

    const totalChunks = sortedChunks.length;
    const decryptedChunks = await Promise.all(sortedChunks.map(async (msg, index) => {
      const attachment = msg.attachments[0];
      console.log(`Fetching chunk from URL: ${attachment.url}`);
      try {
        const response = await fetch(`/api/discord?endpoint=/fetchFile&url=${encodeURIComponent(attachment.url)}`, {
          headers: {
            'X-Discord-Bot-Token': botToken,
          }
        });
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Failed to fetch chunk from ${attachment.url}: ${response.status} ${response.statusText} - ${errorText}`);
          throw new Error(`Failed to fetch chunk from ${attachment.url}: ${response.status} ${response.statusText} - ${errorText}`);
        }
        const encryptedChunk = await response.text();
        const decryptedChunk = CryptoJS.AES.decrypt(encryptedChunk, botToken);
        
        if (onProgress) {
          onProgress(((index + 1) / totalChunks) * 100);
        }
        
        return wordArrayToArrayBuffer(decryptedChunk);
      } catch (fetchError: unknown) {
        console.error(`Error fetching chunk from ${attachment.url}:`, fetchError);
        throw fetchError;
      }
    }));

    const combinedArrayBuffer = concatenateArrayBuffers(decryptedChunks);

    return new Blob([combinedArrayBuffer], { type: metadata.type });
  } catch (error: unknown) {
    console.error('Error downloading file:', error);
    throw error;
  }
}

// Helper functions
function wordArrayToArrayBuffer(wordArray: CryptoJS.lib.WordArray): ArrayBuffer {
  const words = (wordArray as any).words;
  const sigBytes = (wordArray as any).sigBytes;

  const u8Array = new Uint8Array(sigBytes);
  for (let i = 0; i < sigBytes; i++) {
    u8Array[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
  }

  return u8Array.buffer;
}

function concatenateArrayBuffers(buffers: ArrayBuffer[]): ArrayBuffer {
  const totalLength = buffers.reduce((sum, buffer) => sum + buffer.byteLength, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const buffer of buffers) {
    result.set(new Uint8Array(buffer), offset);
    offset += buffer.byteLength;
  }
  return result.buffer;
}