export class SlugVO {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  public static create(value: string): SlugVO {
    const slug = value.trim().toLowerCase();
    
    if (slug.length < 3) {
      throw new Error('Slug must be at least 3 characters long.');
    }
    
    if (!/^[a-z0-9-]+$/.test(slug)) {
      throw new Error('Slug can only contain lowercase letters, numbers, and hyphens.');
    }

    return new SlugVO(slug);
  }

  public getValue(): string {
    return this.value;
  }
}
