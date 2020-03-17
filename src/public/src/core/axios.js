import axios from 'axios';

export default {
    props: {
        baseUrl: {
            type: String,
            default: `localhost:5000`,
        },
        endpoint: {
            type: String,
            required: true,
        },
    },
    data() {
        return {
            // Create a new axios instance.
            // See: https://github.com/axios/axios#creating-an-instance
            api: axios.create({ baseURL: this.baseUrl }),
            data: null,
            error: null,
            loading: false,
        };
    },
    methods: {
        // The `query` method will handle
        // different query types for us.
        async query(type, ...params) {
            // If we're currently loading content
            // we don't submit an additional request.
            if (this.loading) return;

            this.loading = true;
            try {
                const response = await this.api[type](...params);
                this.data = response.data;
                this.error = null;
                this.$emit(`success`, response);
            } catch (error) {
                this.data = null;
                this.error = error.response;
                this.$emit(`error`, error);
            }
            this.loading = false;
        },
    },
};