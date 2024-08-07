"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { uploadFile, listFiles, deleteFile, generateShareCode, downloadFromCode, fetchAllMessages, downloadFileFromUrls } from '@/lib/discord-storage';
import FileUploader from '@/components/FileUploader';
import FileList from '@/components/FileList';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Progress } from '@/components/ui/progress';

interface StoredFile {
  id: string;
  name: string;
  size: number;
  type: string;
  chunks: number;
}

export default function Home() {
  const [botToken, setBotToken] = useState('');
  const [channelId, setChannelId] = useState('');
  const [encryptionKey, setEncryptionKey] = useState('');
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [shareCode, setShareCode] = useState('');
  const { toast } = useToast();

  const fetchFiles = useCallback(async (token = botToken, channel = channelId) => {
    if (!token || !channel) return;

    try {
      setLoading(true);
      const fetchedFiles = await listFiles(channel, token);
      setFiles(fetchedFiles as StoredFile[]);
    } catch (err) {
      console.error('Error fetching files:', err);
      toast({
        title: 'Error',
        description: `Failed to fetch files: ${err instanceof Error ? err.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [botToken, channelId, toast]);

  useEffect(() => {
    const savedBotToken = localStorage.getItem('discordBotToken');
    const savedChannelId = localStorage.getItem('discordChannelId');
    const savedEncryptionKey = localStorage.getItem('encryptionKey');

    if (savedBotToken) setBotToken(savedBotToken);
    if (savedChannelId) setChannelId(savedChannelId);
    if (savedEncryptionKey) setEncryptionKey(savedEncryptionKey);
  }, []);

  useEffect(() => {
    if (botToken && channelId) {
      fetchFiles(botToken, channelId);
    }
  }, [botToken, channelId, fetchFiles]);

  const handleUpload = useCallback(async (file: File) => {
    try {
      setLoading(true);
      setUploadProgress(0);
      await uploadFile(file, channelId, botToken, encryptionKey, (progress) => {
        setUploadProgress(progress);
      });
      await fetchFiles();
      toast({
        title: 'Success',
        description: 'File uploaded successfully.',
      });
    } catch (err) {
      console.error('Error uploading file:', err);
      toast({
        title: 'Error',
        description: `Failed to upload file: ${err instanceof Error ? err.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  }, [botToken, channelId, encryptionKey, fetchFiles, toast]);

  const handleDownload = useCallback(async (fileId: string, fileName: string) => {
    try {
      setLoading(true);
      setDownloadProgress(0);
      const messages = await fetchAllMessages(channelId, botToken);
      const chunkMessages = messages.filter(msg => msg.attachments && msg.attachments.some((att: any) => att.filename.startsWith(`${fileId}_chunk_`)));
      const chunkUrls = chunkMessages.map(msg => msg.attachments[0].url);

      const blob = await downloadFileFromUrls(chunkUrls, encryptionKey, botToken, (progress) => {
        setDownloadProgress(progress);
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Success',
        description: 'File downloaded successfully.',
      });
    } catch (err) {
      console.error('Error downloading file:', err);
      toast({
        title: 'Error',
        description: `Failed to download file: ${err instanceof Error ? err.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setDownloadProgress(0);
    }
  }, [botToken, channelId, encryptionKey, toast]);

  const handleDelete = useCallback(async (fileId: string) => {
    try {
      setLoading(true);
      await deleteFile(fileId, channelId, botToken);
      await fetchFiles();
      toast({
        title: 'Success',
        description: 'File deleted successfully.',
      });
    } catch (err) {
      console.error('Error deleting file:', err);
      toast({
        title: 'Error',
        description: `Failed to delete file: ${err instanceof Error ? err.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [botToken, channelId, fetchFiles, toast]);

  const handleGenerateShareCode = useCallback(async (fileId: string) => {
    try {
      const file = files.find(f => f.id === fileId);
      if (!file) {
        throw new Error('File not found');
      }

      const messages = await fetchAllMessages(channelId, botToken);
      const chunkMessages = messages.filter(msg => msg.attachments && msg.attachments.some((att: any) => att.filename.startsWith(`${fileId}_chunk_`)));
      const chunkUrls = chunkMessages.map(msg => msg.attachments[0].url);

      const code = await generateShareCode(encryptionKey, chunkUrls, file.name);
      setShareCode(code);
      toast({
        title: 'Success',
        description: `Share code generated: ${code}`,
      });
    } catch (err) {
      console.error('Error generating share code:', err);
      toast({
        title: 'Error',
        description: `Failed to generate share code: ${err instanceof Error ? err.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    }
  }, [channelId, encryptionKey, botToken, files, toast]);

  const handleDownloadFromCode = useCallback(async () => {
    try {
      if (!shareCode) {
        toast({
          title: 'Error',
          description: 'Share code is required.',
          variant: 'destructive',
        });
        return;
      }

      setLoading(true);
      setDownloadProgress(0);
      const { blob, fileName } = await downloadFromCode(shareCode, botToken, (progress) => {
        setDownloadProgress(progress);
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Success',
        description: 'File downloaded successfully from share code.',
      });
    } catch (err) {
      console.error('Error downloading file from share code:', err);
      toast({
        title: 'Error',
        description: `Failed to download file from share code: ${err instanceof Error ? err.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setDownloadProgress(0);
    }
  }, [shareCode, botToken, toast]);

  const handleCredentialsSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('discordBotToken', botToken);
    localStorage.setItem('discordChannelId', channelId);
    localStorage.setItem('encryptionKey', encryptionKey);
  }, [botToken, channelId, encryptionKey]);

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="bg-card text-card-foreground rounded-lg shadow-lg p-6 mb-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">ACStorage - Free Storage using Discord</h1>
          <ThemeToggle />
        </div>

        <form onSubmit={handleCredentialsSubmit} className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              type="password"
              placeholder="Bot Token"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              className="w-full"
            />
            <Input
              type="text"
              placeholder="Channel ID"
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
              className="w-full"
            />
            <Input
              type="password"
              placeholder="Encryption Key"
              value={encryptionKey}
              onChange={(e) => setEncryptionKey(e.target.value)}
              className="w-full"
            />
            <Button type="submit" className="w-full">Set Credentials</Button>
          </div>
        </form>

        <div className="mb-6">
          <FileUploader onUpload={handleUpload} disabled={loading || !botToken || !channelId || !encryptionKey} />
          {uploadProgress > 0 && (
            <div className="mt-2">
              <Progress value={uploadProgress} className="w-full" />
              <p className="text-sm text-center mt-1">{uploadProgress.toFixed(2)}% Uploaded</p>
            </div>
          )}
        </div>

        <div>
          <FileList
            files={files}
            onDownload={handleDownload}
            onDelete={handleDelete}
            onGenerateShareCode={handleGenerateShareCode}
            loading={loading}
          />
          {downloadProgress > 0 && (
            <div className="mt-2">
              <Progress value={downloadProgress} className="w-full" />
              <p className="text-sm text-center mt-1">{downloadProgress.toFixed(2)}% Downloaded</p>
            </div>
          )}
        </div>
        <div className="mt-6">
          <Input
            type="text"
            placeholder="Enter share code to download"
            value={shareCode}
            onChange={(e) => setShareCode(e.target.value)}
            className="w-full mb-2"
          />
          <Button onClick={handleDownloadFromCode} className="w-full" disabled={!shareCode}>
            Download from Share Code
          </Button>
        </div>
      </div>
    </main>
  );
}