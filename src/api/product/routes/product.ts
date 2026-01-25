export default {
  routes: [
    {
      method: "POST",
      path: "/product/create",
      handler: "product.createProduct",
      config: {
        policies: [],
      },
    },
    {
      method: "GET",
      path: "/product/my-products",
      handler: "product.getMyProducts",
      config: {
        policies: [],
      },
    },
    {
      method: "PUT",
      path: "/product/:id",
      handler: "product.updateProduct",
      config: {
        policies: [],
      },
    },
    {
      method: "DELETE",
      path: "/product/:id",
      handler: "product.deleteProduct",
      config: {
        policies: [],
      },
    },
    {
      method: "GET",
      path: "/product/:id",
      handler: "product.getProduct",
      config: {
        auth: false,
        policies: [],
      },
    },
    {
      method: "GET",
      path: "/products/store/:storeId",
      handler: "product.getProductsByStore",
      config: {
        auth: false,
        policies: [],
      },
    },
    {
      method: "GET",
      path: "/products/featured",
      handler: "product.getFeaturedProducts",
      config: {
        auth: false,
        policies: [],
      },
    },
    {
      method: "GET",
      path: "/products/search",
      handler: "product.searchProducts",
      config: {
        auth: false,
        policies: [],
      },
    },
    {
      method: "GET",
      path: "/products",
      handler: "product.getAllProducts",
      config: {
        auth: false,
        policies: [],
      },
    },
  ],
};
