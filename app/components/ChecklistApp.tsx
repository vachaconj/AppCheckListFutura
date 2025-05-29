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
    clienteSatisfecho: false,
    entregoInstructivo: false,
  });

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
          <Input
            type="text"
            value={form.cliente}
            onChange={(e) => setForm({ ...form, cliente: e.target.value })}
          />
        </div>

        <div>
          <Label>Dirección</Label>
          <Input
            type="text"
            value={form.direccion}
            onChange={(e) => setForm({ ...form, direccion: e.target.value })}
          />
        </div>

        <div>
          <Label>Ciudad</Label>
          <Input
            type="text"
            value={form.ciudad}
            onChange={(e) => setForm({ ...form, ciudad: e.target.value })}
          />
        </div>

        <div>
          <Label>Técnico</Label>
          <Input
            type="text"
            value={form.tecnico}
            onChange={(e) => setForm({ ...form, tecnico: e.target.value })}
          />
        </div>

        <div>
          <Label>Fecha</Label>
          <Input
            type="date"
            value={form.fecha}
            onChange={(e) => setForm({ ...form, fecha: e.target.value })}
          />
        </div>

        <div>
          <Label>SKU</Label>
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

        <div>
          <Label>Observaciones:</Label>
          <Textarea
            value={form.observaciones}
            onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
          />
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="clienteSatisfecho"
            checked={form.clienteSatisfecho}
            onCheckedChange={(value) =>
              setForm({ ...form, clienteSatisfecho: value === true })
            }
          />
          <Label htmlFor="clienteSatisfecho">Cliente satisfecho</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="entregoInstructivo"
            checked={form.entregoInstructivo}
            onCheckedChange={(value) =>
              setForm({ ...form, entregoInstructivo: value === true })
            }
          />
          <Label htmlFor="entregoInstructivo">Se entregó instructivo</Label>
        </div>

        <Button onClick={handleSubmit}>Enviar</Button>
      </CardContent>
    </Card>
  );
}
