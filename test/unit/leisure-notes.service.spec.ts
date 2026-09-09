import { describe, expect, it, vi } from 'vitest';
import { LeisureNoteNotFoundError } from '../../src/common/errors/app.error';
import { LeisureNotesService } from '../../src/modules/leisure/leisure-notes.service';
import { LeisureNotesRepository } from '../../src/modules/leisure/types/leisure-notes-repository.interface';
import { LeisureNote } from '../../src/modules/leisure/types/leisure-note.type';
import { buildAuthenticatedUser } from '../factories/authenticated-user.factory';

function buildNote(overrides: Partial<LeisureNote> = {}): LeisureNote {
  return {
    id: 'note-1',
    userId: 'user-1',
    title: 'Ideas',
    content: 'Watch more movies',
    type: 'checklist',
    checklistItems: [
      { id: 'a', text: 'Dune', checked: false },
      { id: 'b', text: 'Arrival', checked: true },
    ],
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

function buildRepository(overrides: Partial<LeisureNotesRepository> = {}): LeisureNotesRepository {
  return {
    findAll: vi.fn().mockResolvedValue([buildNote()]),
    findById: vi.fn().mockResolvedValue(buildNote()),
    create: vi.fn().mockResolvedValue(buildNote()),
    update: vi.fn().mockResolvedValue(buildNote()),
    delete: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('LeisureNotesService.findAll', () => {
  it('delegates to the repository', async () => {
    const repository = buildRepository();
    const service = new LeisureNotesService(repository);
    const user = buildAuthenticatedUser();

    await service.findAll(user, { pinned: true });

    expect(repository.findAll).toHaveBeenCalledWith(user.accessToken, { pinned: true });
  });
});

describe('LeisureNotesService.findById', () => {
  it('returns the note when found', async () => {
    const repository = buildRepository();
    const service = new LeisureNotesService(repository);

    await expect(service.findById(buildAuthenticatedUser(), 'note-1')).resolves.toEqual(
      buildNote(),
    );
  });

  it('throws LeisureNoteNotFoundError when the repository returns null', async () => {
    const repository = buildRepository({ findById: vi.fn().mockResolvedValue(null) });
    const service = new LeisureNotesService(repository);

    await expect(service.findById(buildAuthenticatedUser(), 'missing')).rejects.toBeInstanceOf(
      LeisureNoteNotFoundError,
    );
  });
});

describe('LeisureNotesService.create', () => {
  it('delegates to the repository with the caller id and access token', async () => {
    const repository = buildRepository();
    const service = new LeisureNotesService(repository);
    const user = buildAuthenticatedUser({ id: 'user-1' });
    const input = { content: 'x', type: 'text' as const };

    await service.create(user, input);

    expect(repository.create).toHaveBeenCalledWith(user.accessToken, 'user-1', input);
  });
});

describe('LeisureNotesService.update', () => {
  it('returns the updated note', async () => {
    const repository = buildRepository({
      update: vi.fn().mockResolvedValue(buildNote({ content: 'Renamed' })),
    });
    const service = new LeisureNotesService(repository);

    const result = await service.update(buildAuthenticatedUser(), 'note-1', {
      content: 'Renamed',
    });

    expect(result.content).toBe('Renamed');
  });

  it('throws LeisureNoteNotFoundError when the repository returns null', async () => {
    const repository = buildRepository({ update: vi.fn().mockResolvedValue(null) });
    const service = new LeisureNotesService(repository);

    await expect(
      service.update(buildAuthenticatedUser(), 'missing', { content: 'x' }),
    ).rejects.toBeInstanceOf(LeisureNoteNotFoundError);
  });
});

describe('LeisureNotesService.delete', () => {
  it('delegates to the repository', async () => {
    const repository = buildRepository();
    const service = new LeisureNotesService(repository);
    const user = buildAuthenticatedUser();

    await service.delete(user, 'note-1');

    expect(repository.delete).toHaveBeenCalledWith(user.accessToken, 'note-1');
  });
});

describe('LeisureNotesService.togglePin', () => {
  it('flips pinned from false to true', async () => {
    const repository = buildRepository({
      findById: vi.fn().mockResolvedValue(buildNote({ pinned: false })),
    });
    const service = new LeisureNotesService(repository);
    const user = buildAuthenticatedUser();

    await service.togglePin(user, 'note-1');

    expect(repository.update).toHaveBeenCalledWith(user.accessToken, 'note-1', { pinned: true });
  });

  it('throws LeisureNoteNotFoundError when the note does not exist', async () => {
    const repository = buildRepository({ findById: vi.fn().mockResolvedValue(null) });
    const service = new LeisureNotesService(repository);

    await expect(service.togglePin(buildAuthenticatedUser(), 'missing')).rejects.toBeInstanceOf(
      LeisureNoteNotFoundError,
    );
  });
});

describe('LeisureNotesService.archive', () => {
  it('sets archived to true', async () => {
    const repository = buildRepository();
    const service = new LeisureNotesService(repository);
    const user = buildAuthenticatedUser();

    await service.archive(user, 'note-1');

    expect(repository.update).toHaveBeenCalledWith(user.accessToken, 'note-1', {
      archived: true,
    });
  });
});

describe('LeisureNotesService.toggleChecklistItem', () => {
  it('flips the checked flag of the matching checklist item only', async () => {
    const repository = buildRepository();
    const service = new LeisureNotesService(repository);
    const user = buildAuthenticatedUser();

    await service.toggleChecklistItem(user, 'note-1', 'a');

    expect(repository.update).toHaveBeenCalledWith(user.accessToken, 'note-1', {
      checklistItems: [
        { id: 'a', text: 'Dune', checked: true },
        { id: 'b', text: 'Arrival', checked: true },
      ],
    });
  });

  it('leaves checklistItems untouched when checklistItems is null', async () => {
    const repository = buildRepository({
      findById: vi.fn().mockResolvedValue(buildNote({ checklistItems: null })),
    });
    const service = new LeisureNotesService(repository);
    const user = buildAuthenticatedUser();

    await service.toggleChecklistItem(user, 'note-1', 'a');

    expect(repository.update).toHaveBeenCalledWith(user.accessToken, 'note-1', {
      checklistItems: [],
    });
  });

  it('throws LeisureNoteNotFoundError when the note does not exist', async () => {
    const repository = buildRepository({ findById: vi.fn().mockResolvedValue(null) });
    const service = new LeisureNotesService(repository);

    await expect(
      service.toggleChecklistItem(buildAuthenticatedUser(), 'missing', 'a'),
    ).rejects.toBeInstanceOf(LeisureNoteNotFoundError);
  });
});
