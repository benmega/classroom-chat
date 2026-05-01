import client from '../api/client';

const dataProvider = {
    getList: async (resource, params) => {
        const response = await client.get(`/api/admin/crud/${resource}`);
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
        // Simple implementation: just get all and filter locally for now
        // A production implementation would use backend filtering
        const response = await client.get(`/api/admin/crud/${resource}`);
        const data = response.data.data.filter(item => item[params.target] === params.id);
        return {
            data,
            total: data.length,
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

    delete: async (resource, params) => {
        const response = await client.delete(`/api/admin/crud/${resource}/${params.id}`);
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
