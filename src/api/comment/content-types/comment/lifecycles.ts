/**
 * Comment lifecycle hooks
 * Automatically updates product rating and review count when comments are added/deleted
 */

export default {
  async afterCreate(event: any) {
    const { result } = event;
    
    if (result.product) {
      await updateProductRating(event.strapi, result.product);
    }
  },

  async afterUpdate(event: any) {
    const { result } = event;
    
    if (result.product) {
      await updateProductRating(event.strapi, result.product);
    }
  },

  async afterDelete(event: any) {
    const { result } = event;
    
    if (result.product) {
      await updateProductRating(event.strapi, result.product);
    }
  },
};

/**
 * Recalculate and update product's average rating and review count
 */
async function updateProductRating(strapi: any, productRelation: any) {
  try {
    // Get product ID from relation (could be ID, documentId, or object)
    let productDocumentId: string;
    
    if (typeof productRelation === 'string') {
      productDocumentId = productRelation;
    } else if (productRelation.documentId) {
      productDocumentId = productRelation.documentId;
    } else if (productRelation.id) {
      // Need to fetch the product to get documentId
      const product = await strapi.db.query('api::product.product').findOne({
        where: { id: productRelation.id },
      });
      if (!product) return;
      productDocumentId = product.documentId;
    } else {
      return;
    }

    // Find all comments for this product
    const comments = await strapi.db.query('api::comment.comment').findMany({
      where: {
        product: {
          documentId: productDocumentId,
        },
      },
    });

    // Calculate average rating
    let avgRating = 0;
    const reviewCount = comments.length;

    if (reviewCount > 0) {
      const totalRating = comments.reduce((sum: number, comment: any) => {
        return sum + (Number(comment.rating) || 0);
      }, 0);
      avgRating = Math.round((totalRating / reviewCount) * 10) / 10; // Round to 1 decimal
    }

    // Update product's rating and review count
    await strapi.db.query('api::product.product').update({
      where: { documentId: productDocumentId },
      data: {
        rating: avgRating,
        reviews: reviewCount,
      },
    });

    console.log(`Updated product ${productDocumentId}: rating=${avgRating}, reviews=${reviewCount}`);
  } catch (error) {
    console.error('Failed to update product rating:', error);
  }
}
