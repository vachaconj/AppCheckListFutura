// components/ChecklistApp.tsx
"use client";

import { useState, useRef, useEffect, ChangeEvent } from "react";
import imageCompression from 'browser-image-compression';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { skuList } from "@/app/data/skuList";
import { AccordionSection } from "@/components/ui/accordion";

type FormState = {
  cliente: string;
  direccion: string;
  ciudad: string;
  tecnico: string;
  fechaVisita: string;
  codigoSku: string;
  observacionesGenerales: string;
  clienteSatisfecho: boolean;
  seEntregoInstructivo: boolean;
  diagnostico: string[];
  comentariosDiagnostico: string;
  archivosDiagnostico: FileList | null;
  solucion: string[];
  comentariosSolucion: string;
  archivosSolucion: FileList | null;
  pruebas: string[];
  comentariosPruebas: string;
  archivosPruebas: FileList | null;
  transcripcionVoz: string;
};

export default function ChecklistApp() {
  const [form, setForm] = useState<FormState>({
    cliente: "", direccion: "", ciudad: "", tecnico: "", fechaVisita: "", codigoSku: "", 
    observacionesGenerales: "", clienteSatisfecho: false, seEntregoInstructivo: false,
    diagnostico: [], comentariosDiagnostico: "", archivosDiagnostico: null,
    solucion: [], comentariosSolucion: "", archivosSolucion: null,
    pruebas: [], comentariosPruebas: "", archivosPruebas: null,
    transcripcionVoz: "",
  });
  
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);

  const diagnosticoOpciones = [ "No imprime negro / color faltante", "Cabezal se choca con material", "Carro desalineado", "Fugas de tinta en amortiguadores / cabezales", "Banding / líneas / imagen doble", "Sensor de material no detecta", "Luz LED dañada / fallo electrónico", "Tinta se evapora / baja presión en dampers", "Software congela al imprimir", "Cabezal no registra lectura" ];
  const solucionOpciones = [ "Purga general", "Carga con jeringa", "Cambio de amortiguador", "Cambio de cabezal", "Cambio de tarjetas / sensor", "Calibración de carro y encoder", "Ajuste de presión de tinta", "Reinstalación de software o firmware", "Cambio de banda / damper", "Mantenimiento preventivo completo" ];
  const pruebasOpciones = [ "Prueba de impresión directa", "Prueba en modo espejo / negativo", "Impresión con plantilla de calibración", "Prueba de corte", "Impresión continua por 10 metros", "Validación con cliente in situ", "Transferencia en prensa térmica", "Verificación de alineación con barniz/white", "Test en materiales diversos (PET, DTF, UV)", "Confirmación en software RIP" ];
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    try {
      type ExtendedWindow = typeof window & { webkitSpeechRecognition?: new () => SpeechRecognition; };
      const SpeechRecognitionClass = (window as ExtendedWindow).SpeechRecognition || (window as ExtendedWindow).webkitSpeechRecognition;
      if (SpeechRecognitionClass) {
        const recognition = new SpeechRecognitionClass();
        recognition.lang = "es-PE";
        recognition.continuous = true;
        recognition.onresult = (event: SpeechRecognitionEvent) => {
          const transcript = Array.from(event.results).map(result => result[0].transcript).join('');
          setForm((prev) => ({ ...prev, transcripcionVoz: prev.transcripcionVoz + " " + transcript }));
        };
        recognitionRef.current = recognition;
      }
    } catch (error) {
      console.error("Fallo al inicializar la API de Speech Recognition:", error);
    }
  }, []);

  const handleStartRecording = () => { recognitionRef.current?.start(); };
  const handleStopRecording = () => { recognitionRef.current?.stop(); };
  const handleFileChange = (field: keyof FormState, files: FileList | null) => { setForm((prev) => ({ ...prev, [field]: files })); };
  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const processFiles = async (fileList: FileList | null): Promise<File[]> => {
    if (!fileList) return [];
    
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
    };

    const processingPromises = Array.from(fileList).map(file => {
      if (file.type.startsWith('image/')) {
        return imageCompression(file, options);
      } else {
        return Promise.resolve(file);
      }
    });

    return Promise.all(processingPromises);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsProcessingFiles(true);

    try {
      const processedDiagnostico = await processFiles(form.archivosDiagnostico);
      const processedSolucion = await processFiles(form.archivosSolucion);
      const processedPruebas = await processFiles(form.archivosPruebas);

      const formData = new FormData();
      formData.append("cliente", form.cliente);
      formData.append("direccion", form.direccion);
      formData.append("ciudad", form.ciudad);
      formData.append("tecnico", form.tecnico);
      formData.append("fechaVisita", form.fechaVisita);
      formData.append("codigoSku", form.codigoSku);
      formData.append("observacionesGenerales", form.observacionesGenerales);
      formData.append("comentariosDiagnostico", form.comentariosDiagnostico);
      formData.append("comentariosSolucion", form.comentariosSolucion);
      formData.append("comentariosPruebas", form.comentariosPruebas);
      formData.append("transcripcionVoz", form.transcripcionVoz);
      if (form.clienteSatisfecho) formData.append("clienteSatisfecho", "on");
      if (form.seEntregoInstructivo) formData.append("seEntregoInstructivo", "on");
      formData.append("diagnostico", form.diagnostico.join(", "));
      formData.append("solucion", form.solucion.join(", "));
      formData.append("pruebas", form.pruebas.join(", "));
      
      processedDiagnostico.forEach(file => formData.append("diagnosticoFiles", file));
      processedSolucion.forEach(file => formData.append("solucionFiles", file));
      processedPruebas.forEach(file => formData.append("pruebasFiles", file));

      const res = await fetch("/api/submit", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error("Error al enviar: " + (err.error || res.status));
      }
      
      alert("¡Formulario enviado correctamente!");
      setForm({ cliente: "", direccion: "", ciudad: "", tecnico: "", fechaVisita: "", codigoSku: "", observacionesGenerales: "", clienteSatisfecho: false, seEntregoInstructivo: false, diagnostico: [], comentariosDiagnostico: "", archivosDiagnostico: null, solucion: [], comentariosSolucion: "", archivosSolucion: null, pruebas: [], comentariosPruebas: "", archivosPruebas: null, transcripcionVoz: "" });

    } catch (err) {
      console.error("Error en handleSubmit:", err);
      alert(`Ocurrió un error: ${(err as Error).message}`);
    } finally {
      setIsProcessingFiles(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen p-4 sm:p-6 lg:p-8">
      <Card className="max-w-3xl mx-auto shadow-lg">
        {/* *** CABECERA RESPONSIVE MEJORADA *** */}
        <CardHeader className="bg-slate-800 text-white p-4 sm:p-6 rounded-t-lg">
          {/* - Por defecto (móvil): `flex-col` (apilado vertical) y centrado.
            - En pantallas pequeñas (`sm`) y más grandes: `sm:flex-row` (en fila) y alineado a la izquierda.
          */}
          <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
            <div className="flex-shrink-0">
              {/* Asegúrate de que tu logo 'logo.jpg' esté en la carpeta /public */}
              <img 
                src="/logo.png" 
                alt="Logo de la Empresa" 
                className="h-12" // Puedes ajustar la altura de tu logo
              />
            </div>
            <div className="text-center sm:text-left">
              <h1 className="text-xl md:text-2xl font-bold">
                Checklist de Visita Técnica
              </h1>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 md:p-8 space-y-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* El resto del formulario no ha cambiado */}
            <div><Label htmlFor="cliente" className="font-semibold text-slate-700">Cliente</Label><Input id="cliente" name="cliente" value={form.cliente} onChange={handleInputChange} required /></div>
            <div><Label htmlFor="direccion" className="font-semibold text-slate-700">Dirección</Label><Input id="direccion" name="direccion" value={form.direccion} onChange={handleInputChange} required /></div>
            <div><Label htmlFor="ciudad" className="font-semibold text-slate-700">Ciudad</Label><Input id="ciudad" name="ciudad" value={form.ciudad} onChange={handleInputChange} required /></div>
            <div><Label htmlFor="tecnico" className="font-semibold text-slate-700">Técnico</Label><Input id="tecnico" name="tecnico" value={form.tecnico} onChange={handleInputChange} required /></div>
            <div><Label htmlFor="fechaVisita" className="font-semibold text-slate-700">Fecha de visita</Label><Input id="fechaVisita" name="fechaVisita" type="date" value={form.fechaVisita} onChange={handleInputChange} required /></div>
            <div><Label htmlFor="codigoSku" className="font-semibold text-slate-700">Código SKU</Label><Input id="codigoSku" name="codigoSku" value={form.codigoSku} onChange={handleInputChange} list="sku-options" required /><datalist id="sku-options">{skuList.map((sku, idx) => ( <option key={idx} value={sku} /> ))}</datalist></div>
            <div><Label htmlFor="observacionesGenerales" className="font-semibold text-slate-700">Observaciones generales</Label><Textarea id="observacionesGenerales" name="observacionesGenerales" value={form.observacionesGenerales} onChange={handleInputChange} /></div>
            <div className="flex items-center space-x-2"><Checkbox id="clienteSatisfecho" name="clienteSatisfecho" checked={form.clienteSatisfecho} onCheckedChange={(v) => setForm(p => ({...p, clienteSatisfecho: v === true}))} /><Label htmlFor="clienteSatisfecho" className="text-slate-600">Cliente satisfecho</Label></div>
            <div className="flex items-center space-x-2"><Checkbox id="seEntregoInstructivo" name="seEntregoInstructivo" checked={form.seEntregoInstructivo} onCheckedChange={(v) => setForm(p => ({...p, seEntregoInstructivo: v === true}))} /><Label htmlFor="seEntregoInstructivo" className="text-slate-600">Se entregó instructivo</Label></div>
            <hr/>
            <AccordionSection title="Diagnostico" options={diagnosticoOpciones} fileFieldName="diagnosticoFiles" selectedOptions={form.diagnostico} onOptionsChange={(arr) => setForm(p => ({ ...p, diagnostico: arr }))} commentsValue={form.comentariosDiagnostico} onCommentsChange={(e) => setForm(p => ({ ...p, comentariosDiagnostico: e.target.value }))} onFileChange={(e) => handleFileChange("archivosDiagnostico", e.target.files)} />
            <AccordionSection title="Solucion" options={solucionOpciones} fileFieldName="solucionFiles" selectedOptions={form.solucion} onOptionsChange={(arr) => setForm(p => ({ ...p, solucion: arr }))} commentsValue={form.comentariosSolucion} onCommentsChange={(e) => setForm(p => ({ ...p, comentariosSolucion: e.target.value }))} onFileChange={(e) => handleFileChange("archivosSolucion", e.target.files)} />
            <AccordionSection title="Pruebas" options={pruebasOpciones} fileFieldName="pruebasFiles" selectedOptions={form.pruebas} onOptionsChange={(arr) => setForm(p => ({ ...p, pruebas: arr }))} commentsValue={form.comentariosPruebas} onCommentsChange={(e) => setForm(p => ({ ...p, comentariosPruebas: e.target.value }))} onFileChange={(e) => handleFileChange("archivosPruebas", e.target.files)} />
            <hr/>
            <div><Label htmlFor="transcripcionVoz" className="font-semibold text-slate-700">Transcripción de voz a texto</Label><Textarea id="transcripcionVoz" name="transcripcionVoz" value={form.transcripcionVoz} onChange={handleInputChange} /><div className="flex space-x-2 mt-2"><Button type="button" onClick={handleStartRecording} variant="outline">Grabar</Button><Button type="button" onClick={handleStopRecording} variant="outline">Detener</Button></div></div>
            <hr/>
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-6" disabled={isProcessingFiles}>
              {isProcessingFiles ? "Procesando archivos..." : "Enviar Reporte"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}