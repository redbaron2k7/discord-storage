import CryptoJS from 'crypto-js';

// Discord API
async function callDiscordAPI(method: 'GET' | 'POST' | 'DELETE', endpoint: string, botToken: string, body?: any, isMultipart = false): Promise<any> {
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
        console.log(`Sending ${method} request to Discord API:`, {
            url,
            method,
            headers: Object.keys(headers),
            bodyType: body instanceof FormData ? 'FormData' : typeof body
        });

        const response = await fetch(url, options);
        const responseData = await response.text();
        let parsedData;
        try {
            parsedData = JSON.parse(responseData);
        } catch {
            parsedData = responseData;
        }

        if (!response.ok) {
            console.error('Discord API error:', {
                status: response.status,
                statusText: response.statusText,
                data: parsedData,
                endpoint: endpoint,
                method: method
            });
            throw new Error(`HTTP error! status: ${response.status}, message: ${parsedData.message || response.statusText}`);
        }

        return parsedData;
    } catch (error) {
        console.error('Error calling Discord API:', error);
        throw error;
    }
}

const ENCRYPTION_CHUNK_SIZE = 5 * 1024 * 1024;
const CHUNK_SIZE = 25 * 1024 * 1024;

// upload file
export async function uploadFile(file: File, channelId: string, botToken: string, encryptionKey: string, onProgress?: (progress: number) => void): Promise<void> {
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

        await callDiscordAPI('POST', `/channels/${channelId}/messages`, botToken, {
            content: `metadata:${JSON.stringify(metadata)}`
        });

        const iv = CryptoJS.lib.WordArray.create(new Uint8Array(16));
        const key = CryptoJS.enc.Utf8.parse(encryptionKey);
        
        let encryptedContent = iv.toString();
        let fileOffset = 0;
        let uploadChunk = '';
        let uploadChunkIndex = 0;
        const totalSize = file.size;

        while (fileOffset < totalSize) {
            const chunk = await readChunk(file, fileOffset, ENCRYPTION_CHUNK_SIZE);
            fileOffset += chunk.byteLength;

            const wordArray = CryptoJS.lib.WordArray.create(chunk);
            const encryptedChunk = CryptoJS.AES.encrypt(wordArray, key, { iv: iv }).toString();

            encryptedContent += encryptedChunk;

            if (encryptedContent.length >= CHUNK_SIZE || fileOffset === totalSize) {
                uploadChunk = encryptedContent.slice(0, CHUNK_SIZE);
                encryptedContent = encryptedContent.slice(CHUNK_SIZE);

                const formData = new FormData();
                formData.append('file', new Blob([uploadChunk], { type: 'text/plain' }), `${fileId}_chunk_${uploadChunkIndex}`);
                formData.append('content', `Chunk ${uploadChunkIndex + 1}`);

                await callDiscordAPI('POST', `/channels/${channelId}/messages`, botToken, formData, true);
                console.log(`Chunk ${uploadChunkIndex} uploaded`);

                uploadChunkIndex++;
            }

            if (onProgress) {
                onProgress((fileOffset / totalSize) * 100);
            }
        }

        if (encryptedContent.length > 0) {
            const formData = new FormData();
            formData.append('file', new Blob([encryptedContent], { type: 'text/plain' }), `${fileId}_chunk_${uploadChunkIndex}`);
            formData.append('content', `Chunk ${uploadChunkIndex + 1}`);

            await callDiscordAPI('POST', `/channels/${channelId}/messages`, botToken, formData, true);
            console.log(`Final chunk ${uploadChunkIndex} uploaded`);
        }

        console.log(`File uploaded successfully. Total chunks: ${uploadChunkIndex + 1}`);
    } catch (error) {
        console.error('Error uploading file:', error);
        throw error;
    }
}

function generateUniqueId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

export async function fetchAllMessages(channelId: string, botToken: string): Promise<any[]> {
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

async function deleteMessage(channelId: string, messageId: string, botToken: string): Promise<void> {
    console.log(`Attempting to delete message ${messageId}`);
    const endpoint = `/channels/${channelId}/messages/${messageId}`;
    await callDiscordAPI('DELETE', endpoint, botToken);
}

export async function deleteFile(fileId: string, channelId: string, botToken: string): Promise<void> {
    try {
        console.log(`Starting deletion process for file ${fileId}`);
        const messages = await fetchAllMessages(channelId, botToken);
        console.log(`Fetched ${messages.length} messages from channel`);

        const metadataMessage = messages.find(msg => msg.content.startsWith(`metadata:`) && msg.content.includes(`"id":"${fileId}"`));
        if (!metadataMessage) {
            throw new Error('File metadata not found');
        }

        const chunkMessages = messages.filter(msg => msg.attachments && msg.attachments.some((att: any) => att.filename.startsWith(`${fileId}_chunk_`)));
        console.log(`Found ${chunkMessages.length} chunk messages for file ${fileId}`);

        const messageIdsToDelete = [metadataMessage.id, ...chunkMessages.map(msg => msg.id)];

        // Use bulk delete for messages less than 14 days old
        const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
        const recentMessageIds = messageIdsToDelete.filter(id => {
            const timestamp = ((BigInt(id) >> 22n) + 1420070400000n).toString();
            return parseInt(timestamp) > twoWeeksAgo;
        });

        console.log(`${recentMessageIds.length} messages are eligible for bulk delete`);

        if (recentMessageIds.length > 0) {
            try {
                // Discord's bulk delete can only handle up to 100 messages at a time
                for (let i = 0; i < recentMessageIds.length; i += 100) {
                    const batch = recentMessageIds.slice(i, i + 100);
                    await bulkDeleteMessages(channelId, batch, botToken);
                    console.log(`Successfully bulk deleted ${batch.length} messages`);
                }
            } catch (bulkDeleteError) {
                console.error('Bulk delete failed:', bulkDeleteError);
                console.log('Falling back to individual message deletion');

                // Fallback to individual message deletion
                for (const id of recentMessageIds) {
                    try {
                        await deleteMessage(channelId, id, botToken);
                        console.log(`Successfully deleted message ${id}`);
                    } catch (deleteError) {
                        console.error(`Failed to delete message ${id}:`, deleteError);
                    }
                }
            }
        }

        // For older messages, we can't delete them, so we'll just log a warning
        const oldMessageIds = messageIdsToDelete.filter(id => !recentMessageIds.includes(id));
        if (oldMessageIds.length > 0) {
            console.warn(`Unable to delete ${oldMessageIds.length} messages older than 14 days.`);
        }

        console.log(`File ${fileId} deletion process completed. ${recentMessageIds.length} messages processed, ${oldMessageIds.length} messages skipped.`);
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

async function readChunk(file: File, offset: number, length: number): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
        reader.onerror = (e) => reject(e);
        reader.readAsArrayBuffer(file.slice(offset, offset + length));
    });
}

export async function downloadFileFromUrls(chunkUrls: string[], encryptionKey: string, botToken: string, onProgress?: (progress: number) => void): Promise<Blob> {
    console.log('Starting downloadFileFromUrls', { chunkCount: chunkUrls.length, botTokenProvided: !!botToken });

    const totalChunks = chunkUrls.length;
    let encryptedContent = '';

    for (let index = 0; index < totalChunks; index++) {
        const url = chunkUrls[index];
        console.log(`Processing chunk ${index + 1}/${totalChunks}`, { url });

        try {
            const chunk = await fetchChunk(url, botToken);
            encryptedContent += chunk;

            if (onProgress) {
                const progress = ((index + 1) / totalChunks) * 100;
                console.log(`Reporting progress: ${progress}%`);
                onProgress(progress);
            }
        } catch (error) {
            console.error(`Error processing chunk ${index + 1}:`, error);
            throw error;
        }
    }

    console.log('All chunks combined, decrypting');
    const iv = CryptoJS.enc.Hex.parse(encryptedContent.slice(0, 32));
    const ciphertext = encryptedContent.slice(32);

    const key = CryptoJS.enc.Utf8.parse(encryptionKey);
    const decrypted = CryptoJS.AES.decrypt(ciphertext, key, { iv: iv });

    const decryptedArrayBuffer = wordArrayToArrayBuffer(decrypted);
    console.log(`File decrypted`, { size: decryptedArrayBuffer.byteLength });

    return new Blob([decryptedArrayBuffer], { type: 'application/octet-stream' });
}

async function fetchChunk(url: string, botToken: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', `/api/discord?endpoint=/fetchFile&url=${encodeURIComponent(url)}`, true);
        xhr.responseType = 'text';
        xhr.setRequestHeader('X-Discord-Bot-Token', botToken);

        xhr.onload = function () {
            if (this.status >= 200 && this.status < 300) {
                console.log(`Chunk downloaded successfully`, { size: this.responseText.length });
                resolve(this.responseText);
            } else {
                console.error(`Error downloading chunk`, { status: this.status, statusText: this.statusText });
                reject(new Error(`HTTP error! status: ${this.status}`));
            }
        };

        xhr.onerror = function () {
            console.error(`Network error occurred`);
            reject(new Error('Network error occurred'));
        };

        xhr.send();
    });
}

export async function generateShareCode(encryptionKey: string, chunkUrls: string[], fileName: string): Promise<string> {
    const data = JSON.stringify({ encryptionKey, chunkUrls, fileName });
    const code = btoa(data);
    return code;
}

export async function downloadFromCode(shareCode: string, botToken: string, onProgress?: (progress: number) => void): Promise<{ blob: Blob; fileName: string }> {
    console.log('downloadFromCode called', { shareCodeLength: shareCode.length, botTokenProvided: !!botToken });

    const decoded = atob(shareCode);
    console.log('Share code decoded', { decodedLength: decoded.length });

    let parsedData;
    try {
        parsedData = JSON.parse(decoded);
        console.log('Share code parsed', {
            encryptionKeyProvided: !!parsedData.encryptionKey,
            chunkUrlsCount: parsedData.chunkUrls?.length,
            fileName: parsedData.fileName
        });
    } catch (parseError) {
        console.error('Error parsing decoded share code:', parseError);
        throw new Error('Invalid share code format');
    }

    const { encryptionKey, chunkUrls, fileName } = parsedData;

    if (!encryptionKey || !chunkUrls || !Array.isArray(chunkUrls) || !fileName) {
        console.error('Invalid share code content', { encryptionKeyProvided: !!encryptionKey, chunkUrlsProvided: !!chunkUrls, fileNameProvided: !!fileName });
        throw new Error('Invalid share code content');
    }

    const progressCallback = onProgress ? (progress: number) => {
        console.log(`Download progress: ${progress}%`);
        onProgress(progress);
    } : undefined;

    console.log('Calling downloadFileFromUrls', { chunkUrlsCount: chunkUrls.length });
    const blob = await downloadFileFromUrls(chunkUrls, encryptionKey, botToken, progressCallback);

    return { blob, fileName };
}

// Helper functions
function wordArrayToArrayBuffer(wordArray: CryptoJS.lib.WordArray): ArrayBuffer {
    const words = (wordArray as any).words;
    const sigBytes = (wordArray as any).sigBytes;
    const u8 = new Uint8Array(sigBytes);
    for (let i = 0; i < sigBytes; i++) {
        u8[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
    }
    return u8.buffer;
}