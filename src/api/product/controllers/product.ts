import { Core } from "@strapi/strapi";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async createProduct(ctx) {
    try {
      const userId = ctx.state.user?.id;
      
      if (!userId) {
        return ctx.unauthorized("User not authenticated");
      }

      // Get seller's store
      const store = await strapi.db
        .query("api::store.store")
        .findOne({ where: { owner: userId } });

      if (!store) {
        return ctx.badRequest("You need to create a store first");
      }

      const {
        name,
        description,
        price,
        comparePrice,
        stock,
        sku,
        images,
        category,
        isPublished,
        isFeatured,
      } = ctx.request.body;

      if (!name || !description || !price || stock === undefined) {
        return ctx.badRequest("Name, description, price, and stock are required");
      }

      // Create product
      const product = await strapi.db.query("api::product.product").create({
        data: {
          name,
          description,
          price: parseFloat(price),
          comparePrice: comparePrice ? parseFloat(comparePrice) : null,
          stock: parseInt(stock),
          sku,
          images,
          store: store.id,
          category,
          seller: userId,
          isPublished: isPublished !== undefined ? isPublished : false,
          isFeatured: isFeatured !== undefined ? isFeatured : false,
          publishedAt: new Date(),
        },
      });

      return ctx.send({
        message: "Product created successfully",
        product,
      });
    } catch (error) {
      console.error("Create product error:", error);
      return ctx.internalServerError("Failed to create product");
    }
  },

  async getMyProducts(ctx) {
    try {
      const userId = ctx.state.user?.id;
      
      if (!userId) {
        return ctx.unauthorized("User not authenticated");
      }

      const { page = 1, pageSize = 20 } = ctx.query;

      const products = await strapi.db
        .query("api::product.product")
        .findMany({
          where: { seller: userId },
          populate: {
            images: true,
            category: true,
            store: true,
          },
          limit: Number(pageSize),
          offset: (Number(page) - 1) * Number(pageSize),
          orderBy: { createdAt: "desc" },
        });

      const total = await strapi.db
        .query("api::product.product")
        .count({ where: { seller: userId } });

      return ctx.send({
        products,
        pagination: {
          page: Number(page),
          pageSize: Number(pageSize),
          pageCount: Math.ceil(total / Number(pageSize)),
          total,
        },
      });
    } catch (error) {
      console.error("Get my products error:", error);
      return ctx.internalServerError("Failed to get products");
    }
  },

  async updateProduct(ctx) {
    try {
      const userId = ctx.state.user?.id;
      const { id } = ctx.params;
      
      if (!userId) {
        return ctx.unauthorized("User not authenticated");
      }

      // Find product. If admin, allow any product. If seller, only their own.
      const user = await strapi.db
        .query("plugin::users-permissions.user")
        .findOne({ where: { id: userId }, populate: ["role"] });

      const isAdmin = user.accountType === "admin" || (user.role && (user.role.type === "admin" || user.role.name === "Admin"));

      const queryParams: any = { where: { id } };
      if (!isAdmin) {
        queryParams.where.seller = userId;
      }

      const product = await strapi.db
        .query("api::product.product")
        .findOne(queryParams);

      if (!product) {
        return ctx.notFound("Product not found or you don't have permission");
      }

      const {
        name,
        description,
        price,
        comparePrice,
        stock,
        sku,
        images,
        category,
        isPublished,
        isFeatured,
      } = ctx.request.body;

      // Update product
      const updatedProduct = await strapi.db.query("api::product.product").update({
        where: { id },
        data: {
          name: name || product.name,
          description: description || product.description,
          price: price !== undefined ? parseFloat(price) : product.price,
          comparePrice: comparePrice !== undefined ? (comparePrice ? parseFloat(comparePrice) : null) : product.comparePrice,
          stock: stock !== undefined ? parseInt(stock) : product.stock,
          sku: sku !== undefined ? sku : product.sku,
          images: images !== undefined ? images : product.images,
          category: category !== undefined ? category : product.category,
          isPublished: isPublished !== undefined ? isPublished : product.isPublished,
          isFeatured: isFeatured !== undefined ? isFeatured : product.isFeatured,
        },
        populate: {
          images: true,
          category: true,
          store: true,
        },
      });

      return ctx.send({
        message: "Product updated successfully",
        product: updatedProduct,
      });
    } catch (error) {
      console.error("Update product error:", error);
      return ctx.internalServerError("Failed to update product");
    }
  },

  async deleteProduct(ctx) {
    try {
      const userId = ctx.state.user?.id;
      const { id } = ctx.params;
      
      if (!userId) {
        return ctx.unauthorized("User not authenticated");
      }

      // Find product. If admin, allow any product. If seller, only their own.
      const user = await strapi.db
        .query("plugin::users-permissions.user")
        .findOne({ where: { id: userId }, populate: ["role"] });

      const isAdmin = user.accountType === "admin" || (user.role && (user.role.type === "admin" || user.role.name === "Admin"));

      const queryParams: any = { where: { id } };
      if (!isAdmin) {
        queryParams.where.seller = userId;
      }

      const product = await strapi.db
        .query("api::product.product")
        .findOne(queryParams);

      if (!product) {
        return ctx.notFound("Product not found or you don't have permission");
      }

      // Delete product
      await strapi.db.query("api::product.product").delete({ where: { id } });

      return ctx.send({
        message: "Product deleted successfully",
      });
    } catch (error) {
      console.error("Delete product error:", error);
      return ctx.internalServerError("Failed to delete product");
    }
  },

  async getProduct(ctx) {
    try {
      const { id } = ctx.params;

      const product = await strapi.db
        .query("api::product.product")
        .findOne({
          where: { id, isPublished: true },
          populate: {
            images: true,
            category: true,
            store: {
              populate: {
                logo: true,
                owner: {
                  select: ["id", "username", "firstName", "lastName"],
                },
              },
            },
            seller: {
              select: ["id", "username", "firstName", "lastName"],
            },
          },
        });

      if (!product) {
        return ctx.notFound("Product not found");
      }

      return ctx.send({ product });
    } catch (error) {
      console.error("Get product error:", error);
      return ctx.internalServerError("Failed to get product");
    }
  },

  async getProductsByStore(ctx) {
    try {
      const { storeId } = ctx.params;
      const { page = 1, pageSize = 20 } = ctx.query;

      const products = await strapi.db
        .query("api::product.product")
        .findMany({
          where: {
            store: storeId,
            isPublished: true,
          },
          populate: {
            images: true,
            category: true,
          },
          limit: Number(pageSize),
          offset: (Number(page) - 1) * Number(pageSize),
          orderBy: { createdAt: "desc" },
        });

      const total = await strapi.db
        .query("api::product.product")
        .count({
          where: {
            store: storeId,
            isPublished: true,
          },
        });

      return ctx.send({
        products,
        pagination: {
          page: Number(page),
          pageSize: Number(pageSize),
          pageCount: Math.ceil(total / Number(pageSize)),
          total,
        },
      });
    } catch (error) {
      console.error("Get products by store error:", error);
      return ctx.internalServerError("Failed to get products");
    }
  },

  async getFeaturedProducts(ctx) {
    try {
      const { limit = 12 } = ctx.query;

      const products = await strapi.db
        .query("api::product.product")
        .findMany({
          where: {
            isPublished: true,
            isFeatured: true,
          },
          populate: {
            images: true,
            category: true,
            store: {
              populate: {
                logo: true,
              },
            },
          },
          limit: Number(limit),
          orderBy: { createdAt: "desc" },
        });

      return ctx.send({ products });
    } catch (error) {
      console.error("Get featured products error:", error);
      return ctx.internalServerError("Failed to get featured products");
    }
  },

  async searchProducts(ctx) {
    try {
      const { q, category, minPrice, maxPrice, page = 1, pageSize = 20 } = ctx.query;

      const filters: any = {
        isPublished: true,
      };

      if (q) {
        filters.$or = [
          { name: { $containsi: q } },
          { description: { $containsi: q } },
        ];
      }

      if (category) {
        filters.category = category;
      }

      if (minPrice || maxPrice) {
        filters.price = {};
        if (minPrice) filters.price.$gte = parseFloat(minPrice as string);
        if (maxPrice) filters.price.$lte = parseFloat(maxPrice as string);
      }

      const products = await strapi.db
        .query("api::product.product")
        .findMany({
          where: filters,
          populate: {
            images: true,
            category: true,
            store: {
              populate: {
                logo: true,
              },
            },
          },
          limit: Number(pageSize),
          offset: (Number(page) - 1) * Number(pageSize),
          orderBy: { createdAt: "desc" },
        });

      const total = await strapi.db
        .query("api::product.product")
        .count({ where: filters });

      return ctx.send({
        products,
        pagination: {
          page: Number(page),
          pageSize: Number(pageSize),
          pageCount: Math.ceil(total / Number(pageSize)),
          total,
        },
      });
    } catch (error) {
      console.error("Search products error:", error);
      return ctx.internalServerError("Failed to search products");
    }
  },

  async getAllProducts(ctx) {
    try {
      const { page = 1, pageSize = 20, category } = ctx.query;

      const filters: any = {
        isPublished: true,
      };

      if (category) {
        filters.category = category;
      }

      const products = await strapi.db
        .query("api::product.product")
        .findMany({
          where: filters,
          populate: {
            images: true,
            category: true,
            store: {
              populate: {
                logo: true,
              },
            },
          },
          limit: Number(pageSize),
          offset: (Number(page) - 1) * Number(pageSize),
          orderBy: { createdAt: "desc" },
        });

      const total = await strapi.db
        .query("api::product.product")
        .count({ where: filters });

      return ctx.send({
        products,
        pagination: {
          page: Number(page),
          pageSize: Number(pageSize),
          pageCount: Math.ceil(total / Number(pageSize)),
          total,
        },
      });
    } catch (error) {
      console.error("Get all products error:", error);
      return ctx.internalServerError("Failed to get products");
    }
  },
});
