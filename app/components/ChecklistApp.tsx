'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { skuList } from '@/app/data/skuList';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function ChecklistApp() {
  const [form, setForm] = useState<{
    [key: string]: string | boolean | FileList | null;
    cliente: string;
    direccion: string;
    ciudad: string;
    tecnico: string;
    fecha: string;
    sku: string;
    observaciones: string;
    clienteSatisfecho: boolean;
    entregoInstructivo: boolean;
    comentariosDiagnostico: string;
    comentariosSolucion: string;
    comentariosPruebas: string;
    archivosDiagnostico: FileList | null;
    archivosSolucion: FileList | null;
    archivosPruebas: FileList | null;
  }>({
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
    archivosDiagnostico: null,
    archivosSolucion: null,
    archivosPruebas: null,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log(form);
    alert('Formulario enviado (solo en consola por ahora)');
  };

  return (
    <Card className="max-w-2xl mx-auto mt-10">
      <CardContent className="p-6 space-y-4">
        <h1 className="text-xl font-bold text-center">Checklist de Visita Técnica</h1>

        {['cliente', 'direccion', 'ciudad', 'tecnico', 'fecha', 'sku'].map((field) => (
          <div key={field}>
            <Label>{field.charAt(0).toUpperCase() + field.slice(1)}</Label>
            <Input
              type={field === 'fecha' ? 'date' : 'text'}
              value={form[field] as string}
              onChange={(e) => setForm({ ...form, [field]: e.target.value })}
              list={field === 'sku' ? 'sku-options' : undefined}
              placeholder={field === 'sku' ? 'Buscar SKU...' : ''}
            />
          </div>
        ))}

        <datalist id="sku-options">
          {skuList.map((sku, index) => (
            <option key={index} value={sku} />
          ))}
        </datalist>

        <div>
          <Label>Observaciones generales</Label>
          <Textarea
            value={form.observaciones as string}
            onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
          />
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="clienteSatisfecho"
            checked={form.clienteSatisfecho as boolean}
            onCheckedChange={(value) => setForm({ ...form, clienteSatisfecho: value === true })}
          />
          <Label htmlFor="clienteSatisfecho">Cliente satisfecho</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="entregoInstructivo"
            checked={form.entregoInstructivo as boolean}
            onCheckedChange={(value) => setForm({ ...form, entregoInstructivo: value === true })}
          />
          <Label htmlFor="entregoInstructivo">Se entregó instructivo</Label>
        </div>

        <Accordion type="multiple" className="w-full">
          {['Diagnostico', 'Solucion', 'Pruebas'].map((seccion) => (
            <AccordionItem key={seccion} value={seccion}>
              <AccordionTrigger>{seccion}</AccordionTrigger>
              <AccordionContent>
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={`${seccion}-${i}`} className="flex items-center space-x-2">
                    <Checkbox
                      id={`${seccion}-${i}`}
                      checked={form[`${seccion}-${i}`] as boolean}
                      onCheckedChange={(value) =>
                        setForm({ ...form, [`${seccion}-${i}`]: value === true })
                      }
                    />
                    <Label htmlFor={`${seccion}-${i}`}>{`Actividad ${i + 1}`}</Label>
                  </div>
                ))}

                <div className="mt-2">
                  <Label>Comentarios sobre {seccion}</Label>
                  <Textarea
                    value={form[`comentarios${seccion}`] as string}
                    onChange={(e) =>
                      setForm({ ...form, [`comentarios${seccion}`]: e.target.value })
                    }
                  />
                </div>

                <div className="mt-2">
                  <Label>Fotos y videos de {seccion}</Label>
                  <Input
                    type="file"
                    multiple
                    onChange={(e) =>
                      setForm({
                        ...form,
                        [`archivos${seccion}`]: e.target.files ?? null,
                      })
                    }
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <Button onClick={handleSubmit}>Enviar</Button>
      </CardContent>
    </Card>
  );
}
