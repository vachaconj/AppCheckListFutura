// components/ChecklistApp.tsx
"use client";

import { useState, useRef, useEffect } from "react";
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
  codigoSKU: string;
  observacionesGenerales: string;
  clienteSatisfecho: boolean;
  seEntregoInstructivo: boolean;
  // Cada sección almacena un array de opciones marcadas:
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
  // 1) Estado inicial de todo el formulario
  const [form, setForm] = useState<FormState>({
    cliente: "",
    direccion: "",
    ciudad: "",
    tecnico: "",
    fechaVisita: "",
    codigoSKU: "",
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

  // 2) Listas de opciones estáticas
  const diagnosticoOpciones = [
    "No imprime negro / color faltante",
    "Cabezal se choca con material",
    "Carro desalineado",
    "Fugas de tinta en amortiguadores / cabezales",
    "Banding / líneas / imagen doble",
    "Sensor de material no detecta",
    "Luz LED dañada / fallo electrónico",
    "Tinta se evapora / baja presión en dampers",
    "Software congela al imprimir",
    "Cabezal no registra lectura",
  ];

  const solucionOpciones = [
    "Purga general",
    "Carga con jeringa",
    "Cambio de amortiguador",
    "Cambio de cabezal",
    "Cambio de tarjetas / sensor",
    "Calibración de carro y encoder",
    "Ajuste de presión de tinta",
    "Reinstalación de software o firmware",
    "Cambio de banda / damper",
    "Mantenimiento preventivo completo",
  ];

  const pruebasOpciones = [
    "Prueba de impresión directa",
    "Prueba en modo espejo / negativo",
    "Impresión con plantilla de calibración",
    "Prueba de corte",
    "Impresión continua por 10 metros",
    "Validación con cliente in situ",
    "Transferencia en prensa térmica",
    "Verificación de alineación con barniz/white",
    "Test en materiales diversos (PET, DTF, UV)",
    "Confirmación en software RIP",
  ];

  // 3) Refs y lógica de reconocimiento de voz
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isRecordingRef = useRef(false);

  useEffect(() => {
    type ExtendedWindow = typeof window & {
      webkitSpeechRecognition?: new () => SpeechRecognition;
    };

    const speechWindow = window as ExtendedWindow;
    const SpeechRecognitionClass =
      speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;

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

  // 4) Manejadores de cambio de archivos
  const handleFileChange = (
    field: "archivosDiagnostico" | "archivosSolucion" | "archivosPruebas",
    files: FileList | null
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: files,
    }));
  };

  // 5) Manejador de envío del formulario (sin recargar página)
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      // 5.1) Creamos un FormData
      const formData = new FormData();

      // 5.2) Campos simples de texto
      formData.append("cliente", form.cliente);
      formData.append("direccion", form.direccion);
      formData.append("ciudad", form.ciudad);
      formData.append("tecnico", form.tecnico);
      formData.append("fechaVisita", form.fechaVisita);
      formData.append("codigoSKU", form.codigoSKU);
      formData.append("observacionesGenerales", form.observacionesGenerales);

      // 5.3) Checkboxes booleanos
      formData.append(
        "clienteSatisfecho",
        form.clienteSatisfecho ? "Sí" : "No"
      );
      formData.append(
        "seEntregoInstructivo",
        form.seEntregoInstructivo ? "Sí" : "No"
      );

      // 5.4) Opciones múltiples de Diagnóstico, Solución y Pruebas
      form.diagnostico.forEach((opt) => {
        formData.append("diagnostico", opt);
      });
      formData.append(
        "comentariosDiagnostico",
        form.comentariosDiagnostico
      );
      if (form.archivosDiagnostico) {
        for (let i = 0; i < form.archivosDiagnostico.length; i++) {
          const file = form.archivosDiagnostico[i];
          formData.append("diagnosticoFiles", file, file.name);
        }
      }

      form.solucion.forEach((opt) => {
        formData.append("solucion", opt);
      });
      formData.append("comentariosSolucion", form.comentariosSolucion);
      if (form.archivosSolucion) {
        for (let i = 0; i < form.archivosSolucion.length; i++) {
          const file = form.archivosSolucion[i];
          formData.append("solucionFiles", file, file.name);
        }
      }

      form.pruebas.forEach((opt) => {
        formData.append("pruebas", opt);
      });
      formData.append("comentariosPruebas", form.comentariosPruebas);
      if (form.archivosPruebas) {
        for (let i = 0; i < form.archivosPruebas.length; i++) {
          const file = form.archivosPruebas[i];
          formData.append("pruebasFiles", file, file.name);
        }
      }

      // 5.5) Transcripción de voz a texto
      formData.append("transcripcionVoz", form.transcripcionVoz);

      // 5.6) Enviamos el POST a /api/submit
      const response = await fetch("/api/submit", {
        method: "POST",
        body: formData,
      });

      // 5.7) Comprobamos la respuesta
      if (!response.ok) {
        const errorJson = await response.json();
        alert("Error al enviar: " + (errorJson.error || "desconocido"));
        return;
      }

      alert("¡Formulario enviado correctamente!");
      // 5.8) Opcional: reiniciar el estado del formulario
      setForm({
        cliente: "",
        direccion: "",
        ciudad: "",
        tecnico: "",
        fechaVisita: "",
        codigoSKU: "",
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
          {/* 1. Cliente */}
          <div>
            <Label htmlFor="cliente" className="block font-medium mb-1">
              Cliente
            </Label>
            <Input
              id="cliente"
              name="cliente"
              type="text"
              placeholder="Nombre del cliente"
              value={form.cliente}
              onChange={(e) =>
                setForm({ ...form, cliente: e.target.value })
              }
              required
            />
          </div>

          {/* 2. Dirección */}
          <div>
            <Label htmlFor="direccion" className="block font-medium mb-1">
              Dirección
            </Label>
            <Input
              id="direccion"
              name="direccion"
              type="text"
              placeholder="Av. ejemplo 123"
              value={form.direccion}
              onChange={(e) =>
                setForm({ ...form, direccion: e.target.value })
              }
              required
            />
          </div>

          {/* 3. Ciudad */}
          <div>
            <Label htmlFor="ciudad" className="block font-medium mb-1">
              Ciudad
            </Label>
            <Input
              id="ciudad"
              name="ciudad"
              type="text"
              placeholder="Lima"
              value={form.ciudad}
              onChange={(e) => setForm({ ...form, ciudad: e.target.value })}
              required
            />
          </div>

          {/* 4. Técnico */}
          <div>
            <Label htmlFor="tecnico" className="block font-medium mb-1">
              Técnico
            </Label>
            <Input
              id="tecnico"
              name="tecnico"
              type="text"
              placeholder="Nombre del técnico"
              value={form.tecnico}
              onChange={(e) =>
                setForm({ ...form, tecnico: e.target.value })
              }
              required
            />
          </div>

          {/* 5. Fecha de visita */}
          <div>
            <Label htmlFor="fechaVisita" className="block font-medium mb-1">
              Fecha de visita
            </Label>
            <Input
              id="fechaVisita"
              name="fechaVisita"
              type="date"
              value={form.fechaVisita}
              onChange={(e) =>
                setForm({ ...form, fechaVisita: e.target.value })
              }
              required
            />
          </div>

          {/* 6. Código SKU */}
          <div>
            <Label htmlFor="codigoSKU" className="block font-medium mb-1">
              Código SKU
            </Label>
            <Input
              id="codigoSKU"
              name="codigoSKU"
              type="text"
              placeholder="Buscar SKU..."
              value={form.codigoSKU}
              onChange={(e) =>
                setForm({ ...form, codigoSKU: e.target.value })
              }
              list="sku-options"
              required
            />
            <datalist id="sku-options">
              {skuList.map((sku, idx) => (
                <option key={idx} value={sku} />
              ))}
            </datalist>
          </div>

          {/* 7. Observaciones generales */}
          <div>
            <Label
              htmlFor="observacionesGenerales"
              className="block font-medium mb-1"
            >
              Observaciones generales
            </Label>
            <Textarea
              id="observacionesGenerales"
              name="observacionesGenerales"
              placeholder="Anota aquí cualquier comentario general"
              value={form.observacionesGenerales}
              onChange={(e) =>
                setForm({ ...form, observacionesGenerales: e.target.value })
              }
              rows={3}
            />
          </div>

          {/* 8. Cliente satisfecho */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="clienteSatisfecho"
              name="clienteSatisfecho"
              checked={form.clienteSatisfecho}
              onCheckedChange={(v: boolean) =>
                setForm({ ...form, clienteSatisfecho: v })
              }
            />
            <Label htmlFor="clienteSatisfecho">Cliente satisfecho</Label>
          </div>

          {/* 9. Se entregó instructivo */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="seEntregoInstructivo"
              name="seEntregoInstructivo"
              checked={form.seEntregoInstructivo}
              onCheckedChange={(v: boolean) =>
                setForm({ ...form, seEntregoInstructivo: v })
              }
            />
            <Label htmlFor="seEntregoInstructivo">
              Se entregó instructivo
            </Label>
          </div>

          <hr className="border-t my-4" />

          {/* 10. Diagnóstico */}
          <AccordionSection
            title="Diagnostico"
            options={diagnosticoOpciones}
            fileFieldName="diagnosticoFiles"
            selectedOptions={form.diagnostico}
            onOptionsChange={(arr) =>
              setForm((prev) => ({ ...prev, diagnostico: arr }))
            }
            commentsValue={form.comentariosDiagnostico}
            onCommentsChange={(e) =>
              setForm((prev) => ({
                ...prev,
                comentariosDiagnostico: e.target.value,
              }))
            }
            onFileChange={(e) =>
              handleFileChange("archivosDiagnostico", e.target.files)
            }
          />

          <hr className="border-t my-4" />

          {/* 11. Solución */}
          <AccordionSection
            title="Solucion"
            options={solucionOpciones}
            fileFieldName="solucionFiles"
            selectedOptions={form.solucion}
            onOptionsChange={(arr) =>
              setForm((prev) => ({ ...prev, solucion: arr }))
            }
            commentsValue={form.comentariosSolucion}
            onCommentsChange={(e) =>
              setForm((prev) => ({
                ...prev,
                comentariosSolucion: e.target.value,
              }))
            }
            onFileChange={(e) =>
              handleFileChange("archivosSolucion", e.target.files)
            }
          />

          <hr className="border-t my-4" />

          {/* 12. Pruebas */}
          <AccordionSection
            title="Pruebas"
            options={pruebasOpciones}
            fileFieldName="pruebasFiles"
            selectedOptions={form.pruebas}
            onOptionsChange={(arr) =>
              setForm((prev) => ({ ...prev, pruebas: arr }))
            }
            commentsValue={form.comentariosPruebas}
            onCommentsChange={(e) =>
              setForm((prev) => ({
                ...prev,
                comentariosPruebas: e.target.value,
              }))
            }
            onFileChange={(e) =>
              handleFileChange("archivosPruebas", e.target.files)
            }
          />

          <hr className="border-t my-4" />

          {/* 13. Transcripción de voz a texto */}
          <div>
            <Label htmlFor="transcripcionVoz" className="block font-medium mb-1">
              Transcripción de voz a texto
            </Label>
            <Textarea
              id="transcripcionVoz"
              name="transcripcionVoz"
              placeholder="Aquí aparecerá el texto grabado..."
              value={form.transcripcionVoz}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  transcripcionVoz: e.target.value,
                }))
              }
              rows={3}
            />
            <div className="flex space-x-2 mt-2">
              <Button type="button" onClick={handleStartRecording}>
                Grabar
              </Button>
              <Button type="button" onClick={handleStopRecording}>
                Detener
              </Button>
            </div>
          </div>

          <hr className="border-t my-4" />

          {/* 14. Botón de Envío */}
          <div className="text-center">
            <Button type="submit" className="w-full">
              Enviar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

