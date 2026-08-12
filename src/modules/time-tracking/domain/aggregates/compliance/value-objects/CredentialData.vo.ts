export class CredentialData {
  private constructor(public readonly encryptedPayload: string) {}

  public static fromEncrypted(payload: string): CredentialData {
    return new CredentialData(payload);
  }

  // Domain layer does not handle decryption, it only holds the state.
  // The Application Service will inject a CryptoService to map this.
}
