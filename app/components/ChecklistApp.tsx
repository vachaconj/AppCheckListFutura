'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { skuList } from '@/app/data/skuList';

const diagnosticos = [
  'No imprime negro / color faltante',
  'Cabezal se choca con material o carro desalineado',
  'Fugas de tinta en dampers / cabezal',
  'Banding / líneas / imagen doble',
  'Error de encoder o motor',
  'Software no detecta cabezales',
  'Error al cargar tinta / sensor de tinta',
  'Ruido extraño en el cabezal',
  'Tinta derramada en superficie de impresión'
];

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
    diagnosticos: [] as string[],
  });

  const toggleDiagnostico = (diagnostico: string) => {
    setForm((prevForm) => {
      const exists = prevForm.diagnosticos.includes(diagnostico);
      return {
        ...prevForm,
        diagnosticos: exists
          ? prevForm.diagnosticos.filter((d) => d !== diagnostico)
          : [...prevForm.diagnosticos, diagnostico],
      };
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

        <div>
          <Label className="font-semibold">Diagnóstico:</Label>
          <div className="space-y-2 mt-2">
            {diagnosticos.map((item, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                <Checkbox
                  id={`diag-${idx}`}
                  checked={form.diagnosticos.includes(item)}
                  onCheckedChange={() => toggleDiagnostico(item)}
                />
                <Label htmlFor={`diag-${idx}`}>{item}</Label>
              </div>
            ))}
          </div>
        </div>

        <Button onClick={handleSubmit}>Enviar</Button>
      </CardContent>
    </Card>
  );
}
