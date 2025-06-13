// components/ui/accordion.tsx
"use client";

import { useState, useEffect, ChangeEvent } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

interface AccordionSectionProps {
  // Título de la sección (por ejemplo: "Diagnóstico", "Solución", "Pruebas")
  title: string;

  // Array con las opciones de checkbox
  options: string[];

  // Nombre del campo que se usará para el <input type="file" name="...">
  fileFieldName: string;

  // Array de strings con las opciones marcadas actualmente
  selectedOptions: string[];

  // Callback que se llamará cuando cambie el array de opciones marcadas
  onOptionsChange: (opts: string[]) => void;

  // Valor del textarea de comentarios
  commentsValue: string;

  // Callback cuando cambie el contenido del textarea
  onCommentsChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;

  // Callback cuando cambie el input type="file"
  onFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
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
  const [open, setOpen] = useState(true);

  const toggleOption = (option: string) => {
    let newSelected: string[];
    if (selectedOptions.includes(option)) {
      newSelected = selectedOptions.filter((x) => x !== option);
    } else {
      newSelected = [...selectedOptions, option];
    }
    onOptionsChange(newSelected);
  };

  useEffect(() => {
    // Sincronización para accesibilidad (opcional)
  }, [open]);

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
              name={nameBase}
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
            name={`comentarios${title}`}
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
            name={fileFieldName}
            type="file"
            accept="image/*,video/*"
            // *** ESTA ES LA PIEZA CLAVE ***
            // El atributo `multiple` permite seleccionar varios archivos a la vez.
            multiple 
            onChange={onFileChange}
          />
        </div>
      </div>
    </details>
  );
}