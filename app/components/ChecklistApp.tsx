'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { skuList } from '@/app/data/skuList';

// Define los tipos del formulario
type FormData = {
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
  [key: string]: string | boolean;
};

export default function ChecklistApp() {
  const [form, setForm] = useState<FormData>({
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
    alert('Formulario enviado');
  };

  return (
    <Card className="max-w-2xl mx-auto mt-10">
      <CardContent className="p-6 space-y-4">
        <h1 className="text-lg font-bold text-center">Checklist de Visita Técnica</h1>

        <Input value={String(form.cliente)} placeholder="Cliente" onChange={(e) => setForm({ ...form, cliente: e.target.value })} />
        <Input value={String(form.direccion)} placeholder="Dirección" onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
        <Input value={String(form.ciudad)} placeholder="Ciudad" onChange={(e) => setForm({ ...form, ciudad: e.target.value })} />
        <Input value={String(form.tecnico)} placeholder="Técnico" onChange={(e) => setForm({ ...form, tecnico: e.target.value })} />
        <Input type="date" value={String(form.fecha)} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />

        <div>
          <Label>Código SKU</Label>
          <Input
            type="text"
            value={String(form.sku)}
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

        <Textarea
          value={String(form.observaciones)}
          placeholder="Observaciones generales"
          onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
        />

        <div className="flex items-center space-x-2">
          <Checkbox
            checked={!!form.clienteSatisfecho}
            onCheckedChange={(val) => setForm({ ...form, clienteSatisfecho: val === true })}
          />
          <Label>Cliente satisfecho</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            checked={!!form.entregoInstructivo}
            onCheckedChange={(val) => setForm({ ...form, entregoInstructivo: val === true })}
          />
          <Label>Se entregó instructivo</Label>
        </div>

        <Textarea
          placeholder="Comentarios sobre Diagnóstico"
          value={String(form.comentariosDiagnostico)}
          onChange={(e) => setForm({ ...form, comentariosDiagnostico: e.target.value })}
        />

        <Textarea
          placeholder="Comentarios sobre Solución"
          value={String(form.comentariosSolucion)}
          onChange={(e) => setForm({ ...form, comentariosSolucion: e.target.value })}
        />

        <Textarea
          placeholder="Comentarios sobre Pruebas"
          value={String(form.comentariosPruebas)}
          onChange={(e) => setForm({ ...form, comentariosPruebas: e.target.value })}
        />

        <Button onClick={handleSubmit}>Enviar</Button>
      </CardContent>
    </Card>
  );
}
