export class CoverageGap {
  constructor(
    public required: number,
    public scheduled: number,
    public reserved: number,
    public missing: number,
    public overstaffed: number
  ) {}
}
