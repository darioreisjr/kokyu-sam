import { describe, expect, it, vi } from 'vitest';
import { LeisureNotesController } from '../../src/modules/leisure/leisure-notes.controller';
import { LeisureNotesService } from '../../src/modules/leisure/leisure-notes.service';
import { LeisureNote } from '../../src/modules/leisure/types/leisure-note.type';
import { buildAuthenticatedUser } from '../factories/authenticated-user.factory';

function buildNote(overrides: Partial<LeisureNote> = {}): LeisureNote {
  return {
    id: 'note-1',
    userId: 'user-1',
    title: 'Ideas',
    content: 'Watch more movies',
    type: 'text',
    checklistItems: null,
    linkUrl: null,
    tags: [],
    pinned: false,
    archived: false,
    reminderDate: null,
    relatedEntity: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function buildService(overrides: Partial<Record<keyof LeisureNotesService, unknown>> = {}) {
  return {
    findAll: vi.fn().mockResolvedValue([buildNote()]),
    findById: vi.fn().mockResolvedValue(buildNote()),
    create: vi.fn().mockResolvedValue(buildNote()),
    update: vi.fn().mockResolvedValue(buildNote()),
    delete: vi.fn().mockResolvedValue(undefined),
    togglePin: vi.fn().mockResolvedValue(buildNote({ pinned: true })),
    archive: vi.fn().mockResolvedValue(buildNote({ archived: true })),
    toggleChecklistItem: vi.fn().mockResolvedValue(buildNote()),
    ...overrides,
  } as unknown as LeisureNotesService;
}

describe('LeisureNotesController', () => {
  it('GET / delegates to LeisureNotesService.findAll', async () => {
    const service = buildService();
    const controller = new LeisureNotesController(service);
    const user = buildAuthenticatedUser();

    const result = await controller.findAll(user, { pinned: true });

    expect(service.findAll).toHaveBeenCalledWith(user, { pinned: true });
    expect(result).toEqual([buildNote()]);
  });

  it('GET /:id delegates to LeisureNotesService.findById', async () => {
    const service = buildService();
    const controller = new LeisureNotesController(service);
    const user = buildAuthenticatedUser();

    await controller.findById(user, { id: 'note-1' });

    expect(service.findById).toHaveBeenCalledWith(user, 'note-1');
  });

  it('POST / delegates to LeisureNotesService.create', async () => {
    const service = buildService();
    const controller = new LeisureNotesController(service);
    const user = buildAuthenticatedUser();
    const body = { content: 'x', type: 'text' as const };

    await controller.create(user, body);

    expect(service.create).toHaveBeenCalledWith(user, body);
  });

  it('PATCH /:id delegates to LeisureNotesService.update', async () => {
    const service = buildService();
    const controller = new LeisureNotesController(service);
    const user = buildAuthenticatedUser();
    const body = { content: 'Renamed' };

    await controller.update(user, { id: 'note-1' }, body);

    expect(service.update).toHaveBeenCalledWith(user, 'note-1', body);
  });

  it('DELETE /:id delegates to LeisureNotesService.delete', async () => {
    const service = buildService();
    const controller = new LeisureNotesController(service);
    const user = buildAuthenticatedUser();

    await controller.delete(user, { id: 'note-1' });

    expect(service.delete).toHaveBeenCalledWith(user, 'note-1');
  });

  it('POST /:id/pin delegates to LeisureNotesService.togglePin', async () => {
    const service = buildService();
    const controller = new LeisureNotesController(service);
    const user = buildAuthenticatedUser();

    const result = await controller.togglePin(user, { id: 'note-1' });

    expect(service.togglePin).toHaveBeenCalledWith(user, 'note-1');
    expect(result.pinned).toBe(true);
  });

  it('POST /:id/archive delegates to LeisureNotesService.archive', async () => {
    const service = buildService();
    const controller = new LeisureNotesController(service);
    const user = buildAuthenticatedUser();

    const result = await controller.archive(user, { id: 'note-1' });

    expect(service.archive).toHaveBeenCalledWith(user, 'note-1');
    expect(result.archived).toBe(true);
  });

  it('PATCH /:noteId/checklist/:checklistItemId delegates to LeisureNotesService.toggleChecklistItem', async () => {
    const service = buildService();
    const controller = new LeisureNotesController(service);
    const user = buildAuthenticatedUser();

    await controller.toggleChecklistItem(user, { noteId: 'note-1', checklistItemId: 'a' });

    expect(service.toggleChecklistItem).toHaveBeenCalledWith(user, 'note-1', 'a');
  });
});
