export class GstinVO {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  public static create(value: string | null | undefined): GstinVO | null {
    if (!value) return null;

    const gstin = value.trim().toUpperCase();
    
    // Indian GSTIN format: 2 digits (state), 10 chars (PAN), 1 digit (entity), 1 char (Z), 1 char (checksum)
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    
    if (!gstinRegex.test(gstin)) {
      throw new Error('Invalid GSTIN format.');
    }

    return new GstinVO(gstin);
  }

  public getValue(): string {
    return this.value;
  }
}
