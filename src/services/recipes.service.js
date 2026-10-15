import { legacyHttp } from '@/services/http/client';
import { asRows } from '@/utils/format';

export const recipesService = {
    async searchRecipe(query) {
        const { data } = await legacyHttp.get('/search-recipe', { params: { search: query, page: 1, page_size: 50 } });
        return asRows(data);
    },
};
