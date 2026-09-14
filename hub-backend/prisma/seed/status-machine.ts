import { ProjectStatus } from '../../src/generated/prisma/client';

export const STATUS_SEQUENCE: ProjectStatus[] = [
  'proposed',
  'under_review',
  'approved',
  'assigned',
  'in_progress',
  'closed',
];

/**
 * Mirrors ProjectsService.isValidProjectStatusTransition: rejected is reachable
 * from any non-terminal state, so it is modeled as a direct proposed -> rejected
 * step for the seed.
 */
export function statusPathFor(target: ProjectStatus): ProjectStatus[] {
  if (target === 'rejected') {
    return ['proposed', 'rejected'];
  }

  const index = STATUS_SEQUENCE.indexOf(target);
  if (index < 0) {
    return ['proposed'];
  }

  return STATUS_SEQUENCE.slice(0, index + 1);
}

/**
 * Mirrors AuthorizationService.assertCanTransitionProject: evaluators handle
 * review transitions and rejections, coordinators handle the rest.
 */
export function authorRoleForTransition(
  previous: ProjectStatus,
  next: ProjectStatus,
): 'evaluator' | 'coordinator' {
  if (
    next === 'rejected' ||
    previous === 'proposed' ||
    previous === 'under_review'
  ) {
    return 'evaluator';
  }

  return 'coordinator';
}
