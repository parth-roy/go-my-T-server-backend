export class PanVO {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  public static create(value: string | null | undefined): PanVO | null {
    if (!value) return null;

    const pan = value.trim().toUpperCase();
    
    // Indian PAN format: 5 letters, 4 digits, 1 letter
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    
    if (!panRegex.test(pan)) {
      throw new Error('Invalid PAN format.');
    }

    return new PanVO(pan);
  }

  public getValue(): string {
    return this.value;
  }
}
