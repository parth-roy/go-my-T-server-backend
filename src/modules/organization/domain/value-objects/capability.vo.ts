export class Capability {
  constructor(public readonly value: string) {
    if (!value) {
      throw new Error('Capability value cannot be empty');
    }
  }
}
