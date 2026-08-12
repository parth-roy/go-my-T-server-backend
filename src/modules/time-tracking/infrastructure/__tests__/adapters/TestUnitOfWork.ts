import { PrismaClient } from '@prisma/client';

export class TestUnitOfWork {
  public operations: any[] = [];
  
  constructor(public prisma: PrismaClient) {}
  
  public add(operation: any) {
    this.operations.push(operation);
  }
  
  public async commit() {
    if (this.operations.length > 0) {
      await this.prisma.$transaction(this.operations);
    }
    this.operations = [];
  }
}
