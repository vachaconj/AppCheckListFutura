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

const AccordionSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <AccordionItem value={title.toLowerCase().replace(/\s/g, '-')}> 
    <AccordionTrigger>{title}</AccordionTrigger>
    <AccordionContent>{children}</AccordionContent>
  </AccordionItem>
);

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
    diagnostico: [] as string[],
    solucion: [] as string[],
    pruebas: [] as string[],
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
    <Card className="max-w-3xl mx-auto mt-10">
      <CardContent className="p-6 space-y-4">
        <h1 className="text-xl font-bold text-center">Checklist de Visita Técnica</h1>

        <Input placeholder="Cliente" value={form.cliente} onChange={(e) => setForm({ ...form, cliente: e.target.value })} />
        <Input placeholder="Dirección" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
        <Input placeholder="Ciudad" value={form.ciudad} onChange={(e) => setForm({ ...form, ciudad: e.target.value })} />
        <Input placeholder="Técnico" value={form.tecnico} onChange={(e) => setForm({ ...form, tecnico: e.target.value })} />
        <Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />

        <Input
          type="text"
          placeholder="Buscar SKU..."
          value={form.sku}
          onChange={(e) => setForm({ ...form, sku: e.target.value })}
          list="sku-options"
        />
        <datalist id="sku-options">
          {skuList.map((sku, index) => (
            <option key={index} value={sku} />
          ))}
        </datalist>

        <Textarea placeholder="Observaciones generales" value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} />

        <div className="flex items-center space-x-2">
          <Checkbox id="clienteSatisfecho" checked={form.clienteSatisfecho} onCheckedChange={(value) => setForm({ ...form, clienteSatisfecho: value === true })} />
          <Label htmlFor="clienteSatisfecho">Cliente satisfecho</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox id="entregoInstructivo" checked={form.entregoInstructivo} onCheckedChange={(value) => setForm({ ...form, entregoInstructivo: value === true })} />
          <Label htmlFor="entregoInstructivo">Se entregó instructivo</Label>
        </div>

        <Accordion type="multiple" className="w-full">
          <AccordionSection title="Diagnóstico">
            {[
              'No imprime negro / color faltante',
              'Cabezal se choca con material o carro desalineado',
              'Fugas de tinta en amortiguadores / cabezales',
              'Banding / líneas / imagen doble',
              'Error de comunicación del cabezal',
              'Tinta derramada en capping o estación',
              'Pérdida de presión en sistema de tinta',
              'Desalineación de eje Y o X',
              'Desbordamiento de tinta en impresión',
              'Golpe de cabezal en el sustrato',
            ].map((item) => (
              <div key={item} className="flex items-center space-x-2">
                <Checkbox checked={form.diagnostico.includes(item)} onCheckedChange={(value) => {
                  const newDiag = value
                    ? [...form.diagnostico, item]
                    : form.diagnostico.filter((i) => i !== item);
                  setForm({ ...form, diagnostico: newDiag });
                }} />
                <Label>{item}</Label>
              </div>
            ))}
            <Textarea placeholder="Comentarios sobre Diagnóstico" value={form.comentariosDiagnostico} onChange={(e) => setForm({ ...form, comentariosDiagnostico: e.target.value })} />
          </AccordionSection>

          <AccordionSection title="Solución aplicada">
            {[
              'Purgas generales',
              'Carga con jeringa',
              'Cambio de amortiguador',
              'Cambio de cabezal',
              'Cambio de tarjetas / sensor',
              'Calibración de altura y alineación',
              'Limpieza profunda de estación y capping',
              'Reseteo de firmware',
              'Ajuste de parámetros de impresión',
              'Ajuste de presión y flujo de tinta',
            ].map((item) => (
              <div key={item} className="flex items-center space-x-2">
                <Checkbox checked={form.solucion.includes(item)} onCheckedChange={(value) => {
                  const newVal = value
                    ? [...form.solucion, item]
                    : form.solucion.filter((i) => i !== item);
                  setForm({ ...form, solucion: newVal });
                }} />
                <Label>{item}</Label>
              </div>
            ))}
            <Textarea placeholder="Comentarios sobre Solución" value={form.comentariosSolucion} onChange={(e) => setForm({ ...form, comentariosSolucion: e.target.value })} />
          </AccordionSection>

          <AccordionSection title="Pruebas y Verificación">
            {[
              'Prueba de nozzle / test de inyectores',
              'Prueba de impresión A3',
              'Verificación de colores / densidad',
              'Prueba de alineación',
              'Revisión de calidad final',
              'Prueba en diferentes materiales',
              'Revisión con cliente',
              'Reporte de funcionamiento estable',
              'Validación con archivo original',
              'Verificación de conexión USB / red',
            ].map((item) => (
              <div key={item} className="flex items-center space-x-2">
                <Checkbox checked={form.pruebas.includes(item)} onCheckedChange={(value) => {
                  const newVal = value
                    ? [...form.pruebas, item]
                    : form.pruebas.filter((i) => i !== item);
                  setForm({ ...form, pruebas: newVal });
                }} />
                <Label>{item}</Label>
              </div>
            ))}
            <Textarea placeholder="Comentarios sobre Pruebas" value={form.comentariosPruebas} onChange={(e) => setForm({ ...form, comentariosPruebas: e.target.value })} />
          </AccordionSection>
        </Accordion>

        <Button onClick={handleSubmit}>Enviar</Button>
      </CardContent>
    </Card>
  );
}
