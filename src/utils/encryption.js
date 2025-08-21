// Simple encryption utility for API keys
// Uses AES-GCM with a derived key from a password

class ApiKeyEncryption {
  constructor() {
    // Generate a consistent key from browser fingerprint + timestamp
    this.keyMaterial = this.generateKeyMaterial();
  }

  generateKeyMaterial() {
    // Create a semi-unique identifier based on browser characteristics
    const browserFingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width,
      screen.height,
      new Date().getTimezoneOffset()
    ].join('|');
    
    return browserFingerprint;
  }

  async deriveKey(password) {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('astral-quiz-salt'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async encrypt(plaintext) {
    if (!plaintext || plaintext.trim() === '') {
      return '';
    }

    try {
      const encoder = new TextEncoder();
      const key = await this.deriveKey(this.keyMaterial);
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encoder.encode(plaintext)
      );

      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encrypted), iv.length);

      // Convert to base64 for storage
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.error('Encryption failed:', error);
      return plaintext; // Fallback to plain text if encryption fails
    }
  }

  async decrypt(encryptedData) {
    if (!encryptedData || encryptedData.trim() === '') {
      return '';
    }

    try {
      // Convert from base64
      const combined = new Uint8Array(
        atob(encryptedData).split('').map(char => char.charCodeAt(0))
      );

      // Extract IV and encrypted data
      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);

      const key = await this.deriveKey(this.keyMaterial);
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encrypted
      );

      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      console.error('Decryption failed:', error);
      // If decryption fails, assume it's already plain text (for backward compatibility)
      return encryptedData;
    }
  }
}

// Export a singleton instance
export const apiKeyEncryption = new ApiKeyEncryption();
