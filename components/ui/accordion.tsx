import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export function AccordionSection({
  title,
  options,
  value,
  onChange,
  onFileChange
}: {
  title: string;
  options: string[];
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div>
      <details className="mb-4">
        <summary className="cursor-pointer font-semibold">{title}</summary>
        <div className="pl-4 mt-2 space-y-2">
          {options.map((option, idx) => (
            <div key={idx} className="flex items-center space-x-2">
              <Checkbox id={`${title}-${idx}`} />
              <Label htmlFor={`${title}-${idx}`}>{option}</Label>
            </div>
          ))}
          <Textarea
            placeholder={`Comentarios sobre ${title}`}
            value={value}
            onChange={onChange}
          />
          <div>
            <Label>Fotos y videos de {title}</Label>
            <Input type="file" accept="image/*,video/*" multiple onChange={onFileChange} />
          </div>
        </div>
      </details>
    </div>
  );
}
