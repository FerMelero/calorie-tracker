import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';

import { Accent } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { barLayout } from '@/lib/chart';

/** Una barra por día. value = null significa "ese día no se registró nada" (no es un 0). */
export type Bar = { key: string; value: number | null };
/** Etiqueta del eje horizontal, colgada de la barra con ese índice. */
export type AxisLabel = { index: number; text: string };

type Props = {
  bars: Bar[];
  /** Línea discontinua del objetivo; null = sin objetivo */
  goal: number | null;
  xLabels: AxisLabel[];
  height?: number;
  /** Texto para lectores de pantalla (la gráfica en sí no se puede leer) */
  accessibilityLabel: string;
};

const OVER_GOAL = '#E5484D';
const LEFT = 38; // sitio para los números del eje vertical
const TOP = 8;
const BOTTOM = 22; // sitio para las fechas

/** Barras de calorías por día, con la línea del objetivo. Los días sin registro quedan como hueco. */
export function BarChart({ bars, goal, xLabels, height = 170, accessibilityLabel }: Props) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const layout = barLayout(bars, goal, { width, height }, { left: LEFT, top: TOP, bottom: BOTTOM });

  return (
    <View onLayout={onLayout} style={{ height }} accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
      {width > 0 ? (
        <Svg width={width} height={height}>
          {layout.grid.map((g) => (
            <Line key={g.value} x1={LEFT} x2={width} y1={g.y} y2={g.y} stroke={theme.backgroundSelected} strokeWidth={1} />
          ))}
          {layout.grid.map((g) => (
            <SvgText key={`t${g.value}`} x={LEFT - 6} y={g.y + 4} fontSize={10} fill={theme.textSecondary} textAnchor="end">
              {Math.round(g.value)}
            </SvgText>
          ))}

          {layout.bars.map((b) => (
            <Rect
              key={b.key}
              x={b.x}
              y={b.y}
              width={b.width}
              height={b.height}
              rx={Math.min(3, b.width / 2)}
              fill={b.missing ? theme.backgroundSelected : b.over ? OVER_GOAL : Accent}
            />
          ))}

          {layout.goalY !== null ? (
            <Line x1={LEFT} x2={width} y1={layout.goalY} y2={layout.goalY} stroke={theme.text} strokeWidth={1.5} strokeDasharray="5,4" opacity={0.7} />
          ) : null}

          {xLabels.map((l, k) => {
            const cx = LEFT + l.index * layout.slot + layout.slot / 2;
            const anchor = k === 0 ? 'start' : k === xLabels.length - 1 ? 'end' : 'middle';
            return (
              <SvgText key={l.index} x={cx} y={height - 6} fontSize={10} fill={theme.textSecondary} textAnchor={anchor}>
                {l.text}
              </SvgText>
            );
          })}
        </Svg>
      ) : (
        <View style={styles.placeholder} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({ placeholder: { flex: 1 } });
