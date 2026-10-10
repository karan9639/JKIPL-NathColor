import { useState } from 'react';
import { formatNumber, toNumber } from '@/lib/utils';
import { Field, Input, Select } from '@/components/ui/field';
import { PageHeader, Panel, PanelHeader } from '@/components/ui/panel';
export default function GsmPage() {
    const [mode, setMode] = useState('kg-to-m');
    const [gsm, setGsm] = useState('180');
    const [width, setWidth] = useState('60');
    const [widthUnit, setWidthUnit] = useState('in');
    const [qty, setQty] = useState('100');
    const widthM = toNumber(width) * (widthUnit === 'in' ? 0.0254 : 0.01);
    const g = toNumber(gsm);
    const q = toNumber(qty);
    const gramsPerMetre = g * widthM;
    let result = 0;
    let label = '';
    if (mode === 'kg-to-m') {
        result = gramsPerMetre ? (q * 1000) / gramsPerMetre : 0;
        label = 'metres';
    }
    else if (mode === 'm-to-kg') {
        result = (q * gramsPerMetre) / 1000;
        label = 'kg';
    }
    else {
        result = widthM ? q / widthM : 0;
        label = 'GSM';
    }
    return (<>
      <PageHeader title="GSM Calculator" description="Convert between kilograms, metres and GSM for a given fabric width."/>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Inputs"/>
          <div className="grid gap-4 p-4 sm:grid-cols-2">
            <Field label="Calculation" htmlFor="mode" className="sm:col-span-2">
              <Select id="mode" value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="kg-to-m">Kilograms to metres</option>
                <option value="m-to-kg">Metres to kilograms</option>
                <option value="gsm">Grams per running metre to GSM</option>
              </Select>
            </Field>
            {mode !== 'gsm' && (<Field label="GSM (g/m²)" htmlFor="gsm">
                <Input id="gsm" type="number" inputMode="decimal" value={gsm} onChange={(e) => setGsm(e.target.value)}/>
              </Field>)}
            <Field label="Width" htmlFor="width">
              <div className="flex gap-2">
                <Input id="width" type="number" inputMode="decimal" value={width} onChange={(e) => setWidth(e.target.value)}/>
                <Select aria-label="Width unit" value={widthUnit} onChange={(e) => setWidthUnit(e.target.value)} className="w-24">
                  <option value="in">inch</option>
                  <option value="cm">cm</option>
                </Select>
              </div>
            </Field>
            <Field label={mode === 'kg-to-m' ? 'Kilograms' : mode === 'm-to-kg' ? 'Metres' : 'Grams per running metre'} htmlFor="qty" className={mode === 'gsm' ? '' : 'sm:col-span-2'}>
              <Input id="qty" type="number" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)}/>
            </Field>
          </div>
        </Panel>
        <Panel className="flex flex-col justify-center bg-primary-soft">
          <div className="p-6 text-center" aria-live="polite">
            <p className="text-sm font-medium text-muted-foreground">Result</p>
            <p className="tabular mt-2 text-5xl font-semibold text-primary">{formatNumber(result)}</p>
            <p className="mt-1 text-lg">{label}</p>
            {mode !== 'gsm' && <p className="tabular mt-4 text-xs text-muted-foreground">{formatNumber(gramsPerMetre)} g per running metre</p>}
          </div>
        </Panel>
      </div>
    </>);
}
