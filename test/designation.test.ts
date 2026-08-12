import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DesignationEntity } from '../src/modules/organization/domain/entities/designation.entity';
import { DesignationStatus } from '../src/modules/organization/domain/enums/designation-status.enum';

describe('DesignationEntity', () => {
  const mockDate = new Date();
  
  it('should create a valid designation entity', () => {
    const designation = DesignationEntity.create({
      id: 'desig-1',
      organizationId: 'org-1',
      name: 'Manager',
      code: 'MGR',
      description: 'Management position',
      level: 10,
      status: DesignationStatus.ACTIVE,
      createdAt: mockDate,
      updatedAt: mockDate,
      deletedAt: null
    });

    assert.equal(designation.id, 'desig-1');
    assert.equal(designation.organizationId, 'org-1');
    assert.equal(designation.name, 'Manager');
    assert.equal(designation.code, 'MGR');
    assert.equal(designation.status, DesignationStatus.ACTIVE);
  });

  it('should update designation properties', () => {
    const designation = DesignationEntity.create({
      id: 'desig-1',
      organizationId: 'org-1',
      name: 'Manager',
      code: 'MGR',
      description: null,
      level: null,
      status: DesignationStatus.ACTIVE,
      createdAt: mockDate,
      updatedAt: mockDate,
      deletedAt: null
    });

    designation.update({
      name: 'Senior Manager',
      level: 20
    });

    assert.equal(designation.name, 'Senior Manager');
    assert.equal(designation.level, 20);
    assert.ok(designation.updatedAt.getTime() >= mockDate.getTime());
  });

  it('should not allow updating an archived designation', () => {
    const designation = DesignationEntity.create({
      id: 'desig-1',
      organizationId: 'org-1',
      name: 'Manager',
      code: 'MGR',
      description: null,
      level: null,
      status: DesignationStatus.ARCHIVED,
      createdAt: mockDate,
      updatedAt: mockDate,
      deletedAt: mockDate
    });

    assert.throws(() => {
      designation.update({ name: 'New Name' });
    }, /Cannot update an archived designation/);
  });

  it('should archive designation', () => {
    const designation = DesignationEntity.create({
      id: 'desig-1',
      organizationId: 'org-1',
      name: 'Manager',
      code: 'MGR',
      description: null,
      level: null,
      status: DesignationStatus.ACTIVE,
      createdAt: mockDate,
      updatedAt: mockDate,
      deletedAt: null
    });

    designation.archive();

    assert.equal(designation.status, DesignationStatus.ARCHIVED);
    assert.ok(designation.deletedAt instanceof Date);
  });
});
