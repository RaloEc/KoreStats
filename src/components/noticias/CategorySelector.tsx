"use client";

import { useState } from "react";
import { ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

export interface NoticiaCategory {
  id: string;
  nombre: string;
  subcategories?: NoticiaCategory[];
  color?: string;
  descripcion?: string;
}

interface CategorySelectorProps {
  categories: NoticiaCategory[];
  selectedCategoryIds: string[];
  onSelectCategory: (categoryId: string) => void;
  maxSelection?: number;
  showSelectedBadges?: boolean;
}

export function CategorySelector({
  categories,
  selectedCategoryIds = [],
  onSelectCategory,
  maxSelection = 4,
  showSelectedBadges = true,
}: CategorySelectorProps) {
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(
    {}
  );

  const toggleCategory = (categoryId: string) => {
    setOpenCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  const isSelected = (categoryId: string) =>
    selectedCategoryIds.includes(categoryId);
  const canSelectMore = selectedCategoryIds.length < maxSelection;

  const findCategoryById = (
    id: string,
    cats: NoticiaCategory[] = categories
  ): NoticiaCategory | null => {
    for (const cat of cats) {
      if (cat.id === id) return cat;
      if (cat.subcategories) {
        const found = findCategoryById(id, cat.subcategories);
        if (found) return found;
      }
    }
    return null;
  };

  const renderCategory = (category: NoticiaCategory, level: number = 0) => {
    const hasSubcategories =
      category.subcategories && category.subcategories.length > 0;
    const isOpen = openCategories[category.id];
    const selected = isSelected(category.id);
    const disabled = !selected && !canSelectMore;

    return (
      <div key={category.id} className="space-y-1">
        {hasSubcategories ? (
          <Collapsible
            open={isOpen}
            onOpenChange={() => toggleCategory(category.id)}
          >
            <div className="flex items-center group">
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="p-0 h-6 w-6 mr-1 hover:bg-accent flex-shrink-0"
                >
                  <ChevronRight
                    className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform duration-200",
                      isOpen && "rotate-90"
                    )}
                  />
                </Button>
              </CollapsibleTrigger>

              <Button
                type="button"
                variant="ghost"
                disabled={disabled}
                className={cn(
                  "justify-start p-2 h-auto w-full text-left hover:bg-accent/50 rounded-md transition-colors",
                  selected &&
                    "bg-primary/10 text-primary font-medium hover:bg-primary/20",
                  disabled && "opacity-50 cursor-not-allowed"
                )}
                style={{ paddingLeft: `${level * 1.5}rem` }}
                onClick={() => onSelectCategory(category.id)}
              >
                <div className="flex items-center gap-2 flex-1">
                  <span className="truncate text-foreground font-medium">
                    {category.nombre}
                  </span>
                  {category.descripcion && (
                    <span className="text-xs text-muted-foreground block mt-0.5">
                      {category.descripcion}
                    </span>
                  )}
                  {selected && (
                    <div className="ml-auto flex-shrink-0">
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <svg
                          className="w-3 h-3 text-primary-foreground"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path d="M5 13l4 4L19 7"></path>
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
              </Button>
            </div>

            <CollapsibleContent className="ml-6 pl-2 border-l-2 border-border/30 dark:border-border/50 space-y-1">
              {category.subcategories?.map((subcat) =>
                renderCategory(subcat, level + 1)
              )}
            </CollapsibleContent>
          </Collapsible>
        ) : (
          <Button
            type="button"
            variant="ghost"
            disabled={disabled}
            className={cn(
              "justify-start p-2 h-auto w-full text-left hover:bg-accent/50 rounded-md transition-colors",
              selected &&
                "bg-primary/10 text-primary font-medium hover:bg-primary/20",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            style={{ paddingLeft: `${level * 1.5}rem` }}
            onClick={() => onSelectCategory(category.id)}
          >
            <div className="flex items-center gap-2 flex-1">
              {category.color && (
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: category.color }}
                />
              )}
              <div className="flex-1">
                <span className="block text-foreground font-medium">
                  {category.nombre}
                </span>
                {category.descripcion && (
                  <span className="text-xs text-muted-foreground block mt-0.5">
                    {category.descripcion}
                  </span>
                )}
              </div>
              {selected && (
                <div className="ml-auto flex-shrink-0">
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <svg
                      className="w-3 h-3 text-primary-foreground"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                </div>
              )}
            </div>
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Lista de categorías */}
      <div className="space-y-1">
        {categories.map((category) => renderCategory(category))}
      </div>

      {/* Badges de categorías seleccionadas */}
      {showSelectedBadges && selectedCategoryIds.length > 0 && (
        <div className="mt-4 p-3 bg-muted/50 rounded-md">
          <p className="text-sm font-medium mb-2">
            Categorías seleccionadas ({selectedCategoryIds.length}/
            {maxSelection}):
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedCategoryIds.map((catId) => {
              const categoria = findCategoryById(catId);
              return categoria ? (
                <div
                  key={catId}
                  className="flex items-center gap-1.5 bg-primary/10 text-primary px-2.5 py-1.5 rounded-md text-sm"
                >
                  {categoria.color && (
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: categoria.color }}
                    />
                  )}
                  <span>{categoria.nombre}</span>
                  <button
                    type="button"
                    onClick={() => onSelectCategory(catId)}
                    className="ml-1 hover:text-destructive focus:outline-none transition-colors"
                    aria-label={`Quitar ${categoria.nombre}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : null;
            })}
          </div>
          {selectedCategoryIds.length >= maxSelection && (
            <p className="text-xs text-amber-600 dark:text-amber-500 mt-2">
              Has alcanzado el límite de {maxSelection} categorías
            </p>
          )}
        </div>
      )}
    </div>
  );
}
