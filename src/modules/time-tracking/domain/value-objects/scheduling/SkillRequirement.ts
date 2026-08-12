export class SkillRequirement {
  constructor(
    public role: string,
    public requiredSkills: string[],
    public vehicleClass?: string
  ) {}
}
