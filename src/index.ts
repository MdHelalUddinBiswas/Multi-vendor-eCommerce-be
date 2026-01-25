// import type { Core } from '@strapi/strapi';

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }: { strapi: any /* Core.Strapi currently causing type issues in this view, using any for now or relying on inference if types are globally available */ }) {
    try {
      const rolesToCreate = [
        { name: 'Seller', description: 'Role for sellers', type: 'seller' },
        { name: 'Customer', description: 'Role for customers', type: 'customer' },
        // Admin is usually a separate panel role, or do they mean 'Super Admin' in users-permissions? 
        // Typically 'Admin' refers to the Strapi Admin Panel users. 
        // If they mean an API user with Admin privileges, we can create an 'Admin' role in users-permissions too.
        { name: 'Admin', description: 'API Admin Role', type: 'admin' }
      ];

      for (const role of rolesToCreate) {
        // Check if role exists
        const existingRole = await strapi
          .documents('plugin::users-permissions.role')
          .findFirst({
            filters: { type: role.type },
          });

        if (!existingRole) {
          strapi.log.info(`Creating role: ${role.name}`);
          await strapi.documents('plugin::users-permissions.role').create({
            data: {
              name: role.name,
              description: role.description,
              type: role.type,
              // default permissions can be empty
            },
          });
          strapi.log.info(`Role ${role.name} created successfully.`);
        } else {
            strapi.log.info(`Role ${role.name} already exists.`);
        }
      }
    } catch (error) {
      strapi.log.error('Bootstrap function error:', error);
    }
  },
};
