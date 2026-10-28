import { legacyHttp } from '@/services/http/client';
import { getRecipePage } from '@/utils/recipe-records';

export const recipesService = {
  async searchRecipe(search = '', { page = 1, limit = 50, signal } = {}) {
    const { data } = await legacyHttp.get('/search-recipe', {
      params: { search: String(search).trim(), page, limit, paged: 1 },
      signal,
    });
    return getRecipePage(data, page, limit);
  },
};
