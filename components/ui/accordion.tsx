// components/ui/accordion.tsx
"use client";

import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

interface AccordionSectionProps {
  // Título de la sección (por ejemplo: "Diagnóstico", "Solución", "Pruebas")
  title: string;

  // Array con las opciones de checkbox (por ejemplo:
  // ["No imprime negro / color faltante", "Cabezal se choca con material", ...])
  options: string[];

  // Nombre del campo que se usará para el <input type="file" name="...">
  fileFieldName: string;

  // Array de strings con las opciones marcadas actualmente
  selectedOptions: string[];

  // Callback que se llamará cuando cambie el array de opciones marcadas
  onOptionsChange: (opts: string[]) => void;

  // Valor del textarea de comentarios (por ejemplo: comentarioDiagnostico)
  commentsValue: string;

  // Callback cuando cambie el contenido del textarea
  onCommentsChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;

  // Callback cuando cambie el input type="file"
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function AccordionSection({
  title,
  options,
  fileFieldName,
  selectedOptions,
  onOptionsChange,
  commentsValue,
  onCommentsChange,
  onFileChange,
}: AccordionSectionProps) {
  // Estado local para abrir/cerrar el <details>
  const [open, setOpen] = useState(true);

  // Función que se llama al tildar/destildar una opción
  const toggleOption = (option: string) => {
    let newSelected: string[];
    if (selectedOptions.includes(option)) {
      newSelected = selectedOptions.filter((x) => x !== option);
    } else {
      newSelected = [...selectedOptions, option];
    }
    onOptionsChange(newSelected);
  };

  // Asegurarnos de sincronizar `open` si el usuario usa la tecla o clic
  useEffect(() => {
    // No hacemos nada adicional aquí, pero por tema de accesibilidad
    // podríamos leer `details.open` si fuera necesario. Por ahora mantenemos
    // solo el estado interno para controlar la visibilidad.
  }, [open]);

  // El name base (“diagnostico”, “solucion” o “pruebas”) se arma en minúsculas:
  const nameBase = title.toLowerCase();

  return (
    <details
      className="mb-4 border rounded-md"
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
    >
      <summary className="cursor-pointer px-4 py-2 bg-gray-100 font-semibold">
        {title}
      </summary>

      <div className="px-4 py-2">
        {/* Lista de checkboxes */}
        {options.map((option, idx) => (
          <div key={idx} className="flex items-center space-x-2 mb-1">
            <Checkbox
              id={`${nameBase}-${idx}`}
              name={nameBase}               // ej: name="diagnostico"
              value={option}
              checked={selectedOptions.includes(option)}
              onCheckedChange={() => toggleOption(option)}
            />
            <Label htmlFor={`${nameBase}-${idx}`}>{option}</Label>
          </div>
        ))}

        {/* Textarea para comentarios */}
        <div className="mt-3">
          <Label htmlFor={`comentarios-${nameBase}`} className="block mb-1">
            Comentarios sobre {title}
          </Label>
          <Textarea
            id={`comentarios-${nameBase}`}
            name={`comentarios${title}`}   // ej: name="comentariosDiagnostico"
            placeholder={`Escribe tus comentarios sobre ${title.toLowerCase()}...`}
            value={commentsValue}
            onChange={onCommentsChange}
            rows={3}
          />
        </div>

        {/* Input para archivos */}
        <div className="mt-3">
          <Label htmlFor={`${nameBase}Files`} className="block mb-1">
            Fotos y vídeos de {title}
          </Label>
          <Input
            id={`${nameBase}Files`}
            name={`${fileFieldName}`}      // ej: name="diagnosticoFiles"
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={onFileChange}
          />
        </div>
      </div>
    </details>
  );
}
