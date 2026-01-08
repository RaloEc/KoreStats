import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, Link as LinkIcon, Type } from "lucide-react";
import { useEffect } from "react";

interface FuentesListInputProps {
  value?: string[];
  onChange: (value: string[]) => void;
}

export function FuentesListInput({
  value = [],
  onChange,
}: FuentesListInputProps) {
  // Asegurarse de que value sea un array
  const activeValues = Array.isArray(value) ? value : [];

  const addFuente = () => {
    onChange([...activeValues, ""]);
  };

  const updateFuente = (index: number, val: string) => {
    const newValue = [...activeValues];
    newValue[index] = val;
    onChange(newValue);
  };

  const removeFuente = (index: number) => {
    const newValue = activeValues.filter((_, i) => i !== index);
    onChange(newValue);
  };

  const isUrl = (text: string) => /^https?:\/\//.test(text);

  return (
    <div className="space-y-3">
      {activeValues.length > 0 ? (
        <div className="space-y-2">
          {activeValues.map((fuente, index) => (
            <div key={index} className="flex gap-2 items-center group">
              <div className="relative flex-1">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {isUrl(fuente) ? (
                    <LinkIcon className="h-4 w-4" />
                  ) : (
                    <Type className="h-4 w-4" />
                  )}
                </div>
                <Input
                  value={fuente}
                  onChange={(e) => updateFuente(index, e.target.value)}
                  placeholder="Introduce la URL o nombre de la fuente..."
                  className="bg-background pl-9"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeFuente(index)}
                className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                title="Eliminar fuente"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground italic px-1">
          No hay fuentes agregadas
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addFuente}
        className="flex items-center gap-1 mt-1"
      >
        <Plus className="h-3.5 w-3.5" />
        <span>Agregar Fuente</span>
      </Button>
    </div>
  );
}
