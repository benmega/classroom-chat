import { describe, it, expect, vi, beforeEach } from 'vitest';
import dataProvider from './dataProvider';
import client from '../api/client';

vi.mock('../api/client', () => ({
    default: {
        get: vi.fn(),
        put: vi.fn(),
        post: vi.fn(),
        delete: vi.fn(),
    },
}));

/** An axios-style failure with a JSON error body. */
const httpError = (status, error) =>
    Object.assign(new Error(`Request failed with status code ${status}`), {
        response: { status, data: error ? { error } : {} },
    });

/** The query string of the URL passed to the nth client.get call. */
const query = (call = 0) => new URLSearchParams(client.get.mock.calls[call][0].split('?')[1]);

const listParams = (overrides = {}) => ({
    pagination: { page: 2, perPage: 10 },
    sort: { field: 'name', order: 'DESC' },
    filter: {},
    ...overrides,
});

describe('admin dataProvider', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    describe('getList', () => {
        it('sends the page window, sort and returns data and total', async () => {
            client.get.mockResolvedValue({ data: { data: [{ id: 1 }], total: 31 } });

            const result = await dataProvider.getList('Challenge', listParams());

            expect(client.get.mock.calls[0][0]).toMatch(/^\/api\/admin\/crud\/Challenge\?/);
            expect(Object.fromEntries(query())).toEqual({
                _sort: 'name', _order: 'DESC', _start: '10', _end: '20',
            });
            expect(result).toEqual({ data: [{ id: 1 }], total: 31 });
        });

        it('forwards filters, including the autocomplete search term q', async () => {
            client.get.mockResolvedValue({ data: { data: [], total: 0 } });

            await dataProvider.getList('User', listParams({ filter: { q: 'ali', role: 'admin', is_active: false, n: 0 } }));

            expect(Object.fromEntries(query())).toMatchObject({ q: 'ali', role: 'admin', is_active: 'false', n: '0' });
        });

        it('skips nullish filter values and flattens arrays to repeated keys', async () => {
            client.get.mockResolvedValue({ data: { data: [], total: 0 } });

            await dataProvider.getList('User', listParams({ filter: { gone: null, missing: undefined, role: ['a', null, 'b'], none: [] } }));

            const search = query();
            expect(search.has('gone')).toBe(false);
            expect(search.has('missing')).toBe(false);
            expect(search.has('none')).toBe(false);
            expect(search.getAll('role')).toEqual(['a', 'b']);
        });

        it('tolerates a missing filter object', async () => {
            client.get.mockResolvedValue({ data: { data: [], total: 0 } });

            await dataProvider.getList('User', { pagination: { page: 1, perPage: 5 }, sort: { field: 'id', order: 'ASC' } });

            expect(Object.fromEntries(query())).toEqual({ _sort: 'id', _order: 'ASC', _start: '0', _end: '5' });
        });
    });

    describe('getOne', () => {
        it('fetches a single record', async () => {
            client.get.mockResolvedValue({ data: { data: { id: 7 } } });

            expect(await dataProvider.getOne('User', { id: 7 })).toEqual({ data: { id: 7 } });
            expect(client.get).toHaveBeenCalledWith('/api/admin/crud/User/7');
        });
    });

    describe('getMany', () => {
        it('issues a single request with repeated id params', async () => {
            client.get.mockResolvedValue({ data: { data: [{ id: 1 }, { id: 2 }, { id: 3 }] } });

            await dataProvider.getMany('User', { ids: [1, 2, 3] });

            expect(client.get).toHaveBeenCalledTimes(1);
            expect(client.get.mock.calls[0][0]).toMatch(/^\/api\/admin\/crud\/User\?/);
            expect(query().getAll('id')).toEqual(['1', '2', '3']);
        });

        it('returns records in the order of the requested ids and drops missing ones', async () => {
            client.get.mockResolvedValue({ data: { data: [{ id: 3 }, { id: 1 }] } });

            const result = await dataProvider.getMany('User', { ids: [1, 2, 3] });

            expect(result.data).toEqual([{ id: 1 }, { id: 3 }]);
        });

        it('matches string primary keys and ids given as numbers or strings alike', async () => {
            client.get.mockResolvedValue({ data: { data: [{ id: 'b' }, { id: '5' }] } });

            const result = await dataProvider.getMany('Course', { ids: [5, 'b'] });

            expect(result.data).toEqual([{ id: '5' }, { id: 'b' }]);
        });

        it('makes no request when there are no ids', async () => {
            expect(await dataProvider.getMany('User', { ids: [] })).toEqual({ data: [] });
            expect(client.get).not.toHaveBeenCalled();
        });
    });

    describe('getManyReference', () => {
        it('filters on the target column and keeps paging, sort and extra filters', async () => {
            client.get.mockResolvedValue({ data: { data: [{ id: 1 }], total: 1 } });

            const result = await dataProvider.getManyReference('Skill', {
                ...listParams({ filter: { q: 'x' } }),
                target: 'user_id',
                id: 42,
            });

            expect(Object.fromEntries(query())).toEqual({
                _sort: 'name', _order: 'DESC', _start: '10', _end: '20', q: 'x', user_id: '42',
            });
            expect(result).toEqual({ data: [{ id: 1 }], total: 1 });
        });

        it('lets the target win over a filter on the same key', async () => {
            client.get.mockResolvedValue({ data: { data: [], total: 0 } });

            await dataProvider.getManyReference('Skill', {
                ...listParams({ filter: { user_id: 1 } }),
                target: 'user_id',
                id: 2,
            });

            expect(query().getAll('user_id')).toEqual(['2']);
        });
    });

    describe('create / update / delete', () => {
        it('create posts the data and unwraps the record', async () => {
            client.post.mockResolvedValue({ data: { data: { id: 9 } } });

            expect(await dataProvider.create('Skill', { data: { name: 'x' } })).toEqual({ data: { id: 9 } });
            expect(client.post).toHaveBeenCalledWith('/api/admin/crud/Skill', { name: 'x' });
        });

        it('update puts the data', async () => {
            client.put.mockResolvedValue({ data: { data: { id: 9, name: 'y' } } });

            expect(await dataProvider.update('Skill', { id: 9, data: { name: 'y' } })).toEqual({ data: { id: 9, name: 'y' } });
            expect(client.put).toHaveBeenCalledWith('/api/admin/crud/Skill/9', { name: 'y' });
        });

        it('delete removes one record', async () => {
            client.delete.mockResolvedValue({ data: { data: { id: '9' } } });

            expect(await dataProvider.delete('Skill', { id: 9 })).toEqual({ data: { id: '9' } });
            expect(client.delete).toHaveBeenCalledWith('/api/admin/crud/Skill/9');
        });
    });

    describe('server error text', () => {
        it('replaces the generic axios message with the backend error', async () => {
            client.put.mockRejectedValue(httpError(409, 'Integrity error: UNIQUE constraint failed: challenges.slug'));

            await expect(dataProvider.update('Challenge', { id: 1, data: {} }))
                .rejects.toThrow('Integrity error: UNIQUE constraint failed: challenges.slug');
        });

        it('keeps the original error object and its response', async () => {
            const err = httpError(400, 'JSON object body required');
            client.post.mockRejectedValue(err);

            await expect(dataProvider.create('Challenge', { data: {} })).rejects.toBe(err);
            expect(err.response.status).toBe(400);
        });

        it('leaves errors without a server message alone', async () => {
            client.get.mockRejectedValue(httpError(500));
            await expect(dataProvider.getOne('Challenge', { id: 1 })).rejects.toThrow('Request failed with status code 500');

            client.get.mockRejectedValue(new Error('Network Error'));
            await expect(dataProvider.getOne('Challenge', { id: 1 })).rejects.toThrow('Network Error');
        });

        it('passes through rejections that are not Error objects', async () => {
            client.get.mockRejectedValue('boom');
            await expect(dataProvider.getOne('Challenge', { id: 1 })).rejects.toBe('boom');
        });
    });

    describe('updateMany', () => {
        it('puts the data to every id and resolves with the ids', async () => {
            client.put.mockResolvedValue({ data: { data: {} } });

            const result = await dataProvider.updateMany('Skill', { ids: [1, 2, 3], data: { name: 'z' } });

            expect(result).toEqual({ data: [1, 2, 3] });
            expect(client.put.mock.calls.map(c => c[0])).toEqual([
                '/api/admin/crud/Skill/1', '/api/admin/crud/Skill/2', '/api/admin/crud/Skill/3',
            ]);
            expect(client.put.mock.calls.every(c => c[1].name === 'z')).toBe(true);
        });

        it('reports which records failed and how many succeeded, after trying them all', async () => {
            client.put.mockImplementation(url => (
                url.endsWith('/2') ? Promise.reject(httpError(409, 'duplicate slug'))
                    : url.endsWith('/3') ? Promise.reject(new Error('Network Error'))
                        : Promise.resolve({ data: { data: {} } })
            ));

            await expect(dataProvider.updateMany('Skill', { ids: [1, 2, 3, 4], data: {} })).rejects.toThrow(
                'Update failed for 2 of 4 records: 2 (duplicate slug), 3 (Network Error). 2 succeeded.'
            );
            expect(client.put).toHaveBeenCalledTimes(4);
        });
    });

    describe('deleteMany', () => {
        it('deletes every id and resolves with the ids', async () => {
            client.delete.mockResolvedValue({ data: { data: {} } });

            const result = await dataProvider.deleteMany('Skill', { ids: [4, 5] });

            expect(result).toEqual({ data: [4, 5] });
            expect(client.delete.mock.calls.map(c => c[0])).toEqual([
                '/api/admin/crud/Skill/4', '/api/admin/crud/Skill/5',
            ]);
        });

        it('does not stop at the first failure and reports the partial result', async () => {
            client.delete.mockImplementation(url => (
                url.endsWith('/1') ? Promise.reject(httpError(404, 'Item not found')) : Promise.resolve({ data: { data: {} } })
            ));

            await expect(dataProvider.deleteMany('Skill', { ids: [1, 2, 3] })).rejects.toThrow(
                'Delete failed for 1 of 3 records: 1 (Item not found). 2 succeeded.'
            );
            expect(client.delete).toHaveBeenCalledTimes(3);
        });

        it('never has more than a handful of requests in flight', async () => {
            let inFlight = 0;
            let peak = 0;
            client.delete.mockImplementation(async () => {
                inFlight += 1;
                peak = Math.max(peak, inFlight);
                await new Promise(resolve => setTimeout(resolve, 1));
                inFlight -= 1;
                return { data: { data: {} } };
            });

            const ids = Array.from({ length: 12 }, (_, i) => i + 1);
            const result = await dataProvider.deleteMany('Skill', { ids });

            expect(result.data).toEqual(ids);
            expect(client.delete).toHaveBeenCalledTimes(12);
            expect(peak).toBeLessThanOrEqual(5);
        });
    });
});
