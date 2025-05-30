'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { skuList } from '@/app/data/skuList';

export default function ChecklistApp() {
  type FormularioChecklist = {
    cliente: string;
    direccion: string;
    ciudad: string;
    tecnico: string;
    fecha: string;
    sku: string;
    observaciones: string;
    clienteSatisfecho: boolean;
    entregoInstructivo: boolean;
    diagnostico: string[];
    solucion: string[];
    pruebas: string[];
    comentariosDiagnostico: string;
    comentariosSolucion: string;
    comentariosPruebas: string;
    archivoDiagnostico: FileList | null;
    archivoSolucion: FileList | null;
    archivoPruebas: FileList | null;
  };

  const [form, setForm] = useState<FormularioChecklist>({
    cliente: '',
    direccion: '',
    ciudad: '',
    tecnico: '',
    fecha: '',
    sku: '',
    observaciones: '',
    clienteSatisfecho: false,
    entregoInstructivo: false,
    diagnostico: [],
    solucion: [],
    pruebas: [],
    comentariosDiagnostico: '',
    comentariosSolucion: '',
    comentariosPruebas: '',
    archivoDiagnostico: null,
    archivoSolucion: null,
    archivoPruebas: null,
  });

  const handleCheckboxChange = (field: keyof FormularioChecklist, value: string) => {
    const currentValues = form[field] as string[];
    if (currentValues.includes(value)) {
      setForm({ ...form, [field]: currentValues.filter((v) => v !== value) });
    } else {
      setForm({ ...form, [field]: [...currentValues, value] });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log(form);
    alert('Formulario enviado (solo en consola por ahora)');
  };

  return (
    <Card className="max-w-3xl mx-auto mt-10">
      <CardContent className="p-6 space-y-4">
        <h1 className="text-lg font-bold text-center">Checklist de Visita Técnica</h1>

        <Input placeholder="Cliente" value={form.cliente} onChange={(e) => setForm({ ...form, cliente: e.target.value })} />
        <Input placeholder="Dirección" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
        <Input placeholder="Ciudad" value={form.ciudad} onChange={(e) => setForm({ ...form, ciudad: e.target.value })} />
        <Input placeholder="Técnico" value={form.tecnico} onChange={(e) => setForm({ ...form, tecnico: e.target.value })} />
        <Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />

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
          <AccordionItem value="diagnostico">
            <AccordionTrigger>Diagnóstico</AccordionTrigger>
            <AccordionContent>
              {['No imprime', 'Cabezal tapado', 'Error de comunicación', 'Baja presión', 'Banding visible', 'Impresión corrida', 'Tinta espesa', 'Burbujas en damper', 'Error encoder', 'Obstrucción en carro'].map((item) => (
                <div key={item} className="flex items-center space-x-2">
                  <Checkbox id={item} checked={form.diagnostico.includes(item)} onCheckedChange={() => handleCheckboxChange('diagnostico', item)} />
                  <Label htmlFor={item}>{item}</Label>
                </div>
              ))}
              <Textarea placeholder="Comentarios sobre Diagnóstico" value={form.comentariosDiagnostico} onChange={(e) => setForm({ ...form, comentariosDiagnostico: e.target.value })} />
              <Input type="file" multiple onChange={(e) => setForm({ ...form, archivoDiagnostico: e.target.files ? e.target.files : null })} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="solucion">
            <AccordionTrigger>Solución</AccordionTrigger>
            <AccordionContent>
              {['Purga profunda', 'Cambio de cabezal', 'Limpieza damper', 'Cambio de tubos', 'Ajuste de presión', 'Cambio sensor encoder', 'Reinicializar software', 'Cambio tarjeta madre', 'Soldadura cableado', 'Calibración óptica'].map((item) => (
                <div key={item} className="flex items-center space-x-2">
                  <Checkbox id={item} checked={form.solucion.includes(item)} onCheckedChange={() => handleCheckboxChange('solucion', item)} />
                  <Label htmlFor={item}>{item}</Label>
                </div>
              ))}
              <Textarea placeholder="Comentarios sobre Solución" value={form.comentariosSolucion} onChange={(e) => setForm({ ...form, comentariosSolucion: e.target.value })} />
              <Input type="file" multiple onChange={(e) => setForm({ ...form, archivoSolucion: e.target.files ? e.target.files : null })} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="pruebas">
            <AccordionTrigger>Pruebas</AccordionTrigger>
            <AccordionContent>
              {['Test nozzle', 'Test print', 'Prueba real', 'Control de calidad', 'Prueba en software', 'Verificación de colores', 'Reimpresión', 'Control de temperatura', 'Control de humedad', 'Prueba post-servicio'].map((item) => (
                <div key={item} className="flex items-center space-x-2">
                  <Checkbox id={item} checked={form.pruebas.includes(item)} onCheckedChange={() => handleCheckboxChange('pruebas', item)} />
                  <Label htmlFor={item}>{item}</Label>
                </div>
              ))}
              <Textarea placeholder="Comentarios sobre Pruebas" value={form.comentariosPruebas} onChange={(e) => setForm({ ...form, comentariosPruebas: e.target.value })} />
              <Input type="file" multiple onChange={(e) => setForm({ ...form, archivoPruebas: e.target.files ? e.target.files : null })} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <Button className="w-full" onClick={handleSubmit}>Enviar</Button>
      </CardContent>
    </Card>
  );
}
