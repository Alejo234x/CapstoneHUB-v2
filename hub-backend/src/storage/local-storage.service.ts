import { createReadStream } from 'node:fs';
import { access, mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Readable } from 'node:stream';
import { SaveFileInput, StorageService } from './storage.service';

@Injectable()
export class LocalStorageService extends StorageService {
  private readonly root: string;

  constructor(
    root = process.env.UPLOAD_DIR?.trim() || join(process.cwd(), 'uploads'),
  ) {
    super();
    this.root = resolve(root);
  }

  async save(input: SaveFileInput): Promise<void> {
    const path = this.resolveKey(input.key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, input.buffer);
  }

  async read(key: string): Promise<Readable> {
    const path = this.resolveKey(key);

    try {
      await access(path);
    } catch {
      throw new NotFoundException('Stored file not found');
    }

    return createReadStream(path);
  }

  async delete(key: string): Promise<void> {
    const path = this.resolveKey(key);
    await rm(path, { force: true });
  }

  private resolveKey(key: string): string {
    const path = resolve(this.root, key);

    if (path !== this.root && !path.startsWith(`${this.root}${sep}`)) {
      throw new NotFoundException('Stored file not found');
    }

    return path;
  }
}
