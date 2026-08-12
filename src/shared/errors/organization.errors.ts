import { AppError } from './AppError';

export class OrganizationSlugAlreadyExistsError extends AppError {
  constructor(slug: string) {
    super(`Organization with slug '${slug}' already exists`, 409, 'ORG_SLUG_EXISTS');
    this.name = 'OrganizationSlugAlreadyExistsError';
  }
}

export class OrganizationGSTINAlreadyExistsError extends AppError {
  constructor(gstin: string) {
    super(`Organization with GSTIN '${gstin}' already exists`, 409, 'ORG_GSTIN_EXISTS');
    this.name = 'OrganizationGSTINAlreadyExistsError';
  }
}

export class OrganizationPANAlreadyExistsError extends AppError {
  constructor(pan: string) {
    super(`Organization with PAN '${pan}' already exists`, 409, 'ORG_PAN_EXISTS');
    this.name = 'OrganizationPANAlreadyExistsError';
  }
}

export class BranchCodeAlreadyExistsError extends AppError {
  constructor(code: string) {
    super(`Branch with code '${code}' already exists in this organization`, 409, 'BRANCH_CODE_EXISTS');
    this.name = 'BranchCodeAlreadyExistsError';
  }
}

export class BranchNameAlreadyExistsError extends AppError {
  constructor(name: string) {
    super(`Branch with name '${name}' already exists in this organization`, 409, 'BRANCH_NAME_EXISTS');
    this.name = 'BranchNameAlreadyExistsError';
  }
}

export class BranchNotFoundError extends AppError {
  constructor() {
    super(`Branch not found`, 404, 'BRANCH_NOT_FOUND');
    this.name = 'BranchNotFoundError';
  }
}
