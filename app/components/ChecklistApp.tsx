// components/ChecklistApp.tsx
"use client";

import { useState, useRef, useEffect, ChangeEvent } from "react"; // Importar ChangeEvent
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { skuList } from "@/app/data/skuList";
import { AccordionSection } from "@/components/ui/accordion";

// El estado del formulario no necesita cambios
type FormState = {
  cliente: string;
  direccion: string;
  ciudad: string;
  tecnico: string;
  fechaVisita: string;
  codigoSku: string; // <-- CORRECCIÓN: Nombre estandarizado
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
    cliente: "",
    direccion: "",
    ciudad: "",
    tecnico: "",
    fechaVisita: "",
    codigoSku: "", // <-- CORRECCIÓN: Nombre estandarizado
    observacionesGenerales: "",
    clienteSatisfecho: false,
    seEntregoInstructivo: false,
    diagnostico: [],
    comentariosDiagnostico: "",
    archivosDiagnostico: null,
    solucion: [],
    comentariosSolucion: "",
    archivosSolucion: null,
    pruebas: [],
    comentariosPruebas: "",
    archivosPruebas: null,
    transcripcionVoz: "",
  });

  // Las opciones y la lógica de reconocimiento de voz no necesitan cambios
  const diagnosticoOpciones = [
    "No imprime negro / color faltante", "Cabezal se choca con material", "Carro desalineado", "Fugas de tinta en amortiguadores / cabezales", "Banding / líneas / imagen doble", "Sensor de material no detecta", "Luz LED dañada / fallo electrónico", "Tinta se evapora / baja presión en dampers", "Software congela al imprimir", "Cabezal no registra lectura",
  ];
  const solucionOpciones = [
    "Purga general", "Carga con jeringa", "Cambio de amortiguador", "Cambio de cabezal", "Cambio de tarjetas / sensor", "Calibración de carro y encoder", "Ajuste de presión de tinta", "Reinstalación de software o firmware", "Cambio de banda / damper", "Mantenimiento preventivo completo",
  ];
  const pruebasOpciones = [
    "Prueba de impresión directa", "Prueba en modo espejo / negativo", "Impresión con plantilla de calibración", "Prueba de corte", "Impresión continua por 10 metros", "Validación con cliente in situ", "Transferencia en prensa térmica", "Verificación de alineación con barniz/white", "Test en materiales diversos (PET, DTF, UV)", "Confirmación en software RIP",
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
      recognition.lang = "es-PE";
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        setForm((prev) => ({
          ...prev,
          transcripcionVoz: prev.transcripcionVoz + " " + transcript,
        }));
      };
      recognitionRef.current = recognition;
    }
  }, []);

  const handleStartRecording = () => { if (recognitionRef.current && !isRecordingRef.current) { recognitionRef.current.start(); isRecordingRef.current = true; } };
  const handleStopRecording = () => { if (recognitionRef.current && isRecordingRef.current) { recognitionRef.current.stop(); isRecordingRef.current = false; } };
  const handleFileChange = (field: "archivosDiagnostico" | "archivosSolucion" | "archivosPruebas", files: FileList | null) => { setForm((prev) => ({ ...prev, [field]: files })); };
  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  // *** MEJORA CRÍTICA: Construcción manual de FormData ***
  // Esto nos da control total sobre los datos que se envían, solucionando
  // el problema de los arrays (checkboxes) y asegurando que los nombres de campo sean correctos.
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const formData = new FormData();

      // 1. Añadir campos de texto simples
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

      // 2. Añadir valores de checkboxes (se envían como 'on' si están marcados)
      if (form.clienteSatisfecho) formData.append("clienteSatisfecho", "on");
      if (form.seEntregoInstructivo) formData.append("seEntregoInstructivo", "on");

      // 3. Unir los arrays de los acordeones en un solo string
      formData.append("diagnostico", form.diagnostico.join(", "));
      formData.append("solucion", form.solucion.join(", "));
      formData.append("pruebas", form.pruebas.join(", "));

      // 4. Añadir todos los archivos bajo el mismo nombre de campo "files"
      if (form.archivosDiagnostico) {
        for (const file of Array.from(form.archivosDiagnostico)) {
          formData.append("files", file);
        }
      }
      if (form.archivosSolucion) {
        for (const file of Array.from(form.archivosSolucion)) {
          formData.append("files", file);
        }
      }
      if (form.archivosPruebas) {
        for (const file of Array.from(form.archivosPruebas)) {
          formData.append("files", file);
        }
      }
      
      const res = await fetch("/api/submit", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert("Error al enviar: " + (err.error || res.status));
        return;
      }
      alert("¡Formulario enviado correctamente!");
      // Limpiar formulario
      setForm({
        cliente: "", direccion: "", ciudad: "", tecnico: "", fechaVisita: "",
        codigoSku: "", observacionesGenerales: "", clienteSatisfecho: false,
        seEntregoInstructivo: false, diagnostico: [], comentariosDiagnostico: "",
        archivosDiagnostico: null, solucion: [], comentariosSolucion: "",
        archivosSolucion: null, pruebas: [], comentariosPruebas: "",
        archivosPruebas: null, transcripcionVoz: "",
      });

    } catch (err) {
      console.error("Error en handleSubmit:", err);
      alert("Ocurrió un error al enviar el formulario.");
    }
  };

  return (
    <Card className="max-w-2xl mx-auto mt-10 shadow-md">
      <CardContent className="p-6 space-y-6">
        <h1 className="text-2xl font-bold text-center">
          Checklist de Visita Técnica
        </h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Cliente */}
          <div>
            <Label htmlFor="cliente" className="block font-medium mb-1">Cliente</Label>
            <Input id="cliente" name="cliente" type="text" placeholder="Nombre del cliente" value={form.cliente} onChange={handleInputChange} required />
          </div>

          {/* Dirección */}
          <div>
            <Label htmlFor="direccion" className="block font-medium mb-1">Dirección</Label>
            <Input id="direccion" name="direccion" type="text" placeholder="Av. ejemplo 123" value={form.direccion} onChange={handleInputChange} required />
          </div>
          
          {/* Ciudad */}
          <div>
            <Label htmlFor="ciudad" className="block font-medium mb-1">Ciudad</Label>
            <Input id="ciudad" name="ciudad" type="text" placeholder="Lima" value={form.ciudad} onChange={handleInputChange} required />
          </div>

          {/* Técnico */}
          <div>
            <Label htmlFor="tecnico" className="block font-medium mb-1">Técnico</Label>
            <Input id="tecnico" name="tecnico" type="text" placeholder="Nombre del técnico" value={form.tecnico} onChange={handleInputChange} required />
          </div>
          
          {/* Fecha de visita */}
          <div>
            <Label htmlFor="fechaVisita" className="block font-medium mb-1">Fecha de visita</Label>
            <Input id="fechaVisita" name="fechaVisita" type="date" value={form.fechaVisita} onChange={handleInputChange} required />
          </div>

          {/* Código SKU - CORRECCIÓN: el `name` ahora es `codigoSku` */}
          <div>
            <Label htmlFor="codigoSku" className="block font-medium mb-1">Código SKU</Label>
            <Input id="codigoSku" name="codigoSku" type="text" placeholder="Buscar SKU..." value={form.codigoSku} onChange={handleInputChange} list="sku-options" required />
            <datalist id="sku-options">
              {skuList.map((sku, idx) => ( <option key={idx} value={sku} /> ))}
            </datalist>
          </div>

          {/* Observaciones generales */}
          <div>
            <Label htmlFor="observacionesGenerales" className="block font-medium mb-1">Observaciones generales</Label>
            <Textarea id="observacionesGenerales" name="observacionesGenerales" placeholder="Anota aquí cualquier comentario general" value={form.observacionesGenerales} onChange={handleInputChange} rows={3} />
          </div>

          {/* Cliente satisfecho */}
          <div className="flex items-center space-x-2">
            <Checkbox id="clienteSatisfecho" name="clienteSatisfecho" checked={form.clienteSatisfecho} onCheckedChange={(v) => setForm((prev) => ({...prev, clienteSatisfecho: v === true, }))} />
            <Label htmlFor="clienteSatisfecho">Cliente satisfecho</Label>
          </div>

          {/* Se entregó instructivo */}
          <div className="flex items-center space-x-2">
            <Checkbox id="seEntregoInstructivo" name="seEntregoInstructivo" checked={form.seEntregoInstructivo} onCheckedChange={(v) => setForm((prev) => ({ ...prev, seEntregoInstructivo: v === true, }))} />
            <Label htmlFor="seEntregoInstructivo">Se entregó instructivo</Label>
          </div>

          <hr className="border-t my-4" />

          {/* Diagnóstico */}
          <AccordionSection title="Diagnostico" options={diagnosticoOpciones} fileFieldName="files" selectedOptions={form.diagnostico} onOptionsChange={(arr) => setForm((prev) => ({ ...prev, diagnostico: arr }))}
            commentsValue={form.comentariosDiagnostico}
            onCommentsChange={(e) => setForm((prev) => ({ ...prev, comentariosDiagnostico: e.target.value, }))}
            onFileChange={(e) => handleFileChange("archivosDiagnostico", e.target.files)} />

          <hr className="border-t my-4" />

          {/* Solución */}
          <AccordionSection title="Solucion" options={solucionOpciones} fileFieldName="files" selectedOptions={form.solucion} onOptionsChange={(arr) => setForm((prev) => ({ ...prev, solucion: arr }))}
            commentsValue={form.comentariosSolucion}
            onCommentsChange={(e) => setForm((prev) => ({ ...prev, comentariosSolucion: e.target.value, }))}
            onFileChange={(e) => handleFileChange("archivosSolucion", e.target.files)} />

          <hr className="border-t my-4" />

          {/* Pruebas */}
          <AccordionSection title="Pruebas" options={pruebasOpciones} fileFieldName="files" selectedOptions={form.pruebas} onOptionsChange={(arr) => setForm((prev) => ({ ...prev, pruebas: arr }))}
            commentsValue={form.comentariosPruebas}
            onCommentsChange={(e) => setForm((prev) => ({ ...prev, comentariosPruebas: e.target.value, }))}
            onFileChange={(e) => handleFileChange("archivosPruebas", e.target.files)} />

          <hr className="border-t my-4" />

          {/* Transcripción de voz */}
          <div>
            <Label htmlFor="transcripcionVoz" className="block font-medium mb-1">Transcripción de voz a texto</Label>
            <Textarea id="transcripcionVoz" name="transcripcionVoz" placeholder="Aquí aparecerá el texto grabado..." value={form.transcripcionVoz} onChange={handleInputChange} rows={3} />
            <div className="flex space-x-2 mt-2">
              <Button type="button" onClick={handleStartRecording}>Grabar</Button>
              <Button type="button" onClick={handleStopRecording}>Detener</Button>
            </div>
          </div>
          
          <hr className="border-t my-4" />

          <div className="text-center">
            <Button type="submit" className="w-full">Enviar</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}