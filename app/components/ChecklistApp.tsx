'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { skuList } from '@/app/data/skuList';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export default function ChecklistApp() {
  const [form, setForm] = useState({
    cliente: '',
    direccion: '',
    ciudad: '',
    tecnico: '',
    fecha: '',
    sku: '',
    observaciones: '',
    diagnostico: [] as string[],
    acciones: [] as string[],
    validaciones: [] as string[],
  });

  const handleCheckboxChange = (section: 'diagnostico' | 'acciones' | 'validaciones', value: string) => {
    const list = form[section];
    if (list.includes(value)) {
      setForm({ ...form, [section]: list.filter((item) => item !== value) });
    } else {
      setForm({ ...form, [section]: [...list, value] });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log(form);
    alert('Formulario enviado (solo consola por ahora)');
  };

  return (
    <Card className="max-w-2xl mx-auto mt-10">
      <CardContent className="p-6 space-y-4">
        <h1 className="text-lg font-bold text-center">Checklist de Visita Técnica</h1>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Cliente</Label>
            <Input type="text" value={form.cliente} onChange={(e) => setForm({ ...form, cliente: e.target.value })} />
          </div>
          <div>
            <Label>Dirección</Label>
            <Input type="text" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
          </div>
          <div>
            <Label>Ciudad</Label>
            <Input type="text" value={form.ciudad} onChange={(e) => setForm({ ...form, ciudad: e.target.value })} />
          </div>
          <div>
            <Label>Técnico</Label>
            <Input type="text" value={form.tecnico} onChange={(e) => setForm({ ...form, tecnico: e.target.value })} />
          </div>
          <div>
            <Label>Fecha</Label>
            <Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
          </div>
          <div>
            <Label>Código SKU</Label>
            <Input
              type="text"
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
              list="sku-options"
              placeholder="Buscar SKU..."
            />
            <datalist id="sku-options">
              {skuList.map((sku, index) => (
                <option key={index} value={sku} />
              ))}
            </datalist>
          </div>
        </div>

        <Accordion type="multiple" className="w-full">
          <AccordionItem value="diagnostico">
            <AccordionTrigger>Diagnóstico Inicial</AccordionTrigger>
            <AccordionContent>
              {[
                'No imprime negro / color faltante',
                'Cabezal se choca con material o carro desalineado',
                'Fugas de tinta en amortiguadores / cabezales',
                'Banding / líneas / imagen doble',
              ].map((item, i) => (
                <div key={i} className="flex items-center space-x-2">
                  <Checkbox
                    id={`diagnostico-${i}`}
                    checked={form.diagnostico.includes(item)}
                    onCheckedChange={() => handleCheckboxChange('diagnostico', item)}
                  />
                  <Label htmlFor={`diagnostico-${i}`}>{item}</Label>
                </div>
              ))}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="acciones">
            <AccordionTrigger>Acciones Realizadas</AccordionTrigger>
            <AccordionContent>
              {[
                'Purgas generales',
                'Carga con jeringa',
                'Cambio de amortiguador',
                'Cambio de cabezal',
                'Cambio de tarjetas / sensor',
                'Calibración de altura / avance',
              ].map((item, i) => (
                <div key={i} className="flex items-center space-x-2">
                  <Checkbox
                    id={`acciones-${i}`}
                    checked={form.acciones.includes(item)}
                    onCheckedChange={() => handleCheckboxChange('acciones', item)}
                  />
                  <Label htmlFor={`acciones-${i}`}>{item}</Label>
                </div>
              ))}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="validacion">
            <AccordionTrigger>Validación Final</AccordionTrigger>
            <AccordionContent>
              {[
                'Cliente satisfecho',
                'Se entregó instructivo',
                'Test de inyectores',
                'Impresión real final',
              ].map((item, i) => (
                <div key={i} className="flex items-center space-x-2">
                  <Checkbox
                    id={`validacion-${i}`}
                    checked={form.validaciones.includes(item)}
                    onCheckedChange={() => handleCheckboxChange('validaciones', item)}
                  />
                  <Label htmlFor={`validacion-${i}`}>{item}</Label>
                </div>
              ))}
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div>
          <Label>Observaciones</Label>
          <Textarea
            value={form.observaciones}
            onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
          />
        </div>

        <Button onClick={handleSubmit}>Enviar</Button>
      </CardContent>
    </Card>
  );
}
