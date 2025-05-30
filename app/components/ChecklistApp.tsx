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
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
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
    clienteSatisfecho: false,
    entregoInstructivo: false,
    comentariosDiagnostico: '',
    comentariosSolucion: '',
    comentariosPruebas: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log(form);
    alert('Formulario enviado (solo en consola por ahora)');
  };

  return (
    <Card className="max-w-2xl mx-auto mt-10">
      <CardContent className="p-6 space-y-6">
        <h1 className="text-lg font-bold text-center">Checklist de Visita Técnica</h1>

        <div className="grid grid-cols-1 gap-4">
          <Input placeholder="Cliente" value={form.cliente} onChange={(e) => setForm({ ...form, cliente: e.target.value })} />
          <Input placeholder="Dirección" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
          <Input placeholder="Ciudad" value={form.ciudad} onChange={(e) => setForm({ ...form, ciudad: e.target.value })} />
          <Input placeholder="Técnico" value={form.tecnico} onChange={(e) => setForm({ ...form, tecnico: e.target.value })} />
          <Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />

          <div>
            <Label>Código SKU</Label>
            <Input
              type="text"
              list="sku-options"
              placeholder="Buscar SKU..."
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
            />
            <datalist id="sku-options">
              {skuList.map((sku, idx) => <option key={idx} value={sku} />)}
            </datalist>
          </div>

          <Textarea
            placeholder="Observaciones generales"
            value={form.observaciones}
            onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
          />

          <Checkbox
            checked={form.clienteSatisfecho}
            onCheckedChange={(v) => setForm({ ...form, clienteSatisfecho: v === true })}
          /> Cliente satisfecho

          <Checkbox
            checked={form.entregoInstructivo}
            onCheckedChange={(v) => setForm({ ...form, entregoInstructivo: v === true })}
          /> Se entregó instructivo
        </div>

        <Accordion type="multiple" className="space-y-4">
          <AccordionItem value="diagnostico">
            <AccordionTrigger>Diagnóstico Técnico</AccordionTrigger>
            <AccordionContent className="space-y-2">
              {['No imprime / color faltante', 'Cabezal golpea', 'Fugas de tinta', 'Banding / líneas', 'Atasco de papel', 'Error de conexión'].map((item, i) => (
                <div key={i} className="flex items-center space-x-2">
                  <Checkbox id={`diag-${i}`} />
                  <Label htmlFor={`diag-${i}`}>{item}</Label>
                </div>
              ))}
              <Textarea placeholder="Comentarios sobre Diagnóstico" value={form.comentariosDiagnostico} onChange={(e) => setForm({ ...form, comentariosDiagnostico: e.target.value })} />
              <Input type="file" accept="image/*,video/*" multiple />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="acciones">
            <AccordionTrigger>Acciones Realizadas</AccordionTrigger>
            <AccordionContent className="space-y-2">
              {['Cambio de cabezal', 'Cambio de tarjeta', 'Limpieza profunda', 'Purgas con jeringa', 'Ajustes de voltaje', 'Reinstalación de software'].map((item, i) => (
                <div key={i} className="flex items-center space-x-2">
                  <Checkbox id={`acc-${i}`} />
                  <Label htmlFor={`acc-${i}`}>{item}</Label>
                </div>
              ))}
              <Textarea placeholder="Comentarios sobre Solución" value={form.comentariosSolucion} onChange={(e) => setForm({ ...form, comentariosSolucion: e.target.value })} />
              <Input type="file" accept="image/*,video/*" multiple />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="pruebas">
            <AccordionTrigger>Pruebas Realizadas</AccordionTrigger>
            <AccordionContent className="space-y-2">
              {['Test de impresión', 'Prueba de motor', 'Verificación de sensores', 'Test de color', 'Prueba de barniz'].map((item, i) => (
                <div key={i} className="flex items-center space-x-2">
                  <Checkbox id={`prueba-${i}`} />
                  <Label htmlFor={`prueba-${i}`}>{item}</Label>
                </div>
              ))}
              <Textarea placeholder="Comentarios sobre Pruebas" value={form.comentariosPruebas} onChange={(e) => setForm({ ...form, comentariosPruebas: e.target.value })} />
              <Input type="file" accept="image/*,video/*" multiple />
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <Button onClick={handleSubmit}>Enviar</Button>
      </CardContent>
    </Card>
  );
}
