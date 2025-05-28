'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

export default function ChecklistApp() {
  const [form, setForm] = useState<{
  cliente: string;
  direccion: string;
  ciudad: string;
  tecnico: string;
  fecha: string;
  modelo: string;
  tipo: string[];
  diagnostico: string[];
  acciones: string[];
  observaciones: string;
  firmaCliente: string;
  firmaTecnico: string;
}>({
  cliente: '',
  direccion: '',
  ciudad: '',
  tecnico: '',
  fecha: '',
  modelo: '',
  tipo: [],
  diagnostico: [],
  acciones: [],
  observaciones: '',
  firmaCliente: '',
  firmaTecnico: ''
});

  const opcionesTipo = ['DTF', 'UV', 'ECO', 'SUBLIMACIÓN', 'HÍBRIDA', 'CAMA PLANA'];
  const diagnosticos = [
    'No imprime negro / color faltante',
    'Cabezal se choca con material o carro desalineado',
    'Fugas de tinta en dampers / cabezal',
    'Banding / líneas / imagen doble',
    'Perfil ICC no cargado o incorrecto',
    'Error de temperatura o sensores en horno (DTF)',
    'Calibración mal ejecutada / sin resultado',
    'Error de software (Hoson / Maintop / Flexi)',
    'Placa reseteada / sin parámetros / ID perdido',
    'Problemas con RIP o comunicación PC → impresora'
  ];
  const acciones = [
    'Purga manual / desde software / con jeringa',
    'Limpieza profunda de cabezal (flush, solución)',
    'Reemplazo de damper / manguera / filtro',
    'Reconfiguración de software RIP',
    'Calibración de bi-direccional, alimentación, separación cabezal',
    'Carga o verificación de ICC',
    'Reseteo / configuración de parámetros de placa (BetterPrinter)',
    'Asistencia remota (AnyDesk / TeamViewer)',
    'Asistencia presencial complementaria'
  ];

  const toggleItem = (field: 'tipo' | 'diagnostico' | 'acciones', value: string) => {
  setForm(prev => ({
    ...prev,
    [field]: prev[field].includes(value)
      ? prev[field].filter(v => v !== value)
      : [...prev[field], value]
  }));
};

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    alert('Formulario enviado con éxito');
    // Aquí puedes integrar con Google Sheets vía webhook en el futuro
  };

  return (
    <div className="p-4 grid gap-4">
      <Card>
        <CardContent className="grid gap-4">
          <Label>Cliente</Label>
          <Input value={form.cliente} onChange={e => handleChange('cliente', e.target.value)} />
          <Label>Dirección</Label>
          <Input value={form.direccion} onChange={e => handleChange('direccion', e.target.value)} />
          <Label>Ciudad</Label>
          <Input value={form.ciudad} onChange={e => handleChange('ciudad', e.target.value)} />
          <Label>Técnico</Label>
          <Input value={form.tecnico} onChange={e => handleChange('tecnico', e.target.value)} />
          <Label>Fecha</Label>
          <Input type="date" value={form.fecha} onChange={e => handleChange('fecha', e.target.value)} />
          <Label>Modelo</Label>
          <Input value={form.modelo} onChange={e => handleChange('modelo', e.target.value)} />

          <Label>Tipo de máquina</Label>
          <div className="grid grid-cols-3 gap-2">
            {opcionesTipo.map(tipo => (
              <div key={tipo}>
                <Checkbox checked={form.tipo.includes(tipo)} onCheckedChange={() => toggleItem('tipo', tipo)} />
                <span className="ml-2">{tipo}</span>
              </div>
            ))}
          </div>

          <Label>Diagnóstico</Label>
          <div className="grid gap-1">
            {diagnosticos.map(d => (
              <div key={d}>
                <Checkbox checked={form.diagnostico.includes(d)} onCheckedChange={() => toggleItem('diagnostico', d)} />
                <span className="ml-2">{d}</span>
              </div>
            ))}
          </div>

          <Label>Acciones realizadas</Label>
          <div className="grid gap-1">
            {acciones.map(a => (
              <div key={a}>
                <Checkbox checked={form.acciones.includes(a)} onCheckedChange={() => toggleItem('acciones', a)} />
                <span className="ml-2">{a}</span>
              </div>
            ))}
          </div>

          <Label>Observaciones</Label>
          <Textarea value={form.observaciones} onChange={e => handleChange('observaciones', e.target.value)} />

          <Label>Firma del cliente</Label>
          <Input value={form.firmaCliente} onChange={e => handleChange('firmaCliente', e.target.value)} />
          <Label>Firma del técnico</Label>
          <Input value={form.firmaTecnico} onChange={e => handleChange('firmaTecnico', e.target.value)} />

          <Button onClick={handleSubmit}>Enviar checklist</Button>
        </CardContent>
      </Card>
    </div>
  );
}
