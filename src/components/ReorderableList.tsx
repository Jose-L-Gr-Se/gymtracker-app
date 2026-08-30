import { Ionicons } from '@expo/vector-icons';
import { useCallback, useRef, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { colors, radius } from '@/theme/tokens';

/**
 * Lista reordenable por arrastre (mantener pulsado el asa ⠿ y mover).
 *
 * Construida sobre gesture-handler + reanimated ya presentes en la app en
 * vez de una librería externa de drag & drop: evita depender de un paquete
 * cuya compatibilidad con la Reanimated 4 de este SDK no está garantizada.
 *
 * El gesto corre en el hilo de JS (`runOnJS(true)`) para poder leer/escribir
 * estado de React de forma directa. El reordenamiento no se aplica en vivo
 * mientras se arrastra (evitaría condiciones de carrera entre el índice
 * capturado al iniciar el gesto y un array cambiando a mitad de arrastre);
 * en su lugar, el ítem flota libremente sobre el resto y una línea indica
 * dónde caerá, aplicándose el reordenamiento real solo al soltar.
 */

export interface ReorderableListProps<T> {
  data: T[];
  keyExtractor: (item: T, index: number) => string;
  onReorder: (next: T[]) => void;
  /** El tercer argumento es el asa de arrastre: colócala donde quieras dentro de la fila. */
  renderItem: (item: T, index: number, dragHandle: React.ReactNode) => React.ReactNode;
  gap?: number;
}

export function ReorderableList<T>({ data, keyExtractor, onReorder, renderItem, gap = 12 }: ReorderableListProps<T>) {
  const heightsByKey = useRef<Map<string, number>>(new Map());
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const offsetForIndex = useCallback(
    (index: number) => {
      let y = 0;
      for (let i = 0; i < index; i++) {
        y += (heightsByKey.current.get(keyExtractor(data[i], i)) ?? 0) + gap;
      }
      return y;
    },
    [data, gap, keyExtractor],
  );

  /** Índice de destino según dónde queda el centro del ítem arrastrado. */
  const hoverIndexFor = useCallback(
    (fromIndex: number, translationY: number) => {
      const fromKey = keyExtractor(data[fromIndex], fromIndex);
      const fromHeight = heightsByKey.current.get(fromKey) ?? 0;
      const draggedCenter = offsetForIndex(fromIndex) + translationY + fromHeight / 2;
      let acc = 0;
      for (let i = 0; i < data.length; i++) {
        const h = heightsByKey.current.get(keyExtractor(data[i], i)) ?? fromHeight;
        if (draggedCenter < acc + h + gap / 2) return i;
        acc += h + gap;
      }
      return data.length - 1;
    },
    [data, gap, keyExtractor, offsetForIndex],
  );

  const handleDragMove = useCallback(
    (fromIndex: number, translationY: number) => setHoverIndex(hoverIndexFor(fromIndex, translationY)),
    [hoverIndexFor],
  );

  const handleDragEnd = useCallback(
    (fromIndex: number, translationY: number) => {
      const toIndex = hoverIndexFor(fromIndex, translationY);
      setDraggingIndex(null);
      setHoverIndex(null);
      if (toIndex === fromIndex) return;
      const next = data.slice();
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      onReorder(next);
    },
    [data, hoverIndexFor, onReorder],
  );

  return (
    <View>
      {data.map((item, index) => {
        const key = keyExtractor(item, index);
        return (
          <ReorderableRow
            key={key}
            index={index}
            isDragging={draggingIndex === index}
            showInsertionAbove={hoverIndex === index && draggingIndex !== null && draggingIndex !== index}
            gap={gap}
            onMeasured={(h) => heightsByKey.current.set(key, h)}
            onDragStart={() => setDraggingIndex(index)}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
          >
            {(dragHandle) => renderItem(item, index, dragHandle)}
          </ReorderableRow>
        );
      })}
    </View>
  );
}

interface ReorderableRowProps {
  index: number;
  isDragging: boolean;
  showInsertionAbove: boolean;
  gap: number;
  onMeasured: (height: number) => void;
  onDragStart: () => void;
  onDragMove: (fromIndex: number, translationY: number) => void;
  onDragEnd: (fromIndex: number, translationY: number) => void;
  children: (dragHandle: React.ReactNode) => React.ReactNode;
}

function ReorderableRow({
  index,
  isDragging,
  showInsertionAbove,
  gap,
  onMeasured,
  onDragStart,
  onDragMove,
  onDragEnd,
  children,
}: ReorderableRowProps) {
  const dragY = useSharedValue(0);

  const handleLayout = (e: LayoutChangeEvent) => onMeasured(e.nativeEvent.layout.height);

  const pan = Gesture.Pan()
    .runOnJS(true)
    .activateAfterLongPress(220)
    .onStart(() => {
      dragY.value = 0;
      onDragStart();
    })
    .onUpdate((e) => {
      dragY.value = e.translationY;
      onDragMove(index, e.translationY);
    })
    .onEnd((e) => {
      dragY.value = withSpring(0, { damping: 20, stiffness: 300 });
      onDragEnd(index, e.translationY);
    })
    .onFinalize(() => {
      dragY.value = withSpring(0, { damping: 20, stiffness: 300 });
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: isDragging ? dragY.value : 0 }],
    zIndex: isDragging ? 10 : 0,
    opacity: isDragging ? 0.94 : 1,
  }));

  const dragHandle = (
    <GestureDetector gesture={pan}>
      <View style={styles.handle} hitSlop={10}>
        <Ionicons name="reorder-three" size={22} color={colors.textMuted} />
      </View>
    </GestureDetector>
  );

  return (
    <View style={{ marginBottom: gap }}>
      {showInsertionAbove ? <View style={styles.insertionLine} /> : null}
      <Animated.View onLayout={handleLayout} style={animatedStyle}>
        {children(dragHandle)}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  handle: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insertionLine: {
    height: 3,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    marginBottom: 8,
  },
});
