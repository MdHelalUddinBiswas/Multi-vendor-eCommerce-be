export default {
  routes: [
    {
      method: 'GET',
      path: '/stores/me',
      handler: 'api::store.store.me',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/store/update',
      handler: 'api::store.store.update',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
