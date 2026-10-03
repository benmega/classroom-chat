import client from '../api/client';

/** Max concurrent requests when a bulk action has to fan out one request per record. */
const BULK_BATCH_SIZE = 5;

/**
 * Add react-admin's filter object to a query string: nullish values are skipped and
 * arrays become repeated keys (the backend reads those as "any of").
 */
function appendFilter(search, filter = {}) {
    Object.entries(filter).forEach(([key, value]) => {
        if (value == null) return;
        (Array.isArray(value) ? value : [value])
            .filter(item => item != null)
            .forEach(item => search.append(key, item));
    });
}

/** Query string for the paged/sorted/filtered list endpoint. */
function listQuery({ pagination, sort, filter }) {
    const { page, perPage } = pagination;
    const { field, order } = sort;
    const search = new URLSearchParams({
        _sort: field,
        _order: order,
        _start: (page - 1) * perPage,
        _end: page * perPage,
    });
    appendFilter(search, filter);
    return search;
}

/** The message to show for a failed request: the server's error text when it sent one. */
function errorText(err) {
    return err?.response?.data?.error || err?.message || String(err);
}

/**
 * Run `fn` for every id, at most BULK_BATCH_SIZE at a time, and return the settled results
 * in id order. Throws when any request failed, naming the failed ids and how many went through.
 */
async function runBulk(action, ids, fn) {
    const results = [];
    for (let i = 0; i < ids.length; i += BULK_BATCH_SIZE) {
        results.push(...await Promise.allSettled(ids.slice(i, i + BULK_BATCH_SIZE).map(fn)));
    }
    const failed = ids
        .map((id, i) => ({ id, result: results[i] }))
        .filter(({ result }) => result.status === 'rejected');
    if (failed.length > 0) {
        const detail = failed.map(({ id, result }) => `${id} (${errorText(result.reason)})`).join(', ');
        throw new Error(
            `${action} failed for ${failed.length} of ${ids.length} records: ${detail}. ` +
            `${ids.length - failed.length} succeeded.`
        );
    }
    return ids;
}

const methods = {
    getList: async (resource, params) => {
        const url = `/api/admin/crud/${resource}?${listQuery(params).toString()}`;
        const response = await client.get(url);
        return {
            data: response.data.data,
            total: response.data.total,
        };
    },

    getOne: async (resource, params) => {
        const response = await client.get(`/api/admin/crud/${resource}/${params.id}`);
        return {
            data: response.data.data,
        };
    },

    getMany: async (resource, params) => {
        if (params.ids.length === 0) return { data: [] };
        const search = new URLSearchParams();
        params.ids.forEach(id => search.append('id', id));
        const response = await client.get(`/api/admin/crud/${resource}?${search.toString()}`);
        // The backend returns rows in its own order; hand them back in the order asked for
        // and leave out ids that no longer exist.
        const byId = new Map(response.data.data.map(record => [String(record.id), record]));
        return {
            data: params.ids.map(id => byId.get(String(id))).filter(Boolean),
        };
    },

    getManyReference: async (resource, params) => {
        const search = listQuery(params);
        search.set(params.target, params.id);
        const url = `/api/admin/crud/${resource}?${search.toString()}`;
        const response = await client.get(url);
        return {
            data: response.data.data,
            total: response.data.total,
        };
    },

    update: async (resource, params) => {
        const response = await client.put(`/api/admin/crud/${resource}/${params.id}`, params.data);
        return { data: response.data.data };
    },

    updateMany: async (resource, params) => {
        const ids = await runBulk('Update', params.ids, id =>
            client.put(`/api/admin/crud/${resource}/${id}`, params.data)
        );
        return { data: ids };
    },

    create: async (resource, params) => {
        const response = await client.post(`/api/admin/crud/${resource}`, params.data);
        return { data: response.data.data };
    },

    delete: async (resource, _params) => {
        const response = await client.delete(`/api/admin/crud/${resource}/${_params.id}`);
        return { data: response.data.data };
    },

    deleteMany: async (resource, params) => {
        const ids = await runBulk('Delete', params.ids, id =>
            client.delete(`/api/admin/crud/${resource}/${id}`)
        );
        return { data: ids };
    },
};

/**
 * react-admin shows `error.message` in its notifications; surface the backend's own
 * error text (e.g. "Integrity error: UNIQUE constraint failed ...") instead of axios'
 * generic "Request failed with status code 409".
 */
const dataProvider = Object.fromEntries(
    Object.entries(methods).map(([name, method]) => [
        name,
        async (...args) => {
            try {
                return await method(...args);
            } catch (err) {
                const serverText = err?.response?.data?.error;
                if (serverText) err.message = serverText;
                throw err;
            }
        },
    ])
);

export default dataProvider;
