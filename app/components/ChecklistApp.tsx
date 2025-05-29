'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { skuList } from '@/app/data/skuList';

export default function ChecklistApp() {
  const [form, setForm] = useState({
    cliente: '',
    direccion: '',
    ciudad: '',
    tecnico: '',
    fecha: '',
    sku: '',
    observaciones: '',
    actividades: [] as string[],
    diagnostico: [] as string[],
    validacion: [] as string[],
    clienteSatisfecho: false,
    entregoInstructivo: false,
  });

  const handleCheckboxChange = (field: 'actividades' | 'diagnostico' | 'validacion', value: string) => {
    setForm((prev) => {
      const list = prev[field];
      const newList = list.includes(value)
        ? list.filter((item) => item !== value)
        : [...list, value];
      return { ...prev, [field]: newList };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log(form);
    alert('Formulario enviado (solo en consola por ahora)');
  };

  return (
    <Card className="max-w-md mx-auto mt-10">
      <CardContent className="p-6 space-y-4">
        <h1 className="text-lg font-bold text-center">Checklist de Visita Técnica</h1>

        <div>
          <Label>Cliente</Label>
          <Input value={form.cliente} onChange={(e) => setForm({ ...form, cliente: e.target.value })} />
        </div>

        <div>
          <Label>Dirección</Label>
          <Input value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
        </div>

        <div>
          <Label>Ciudad</Label>
          <Input value={form.ciudad} onChange={(e) => setForm({ ...form, ciudad: e.target.value })} />
        </div>

        <div>
          <Label>Técnico</Label>
          <Input value={form.tecnico} onChange={(e) => setForm({ ...form, tecnico: e.target.value })} />
        </div>

        <div>
          <Label>Fecha</Label>
          <Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
        </div>

        <div>
          <Label>SKU</Label>
          <Input
            value={form.sku}
            onChange={(e) => setForm({ ...form, sku: e.target.value })}
            list="sku-options"
            placeholder="Buscar SKU..."
          />
          <datalist id="sku-options">
            {skuList.map((sku, i) => (
              <option key={i} value={sku} />
            ))}
          </datalist>
        </div>

        <div>
          <Label>Diagnóstico</Label>
          {['No imprime negro / color faltante', 'Cabezal se choca con material o carro desalineado', 'Fugas de tinta en dampers / cabezal', 'Banding / líneas / imagen doble'].map((item, i) => (
            <div key={i} className="flex items-center space-x-2">
              <Checkbox
                checked={form.diagnostico.includes(item)}
                onCheckedChange={() => handleCheckboxChange('diagnostico', item)}
              />
              <Label>{item}</Label>
            </div>
          ))}
        </div>

        <div>
          <Label>Acciones realizadas</Label>
          {['Purgas generales', 'Carga con jeringa', 'Cambio de damper', 'Cambio de cabezal', 'Cambio de tarjetas / sensor', 'Calibración de altura', 'Ajuste de presión', 'Nivelado de cama'].map((item, i) => (
            <div key={i} className="flex items-center space-x-2">
              <Checkbox
                checked={form.actividades.includes(item)}
                onCheckedChange={() => handleCheckboxChange('actividades', item)}
              />
              <Label>{item}</Label>
            </div>
          ))}
        </div>

        <div>
          <Label>Validación</Label>
          {['Cliente valida impresión en su material', 'Cliente valida impresión archivo sugerido'].map((item, i) => (
            <div key={i} className="flex items-center space-x-2">
              <Checkbox
                checked={form.validacion.includes(item)}
                onCheckedChange={() => handleCheckboxChange('validacion', item)}
              />
              <Label>{item}</Label>
            </div>
          ))}
        </div>

        <div>
          <Label>Observaciones</Label>
          <Textarea value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} />
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            checked={form.clienteSatisfecho}
            onCheckedChange={(v) => setForm({ ...form, clienteSatisfecho: v === true })}
          />
          <Label>Cliente satisfecho</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            checked={form.entregoInstructivo}
            onCheckedChange={(v) => setForm({ ...form, entregoInstructivo: v === true })}
          />
          <Label>Se entregó instructivo</Label>
        </div>

        <Button onClick={handleSubmit}>Enviar</Button>
      </CardContent>
    </Card>
  );
}
