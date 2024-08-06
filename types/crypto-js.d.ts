declare module 'crypto-js' {
  export = CryptoJS;

  namespace CryptoJS {
    function AES(): Cipher;
    namespace AES {
      function encrypt(message: WordArray | string, secretPassphrase: string | WordArray, option?: CipherOption): CipherParams;
      function decrypt(ciphertext: CipherParams | string, secretPassphrase: string | WordArray, option?: CipherOption): DecryptedMessage;
    }

    function enc(): Encoder;
    namespace enc {
      const Hex: Encoder;
      const Latin1: Encoder;
      const Utf8: Encoder;
    }

    function lib(): Library;
    namespace lib {
      class WordArray {
        static create: (words?: ArrayBuffer | number[], sigBytes?: number) => WordArray;
        toString(encoder?: Encoder): string;
      }
    }

    function format(): Format;
    namespace format {
      const OpenSSL: Formatter;
    }

    interface CipherParams {
      ciphertext: WordArray;
      key?: WordArray;
      iv?: WordArray;
      salt?: WordArray;
      algorithm?: Cipher;
      mode?: Mode;
      padding?: Padding;
      blockSize?: number;
      formatter?: Formatter;
      toString(formatter?: Formatter): string;
    }

    interface DecryptedMessage {
      toString(encoder?: Encoder): string;
    }

    interface CipherOption {
      iv?: WordArray;
      mode?: Mode;
      padding?: Padding;
      format?: Formatter;
    }

    interface Cipher {
      encrypt(message: WordArray | string, secretPassphrase: string | WordArray, option?: CipherOption): CipherParams;
      decrypt(ciphertext: CipherParams | string, secretPassphrase: string | WordArray, option?: CipherOption): DecryptedMessage;
    }

    interface Mode {}
    interface Padding {}
    interface Formatter {
      parse(input: string): CipherParams;
      stringify(cipherParams: CipherParams): string;
    }
    interface Encoder {
      parse(input: string): WordArray;
      stringify(wordArray: WordArray): string;
    }
    interface Library {
      WordArray: typeof CryptoJS.lib.WordArray;
    }
  }
}