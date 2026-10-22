import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { recipesService } from '@/services/recipes.service';
import { errorMessage } from '@/services/http/client';
import { formatCell, pickString } from '@/utils/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { Badge, EmptyState, ErrorState, LoadingState, PageHeader, Panel } from '@/components/ui/panel';
function RecipeCard({ r }) {
    const dyes = [1, 2, 3, 4, 5, 6]
        .map((n) => ({ name: pickString(r, `COLOR${n}`), pct: pickString(r, `C${n}PER`), rem: pickString(r, `C${n}REM`) }))
        .filter((d) => d.name);
    return (<Panel className="flex flex-col">
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{formatCell(r.SHADE)}</p>
          <p className="truncate text-xs text-muted-foreground">
            {formatCell(r.QUALITY)} · {formatCell(r.PARTY)}
          </p>
        </div>
        {pickString(r, 'STATUS') && <Badge tone={pickString(r, 'STATUS') === 'APPROVED' ? 'success' : 'warning'}>{pickString(r, 'STATUS')}</Badge>}
      </div>
      <table className="w-full table-fixed break-words text-sm">
        <caption className="sr-only">Dye composition</caption>
        <tbody>
          {dyes.map((d, i) => (<tr key={i} className="border-b border-border/60 last:border-0">
              <th scope="row" className="px-4 py-1.5 text-left font-normal">
                {d.name}
                {d.rem && <span className="ml-1 text-xs text-muted-foreground">({d.rem})</span>}
              </th>
              <td className="tabular px-4 py-1.5 text-right font-medium">{d.pct ? `${d.pct}%` : '—'}</td>
            </tr>))}
        </tbody>
      </table>
      <p className="mt-auto border-t border-border bg-muted/50 px-4 py-2 text-xs text-muted-foreground">
        Reg <span className="tabular font-medium text-foreground">{formatCell(r.REGNO)}</span> · Year {formatCell(r.Year)} · Page {formatCell(r.PAGENO)}
      </p>
    </Panel>);
}
export default function RecipesPage() {
    const [draft, setDraft] = useState('');
    const [search, setSearch] = useState('');
    const query = useQuery({ queryKey: ['recipes', search], queryFn: () => recipesService.searchRecipe(search), enabled: search.length > 0 });
    return (<>
      <PageHeader title="Recipes" description="Search shade recipes by party, quality, shade or dye name."/>
      <form role="search" className="flex flex-col gap-2 sm:flex-row" onSubmit={(e) => {
            e.preventDefault();
            setSearch(draft.trim());
        }}>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true"/>
          <label htmlFor="recipe-search" className="sr-only">
            Search recipes
          </label>
          <Input id="recipe-search" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="e.g. NAVY PIQUE RAYMOND" className="h-11 pl-9"/>
        </div>
        <Button type="submit" size="lg" disabled={!draft.trim()} loading={query.isFetching}>
          Search
        </Button>
      </form>

      {!search ? (<Panel>
          <EmptyState title="Search the recipe register" description="Enter one or more keywords. All words must match."/>
        </Panel>) : query.isLoading ? (<LoadingState />) : query.error ? (<ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()}/>) : !query.data?.length ? (<Panel>
          <EmptyState title="No recipes found" description="Try fewer keywords."/>
        </Panel>) : (<>
          <p className="text-sm text-muted-foreground">
            <span className="tabular font-medium text-foreground">{query.data.length}</span> recipes match &ldquo;{search}&rdquo;
          </p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {query.data.map((r, i) => (<RecipeCard key={`${String(r.REGNO)}-${i}`} r={r}/>))}
          </div>
        </>)}
    </>);
}
