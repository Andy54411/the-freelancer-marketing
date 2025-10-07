'use client';

import React, { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Dashboard Component Interface
export interface DashboardComponent {
  id: string;
  title: string;
  component?: React.ReactNode; // Optional für Speicherung
  width: 'full' | 'half' | 'third';
  enabled: boolean;
  order: number;
}

// Sortable Item Component
interface SortableItemProps {
  id: string;
  component: DashboardComponent;
  isEditMode: boolean;
  onToggle?: (id: string) => void;
}

function SortableItem({ id, component, isEditMode, onToggle }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getGridClasses = (width: string) => {
    switch (width) {
      case 'full':
        return 'col-span-1 lg:col-span-2';
      case 'half':
        return 'col-span-1';
      case 'third':
        return 'col-span-1 lg:col-span-1';
      default:
        return 'col-span-1';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        getGridClasses(component.width),
        'relative group',
        isDragging && 'z-50 opacity-50',
        !component.enabled && 'opacity-30 pointer-events-none'
      )}
      {...attributes}
    >
      {/* Drag Handle - nur im Edit-Modus sichtbar */}
      {isEditMode && (
        <div className="absolute -top-2 -right-2 z-10 flex space-x-1">
          <Button
            variant="outline"
            size="sm"
            className="h-6 w-6 p-0 bg-white border-gray-200 hover:bg-gray-50"
            onClick={() => onToggle?.(component.id)}
          >
            <div className={cn(
              "w-2 h-2 rounded-full",
              component.enabled ? "bg-green-500" : "bg-gray-400"
            )} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-6 w-6 p-0 bg-white border-gray-200 hover:bg-gray-50 cursor-grab active:cursor-grabbing"
            {...listeners}
          >
            <GripVertical className="h-3 w-3" />
          </Button>
        </div>
      )}
      
      {/* Component Content */}
      <div className={cn(
        "transition-all duration-200",
        isEditMode && "border-2 border-dashed border-gray-300 rounded-lg p-2",
        isEditMode && component.enabled && "border-[#14ad9f]"
      )}>
        {component.component || (
          <div className="p-4 text-gray-500 text-center">
            Komponente "{component.title}" nicht verfügbar
          </div>
        )}
      </div>

      {/* Edit Mode Overlay */}
      {isEditMode && (
        <div className="absolute inset-0 bg-gray-900/5 rounded-lg pointer-events-none" />
      )}
    </div>
  );
}

// Main Draggable Dashboard Grid Component
interface DraggableDashboardGridProps {
  components: DashboardComponent[];
  onReorder?: (components: DashboardComponent[]) => void;
  className?: string;
}

export default function DraggableDashboardGrid({
  components: initialComponents,
  onReorder,
  className,
}: DraggableDashboardGridProps) {
  const [components, setComponents] = useState(initialComponents);
  const [isEditMode, setIsEditMode] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Verhindert ungewolltes Dragging bei normalen Klicks
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Drag End Handler
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = components.findIndex((item) => item.id === active.id);
      const newIndex = components.findIndex((item) => item.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newComponents = arrayMove(components, oldIndex, newIndex).map((comp, index) => ({
          ...comp,
          order: index,
        }));
        
        setComponents(newComponents);
        onReorder?.(newComponents);
      }
    }
  }, [components, onReorder]);

  // Toggle Component Enable/Disable
  const handleToggleComponent = useCallback((componentId: string) => {
    const newComponents = components.map(comp =>
      comp.id === componentId
        ? { ...comp, enabled: !comp.enabled }
        : comp
    );
    setComponents(newComponents);
    onReorder?.(newComponents);
  }, [components, onReorder]);

  // Nur aktive Komponenten für das Drag & Drop
  const activeComponents = components.filter(comp => comp.enabled);
  const sortableIds = activeComponents.map(comp => comp.id);

  return (
    <div className={cn("relative", className)}>
      {/* Edit Mode Toggle */}
      <div className="flex justify-end mb-4">
        <Button
          variant={isEditMode ? "default" : "outline"}
          size="sm"
          onClick={() => setIsEditMode(!isEditMode)}
          className={cn(
            "transition-colors",
            isEditMode && "bg-[#14ad9f] hover:bg-[#129488] text-white"
          )}
        >
          <Settings className="h-4 w-4 mr-2" />
          {isEditMode ? 'Bearbeitung beenden' : 'Dashboard bearbeiten'}
        </Button>
      </div>

      {/* Edit Mode Info */}
      {isEditMode && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Bearbeitungsmodus aktiv:</strong> Ziehe Komponenten zum Neu-Anordnen. 
            Klicke auf den farbigen Punkt zum Ein-/Ausschalten von Komponenten.
          </p>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext 
          items={sortableIds} 
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {components.map((component) => (
              <SortableItem
                key={component.id}
                id={component.id}
                component={component}
                isEditMode={isEditMode}
                onToggle={handleToggleComponent}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Deaktivierte Komponenten */}
      {isEditMode && components.some(comp => !comp.enabled) && (
        <div className="mt-8 border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">
            Deaktivierte Komponenten
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {components
              .filter(comp => !comp.enabled)
              .map((component) => (
                <div
                  key={component.id}
                  className="relative group opacity-50 hover:opacity-75 transition-opacity"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute -top-2 -right-2 z-10 h-6 w-6 p-0 bg-white border-gray-200 hover:bg-gray-50"
                    onClick={() => handleToggleComponent(component.id)}
                  >
                    <div className="w-2 h-2 rounded-full bg-gray-400" />
                  </Button>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-2">
                    {component.component}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}