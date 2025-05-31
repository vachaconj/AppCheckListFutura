'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { skuList } from '@/app/data/skuList';
import { AccordionSection } from '@/components/ui/accordion';

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
    archivosDiagnostico: null as FileList | null,
    archivosSolucion: null as FileList | null,
    archivosPruebas: null as FileList | null,
    transcripcionAudio: '',
  });

  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);

  const startRecording = () => {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) {
      alert("Tu navegador no soporta reconocimiento de voz.");
      return;
    }
    const recog = new SpeechRecognition();
    recog.lang = 'es-ES';
    recog.continuous = false;
    recog.interimResults = false;

    recog.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setForm(prev => ({ ...prev, transcripcionAudio: transcript }));
    };

    recog.onerror = (event: any) => {
      console.error('Error de reconocimiento de voz:', event.error);
    };

    recog.start();
    setRecognition(recog);
  };

  const stopRecording = () => {
    if (recognition) {
      recognition.stop();
      setRecognition(null);
    }
  };

  const diagnosticoOpciones = [
    'No imprime negro / color faltante',
    'Cabezal se choca con material',
    'Carro desalineado',
    'Fugas de tinta en amortiguadores / cabezales',
    'Banding / líneas / imagen doble',
    'Sensor de material no detecta',
    'Luz LED dañada / fallo electrónico',
    'Tinta se evapora / baja presión en dampers',
    'Software congela al imprimir',
    'Cabezal no registra lectura'
  ];

  const solucionOpciones = [
    'Purga general',
    'Carga con jeringa',
    'Cambio de amortiguador',
    'Cambio de cabezal',
    'Cambio de tarjetas / sensor',
    'Calibración de carro y encoder',
    'Ajuste de presión de tinta',
    'Reinstalación de software o firmware',
    'Cambio de banda / damper',
    'Mantenimiento preventivo completo'
  ];

  const pruebasOpciones = [
    'Prueba de impresión directa',
    'Prueba en modo espejo / negativo',
    'Impresión con plantilla de calibración',
    'Prueba de corte',
    'Impresión continua por 10 metros',
    'Validación con cliente in situ',
    'Transferencia en prensa térmica',
    'Verificación de alineación con barniz/white',
    'Test en materiales diversos (PET, DTF, UV)',
    'Confirmación en software RIP'
  ];

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log(form);
    alert('Formulario enviado (solo consola por ahora)');
  };

  const handleFileChange = (field: keyof typeof form, files: FileList | null) => {
    setForm({ ...form, [field]: files });
  };

  return (
    <Card className="max-w-2xl mx-auto mt-10">
      <CardContent className="p-6 space-y-4">
        <h1 className="text-lg font-bold text-center">Checklist de Visita Técnica</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input placeholder="Cliente" value={form.cliente} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, cliente: e.target.value })} />
          <Input placeholder="Dirección" value={form.direccion} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, direccion: e.target.value })} />
          <Input placeholder="Ciudad" value={form.ciudad} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, ciudad: e.target.value })} />
          <Input placeholder="Técnico" value={form.tecnico} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, tecnico: e.target.value })} />
          <Input type="date" value={form.fecha} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, fecha: e.target.value })} />

          <div>
            <Label className="block mb-1">Código SKU</Label>
            <Input
              type="text"
              value={form.sku}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, sku: e.target.value })}
              list="sku-options"
              placeholder="Buscar SKU..."
            />
            <datalist id="sku-options">
              {skuList.map((sku, idx) => (
                <option key={idx} value={sku} />
              ))}
            </datalist>
          </div>

          <Textarea
            placeholder="Observaciones generales"
            value={form.observaciones}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm({ ...form, observaciones: e.target.value })}
          />

          <div className="flex gap-4">
            <Checkbox checked={form.clienteSatisfecho} onCheckedChange={(v: boolean) => setForm({ ...form, clienteSatisfecho: v })} />
            <Label>Cliente satisfecho</Label>
            <Checkbox checked={form.entregoInstructivo} onCheckedChange={(v: boolean) => setForm({ ...form, entregoInstructivo: v })} />
            <Label>Se entregó instructivo</Label>
          </div>

          <AccordionSection
            title="Diagnostico"
            options={diagnosticoOpciones}
            value={form.comentariosDiagnostico}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm({ ...form, comentariosDiagnostico: e.target.value })}
            onFileChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFileChange('archivosDiagnostico', e.target.files)}
          />

          <AccordionSection
            title="Solucion"
            options={solucionOpciones}
            value={form.comentariosSolucion}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm({ ...form, comentariosSolucion: e.target.value })}
            onFileChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFileChange('archivosSolucion', e.target.files)}
          />

          <AccordionSection
            title="Pruebas"
            options={pruebasOpciones}
            value={form.comentariosPruebas}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm({ ...form, comentariosPruebas: e.target.value })}
            onFileChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFileChange('archivosPruebas', e.target.files)}
          />

          <div className="space-y-2">
            <Label>🎤 Transcripción por Voz</Label>
            <div className="flex gap-2">
              <Button type="button" onClick={startRecording}>🎙 Iniciar Grabación</Button>
              <Button type="button" onClick={stopRecording}>⏹ Detener</Button>
            </div>
            <Textarea
              readOnly
              placeholder="Texto transcrito desde el micrófono..."
              value={form.transcripcionAudio}
            />
          </div>

          <Button type="submit">Enviar</Button>
        </form>
      </CardContent>
    </Card>
  );
}
