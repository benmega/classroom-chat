import client from '../api/client';

const dataProvider = {
    getList: async (resource, params) => {
        const { page, perPage } = params.pagination;
        const { field, order } = params.sort;
        const query = {
            _sort: field,
            _order: order,
            _start: (page - 1) * perPage,
            _end: page * perPage,
        };
        const url = `/api/admin/crud/${resource}?${new URLSearchParams(query).toString()}`;
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
        const responses = await Promise.all(
            params.ids.map(id => client.get(`/api/admin/crud/${resource}/${id}`))
        );
        return { data: responses.map(res => res.data.data) };
    },

    getManyReference: async (resource, params) => {
        const { page, perPage } = params.pagination;
        const { field, order } = params.sort;
        const query = {
            _sort: field,
            _order: order,
            _start: (page - 1) * perPage,
            _end: page * perPage,
            [params.target]: params.id,
        };
        const url = `/api/admin/crud/${resource}?${new URLSearchParams(query).toString()}`;
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
        const responses = await Promise.all(
            params.ids.map(id => client.put(`/api/admin/crud/${resource}/${id}`, params.data))
        );
        return { data: responses.map(res => res.data.data.id) };
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
        const responses = await Promise.all(
            params.ids.map(id => client.delete(`/api/admin/crud/${resource}/${id}`))
        );
        return { data: responses.map(res => res.data.data.id) };
    },
};

export default dataProvider;
