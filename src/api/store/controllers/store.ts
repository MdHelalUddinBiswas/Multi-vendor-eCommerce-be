import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::store.store', ({ strapi }) => ({
  async me(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized();
    }

    const store = await strapi.query('api::store.store').findOne({
      where: { owner: user.id },
      populate: ['logo', 'banner', 'products']
    });

    return { store: store || null };
  },

  async create(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized();
    }

    // Ensure the data has the owner set
    const { data } = ctx.request.body;
    ctx.request.body = {
      data: {
        ...(data || ctx.request.body),
        owner: user.id,
        isActive: true, // Auto-activate for now
      },
    };

    const response = await super.create(ctx);
    return response;
  },

  async update(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized();
    }

    const { data } = ctx.request.body;

    let store = await strapi.query('api::store.store').findOne({
      where: { owner: user.id }
    });

    if (!store) {
      return ctx.notFound('Store not found');
    }

    const updatedStore = await strapi.entityService.update('api::store.store', store.id, {
      data: data || ctx.request.body, // handle both {data: ...} and direct body
      populate: ['logo', 'banner']
    });

    return { store: updatedStore };
  }
}));
