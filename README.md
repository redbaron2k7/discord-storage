# ACStorage

ACStorage is a free, secure file storage solution that leverages Discord as a backend. It allows users to encrypt and store files using Discord's API, providing a free alternative to traditional cloud storage services.

## Features

- **Free, Unlimited Storage**: Utilize Discord's generous file hosting capabilities at no cost and speed as the only limit.
- **End-to-End Encryption**: All files are encrypted before upload and decrypted after download, ensuring your data remains private.
- **Large File Support**: Handles large files by splitting them into chunks, circumventing Discord's file size limitations.
- **Resume Capability**: Interrupted uploads can be resumed from the last successfully uploaded chunk.
- **Progress Tracking**: Real-time progress bars for both upload and download operations.
- **Share Functionality**: Generate and use share codes to easily share files with others.
- **File Management**: List, download, and delete your stored files with ease.

## Using the Hosted Service

You can use ACStorage without self-hosting by visiting:

[https://discord-storage-beryl.vercel.app/](https://discord-storage-beryl.vercel.app/)

This hosted version provides all the features of ACStorage without the need for setup or deployment.

## Getting Started

To use ACStorage, you'll need:

1. A Discord bot token
2. A Discord channel ID where files will be stored
3. An encryption key of your choice

### Usage

1. Visit [https://discord-storage-beryl.vercel.app/](https://discord-storage-beryl.vercel.app/) or your self-hosted instance.
2. Enter your Discord bot token, channel ID, and chosen encryption key in the provided fields.
3. Click "Set Credentials" to save your information.
4. Use the file uploader to select and upload files.
5. View your uploaded files in the file list.
6. Download files by clicking the download button next to each file.
7. Generate share codes for files you want to share with others.
8. Use the "Download from Share Code" feature to download shared files.

## Self-Hosting

If you prefer to self-host ACStorage:

1. Clone this repository and install dependencies:
   ```
   git clone https://github.com/redbaron2k7/discord-storage.git
   cd discord-storage
   npm install
   ```

2. Start the development server:
   ```
   npm run dev
   ```

3. Open your browser and navigate to `http://localhost:3000`

## Security Considerations

- Sharing files using a share code __WILL include your **Encryption Key**__ encoded in base64.
- Your encryption key and bot token are used locally and are never sent to the server or stored anywhere.
- Files are encrypted client-side before being uploaded to Discord.
- Always keep your Discord bot token and encryption key secure and do not share them with others.

## Limitations

- Large files can take a long time to upload/download depending on size and internet speeds.
- File names and sizes are visible in Discord, though the content remains encrypted.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.