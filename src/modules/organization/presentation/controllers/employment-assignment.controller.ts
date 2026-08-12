import { Request, Response, NextFunction } from 'express';
import { CreateEmploymentAssignmentUseCase } from '../../application/use-cases/create-employment-assignment.use-case';
import { TransitionEmploymentAssignmentUseCase } from '../../application/use-cases/transition-employment-assignment.use-case';
import { GetAssignmentTimelineUseCase } from '../../application/use-cases/get-assignment-timeline.use-case';
import { AppError } from '@shared/errors/AppError';
import { PrismaClient } from '@prisma/client';

export class EmploymentAssignmentController {
  constructor(
    private readonly createUseCase: CreateEmploymentAssignmentUseCase,
    private readonly transitionUseCase: TransitionEmploymentAssignmentUseCase,
    private readonly getTimelineUseCase: GetAssignmentTimelineUseCase,
    private readonly prisma: PrismaClient
  ) {}

  public list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const context = req.context;
      if (!context) throw AppError.unauthorized('Context missing');
      
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const skip = (page - 1) * limit;

      const records = await this.prisma.organizationEmploymentAssignment.findMany({
        where: {
          membership: { organizationId: context.organization?.id },
          status: 'ACTIVE'
        },
        include: {
          membership: {
            include: { user: { select: { firstName: true, lastName: true, email: true } } }
          }
        },
        skip,
        take: limit + 1,
        orderBy: { createdAt: 'desc' }
      });

      const hasNextPage = records.length > limit;
      const data = hasNextPage ? records.slice(0, limit) : records;

      const dtos = data.map(r => ({
        id: r.id,
        assignmentNumber: r.assignmentNumber,
        membershipId: r.membershipId,
        user: r.membership ? {
          firstName: r.membership.user.firstName,
          lastName: r.membership.user.lastName,
          email: r.membership.user.email
        } : null,
        employmentTypeId: r.employmentTypeId,
        employmentTypeName: r.employmentTypeNameSnapshot,
        designationId: r.designationId,
        designationName: r.designationNameSnapshot,
        branchId: r.branchId,
        branchName: r.branchNameSnapshot,
        departmentId: r.departmentId,
        departmentName: r.departmentNameSnapshot,
        teamId: r.teamId,
        teamName: r.teamNameSnapshot,
        effectiveFrom: r.effectiveFrom,
        status: r.status
      }));

      res.status(200).json({
        success: true,
        data: dtos,
        pagination: { page, limit, hasNextPage }
      });
    } catch (error) {
      next(error);
    }
  };

  public create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const context = req.context;
      if (!context) throw AppError.unauthorized('Context missing');
      
      const data = await this.createUseCase.execute(context, req.body);
      res.status(201).json({ success: true, data, message: 'Employment assignment created successfully' });
    } catch (error) {
      next(error);
    }
  };

  public transition = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const membershipId = req.params.membershipId as string;
      const context = req.context;
      if (!context) throw AppError.unauthorized('Context missing');
      
      const data = await this.transitionUseCase.execute(context, membershipId, req.body);
      res.status(200).json({ success: true, data, message: 'Employment assignment transitioned successfully' });
    } catch (error) {
      next(error);
    }
  };

  public getTimeline = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const membershipId = req.params.membershipId as string;
      const context = req.context;
      if (!context) throw AppError.unauthorized('Context missing');
      
      const data = await this.getTimelineUseCase.execute(context, membershipId);
      res.status(200).json({ success: true, data, message: 'Assignment timeline retrieved successfully' });
    } catch (error) {
      next(error);
    }
  };
}
