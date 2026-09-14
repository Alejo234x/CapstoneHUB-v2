import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { FIXTURES_DIR, SeedContext, log, requireProjectId } from './common';
import { loadProjects } from './fixtures';
import {
  buildStorageKey,
  createStorage,
  mimeTypeForFile,
  uploadToStorage,
} from './storage';

export async function seedAttachments({
  prisma,
  options,
}: SeedContext): Promise<void> {
  const { projects } = loadProjects();
  const storage = createStorage();

  if (!storage) {
    const message =
      'S3/MinIO is not configured (S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY). Skipping attachments.';
    if (options.strict) {
      throw new Error(message);
    }
    log.warn(message);
    return;
  }

  for (const project of projects) {
    if (!project.attachments?.length) {
      continue;
    }

    const projectId = await requireProjectId(prisma, project.name);
    const uploader = await prisma.projectActorAssignment.findFirst({
      where: { projectId },
      select: { userId: true },
    });

    for (const fileName of project.attachments) {
      const existing = await prisma.projectAttachment.findFirst({
        where: { projectId, originalName: fileName },
        select: { id: true },
      });

      if (existing) {
        log.info(`Attachment already exists: ${fileName} (${project.name})`);
        continue;
      }

      if (options.dryRun) {
        log.info(`[dry-run] would upload ${fileName} (${project.name})`);
        continue;
      }

      const buffer = readFileSync(
        resolve(FIXTURES_DIR, 'attachments', fileName),
      );
      const mimeType = mimeTypeForFile(fileName);
      const storageKey = buildStorageKey(projectId, fileName);

      try {
        await uploadToStorage(storage, storageKey, buffer, mimeType);
      } catch (error) {
        const message = `Failed to upload ${fileName} for ${project.name}: ${
          error instanceof Error ? error.message : String(error)
        }`;
        if (options.strict) {
          throw new Error(message);
        }
        log.warn(`${message}. Skipping.`);
        continue;
      }

      await prisma.projectAttachment.create({
        data: {
          projectId,
          uploadedByUserId: uploader?.userId ?? null,
          originalName: fileName,
          storageKey,
          mimeType,
          sizeBytes: buffer.byteLength,
        },
      });
      log.ok(`Uploaded attachment ${fileName} (${project.name})`);
    }
  }
}
