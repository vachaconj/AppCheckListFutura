// components/ChecklistApp.tsx
"use client";

import { useState, useRef, useEffect, ChangeEvent } from "react";
import imageCompression from 'browser-image-compression'; // <-- Importar la librería
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
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
  
  // *** NUEVO ESTADO: Para feedback visual durante la compresión ***
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

  // *** NUEVA FUNCIÓN: Comprime una lista de archivos ***
  const compressFiles = async (fileList: FileList | null): Promise<File[]> => {
    if (!fileList) return [];
    
    const options = {
      maxSizeMB: 1,          // El tamaño máximo de la imagen en MB
      maxWidthOrHeight: 1920, // Redimensiona la imagen al ancho/alto máximo
      useWebWorker: true,    // Usa un worker para no bloquear la UI
    };

    const compressionPromises = Array.from(fileList).map(file => {
      console.log(`Comprimiendo ${file.name}... Tamaño original: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
      return imageCompression(file, options);
    });

    const compressedFiles = await Promise.all(compressionPromises);
    compressedFiles.forEach(file => {
        console.log(`Compresión finalizada para ${file.name}. Nuevo tamaño: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
    });

    return compressedFiles;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsProcessingFiles(true); // Bloquear el botón de envío

    try {
      // *** CAMBIO EN handleSubmit: Comprimir archivos antes de enviarlos ***
      const compressedDiagnostico = await compressFiles(form.archivosDiagnostico);
      const compressedSolucion = await compressFiles(form.archivosSolucion);
      const compressedPruebas = await compressFiles(form.archivosPruebas);

      const formData = new FormData();
      // Añadir campos de texto y checkboxes...
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

      // Añadir los archivos YA COMPRIMIDOS
      compressedDiagnostico.forEach(file => formData.append("diagnosticoFiles", file));
      compressedSolucion.forEach(file => formData.append("solucionFiles", file));
      compressedPruebas.forEach(file => formData.append("pruebasFiles", file));

      const res = await fetch("/api/submit", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error("Error al enviar: " + (err.error || res.status));
      }
      
      alert("¡Formulario enviado correctamente!");
      setForm({ cliente: "", direccion: "", ciudad: "", tecnico: "", fechaVisita: "", codigoSku: "", observacionesGenerales: "", clienteSatisfecho: false, seEntregoInstructivo: false, diagnostico: [], comentariosDiagnostico: "", archivosDiagnostico: null, solucion: [], comentariosSolucion: "", archivosSolucion: null, pruebas: [], comentariosPruebas: "", archivosPruebas: null, transcripcionVoz: "" });

    } catch (err) {
      console.error("Error en handleSubmit:", err);
      alert((err as Error).message);
    } finally {
      setIsProcessingFiles(false); // Desbloquear el botón de envío
    }
  };

  return (
    <Card className="max-w-2xl mx-auto mt-10 shadow-md">
      <CardContent className="p-6 space-y-6">
        <h1 className="text-2xl font-bold text-center">Checklist de Visita Técnica</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ... Todos tus inputs y acordeones siguen igual ... */}
          <div><Label htmlFor="cliente">Cliente</Label><Input id="cliente" name="cliente" value={form.cliente} onChange={handleInputChange} required /></div>
          <div><Label htmlFor="direccion">Dirección</Label><Input id="direccion" name="direccion" value={form.direccion} onChange={handleInputChange} required /></div>
          <div><Label htmlFor="ciudad">Ciudad</Label><Input id="ciudad" name="ciudad" value={form.ciudad} onChange={handleInputChange} required /></div>
          <div><Label htmlFor="tecnico">Técnico</Label><Input id="tecnico" name="tecnico" value={form.tecnico} onChange={handleInputChange} required /></div>
          <div><Label htmlFor="fechaVisita">Fecha de visita</Label><Input id="fechaVisita" name="fechaVisita" type="date" value={form.fechaVisita} onChange={handleInputChange} required /></div>
          <div><Label htmlFor="codigoSku">Código SKU</Label><Input id="codigoSku" name="codigoSku" value={form.codigoSku} onChange={handleInputChange} list="sku-options" required /><datalist id="sku-options">{skuList.map((sku, idx) => ( <option key={idx} value={sku} /> ))}</datalist></div>
          <div><Label htmlFor="observacionesGenerales">Observaciones generales</Label><Textarea id="observacionesGenerales" name="observacionesGenerales" value={form.observacionesGenerales} onChange={handleInputChange} /></div>
          <div className="flex items-center space-x-2"><Checkbox id="clienteSatisfecho" name="clienteSatisfecho" checked={form.clienteSatisfecho} onCheckedChange={(v) => setForm(p => ({...p, clienteSatisfecho: v === true}))} /><Label htmlFor="clienteSatisfecho">Cliente satisfecho</Label></div>
          <div className="flex items-center space-x-2"><Checkbox id="seEntregoInstructivo" name="seEntregoInstructivo" checked={form.seEntregoInstructivo} onCheckedChange={(v) => setForm(p => ({...p, seEntregoInstructivo: v === true}))} /><Label htmlFor="seEntregoInstructivo">Se entregó instructivo</Label></div>
          <hr/>
          <AccordionSection title="Diagnostico" options={diagnosticoOpciones} fileFieldName="diagnosticoFiles" selectedOptions={form.diagnostico} onOptionsChange={(arr) => setForm(p => ({ ...p, diagnostico: arr }))} commentsValue={form.comentariosDiagnostico} onCommentsChange={(e) => setForm(p => ({ ...p, comentariosDiagnostico: e.target.value }))} onFileChange={(e) => handleFileChange("archivosDiagnostico", e.target.files)} />
          <AccordionSection title="Solucion" options={solucionOpciones} fileFieldName="solucionFiles" selectedOptions={form.solucion} onOptionsChange={(arr) => setForm(p => ({ ...p, solucion: arr }))} commentsValue={form.comentariosSolucion} onCommentsChange={(e) => setForm(p => ({ ...p, comentariosSolucion: e.target.value }))} onFileChange={(e) => handleFileChange("archivosSolucion", e.target.files)} />
          <AccordionSection title="Pruebas" options={pruebasOpciones} fileFieldName="pruebasFiles" selectedOptions={form.pruebas} onOptionsChange={(arr) => setForm(p => ({ ...p, pruebas: arr }))} commentsValue={form.comentariosPruebas} onCommentsChange={(e) => setForm(p => ({ ...p, comentariosPruebas: e.target.value }))} onFileChange={(e) => handleFileChange("archivosPruebas", e.target.files)} />
          <hr/>
          <div><Label htmlFor="transcripcionVoz">Transcripción de voz a texto</Label><Textarea id="transcripcionVoz" name="transcripcionVoz" value={form.transcripcionVoz} onChange={handleInputChange} /><div className="flex space-x-2 mt-2"><Button type="button" onClick={handleStartRecording}>Grabar</Button><Button type="button" onClick={handleStopRecording}>Detener</Button></div></div>
          <hr/>
          {/* El botón ahora muestra un estado de carga */}
          <Button type="submit" className="w-full" disabled={isProcessingFiles}>
            {isProcessingFiles ? "Procesando imágenes..." : "Enviar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}