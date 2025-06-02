'use client';

import { useState, useEffect, useRef } from 'react';
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
    transcripcion: '',
    archivosDiagnostico: null as FileList | null,
    archivosSolucion: null as FileList | null,
    archivosPruebas: null as FileList | null,
  });

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

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isRecordingRef = useRef(false);

  useEffect(() => {
  type ExtendedWindow = typeof window & {
    webkitSpeechRecognition?: new () => SpeechRecognition;
  };

  const speechWindow = window as ExtendedWindow;
  const SpeechRecognitionClass = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;

  if (SpeechRecognitionClass) {
    const recognition = new SpeechRecognitionClass();
    recognition.lang = 'es-PE';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setForm((prev) => ({
        ...prev,
        transcripcion: prev.transcripcion + ' ' + transcript,
      }));
    };

    recognitionRef.current = recognition;
  }
}, []);

  const handleStartRecording = () => {
    if (recognitionRef.current && !isRecordingRef.current) {
      recognitionRef.current.start();
      isRecordingRef.current = true;
    }
  };

  const handleStopRecording = () => {
    if (recognitionRef.current && isRecordingRef.current) {
      recognitionRef.current.stop();
      isRecordingRef.current = false;
    }
  };

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
          <Input placeholder="Cliente" value={form.cliente} onChange={(e) => setForm({ ...form, cliente: e.target.value })} />
          <Input placeholder="Dirección" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
          <Input placeholder="Ciudad" value={form.ciudad} onChange={(e) => setForm({ ...form, ciudad: e.target.value })} />
          <Input placeholder="Técnico" value={form.tecnico} onChange={(e) => setForm({ ...form, tecnico: e.target.value })} />
          <Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />

          <div>
            <Label className="block mb-1">Código SKU</Label>
            <Input
              type="text"
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
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
            onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
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
            onChange={(e) => setForm({ ...form, comentariosDiagnostico: e.target.value })}
            onFileChange={(e) => handleFileChange('archivosDiagnostico', e.target.files)}
          />

          <AccordionSection
            title="Solucion"
            options={solucionOpciones}
            value={form.comentariosSolucion}
            onChange={(e) => setForm({ ...form, comentariosSolucion: e.target.value })}
            onFileChange={(e) => handleFileChange('archivosSolucion', e.target.files)}
          />

          <AccordionSection
            title="Pruebas"
            options={pruebasOpciones}
            value={form.comentariosPruebas}
            onChange={(e) => setForm({ ...form, comentariosPruebas: e.target.value })}
            onFileChange={(e) => handleFileChange('archivosPruebas', e.target.files)}
          />

          <div>
            <Label>Transcripción de voz a texto</Label>
            <Textarea
              value={form.transcripcion}
              onChange={(e) => setForm({ ...form, transcripcion: e.target.value })}
              placeholder="Aquí aparecerá el texto grabado..."
            />
            <div className="flex gap-2 mt-2">
              <Button type="button" onClick={handleStartRecording}>Grabar</Button>
              <Button type="button" onClick={handleStopRecording}>Detener</Button>
            </div>
          </div>

          <Button type="submit">Enviar</Button>
        </form>
      </CardContent>
    </Card>
  );
}
