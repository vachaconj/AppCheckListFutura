'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { skuList } from '@/app/data/skuList'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion'

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
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log(form)
    alert('Formulario enviado (solo consola por ahora)')
  }

  return (
    <Card className="max-w-2xl mx-auto mt-10">
      <CardContent className="p-6 space-y-4">
        <h1 className="text-lg font-bold text-center">Checklist de Visita Técnica</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Cliente</Label>
            <Input value={form.cliente} onChange={e => setForm({ ...form, cliente: e.target.value })} />
          </div>
          <div>
            <Label>Dirección</Label>
            <Input value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} />
          </div>
          <div>
            <Label>Ciudad</Label>
            <Input value={form.ciudad} onChange={e => setForm({ ...form, ciudad: e.target.value })} />
          </div>
          <div>
            <Label>Técnico</Label>
            <Input value={form.tecnico} onChange={e => setForm({ ...form, tecnico: e.target.value })} />
          </div>
          <div>
            <Label>Fecha</Label>
            <Input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} />
          </div>
          <div>
            <Label>Código SKU</Label>
            <Input
              list="sku-options"
              value={form.sku}
              onChange={e => setForm({ ...form, sku: e.target.value })}
              placeholder="Buscar SKU..."
            />
            <datalist id="sku-options">
              {skuList.map((sku, idx) => (
                <option key={idx} value={sku} />
              ))}
            </datalist>
          </div>
          <div>
            <Label>Observaciones generales</Label>
            <Textarea value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox checked={form.clienteSatisfecho} onCheckedChange={v => setForm({ ...form, clienteSatisfecho: v === true })} />
            <Label>Cliente satisfecho</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox checked={form.entregoInstructivo} onCheckedChange={v => setForm({ ...form, entregoInstructivo: v === true })} />
            <Label>Se entregó instructivo</Label>
          </div>

          <Accordion type="multiple" className="w-full">
            <AccordionItem value="diagnostico">
              <AccordionTrigger>Diagnóstico</AccordionTrigger>
              <AccordionContent>
                <Textarea placeholder="Comentarios sobre Diagnóstico" value={form.comentariosDiagnostico} onChange={e => setForm({ ...form, comentariosDiagnostico: e.target.value })} />
                <Input type="file" multiple onChange={e => setForm({ ...form, archivosDiagnostico: e.target.files })} />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="solucion">
              <AccordionTrigger>Solución</AccordionTrigger>
              <AccordionContent>
                <Textarea placeholder="Comentarios sobre Solución" value={form.comentariosSolucion} onChange={e => setForm({ ...form, comentariosSolucion: e.target.value })} />
                <Input type="file" multiple onChange={e => setForm({ ...form, archivosSolucion: e.target.files })} />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="pruebas">
              <AccordionTrigger>Pruebas</AccordionTrigger>
              <AccordionContent>
                <Textarea placeholder="Comentarios sobre Pruebas" value={form.comentariosPruebas} onChange={e => setForm({ ...form, comentariosPruebas: e.target.value })} />
                <Input type="file" multiple onChange={e => setForm({ ...form, archivosPruebas: e.target.files })} />
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <Button type="submit">Enviar</Button>
        </form>
      </CardContent>
    </Card>
  )
}
